import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getAdminAuthConfig, getAdminSession, getTrustedClientAddress, takeGalleryUploadRateLimit } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryPendingExpiryMs } from "@/lib/gallery-cleanup";
import { GalleryUploadBodyError, readGalleryUploadBody } from "@/lib/gallery-upload";
import { getPrisma } from "@/lib/prisma";
import {
  getGalleryUploadChunkCount,
  galleryUploadChunkBytes,
  maxGalleryPhotos,
  parseGalleryOrderRequest,
  parseGalleryUploadRequest,
} from "@/lib/gallery-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

const maxGalleryOrderBodyBytes = 24_000;
const galleryOrderTransactionRetries = 3;

class GalleryOrderConflictError extends Error {
  constructor() {
    super("Gallery photo order changed while it was being saved.");
    this.name = "GalleryOrderConflictError";
  }
}

function isTransactionConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2034";
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034");
}

async function saveGalleryOrder(
  prisma: ReturnType<typeof getPrisma>,
  basePhotoIds: readonly string[],
  photoIds: readonly string[],
) {
  for (let attempt = 0; attempt < galleryOrderTransactionRetries; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const activePhotos = await transaction.galleryPhoto.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
          take: maxGalleryPhotos + 1,
          where: { status: "ACTIVE" },
        });
        if (activePhotos.length > maxGalleryPhotos) throw new GalleryOrderConflictError();

        const activeIds = new Set(activePhotos.map((photo) => photo.id));
        const currentPhotoIds = activePhotos.map((photo) => photo.id);
        if (currentPhotoIds.length === photoIds.length && currentPhotoIds.every((id, index) => id === photoIds[index])) {
          return;
        }
        if (currentPhotoIds.length !== basePhotoIds.length || currentPhotoIds.some((id, index) => id !== basePhotoIds[index])
          || activeIds.size !== photoIds.length || photoIds.some((id) => !activeIds.has(id))) {
          throw new GalleryOrderConflictError();
        }

        for (const [sortOrder, id] of photoIds.entries()) {
          const updated = await transaction.galleryPhoto.updateMany({
            data: { sortOrder },
            where: { id, status: "ACTIVE" },
          });
          if (updated.count !== 1) throw new GalleryOrderConflictError();
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      if (error instanceof GalleryOrderConflictError || !isTransactionConflict(error)
        || attempt === galleryOrderTransactionRetries - 1) throw error;
    }
  }
}

async function getAuthorizedConfig(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config) || !(await getAdminSession())) return undefined;
  return config;
}

export async function POST(request: Request) {
  const config = await getAuthorizedConfig(request);
  if (!config) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const clientAddress = getTrustedClientAddress(request);
  if (!clientAddress || !(await takeGalleryUploadRateLimit(clientAddress, config))) {
    return json({ message: "Zbyt wiele prób dodania zdjęcia. Spróbuj ponownie później." }, 429);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 20_000) {
    return json({ message: "Nieprawidłowe dane zdjęcia." }, 413);
  }

  let parsed;
  try {
    const body = await readGalleryUploadBody(request, 20_000);
    parsed = parseGalleryUploadRequest(JSON.parse(body.toString("utf8")));
  } catch (error) {
    if (error instanceof GalleryUploadBodyError) return json({ message: "Nieprawidłowe dane zdjęcia." }, 413);
    return json({ message: "Nieprawidłowe dane zdjęcia." }, 400);
  }
  if (!parsed.success) {
    return json({ message: "Wybierz zdjęcie JPEG, PNG lub WebP oraz podaj tekst alternatywny." }, 400);
  }

  const id = randomUUID();
  const chunkCount = getGalleryUploadChunkCount(parsed.data.size);
  const prisma = getPrisma();

  try {
    await prisma.galleryPhoto.create({
      data: {
        altText: parsed.data.altText,
        expiresAt: new Date(Date.now() + galleryPendingExpiryMs),
        id,
        mimeType: parsed.data.contentType,
        sizeBytes: parsed.data.size,
        status: "PENDING",
      },
    });

    return json({ chunkCount, chunkSize: galleryUploadChunkBytes, photoId: id }, 201);
  } catch {
    await prisma.galleryPhoto.deleteMany({ where: { id, status: "PENDING" } }).catch(() => undefined);
    return json({ message: "Nie udało się przygotować przesyłania zdjęcia." }, 500);
  }
}

export async function PATCH(request: Request) {
  const config = await getAuthorizedConfig(request);
  if (!config) {
    return json({ message: "Brak dostępu." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ message: "Nieprawidłowy format żądania." }, 415);
  }

  let parsed;
  try {
    const body = await readGalleryUploadBody(request, maxGalleryOrderBodyBytes);
    parsed = parseGalleryOrderRequest(JSON.parse(body.toString("utf8")));
  } catch (error) {
    if (error instanceof GalleryUploadBodyError) return json({ message: "Dane kolejności są zbyt duże." }, 413);
    return json({ message: "Nieprawidłowe dane kolejności." }, 400);
  }
  if (!parsed.success) {
    return json({ message: "Nieprawidłowa kolejność zdjęć." }, 400);
  }

  try {
    await saveGalleryOrder(getPrisma(), parsed.data.basePhotoIds, parsed.data.photoIds);
  } catch (error) {
    if (error instanceof GalleryOrderConflictError) {
      return json({ code: "GALLERY_CHANGED", message: "Galeria zmieniła się. Odśwież listę i spróbuj ponownie." }, 409);
    }
    console.error("Gallery photo order could not be saved", { error });
    return json({ message: "Nie udało się zapisać kolejności zdjęć. Spróbuj ponownie." }, 503);
  }

  console.info("Gallery photo order updated", { count: parsed.data.photoIds.length });
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  return new NextResponse(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
