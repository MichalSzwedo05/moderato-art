import { Resend } from "resend";
import { cookies } from "next/headers";
import { getPrisma } from "./prisma";
import {
  createRandomToken,
  createRateLimitIdentifier,
  getTrustedClientAddress,
  getAdminAuthConfig,
  getAdminSessionVersion,
  hashToken,
  isAdminCmsEnabled,
  isMagicToken,
  type AdminAuthConfig,
} from "./admin-security";

const magicLinkLifetimeMs = 15 * 60 * 1000;
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const rateLimitLifetimeMs = 15 * 60 * 1000;
const maxLoginRequestsPerWindow = 5;
const maxPasswordLoginRequestsPerWindow = 20;

export const adminSessionCookieName = "__Host-moderato-admin-session";

export { getAdminAuthConfig, isAdminCmsEnabled };
export { getTrustedClientAddress };

function logResendFailure(error: unknown) {
  const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error("Admin magic-link delivery failed", {
    name: typeof details.name === "string" ? details.name : "unknown",
    statusCode: typeof details.statusCode === "number" ? details.statusCode : undefined,
  });
}

async function takeRateLimit(identifierHash: string, maximumAttempts: number) {
  const prisma = getPrisma();
  const now = new Date();

  await prisma.adminLoginRateLimit.deleteMany({
    where: { resetAt: { lte: now } },
  });

  const incremented = await prisma.adminLoginRateLimit.updateMany({
    data: { attempts: { increment: 1 } },
    where: {
      attempts: { lt: maximumAttempts },
      identifierHash,
      resetAt: { gt: now },
    },
  });
  if (incremented.count === 1) {
    return true;
  }

  try {
    await prisma.adminLoginRateLimit.create({
      data: {
        attempts: 1,
        identifierHash,
        resetAt: new Date(now.getTime() + rateLimitLifetimeMs),
      },
    });
    return true;
  } catch {
    // A concurrent first request may have created the bucket. Retry the bounded update once.
    const retried = await prisma.adminLoginRateLimit.updateMany({
      data: { attempts: { increment: 1 } },
      where: {
        attempts: { lt: maximumAttempts },
        identifierHash,
        resetAt: { gt: now },
      },
    });
    return retried.count === 1;
  }
}

export async function takeLoginRateLimit(clientAddress: string, config: AdminAuthConfig) {
  return takeRateLimit(createRateLimitIdentifier(clientAddress, config.rateLimitSecret), maxLoginRequestsPerWindow);
}

export async function takePasswordLoginRateLimit(clientAddress: string, config: AdminAuthConfig) {
  if (!(await takeLoginRateLimit(clientAddress, config))) return false;
  return takeRateLimit(createRateLimitIdentifier("admin-password-account", config.rateLimitSecret), maxPasswordLoginRequestsPerWindow);
}

export async function createAndSendMagicLink(
  email: string,
  clientAddress: string,
  config: AdminAuthConfig & { mode: "magic_link" },
) {
  const token = createRandomToken();
  const prisma = getPrisma();
  const now = new Date();

  await prisma.adminMagicLink.create({
    data: {
      expiresAt: new Date(now.getTime() + magicLinkLifetimeMs),
      requesterHash: createRateLimitIdentifier(clientAddress, config.rateLimitSecret),
      tokenHash: hashToken(token),
    },
  });

  const link = new URL("/admin/confirm", config.authUrl);
  link.searchParams.set("token", token);

  try {
    const resend = new Resend(config.resendKey);
    const { error } = await resend.emails.send({
      from: config.resendFrom,
      html: `<p>Otwórz poniższy link, aby potwierdzić logowanie do panelu administracyjnego.</p><p><a href="${link.href}">Potwierdź logowanie</a></p><p>Link jest ważny 15 minut.</p>`,
      subject: "Potwierdź logowanie do panelu Moderato Art",
      text: `Otwórz ten link, aby potwierdzić logowanie do panelu administracyjnego: ${link.href}\n\nLink jest ważny 15 minut.`,
      to: [email],
    });

    if (error) {
      logResendFailure(error);
      await prisma.adminMagicLink.deleteMany({ where: { tokenHash: hashToken(token) } });
      return false;
    }
  } catch (error) {
    logResendFailure(error);
    await prisma.adminMagicLink.deleteMany({ where: { tokenHash: hashToken(token) } });
    return false;
  }

  return true;
}

export async function consumeMagicLink(token: string, config: AdminAuthConfig) {
  if (!isMagicToken(token)) {
    return undefined;
  }

  const sessionToken = createRandomToken();
  const now = new Date();
  const prisma = getPrisma();
  const consumed = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.adminMagicLink.updateMany({
      data: { usedAt: now },
      where: {
        expiresAt: { gt: now },
        tokenHash: hashToken(token),
        usedAt: null,
      },
    });
    if (updated.count !== 1) {
      return false;
    }

    await transaction.adminSession.create({
      data: {
        authMode: config.mode,
        credentialVersion: getAdminSessionVersion(config),
        expiresAt: new Date(now.getTime() + sessionLifetimeMs),
        sessionHash: hashToken(sessionToken),
      },
    });
    return true;
  });

  return consumed ? sessionToken : undefined;
}

export async function createAdminSession(config: AdminAuthConfig) {
  const sessionToken = createRandomToken();
  await getPrisma().adminSession.create({
    data: {
      authMode: config.mode,
      credentialVersion: getAdminSessionVersion(config),
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
      sessionHash: hashToken(sessionToken),
    },
  });
  return sessionToken;
}

export async function getAdminSession() {
  const config = getAdminAuthConfig();
  if (!config) return undefined;

  const sessionToken = (await cookies()).get(adminSessionCookieName)?.value;
  if (!sessionToken || !isMagicToken(sessionToken)) {
    return undefined;
  }

  try {
    return await getPrisma().adminSession.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        authMode: config.mode,
        credentialVersion: getAdminSessionVersion(config),
        revokedAt: null,
        sessionHash: hashToken(sessionToken),
      },
    });
  } catch {
    return undefined;
  }
}

export async function revokeSession(sessionToken: string | undefined) {
  if (!sessionToken || !isMagicToken(sessionToken)) {
    return;
  }

  await getPrisma().adminSession.updateMany({
    data: { revokedAt: new Date() },
    where: { revokedAt: null, sessionHash: hashToken(sessionToken) },
  });
}

export const adminSessionCookie = (sessionToken: string) => ({
  expires: new Date(Date.now() + sessionLifetimeMs),
  httpOnly: true,
  maxAge: sessionLifetimeMs / 1000,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  value: sessionToken,
});
