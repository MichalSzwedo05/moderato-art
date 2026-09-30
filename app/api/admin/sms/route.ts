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
import { isSmsMessageWithinLimit, normalizeSmsApiPhone, sendMmsMessageToRecipients, sendSmsMessage } from "@/lib/smsapi";
import { recordMessage } from "@/lib/message-history";
import {
  finishDispatchStatus,
  getOrCreateDispatch,
  markRecipientFailed,
  markRecipientInFlight,
  markRecipientSent,
  pendingRecipients,
} from "@/lib/message-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dispatchKeyPattern = /^[A-Za-z0-9_-]{16,64}$/;

const smsRequestSchema = z.object({
  dispatchKey: z.string().regex(dispatchKeyPattern).optional(),
  message: z.string().trim().min(1).max(contactSubmissionMmsMaxMessageLength),
  submissionIds: z.array(z.string().trim().min(1).max(100))
    .min(1)
    .max(contactSubmissionSmsMaxRecipients)
    .refine((ids) => new Set(ids).size === ids.length, "Duplikaty zgłoszeń."),
}).strict();

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

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

  const normalizedRecipients = submissions.map((submission) => normalizeSmsApiPhone(submission.phone ?? ""));
  const recipients = normalizedRecipients.filter((recipient): recipient is string => Boolean(recipient));
  if (recipients.length !== submissions.length) {
    return errorResponse("Jedno z wybranych zgłoszeń ma nieprawidłowy numer telefonu.", 422);
  }

  const message = parsedRequest.data.message;
  const isSms = isSmsMessageWithinLimit(message);

  if (isSms) {
    try {
      await sendSmsMessage(contactConfig.sms, recipients, message, { throwOnError: true });
    } catch (error) {
      console.error("Admin SMS sending failed", error instanceof Error ? error.message : String(error));
      return errorResponse("Nie udało się wysłać wiadomości SMS.", 502);
    }

    try {
      await recordMessage("SMS", message, recipients.length);
    } catch {
      console.error("Admin SMS history record failed");
    }

    return jsonResponse({ message: `SMS wysłano do ${recipients.length} odbiorców.` }, 200);
  }

  return sendMms(contactConfig.sms, recipients, message, parsedRequest.data.dispatchKey, new URL(request.url).origin);
}

async function sendMms(
  config: NonNullable<ReturnType<typeof getContactFormConfig>>["sms"],
  recipients: string[],
  message: string,
  dispatchKey: string | undefined,
  contentOrigin: string,
) {
  if (!dispatchKey) {
    return errorResponse("Brak klucza wysyłki MMS. Odśwież stronę i spróbuj ponownie.", 400);
  }

  let reuse: Awaited<ReturnType<typeof getOrCreateDispatch>>;
  try {
    reuse = await getOrCreateDispatch({ channel: "MMS", key: dispatchKey, message, recipients });
  } catch {
    console.error("Admin MMS dispatch could not be opened");
    return errorResponse("Nie udało się przygotować wysyłki MMS.", 503);
  }

  if (reuse.kind === "expired") {
    return errorResponse("Ta wysyłka MMS wygasła. Zmień treść lub odbiorców, aby rozpocząć nową.", 409);
  }
  if (reuse.kind === "conflict") {
    return errorResponse("Ten klucz wysyłki był już użyty dla innej treści lub innej listy odbiorców.", 409);
  }
  if (reuse.kind === "completed") {
    return jsonResponse({
      failed: 0,
      message: `MMS wysłano do ${reuse.dispatch.totalCount} odbiorców.`,
      sent: reuse.dispatch.totalCount,
      total: reuse.dispatch.totalCount,
    }, 200);
  }

  const { id, totalCount } = reuse.dispatch;
  const alreadySent = reuse.kind === "resumed" ? reuse.dispatch.sentCount : 0;
  const queue = pendingRecipients(reuse.dispatch).map((recipient) => recipient.phone);
  let sentCount = reuse.dispatch.sentCount;
  let failedCount = 0;
  const failedPhones = new Set<string>();
  const sentPhones = new Set<string>();

  try {
    await sendMmsMessageToRecipients(config, queue, message, contentOrigin, {
      onRecipientStart: (phone) => markRecipientInFlight(id, phone),
      onRecipient: async (outcome) => {
        if (outcome.sent) {
          sentPhones.add(outcome.phone);
          sentCount += 1;
          await markRecipientSent(id, outcome.phone, sentCount);
        } else {
          failedPhones.add(outcome.phone);
          failedCount = failedPhones.size;
          await markRecipientFailed(id, outcome.phone, sentCount, failedCount);
        }
      },
    });
  } catch (error) {
    console.error("Admin MMS sending failed", error instanceof Error ? error.message : String(error));
    return errorResponse("Nie udało się wysłać wiadomości MMS.", 502);
  }

  const newlySent = sentCount - alreadySent;

  if (newlySent > 0) {
    try {
      await recordMessage("MMS", message, newlySent);
    } catch {
      console.error("Admin MMS history record failed");
    }
  }

  const isComplete = failedCount === 0 && sentCount === totalCount;
  const finalRecipients = reuse.dispatch.recipients.map((recipient) => {
    if (sentPhones.has(recipient.phone)) return { ...recipient, state: "sent" as const };
    if (failedPhones.has(recipient.phone)) return { ...recipient, state: "failed" as const };
    return recipient;
  });

  try {
    await getPrisma().messageDispatch.update({
      data: { failedCount, recipients: finalRecipients, sentCount, status: finishDispatchStatus(failedCount) },
      where: { id },
    });
  } catch {
    console.error("Admin MMS dispatch status update failed");
  }

  if (isComplete) {
    return jsonResponse({
      failed: 0,
      message: `MMS wysłano do ${totalCount} odbiorców.`,
      sent: totalCount,
      total: totalCount,
    }, 200);
  }

  const remaining = totalCount - sentCount - failedCount;
  const summary = [
    `MMS wysłano do ${sentCount} z ${totalCount} odbiorców.`,
    failedCount > 0 ? `${failedCount} niepowodzeń.` : null,
    remaining > 0 ? `Pozostało do wysłania: ${remaining}.` : null,
    "Wyślij ponownie, aby dokończyć — wysłani odbiorcy nie dostaną kopii.",
  ].filter(Boolean).join(" ");

  return jsonResponse({
    failed: failedCount,
    message: summary,
    partial: true,
    sent: sentCount,
    total: totalCount,
  }, 200);
}
