import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getContactFormConfig } from "@/lib/contact-config";
import { getPrisma } from "@/lib/prisma";
import {
  contactSubmissionEmailMaxMessageLength,
  contactSubmissionEmailMaxRecipients,
  contactSubmissionEmailMaxSubjectLength,
} from "@/lib/contact-submissions";
import { sendEmailMessage } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRequestSchema = z.object({
  message: z.string().trim().min(1).max(contactSubmissionEmailMaxMessageLength),
  subject: z.string().trim().min(1).max(contactSubmissionEmailMaxSubjectLength),
  submissionIds: z.array(z.string().trim().min(1).max(100))
    .min(1)
    .max(contactSubmissionEmailMaxRecipients)
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
  if (!contactConfig?.notification) {
    return errorResponse("Wysyłka e-maili jest chwilowo niedostępna.", 503);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return errorResponse("Nieprawidłowy format żądania.", 400);
  }

  const parsedRequest = emailRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return errorResponse("Wybierz odbiorców, wpisz temat i treść wiadomości.", 400);
  }

  let submissions: Array<{ email: string; id: string }>;
  try {
    submissions = await getPrisma().contactSubmission.findMany({
      select: { email: true, id: true },
      where: { id: { in: parsedRequest.data.submissionIds } },
    });
  } catch {
    console.error("Email contact recipients lookup failed");
    return errorResponse("Nie udało się wczytać odbiorców e-mail.", 503);
  }
  if (submissions.length !== parsedRequest.data.submissionIds.length) {
    return errorResponse("Nie znaleziono wybranego zgłoszenia.", 404);
  }

  const recipients = submissions.map((submission) => submission.email.trim());
  if (recipients.some((recipient) => !/^\S+@\S+\.\S+$/.test(recipient))) {
    return errorResponse("Jedno z wybranych zgłoszeń ma nieprawidłowy adres e-mail.", 422);
  }

  try {
    await sendEmailMessage(
      contactConfig.notification,
      recipients,
      parsedRequest.data.subject,
      parsedRequest.data.message,
      { throwOnError: true },
    );
    return NextResponse.json({ message: `Wiadomość wysłano do ${recipients.length} odbiorców.` }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      status: 200,
    });
  } catch {
    return errorResponse("Nie udało się wysłać wiadomości e-mail.", 502);
  }
}
