import { getPrisma } from "./prisma";

const contactCleanupBatchSize = 100;

export type ContactCleanupResult = {
  contactSubmissions: number;
  loginRateLimits: number;
  magicLinks: number;
  messageDispatches: number;
  mmsContent: number;
  sessions: number;
};

export async function cleanupExpiredContactData(now = new Date()): Promise<ContactCleanupResult> {
  const prisma = getPrisma();
  let contactSubmissions = 0;

  while (true) {
    const expired = await prisma.contactSubmission.findMany({
      select: { id: true },
      take: contactCleanupBatchSize,
      where: { deleteAfter: { lte: now } },
    });
    if (expired.length === 0) break;

    const deleted = await prisma.contactSubmission.deleteMany({
      where: { id: { in: expired.map(({ id }) => id) } },
    });
    contactSubmissions += deleted.count;
    if (deleted.count === 0) break;
  }

  const [magicLinks, sessions, loginRateLimits, messageDispatches, mmsContent] = await Promise.all([
    prisma.adminMagicLink.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } }),
    prisma.adminLoginRateLimit.deleteMany({ where: { resetAt: { lte: now } } }),
    prisma.messageDispatch.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.mmsContent.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);

  return {
    contactSubmissions,
    loginRateLimits: loginRateLimits.count,
    magicLinks: magicLinks.count,
    messageDispatches: messageDispatches.count,
    mmsContent: mmsContent.count,
    sessions: sessions.count,
  };
}
