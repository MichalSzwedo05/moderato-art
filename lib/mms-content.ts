import { getPrisma } from "./prisma";

const mmsContentLifetimeMs = 60 * 60 * 1000;

export async function createMmsContent(message: string, now = new Date()) {
  const prisma = getPrisma();
  const content = await prisma.mmsContent.create({
    data: { expiresAt: new Date(now.getTime() + mmsContentLifetimeMs), message },
    select: { id: true },
  });

  return content.id;
}

export async function readMmsContent(id: string, now = new Date()) {
  const prisma = getPrisma();
  const content = await prisma.mmsContent.findUnique({
    select: { expiresAt: true, message: true },
    where: { id },
  });

  if (!content) return undefined;
  if (content.expiresAt.getTime() <= now.getTime()) {
    await prisma.mmsContent.deleteMany({ where: { id } });
    return undefined;
  }

  return content.message;
}
