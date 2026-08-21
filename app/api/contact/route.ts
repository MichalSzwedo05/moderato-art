import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { isContactTestEnabled } from "../../../lib/contact-test";
import { isContactRateLimited } from "../../../lib/contact-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxRequestBytes = 10_000;

const contactSubmissionSchema = z.object({
  parentName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  lessonType: z.enum(["rytmika", "junior-voice", "studio-wokalne"]).optional(),
  childAgeRange: z.enum(["3-5", "6-9", "10-15", "16-plus"]).optional(),
  message: z.string().trim().min(10).max(2_000),
  website: z.string().max(0).optional(),
}).strict();

type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

const jsonResponse = (body: object, status: number) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

const unavailableResponse = () => jsonResponse(
  { message: "Formularz kontaktowy jest chwilowo niedostępny." },
  503,
);

function secretsMatch(received: string | null, expected: string | undefined) {
  if (!received || !expected) {
    return false;
  }

  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(receivedHash, expectedHash);
}

async function parseJsonBody(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxRequestBytes) {
    return { tooLarge: true } as const;
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { invalid: true } as const;
  }

  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      size += value.byteLength;
      if (size > maxRequestBytes) {
        await reader.cancel();
        return { tooLarge: true } as const;
      }

      chunks.push(value);
    }
  } catch {
    return { invalid: true } as const;
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { value: JSON.parse(new TextDecoder().decode(body)) } as const;
  } catch {
    return { invalid: true } as const;
  }
}

function formatEmailText(submission: ContactSubmission) {
  return [
    "Testowa wiadomość z formularza Moderato Art.",
    "Nie jest to aktywny formularz produkcyjny i wiadomość nie została zapisana w bazie.",
    "",
    `Imię i nazwisko: ${submission.parentName}`,
    `E-mail: ${submission.email}`,
    `Telefon: ${submission.phone || "—"}`,
    `Rodzaj zajęć: ${submission.lessonType || "—"}`,
    `Wiek dziecka: ${submission.childAgeRange || "—"}`,
    "",
    "Wiadomość:",
    submission.message,
  ].join("\n");
}

export async function POST(request: Request) {
  if (!isContactTestEnabled()) {
    return unavailableResponse();
  }

  if (!secretsMatch(request.headers.get("x-contact-test-token"), process.env.CONTACT_FORM_TEST_TOKEN)) {
    return jsonResponse({ message: "Nieprawidłowy dostęp do testu formularza." }, 401);
  }

  if (isContactRateLimited()) {
    return jsonResponse({ message: "Zbyt wiele prób. Spróbuj ponownie później." }, 429);
  }

  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) {
    return jsonResponse({ message: "Nieprawidłowe źródło żądania." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ message: "Nieprawidłowy format żądania." }, 415);
  }

  const parsedBody = await parseJsonBody(request);
  if ("tooLarge" in parsedBody) {
    return jsonResponse({ message: "Wiadomość jest zbyt długa." }, 413);
  }

  if ("invalid" in parsedBody) {
    return jsonResponse({ message: "Nieprawidłowy format żądania." }, 400);
  }

  const parsedSubmission = contactSubmissionSchema.safeParse(parsedBody.value);
  if (!parsedSubmission.success || parsedSubmission.data.website) {
    return jsonResponse({ message: "Sprawdź poprawność formularza." }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_FORM_RECIPIENT;
  if (!apiKey || !recipient) {
    return unavailableResponse();
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Moderato Art test <onboarding@resend.dev>",
      to: [recipient],
      subject: "[TEST] Wiadomość z formularza Moderato Art",
      text: formatEmailText(parsedSubmission.data),
    });

    if (error) {
      return jsonResponse({ message: "Nie udało się wysłać wiadomości testowej." }, 502);
    }
  } catch {
    return jsonResponse({ message: "Nie udało się wysłać wiadomości testowej." }, 502);
  }

  return jsonResponse({ message: "Wiadomość testowa została wysłana." }, 200);
}
