import { createHash, createHmac, randomBytes } from "node:crypto";

const minimumSecretLength = 32;
const magicTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type AdminAuthConfig = {
  adminEmail: string;
  authOrigin: string;
  authUrl: string;
  rateLimitSecret: string;
  resendFrom: string;
  resendKey: string;
};

type AdminAuthEnvironment = {
  ADMIN_AUTH_RESEND_FROM?: string;
  ADMIN_AUTH_RESEND_KEY?: string;
  ADMIN_AUTH_URL?: string;
  ADMIN_CMS_ENABLED?: string;
  ADMIN_EMAIL?: string;
  ADMIN_RATE_LIMIT_SECRET?: string;
  NODE_ENV?: string;
};

function hasUsableValue(value: string | undefined) {
  return Boolean(value && !value.startsWith("replace-with-"));
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isAdminCmsEnabled(environment: AdminAuthEnvironment = process.env) {
  return environment.ADMIN_CMS_ENABLED === "true";
}

export function getAdminAuthConfig(
  environment: AdminAuthEnvironment = process.env,
): AdminAuthConfig | undefined {
  if (!isAdminCmsEnabled(environment)) {
    return undefined;
  }

  const {
    ADMIN_AUTH_RESEND_FROM: resendFrom,
    ADMIN_AUTH_RESEND_KEY: resendKey,
    ADMIN_AUTH_URL: authUrl,
    ADMIN_EMAIL: adminEmail,
    ADMIN_RATE_LIMIT_SECRET: rateLimitSecret,
  } = environment;
  if (!authUrl
    || !adminEmail
    || !resendFrom
    || !resendKey
    || !rateLimitSecret
    || !hasUsableValue(authUrl)
    || !hasUsableValue(adminEmail)
    || !hasUsableValue(resendFrom)
    || !hasUsableValue(resendKey)
    || !hasUsableValue(rateLimitSecret)
    || !isValidEmail(adminEmail)
    || rateLimitSecret.length < minimumSecretLength) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(authUrl);
    const isLocalDevelopmentOrigin = environment.NODE_ENV === "development"
      && parsedUrl.protocol === "http:"
      && parsedUrl.hostname === "localhost"
      && parsedUrl.port === "3000";
    if ((!isLocalDevelopmentOrigin && parsedUrl.protocol !== "https:")
      || parsedUrl.username
      || parsedUrl.password
      || parsedUrl.pathname !== "/"
      || parsedUrl.search
      || parsedUrl.hash) {
      return undefined;
    }

    return {
      adminEmail,
      authOrigin: parsedUrl.origin,
      authUrl: parsedUrl.origin,
      rateLimitSecret,
      resendFrom,
      resendKey,
    };
  } catch {
    return undefined;
  }
}

export function createRandomToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRateLimitIdentifier(clientAddress: string, secret: string) {
  return createHmac("sha256", secret).update(clientAddress).digest("hex");
}

export function isMagicToken(token: string) {
  return magicTokenPattern.test(token);
}

export function isSameAdminOrigin(origin: string | null, config: AdminAuthConfig) {
  return origin === config.authOrigin;
}

export function getTrustedClientAddress(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return "localhost";
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor || forwardedFor.includes(",") || forwardedFor.length > 200) {
    return undefined;
  }

  const address = forwardedFor.trim();
  return address || undefined;
}
