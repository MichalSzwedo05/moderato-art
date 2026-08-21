import { getPrisma } from "./prisma";

export const galleryPendingExpiryMs = 15 * 60 * 1000;
export const galleryProcessingExpiryMs = 30 * 60 * 1000;
export const galleryDeletingExpiryMs = 60 * 60 * 1000;

const staleStatuses = ["PENDING", "PROCESSING", "DELETING"] as const;

export async function cleanupStaleGalleryPhotos(now = new Date()) {
  const prisma = getPrisma();
  let cleaned = 0;
  let failed = 0;
  let inspected = 0;

  let lastNonActiveId: string | undefined;
  while (true) {
    const stalePhotos = await prisma.galleryPhoto.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
      },
      take: 100,
      where: {
        expiresAt: { lte: now },
        ...(lastNonActiveId ? { id: { gt: lastNonActiveId } } : {}),
        status: { in: [...staleStatuses] },
      },
    });
    if (stalePhotos.length === 0) break;
    inspected += stalePhotos.length;

    for (const photo of stalePhotos) {
      try {
        const deleted = await prisma.galleryPhoto.deleteMany({ where: { expiresAt: { lte: now }, id: photo.id, status: photo.status } });
        if (deleted.count === 1) cleaned += 1;
      } catch (error) {
        failed += 1;
        console.error("Stale gallery photo cleanup failed", { error, id: photo.id, status: photo.status });
      }
    }
    lastNonActiveId = stalePhotos[stalePhotos.length - 1].id;
    if (stalePhotos.length < 100) break;
  }

  return { cleaned, failed, inspected };
}
