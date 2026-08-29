import type { GoogleSheetsConfig } from "./google-sheets";

type ContactFormEnvironment = {
  CONTACT_FORM_ENABLED?: string;
  CONTACT_FORM_RECIPIENT?: string;
  CONTACT_FORM_RESEND_FROM?: string;
  CONTACT_RATE_LIMIT_SECRET?: string;
  CRON_SECRET?: string;
  DATABASE_URL?: string;
  RESEND_API_KEY?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID?: string;
  GOOGLE_SHEETS_RANGE?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
};

export type ContactFormConfig = {
  rateLimitSecret: string;
  notification?: {
    recipient: string;
    resendFrom: string;
    resendKey: string;
  };
  sheets?: GoogleSheetsConfig;
};

function hasUsableValue(value: string | undefined) {
  return Boolean(value && !value.includes("replace-with"));
}

function isResendKey(value: string | undefined) {
  return Boolean(value && hasUsableValue(value) && /^re_[A-Za-z0-9_-]{20,}$/.test(value.trim()));
}

function isDatabaseUrl(value: string | undefined) {
  if (!hasUsableValue(value)) return false;
  try {
    const parsed = new URL(value!);
    return (parsed.protocol === "postgresql:" || parsed.protocol === "postgres:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function isEmail(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    && !normalized.endsWith("@example.com")
    && !normalized.endsWith("@example.test");
}

function isSender(value: string | undefined) {
  if (!value || value.includes("onboarding@resend.dev")) return false;
  const match = value.match(/<([^>]+)>$/);
  return isEmail(match ? match[1] : value);
}

function getSheetsConfig(environment: ContactFormEnvironment) {
  const values = [
    environment.GOOGLE_SHEETS_SPREADSHEET_ID,
    environment.GOOGLE_SHEETS_RANGE,
    environment.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    environment.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  ];
  if (!values.some(Boolean)) return undefined;

  const spreadsheetId = environment.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const range = environment.GOOGLE_SHEETS_RANGE?.trim();
  const clientEmail = environment.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = environment.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replaceAll("\\n", "\n").trim();
  if (!spreadsheetId || !/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)
    || !range || range.length > 200 || /[\r\n]/.test(range)
    || !clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)
    || !privateKey?.startsWith("-----BEGIN PRIVATE KEY-----")
    || !privateKey.endsWith("-----END PRIVATE KEY-----")) return null;

  return { clientEmail, privateKey, range, spreadsheetId } satisfies GoogleSheetsConfig;
}

export function getContactFormConfig(environment: ContactFormEnvironment = process.env as ContactFormEnvironment): ContactFormConfig | undefined {
  const resendKey = environment.RESEND_API_KEY;
  const recipient = environment.CONTACT_FORM_RECIPIENT?.trim();
  const resendFrom = environment.CONTACT_FORM_RESEND_FROM?.trim();
  const rateLimitSecret = environment.CONTACT_RATE_LIMIT_SECRET?.trim();
  const cronSecret = environment.CRON_SECRET?.trim();
  const notificationConfigured = Boolean(resendKey || recipient || resendFrom);
  const notification = notificationConfigured
    ? (isResendKey(resendKey) && isEmail(recipient) && isSender(resendFrom)
      ? { recipient: recipient!, resendFrom: resendFrom!, resendKey: resendKey!.trim() }
      : undefined)
      : undefined;
  const sheets = getSheetsConfig(environment);

  if (environment.CONTACT_FORM_ENABLED !== "true"
    || !rateLimitSecret
    || !hasUsableValue(rateLimitSecret)
    || rateLimitSecret.length < 32
    || !isDatabaseUrl(environment.DATABASE_URL)
    || !hasUsableValue(cronSecret)
    || cronSecret!.length < 16) return undefined;

  if (notificationConfigured && !notification) return undefined;
  if (sheets === null) return undefined;

  return {
    notification,
    rateLimitSecret: rateLimitSecret!,
    ...(sheets ? { sheets } : {}),
  };
}

export function isContactFormConfigured(environment: ContactFormEnvironment = process.env as ContactFormEnvironment) {
  return Boolean(getContactFormConfig(environment));
}
