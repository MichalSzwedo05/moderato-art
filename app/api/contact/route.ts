import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { createRateLimitIdentifier } from "../../../lib/admin-security";
import { getContactFormConfig } from "../../../lib/contact-config";
import { isContactRateLimited } from "../../../lib/contact-rate-limit";
import { createContactSubmission } from "../../../lib/contact-submissions";
import { type ContactLessonType } from "../../../lib/offers";
import { privacyNoticeVersion } from "../../../lib/privacy-policy";
import { appendContactSubmissionToSheet } from "../../../lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxRequestBytes = 10_000;
const notificationTimeoutMs = 5_000;

function normalizePhone(value: string) {
  return value.replace(/[\s\-().]/g, "");
}

function isValidPhoneNumber(value: string) {
  const number = normalizePhone(value);
  if (number.startsWith("+")) {
    return /^(?:48)?[1-9]\d{6,13}$/.test(number.slice(1));
  }
  if (number.startsWith("00")) {
    return /^(?:48)?[1-9]\d{6,13}$/.test(number.slice(2));
  }
  return /^(?:0)?(?:48)?[2-9]\d{7,8}$/.test(number);
}

const phoneField = z.string().trim().min(1).max(40).refine(isValidPhoneNumber, {
  message: "Podaj polski numer telefonu albo numer międzynarodowy zaczynający się od + lub 00.",
});

const sharedContactFields = {
  addressStreet: z.string().trim().max(120).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  childName: z.string().trim().min(1).max(120),
  city: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254),
  imageConsent: z.enum(["Wyrażam zgodę", "Nie wyrażam zgody"]),
  phone: phoneField,
  postalCode: z.string().trim().max(20).optional(),
  privacyNoticeAcknowledged: z.literal(true),
  website: z.string().max(200).optional(),
};

const childLessonSubmissionSchema = z.object({
  ...sharedContactFields,
  lessonType: z.literal("junior-voice"),
  preschool: z.string().trim().min(1).max(200),
  group: z.string().trim().min(1).max(100),
  paymentAccepted: z.literal(true),
}).strict();

const participantLessonSubmissionSchema = z.object({
  ...sharedContactFields,
  lessonType: z.enum(["studio-wokalne", "rehabilitacja-zaburzen-glosu"]),
}).strict();

const contactSubmissionSchema = z.discriminatedUnion("lessonType", [
  childLessonSubmissionSchema,
  participantLessonSubmissionSchema,
]);

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

async function appendContactSheetRow(
  sheets: NonNullable<ReturnType<typeof getContactFormConfig>>["sheets"],
  submission: {
    addressStreet?: string;
    birthDate: string;
    childName?: string;
    city?: string;
    email: string;
    group?: string;
    imageConsent: string;
    lessonType: ContactLessonType;
    paymentAccepted?: boolean;
    postalCode?: string;
    preschool?: string;
    phone?: string;
  },
) {
  if (!sheets) return;

  try {
    await appendContactSubmissionToSheet(sheets, { ...submission, submittedAt: new Date() });
  } catch {
    console.error("Contact submission Google Sheets append failed");
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

  const isChildLesson = submission.lessonType === "junior-voice";
  const childFields = isChildLesson ? { group: submission.group, paymentAccepted: submission.paymentAccepted, preschool: submission.preschool } : {};
  const consolidatedAddress = [submission.addressStreet, submission.postalCode, submission.city]
    .filter((part) => part?.trim())
    .join(", ");

  let savedSubmission: { id: string };
  try {
    savedSubmission = await createContactSubmission({
      address: consolidatedAddress || undefined,
      birthDate: submission.birthDate,
      childName: submission.childName,
      email: submission.email,
      lessonType: submission.lessonType,
      message: "",
      parentName: submission.childName,
      imageConsent: submission.imageConsent,
      phone: submission.phone,
      privacyNoticeAcknowledgedAt: new Date(),
      privacyNoticeVersion,
      ...childFields,
    });
  } catch (error) {
    console.error("Contact submission creation failed", error instanceof Error ? error.message : String(error));
    return unavailableResponse();
  }

  await Promise.all([
    sendContactNotification(config.notification, savedSubmission.id),
    appendContactSheetRow(config.sheets, {
      addressStreet: submission.addressStreet,
      birthDate: submission.birthDate,
      childName: submission.childName,
      city: submission.city,
      email: submission.email,
      imageConsent: submission.imageConsent,
      lessonType: submission.lessonType,
      postalCode: submission.postalCode,
      phone: submission.phone,
      ...childFields,
    }),
  ]);

  return jsonResponse({ message: "Zgłoszenie zostało przyjęte." }, 200);
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address = forwardedFor?.split(",", 1)[0]?.trim();
  return address && address.length <= 200 ? address : "unknown";
}
