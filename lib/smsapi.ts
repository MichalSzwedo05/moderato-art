import type { ContactLessonType } from "./offers";
import { lessonTypeTabs } from "./offers";
import { createMmsContentToken } from "./mms-content";

const smsApiEndpoint = "https://api.smsapi.pl/sms.do";
const smsApiTimeoutMs = 5_000;
const mmsApiEndpoint = "https://api.smsapi.pl/mms.do";
const smsMaxParts = 2;
const gsm7BasicCharacters = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆÉ!\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const gsm7ExtendedCharacters = "^{}\\[~]|€";

export type SmsApiConfig = {
  recipient: string;
  sender: string;
  token: string;
};

export function isSmsMessageWithinLimit(message: string) {
  let gsm7 = true;
  let septets = 0;
  for (const character of message) {
    if (gsm7BasicCharacters.includes(character)) septets += 1;
    else if (gsm7ExtendedCharacters.includes(character)) septets += 2;
    else { gsm7 = false; break; }
  }
  return gsm7 ? septets <= (septets <= 160 ? 160 : 153 * smsMaxParts) : [...message].length <= 70 + 67 * (smsMaxParts - 1);
}

function escapeXml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }

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
    from: config.sender,
    format: "json",
    max_parts: String(smsMaxParts),
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

export async function sendMmsMessage(config: SmsApiConfig | undefined, recipients: string[], message: string, contentOrigin: string, options: SmsNotificationOptions = {}) {
  if (!config) return false;
  const contentToken = createMmsContentToken(message, config.token);
  const contentUrl = `${contentOrigin}/api/mms-content/${contentToken}`;
  const imageUrl = "https://www.moderato-art.pl/moderato-logo.jpg";
  const smil = `<smil><head><layout><root-layout backgroundColor="#FFFFFF" height="100%" width="100%"/><region id="Image" top="0" left="0" height="50%" width="100%" fit="meet"/><region id="Text" top="50%" left="0" height="50%" width="100%" fit="scroll"/></layout></head><body><par dur="5000ms"><img src="${escapeXml(imageUrl)}" region="Image"/></par><par dur="5000ms"><text src="${escapeXml(contentUrl)}" region="Text"/></par></body></smil>`;
  try {
    for (const recipient of recipients) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), smsApiTimeoutMs);
      try {
        const response = await fetch(mmsApiEndpoint, { body: new URLSearchParams({ format: "json", smil, subject: config.sender, to: recipient }), headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/x-www-form-urlencoded" }, method: "POST", signal: controller.signal });
        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`SMSAPI MMS request failed with status ${response.status}: ${responseText.slice(0, 500)}`);
        }
        const result = await response.json() as { error?: number; message?: string };
        if (result.error) throw new Error(`SMSAPI MMS rejected the message: ${result.message ?? result.error}`);
      } finally { clearTimeout(timeout); }
    }
    return true;
  } catch (error) {
    console.error("SMSAPI MMS sending failed", error instanceof Error ? error.message : String(error));
    if (options.throwOnError) throw error instanceof Error ? error : new Error("SMSAPI MMS request failed");
    return false;
  }
}

export async function sendSmsNotification(
  config: SmsApiConfig | undefined,
  childName: string,
  lessonType: ContactLessonType,
  options: SmsNotificationOptions = {},
) {
  if (!config) return false;

  return sendSmsMessage(
    config,
    [config.recipient],
    `Nowe zgloszenie: ${childName} (${lessonTypeTabs[lessonType]})`,
    options,
  );
}
