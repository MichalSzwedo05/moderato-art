import { deleteGalleryObjects, getGalleryStorageConfig } from "./gallery-storage";
import { getPrisma } from "./prisma";

export const galleryPendingExpiryMs = 15 * 60 * 1000;
export const galleryProcessingExpiryMs = 30 * 60 * 1000;
export const galleryDeletingExpiryMs = 60 * 60 * 1000;

const staleStatuses = ["PENDING", "PROCESSING", "DELETING"] as const;

export async function cleanupStaleGalleryPhotos(now = new Date()) {
  const prisma = getPrisma();
  const storage = getGalleryStorageConfig();
  let cleaned = 0;
  let failed = 0;
  let inspected = 0;

  let lastNonActiveId: string | undefined;
  while (true) {
    const stalePhotos = await prisma.galleryPhoto.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        objectKey: true,
        status: true,
        thumbnailObjectKey: true,
        uploadObjectKey: true,
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
      const objectKeys = [photo.uploadObjectKey, photo.objectKey, photo.thumbnailObjectKey];
      if (objectKeys.some(Boolean) && !storage) {
        failed += 1;
        continue;
      }

      try {
        if (storage) await deleteGalleryObjects(storage, objectKeys);
        const deleted = await prisma.galleryPhoto.deleteMany({ where: { id: photo.id, status: photo.status } });
        if (deleted.count === 1) cleaned += 1;
      } catch (error) {
        failed += 1;
        console.error("Stale gallery photo cleanup failed", { error, id: photo.id, status: photo.status });
      }
    }
    lastNonActiveId = stalePhotos[stalePhotos.length - 1].id;
    if (stalePhotos.length < 100) break;
  }

  let lastTemporaryId: string | undefined;
  while (true) {
    const temporaryUploads = await prisma.galleryPhoto.findMany({
      orderBy: { id: "asc" },
      select: { id: true, uploadObjectKey: true },
      take: 100,
      where: {
        expiresAt: { lte: now },
        ...(lastTemporaryId ? { id: { gt: lastTemporaryId } } : {}),
        status: "ACTIVE",
        uploadObjectKey: { not: null },
      },
    });
    if (temporaryUploads.length === 0) break;
    inspected += temporaryUploads.length;

    for (const photo of temporaryUploads) {
      if (!storage || !photo.uploadObjectKey) {
        failed += 1;
        continue;
      }
      try {
        await deleteGalleryObjects(storage, [photo.uploadObjectKey]);
        const updated = await prisma.galleryPhoto.updateMany({
          data: { expiresAt: null, uploadObjectKey: null },
          where: { id: photo.id, status: "ACTIVE", uploadObjectKey: photo.uploadObjectKey },
        });
        if (updated.count === 1) cleaned += 1;
      } catch (error) {
        failed += 1;
        console.error("Temporary gallery object cleanup failed", { error, id: photo.id });
      }
    }
    lastTemporaryId = temporaryUploads[temporaryUploads.length - 1].id;
    if (temporaryUploads.length < 100) break;
  }

  return { cleaned, failed, inspected };
}
