import { createHash, createHmac, randomBytes } from "node:crypto";

const minimumSecretLength = 32;
const magicTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type AdminAuthConfig = {
  authOrigin: string;
  authUrl: string;
  mode: "magic_link" | "password";
  rateLimitSecret: string;
} & ({
  adminEmail: string;
  mode: "magic_link";
  resendFrom: string;
  resendKey: string;
} | {
  mode: "password";
  passwordHash: string;
  username: string;
});

type AdminAuthEnvironment = {
  ADMIN_AUTH_MODE?: string;
  ADMIN_AUTH_RESEND_FROM?: string;
  ADMIN_AUTH_RESEND_KEY?: string;
  ADMIN_AUTH_URL?: string;
  ADMIN_CMS_ENABLED?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_RATE_LIMIT_SECRET?: string;
  ADMIN_USERNAME?: string;
  NODE_ENV?: string;
};

function hasUsableValue(value: string | undefined) {
  return Boolean(value && !value.startsWith("replace-with-"));
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9._-]{1,100}$/.test(value);
}

function isCanonicalBase64(value: string, minimumLength: number) {
  if (!/^[A-Za-z0-9+/]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64");
  return decoded.length >= minimumLength && decoded.toString("base64").replace(/=+$/, "") === value;
}

function isValidPasswordHash(value: string) {
  const matched = /^\$argon2id\$v=19\$([^$]+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(value);
  if (!matched) return false;
  const parameters = new Map<string, string>();
  for (const parameter of matched[1].split(",")) {
    const [name, parameterValue, ...rest] = parameter.split("=");
    if (!name || !parameterValue || rest.length) return false;
    parameters.set(name, parameterValue);
  }
  if (parameters.size !== 3 || !["m", "p", "t"].every((name) => parameters.has(name))) return false;
  const memoryCost = Number(parameters.get("m"));
  const parallelism = Number(parameters.get("p"));
  const timeCost = Number(parameters.get("t"));
  return isCanonicalBase64(matched[2], 16) && isCanonicalBase64(matched[3], 32)
    && Number.isSafeInteger(memoryCost) && memoryCost >= 65_536 && memoryCost <= 262_144
    && Number.isSafeInteger(timeCost) && timeCost >= 3 && timeCost <= 10
    && Number.isSafeInteger(parallelism) && parallelism >= 1 && parallelism <= 4;
}

export function isAdminCmsEnabled(environment: AdminAuthEnvironment = process.env) {
  return environment.ADMIN_CMS_ENABLED === "true";
}

export function getAdminAuthConfig(
  environment: AdminAuthEnvironment = process.env,
): AdminAuthConfig | undefined {
  if (!isAdminCmsEnabled(environment)) return undefined;

  const {
    ADMIN_AUTH_MODE: mode = "magic_link",
    ADMIN_AUTH_RESEND_FROM: resendFrom,
    ADMIN_AUTH_RESEND_KEY: resendKey,
    ADMIN_AUTH_URL: authUrl,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD_HASH: passwordHash,
    ADMIN_RATE_LIMIT_SECRET: rateLimitSecret,
    ADMIN_USERNAME: username,
  } = environment;
  if (!authUrl || !rateLimitSecret || !hasUsableValue(authUrl)
    || !hasUsableValue(rateLimitSecret) || rateLimitSecret.length < minimumSecretLength) return undefined;

  const hasMagicLinkCredentials = hasUsableValue(adminEmail)
    || hasUsableValue(resendFrom)
    || hasUsableValue(resendKey);
  const hasPasswordCredentials = hasUsableValue(username) || hasUsableValue(passwordHash);
  if (mode !== "magic_link" && mode !== "password") return undefined;
  if (mode === "magic_link" && (!adminEmail || !resendFrom || !resendKey
    || !hasUsableValue(adminEmail) || !hasUsableValue(resendFrom) || !hasUsableValue(resendKey)
    || !isValidEmail(adminEmail) || hasPasswordCredentials)) return undefined;
  if (mode === "password" && (!username || !passwordHash
    || !hasUsableValue(username) || !hasUsableValue(passwordHash)
    || !isValidUsername(username) || !isValidPasswordHash(passwordHash)
    || passwordHash.length > 1024 || hasMagicLinkCredentials)) return undefined;

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
      || parsedUrl.hash) return undefined;

    const base = {
      authOrigin: parsedUrl.origin,
      authUrl: parsedUrl.origin,
      rateLimitSecret,
    };
    if (mode === "password") return { ...base, mode, passwordHash: passwordHash!, username: username! };
    return { ...base, adminEmail: adminEmail!, mode, resendFrom: resendFrom!, resendKey: resendKey! };
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

export function getAdminSessionVersion(config: AdminAuthConfig) {
  return hashToken(config.mode === "password" ? config.passwordHash : "magic-link-v1");
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
  if (process.env.NODE_ENV === "development") return "localhost";

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor || forwardedFor.includes(",") || forwardedFor.length > 200) return undefined;

  const address = forwardedFor.trim();
  return address || undefined;
}
