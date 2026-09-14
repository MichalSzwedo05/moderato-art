import type { ContactLessonType } from "./offers";
import { lessonTypeTabs } from "./offers";

const smsApiEndpoint = "https://api.smsapi.pl/sms.do";
const smsApiSender = "Test";
const smsApiRecipients = ["792888578"];
const smsApiTimeoutMs = 5_000;

export type SmsApiConfig = {
  token: string;
};

type SmsNotificationOptions = {
  throwOnError?: boolean;
};

export function normalizeSmsApiPhone(value: string) {
  const digits = value.replace(/[\s\-().]/g, "");
  const normalized = digits.startsWith("+")
    ? digits.slice(1)
    : digits.startsWith("00")
      ? digits.slice(2)
      : digits.startsWith("0") && digits.length === 10
        ? `48${digits.slice(1)}`
        : digits.length === 9
          ? `48${digits}`
          : digits;

  return /^\d{8,15}$/.test(normalized) ? normalized : undefined;
}

export async function sendSmsMessage(
  config: SmsApiConfig | undefined,
  recipients: string[],
  message: string,
  options: SmsNotificationOptions = {},
) {
  if (!config) return false;

  const body = new URLSearchParams({
    encoding: "utf-8",
    from: smsApiSender,
    format: "json",
    message,
    to: recipients.join(","),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), smsApiTimeoutMs);

  try {
    const response = await fetch(smsApiEndpoint, {
      body,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`SMSAPI request failed with status ${response.status}: ${responseText.slice(0, 200)}`);
    }

    const result = await response.json() as { error?: number; message?: string };
    if (result.error) {
      throw new Error(`SMSAPI rejected the message: ${result.message ?? result.error}`);
    }

    return true;
  } catch (error) {
    console.error(
      "Contact submission SMS notification failed",
      error instanceof Error ? error.message : String(error),
    );
    if (options.throwOnError) {
      throw error instanceof Error ? error : new Error("SMSAPI request failed");
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSmsNotification(
  config: SmsApiConfig | undefined,
  childName: string,
  lessonType: ContactLessonType,
  options: SmsNotificationOptions = {},
) {
  return sendSmsMessage(
    config,
    smsApiRecipients,
    `Nowe zgloszenie: ${childName} (${lessonTypeTabs[lessonType]})`,
    options,
  );
}
