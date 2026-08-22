import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryPendingExpiryMs, galleryProcessingExpiryMs } from "@/lib/gallery-cleanup";
import { GalleryImageValidationError, processGalleryImage } from "@/lib/gallery-image";
import { getGalleryUploadChunkCount, maxGalleryPhotos } from "@/lib/gallery-validation";
import { toDatabaseBytes } from "@/lib/gallery-upload";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const galleryActivationTransactionRetries = 3;

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

function isTransactionConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2034";
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034");
}

async function isAuthorized(request: Request) {
  const config = getAdminAuthConfig();
  return Boolean(config
    && isSameAdminOrigin(request.headers.get("origin"), config)
    && await getAdminSession());
}

async function resetPending(prisma: ReturnType<typeof getPrisma>, id: string) {
  await prisma.galleryPhoto.updateMany({
    data: { expiresAt: new Date(Date.now() + galleryPendingExpiryMs), status: "PENDING" },
    where: { id, status: "PROCESSING" },
  }).catch((error) => {
    console.error("Gallery photo processing state reset failed", { error, id });
  });
}

class GalleryPhotoLimitError extends Error {
  constructor() {
    super("The gallery photo limit has been reached.");
    this.name = "GalleryPhotoLimitError";
  }
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

  const prisma = getPrisma();
  const existingPhoto = await prisma.galleryPhoto.findUnique({
    select: {
      altText: true,
      height: true,
      id: true,
      imageUrl: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      thumbnailUrl: true,
      width: true,
    },
    where: { id },
  });
  if (!existingPhoto) return json({ message: "Nie znaleziono zdjęcia." }, 404);

  if (existingPhoto.status === "ACTIVE" && existingPhoto.imageUrl && existingPhoto.thumbnailUrl) {
    return json({ photo: {
      alt: existingPhoto.altText,
      height: existingPhoto.height ?? 0,
      id: existingPhoto.id,
      imageUrl: existingPhoto.imageUrl,
      thumbnailUrl: existingPhoto.thumbnailUrl,
      width: existingPhoto.width ?? 0,
    } }, 200);
  }
  if (existingPhoto.status !== "PENDING" || !existingPhoto.mimeType || !existingPhoto.sizeBytes) {
    return json({ code: "PROCESSING", message: "Zdjęcie nie oczekuje na przetworzenie." }, 409);
  }
  const totalSize = existingPhoto.sizeBytes;

  const claimed = await prisma.galleryPhoto.updateMany({
    data: { expiresAt: new Date(Date.now() + galleryProcessingExpiryMs), status: "PROCESSING" },
    where: { id, status: "PENDING" },
  });
  if (claimed.count !== 1) {
    return json({ code: "PROCESSING", message: "Zdjęcie jest już przetwarzane." }, 409);
  }

  const expectedChunkCount = getGalleryUploadChunkCount(totalSize);
  let chunks;
  try {
    chunks = await prisma.galleryPhotoUploadChunk.findMany({
      orderBy: { chunkIndex: "asc" },
      select: { chunkIndex: true, data: true, sizeBytes: true },
      where: { photoId: id },
    });
  } catch (error) {
    await resetPending(prisma, id);
    console.error("Gallery upload chunks could not be read", { error, id });
    return json({ message: "Nie udało się odczytać zdjęcia. Spróbuj ponownie." }, 503);
  }

  const chunksAreValid = chunks.length === expectedChunkCount
    && chunks.every((chunk, index) => {
      const expectedSize = index === expectedChunkCount - 1
        ? totalSize - index * 1_048_576
        : 1_048_576;
      return chunk.chunkIndex === index && chunk.sizeBytes === expectedSize && chunk.data.byteLength === expectedSize;
    });
  if (!chunksAreValid) {
    await resetPending(prisma, id);
    return json({ code: "MISSING_CHUNKS", message: "Nie przesłano wszystkich fragmentów zdjęcia." }, 409);
  }

  const source = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.data)), totalSize);
  let processed;
  try {
    processed = await processGalleryImage(source, existingPhoto.mimeType);
  } catch (error) {
    if (error instanceof GalleryImageValidationError) {
      await prisma.galleryPhoto.deleteMany({ where: { id, status: "PROCESSING" } });
      return json({ message: "Zdjęcie ma nieprawidłowy format lub przekracza dopuszczalne wymiary." }, 400);
    }
    await resetPending(prisma, id);
    console.error("Gallery source image could not be processed", { error, id });
    return json({ message: "Przetwarzanie zdjęcia jest chwilowo niedostępne. Spróbuj ponownie." }, 503);
  }

  const imageUrl = `/gallery/${id}`;
  const thumbnailUrl = `/gallery/${id}?variant=thumbnail`;
  try {
    for (let attempt = 0; attempt < galleryActivationTransactionRetries; attempt += 1) {
      try {
        await prisma.$transaction(async (transaction) => {
          const activeCount = await transaction.galleryPhoto.count({ where: { status: "ACTIVE" } });
          if (activeCount >= maxGalleryPhotos) throw new GalleryPhotoLimitError();

          const firstActivePhoto = await transaction.galleryPhoto.findFirst({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { sortOrder: true },
            where: { status: "ACTIVE" },
          });
          const updated = await transaction.galleryPhoto.updateMany({
            data: {
              height: processed.height,
              imageUrl,
              mimeType: processed.mimeType,
              expiresAt: null,
              sizeBytes: processed.full.byteLength,
              sortOrder: (firstActivePhoto?.sortOrder ?? 0) - 1,
              status: "ACTIVE",
              thumbnailUrl,
              width: processed.width,
            },
            where: { id, status: "PROCESSING" },
          });
          if (updated.count !== 1) throw new Error("Gallery photo changed while processing.");

          await transaction.galleryPhotoAsset.upsert({
            create: { data: toDatabaseBytes(processed.full), photoId: id, sizeBytes: processed.full.byteLength, variant: "FULL" },
            update: { data: toDatabaseBytes(processed.full), sizeBytes: processed.full.byteLength },
            where: { photoId_variant: { photoId: id, variant: "FULL" } },
          });
          await transaction.galleryPhotoAsset.upsert({
            create: { data: toDatabaseBytes(processed.thumbnail), photoId: id, sizeBytes: processed.thumbnail.byteLength, variant: "THUMBNAIL" },
            update: { data: toDatabaseBytes(processed.thumbnail), sizeBytes: processed.thumbnail.byteLength },
            where: { photoId_variant: { photoId: id, variant: "THUMBNAIL" } },
          });
          await transaction.galleryPhotoUploadChunk.deleteMany({ where: { photoId: id } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        break;
      } catch (error) {
        if (!isTransactionConflict(error) || attempt === galleryActivationTransactionRetries - 1) throw error;
      }
    }
  } catch (error) {
    if (error instanceof GalleryPhotoLimitError) {
      await prisma.galleryPhoto.deleteMany({ where: { id, status: "PROCESSING" } }).catch((cleanupError) => {
        console.error("Gallery photo at-limit cleanup failed", { cleanupError, id });
      });
      return json({ code: "GALLERY_LIMIT_REACHED", message: "Galeria osiągnęła maksymalną liczbę zdjęć." }, 409);
    }
    await resetPending(prisma, id);
    console.error("Gallery photo assets could not be persisted", { error, id });
    return json({ message: "Nie udało się zapisać zdjęcia. Spróbuj ponownie." }, 503);
  }

  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  return json({ photo: { alt: existingPhoto.altText, height: processed.height, id, imageUrl, thumbnailUrl, width: processed.width } }, 200);
}
