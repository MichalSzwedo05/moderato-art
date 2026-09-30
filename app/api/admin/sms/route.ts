import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getContactFormConfig } from "@/lib/contact-config";
import { getPrisma } from "@/lib/prisma";
import {
  contactSubmissionMmsMaxMessageLength,
  contactSubmissionSmsMaxRecipients,
} from "@/lib/contact-submissions";
import { isSmsMessageWithinLimit, normalizeSmsApiPhone, sendMmsMessage, sendSmsMessage } from "@/lib/smsapi";
import { recordMessage } from "@/lib/message-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const smsRequestSchema = z.object({
  message: z.string().trim().min(1).max(contactSubmissionMmsMaxMessageLength),
  submissionIds: z.array(z.string().trim().min(1).max(100))
    .min(1)
    .max(contactSubmissionSmsMaxRecipients)
    .refine((ids) => new Set(ids).size === ids.length, "Duplikaty zgłoszeń."),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config) || !(await getAdminSession())) {
    return errorResponse("Brak dostępu.", 403);
  }

  const contactConfig = getContactFormConfig();
  if (!contactConfig?.sms) {
    return errorResponse("Wysyłka SMS jest chwilowo niedostępna.", 503);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return errorResponse("Nieprawidłowy format żądania.", 400);
  }

  const parsedRequest = smsRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return errorResponse("Wybierz odbiorców i wpisz wiadomość.", 400);
  }

  let submissions: Array<{ id: string; phone: string | null }>;
  try {
    submissions = await getPrisma().contactSubmission.findMany({
      select: { id: true, phone: true },
      where: { id: { in: parsedRequest.data.submissionIds } },
    });
  } catch {
    console.error("SMS contact recipients lookup failed");
    return errorResponse("Nie udało się wczytać odbiorców SMS.", 503);
  }
  if (submissions.length !== parsedRequest.data.submissionIds.length) {
    return errorResponse("Nie znaleziono wybranego zgłoszenia.", 404);
  }

  const recipients = submissions.map((submission) => normalizeSmsApiPhone(submission.phone ?? ""));
  if (recipients.some((recipient) => !recipient)) {
    return errorResponse("Jedno z wybranych zgłoszeń ma nieprawidłowy numer telefonu.", 422);
  }

  try {
    const message = parsedRequest.data.message;
    const isSms = isSmsMessageWithinLimit(message);
    if (isSms) {
      await sendSmsMessage(contactConfig.sms, recipients as string[], message, { throwOnError: true });
    } else {
      await sendMmsMessage(contactConfig.sms, recipients as string[], message, new URL(request.url).origin, { throwOnError: true });
    }

    try {
      await recordMessage(isSms ? "SMS" : "MMS", message, recipients.length);
    } catch {
      console.error("Admin SMS history record failed");
    }

    return NextResponse.json({ message: `${isSms ? "SMS" : "MMS"} wysłano do ${recipients.length} odbiorców.` }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      status: 200,
    });
  } catch (error) {
    console.error("Admin SMS/MMS sending failed", error instanceof Error ? error.message : String(error));
    return errorResponse("Nie udało się wysłać wiadomości SMS.", 502);
  }
}
