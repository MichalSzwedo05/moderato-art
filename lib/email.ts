import { Resend } from "resend";

const resendBatchSize = 100;
const resendTimeoutMs = 10_000;

export type EmailConfig = {
  resendFrom: string;
  resendKey: string;
};

type EmailMessageOptions = {
  throwOnError?: boolean;
};

export async function sendEmailMessage(
  config: EmailConfig | undefined,
  recipients: string[],
  subject: string,
  message: string,
  options: EmailMessageOptions = {},
) {
  if (!config) return false;

  const resend = new Resend(config.resendKey);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const emails = recipients.map((recipient) => ({
      from: config.resendFrom,
      subject,
      text: message,
      to: [recipient],
    }));

    for (let offset = 0; offset < emails.length; offset += resendBatchSize) {
      const result = await Promise.race([
        resend.batch.send(emails.slice(offset, offset + resendBatchSize)),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Admin email sending timed out")), resendTimeoutMs);
        }),
      ]);
      if (result.error) throw new Error(result.error.message);
      if (timeout) clearTimeout(timeout);
    }

    return true;
  } catch (error) {
    console.error("Admin email sending failed", error instanceof Error ? error.message : String(error));
    if (options.throwOnError) {
      throw error instanceof Error ? error : new Error("Email sending failed");
    }
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
