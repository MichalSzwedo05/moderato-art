import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { createRateLimitIdentifier } from "../../../lib/admin-security";
import { getContactFormConfig } from "../../../lib/contact-config";
import { isContactRateLimited } from "../../../lib/contact-rate-limit";
import { createContactSubmission } from "../../../lib/contact-submissions";
import { privacyNoticeVersion } from "../../../lib/privacy-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxRequestBytes = 10_000;
const notificationTimeoutMs = 5_000;

const contactSubmissionSchema = z.object({
  parentName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  lessonType: z.enum(["rytmika", "junior-voice", "studio-wokalne"]).optional(),
  childAgeRange: z.enum(["3-5", "6-9", "10-15", "16-plus"]).optional(),
  message: z.string().trim().min(10).max(2_000),
  privacyNoticeAcknowledged: z.literal(true),
  website: z.string().max(200).optional(),
}).strict();

const jsonResponse = (body: object, status: number) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

const unavailableResponse = () => jsonResponse(
  { message: "Formularz kontaktowy jest chwilowo niedostępny." },
  503,
);

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

function formatEmailText(submissionId: string) {
  return [
    "Nowe zapytanie z formularza Moderato Art.",
    `Identyfikator zgłoszenia: ${submissionId}`,
    "",
    "Szczegóły są dostępne wyłącznie w uwierzytelnionym panelu CMS.",
  ].join("\n");
}

async function sendContactNotification(
  notification: NonNullable<ReturnType<typeof getContactFormConfig>>["notification"],
  submissionId: string,
) {
  if (!notification) return;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const resend = new Resend(notification.resendKey);
    const result = await Promise.race([
      resend.emails.send({
        from: notification.resendFrom,
        to: [notification.recipient],
        subject: "Nowe zapytanie z formularza Moderato Art",
        text: formatEmailText(submissionId),
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Contact notification timed out")), notificationTimeoutMs);
      }),
    ]);

    if (result.error) {
      console.error("Contact submission notification failed");
    }
  } catch {
    console.error("Contact submission notification failed");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const config = getContactFormConfig();
  if (!config) {
    return unavailableResponse();
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
  if (!parsedSubmission.success) {
    return jsonResponse({ message: "Sprawdź poprawność formularza." }, 400);
  }

  if (isContactRateLimited(createRateLimitIdentifier(getClientAddress(request), config.rateLimitSecret))) {
    return jsonResponse({ message: "Zbyt wiele prób. Spróbuj ponownie później." }, 429);
  }

  const submission = parsedSubmission.data;
  if (submission.website) return jsonResponse({ message: "Zgłoszenie zostało przyjęte." }, 200);

  let savedSubmission: { id: string };
  try {
    savedSubmission = await createContactSubmission({
      childAgeRange: submission.childAgeRange,
      email: submission.email,
      lessonType: submission.lessonType,
      message: submission.message,
      parentName: submission.parentName,
      phone: submission.phone,
      privacyNoticeAcknowledgedAt: new Date(),
      privacyNoticeVersion,
    });
  } catch {
    console.error("Contact submission creation failed");
    return unavailableResponse();
  }

  if (config.notification) {
    await sendContactNotification(config.notification, savedSubmission.id);
  }

  return jsonResponse({ message: "Zgłoszenie zostało przyjęte." }, 200);
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address = forwardedFor?.split(",", 1)[0]?.trim();
  return address && address.length <= 200 ? address : "unknown";
}
