import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryDeletingExpiryMs, galleryPendingExpiryMs, galleryProcessingExpiryMs } from "@/lib/gallery-cleanup";
import { GalleryImageProcessingError, GalleryImageValidationError, processGalleryImage } from "@/lib/gallery-image";
import {
  GalleryStorageObjectValidationError,
  deleteGalleryObjects,
  getGalleryObject,
  getGalleryStorageConfig,
  makeGalleryPublicUrl,
  makeGalleryStorageKey,
  putGalleryObject,
} from "@/lib/gallery-storage";
import { maxGalleryUploadBytes } from "@/lib/gallery-validation";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

async function isAuthorized(request: Request) {
  const config = getAdminAuthConfig();
  return Boolean(config
    && isSameAdminOrigin(request.headers.get("origin"), config)
    && await getAdminSession());
}

type CompleteRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: CompleteRouteContext) {
  if (!(await isAuthorized(request))) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return json({ message: "Nie znaleziono zdjęcia." }, 404);
  }

  const storage = getGalleryStorageConfig();
  if (!storage) {
    return json({ message: "Przechowywanie zdjęć nie jest jeszcze skonfigurowane." }, 503);
  }

  const prisma = getPrisma();
  const pendingPhoto = await prisma.galleryPhoto.findFirst({ where: { id, status: "PENDING" } });
  if (!pendingPhoto || !pendingPhoto.uploadObjectKey || !pendingPhoto.mimeType) {
    return json({ message: "Zdjęcie nie oczekuje na przetworzenie." }, 409);
  }
  const claimed = await prisma.galleryPhoto.updateMany({ data: { expiresAt: new Date(Date.now() + galleryProcessingExpiryMs), status: "PROCESSING" }, where: { id, status: "PENDING" } });
  if (claimed.count !== 1) {
    return json({ message: "Zdjęcie jest już przetwarzane." }, 409);
  }

  let source: Buffer;
  try {
    source = await getGalleryObject(storage, pendingPhoto.uploadObjectKey, maxGalleryUploadBytes, pendingPhoto.sizeBytes ?? undefined);
  } catch (error) {
    if (!(error instanceof GalleryStorageObjectValidationError)) {
      await prisma.galleryPhoto.updateMany({ data: { expiresAt: new Date(Date.now() + galleryPendingExpiryMs), status: "PENDING" }, where: { id, status: "PROCESSING" } }).catch((resetError) => {
        console.error("Gallery photo processing state reset failed", { error: resetError, id });
      });
      console.error("Gallery source object could not be read", { error, id });
      return json({ message: "Magazyn zdjęć jest chwilowo niedostępny. Spróbuj ponownie." }, 503);
    }

    try {
      await deleteGalleryObjects(storage, [pendingPhoto.uploadObjectKey]);
      await prisma.galleryPhoto.deleteMany({ where: { id, status: "PROCESSING" } });
    } catch (cleanupError) {
      console.error("Invalid gallery upload cleanup failed", { error: cleanupError, id });
    }
    return json({ message: "Zdjęcie ma nieprawidłowy format lub przekracza dopuszczalne wymiary." }, 400);
  }

  let processed;
  try {
    processed = await processGalleryImage(source, pendingPhoto.mimeType);
  } catch (error) {
    if (error instanceof GalleryImageProcessingError || !(error instanceof GalleryImageValidationError)) {
      await prisma.galleryPhoto.updateMany({ data: { expiresAt: new Date(Date.now() + galleryPendingExpiryMs), status: "PENDING" }, where: { id, status: "PROCESSING" } }).catch((resetError) => {
        console.error("Gallery photo processing state reset failed", { error: resetError, id });
      });
      console.error("Gallery source image could not be processed", { error, id });
      return json({ message: "Przetwarzanie zdjęcia jest chwilowo niedostępne. Spróbuj ponownie." }, 503);
    }

    try {
      await deleteGalleryObjects(storage, [pendingPhoto.uploadObjectKey]);
      await prisma.galleryPhoto.deleteMany({ where: { id, status: "PROCESSING" } });
    } catch (cleanupError) {
      console.error("Invalid gallery upload cleanup failed", { error: cleanupError, id });
    }
    return json({ message: "Zdjęcie ma nieprawidłowy format lub przekracza dopuszczalne wymiary." }, 400);
  }

  const objectKey = makeGalleryStorageKey(storage, id, "full.webp");
  const thumbnailObjectKey = makeGalleryStorageKey(storage, id, "thumbnail.webp");
  const imageUrl = makeGalleryPublicUrl(storage, objectKey);
  const thumbnailUrl = makeGalleryPublicUrl(storage, thumbnailObjectKey);

  try {
    const prepared = await prisma.galleryPhoto.updateMany({
      data: { expiresAt: new Date(Date.now() + galleryProcessingExpiryMs), imageUrl, objectKey, thumbnailObjectKey, thumbnailUrl },
      where: { id, status: "PROCESSING" },
    });
    if (prepared.count !== 1) return json({ message: "Zdjęcie jest już przetwarzane." }, 409);
    await putGalleryObject(storage, objectKey, processed.full);
    await putGalleryObject(storage, thumbnailObjectKey, processed.thumbnail);

    const firstActivePhoto = await prisma.galleryPhoto.findFirst({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { sortOrder: true },
      where: { status: "ACTIVE" },
    });
    const updated = await prisma.galleryPhoto.updateMany({
      data: {
        height: processed.height,
        imageUrl,
        mimeType: processed.mimeType,
        objectKey,
        expiresAt: new Date(Date.now() + galleryDeletingExpiryMs),
        sizeBytes: processed.full.byteLength,
        sortOrder: (firstActivePhoto?.sortOrder ?? 0) - 1,
        status: "ACTIVE",
        thumbnailObjectKey,
        thumbnailUrl,
        width: processed.width,
      },
      where: { id, status: "PROCESSING" },
    });
    if (updated.count !== 1) throw new Error("Gallery photo was changed while processing.");

    // Keep the private upload object tracked until the cleanup job removes it.
    // The presigned If-None-Match URL cannot overwrite this existing object.
  } catch {
    try {
      await prisma.galleryPhoto.updateMany({
        data: { expiresAt: new Date(Date.now() + galleryDeletingExpiryMs), status: "DELETING" },
        where: { id, status: "PROCESSING" },
      });
      await deleteGalleryObjects(storage, [pendingPhoto.uploadObjectKey, objectKey, thumbnailObjectKey]);
      await prisma.galleryPhoto.deleteMany({ where: { id, status: "DELETING" } });
    } catch (cleanupError) {
      console.error("Processed gallery object cleanup failed", { error: cleanupError, id });
    }
    return json({ message: "Magazyn zdjęć jest chwilowo niedostępny. Spróbuj ponownie." }, 503);
  }

  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  return json({ photo: { alt: pendingPhoto.altText, height: processed.height, id, imageUrl, thumbnailUrl, width: processed.width } }, 200);
}
