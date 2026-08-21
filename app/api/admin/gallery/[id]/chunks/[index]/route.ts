import { NextResponse } from "next/server";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryPendingExpiryMs } from "@/lib/gallery-cleanup";
import { getExpectedGalleryChunkSize, GalleryUploadBodyError, readGalleryUploadBody, toDatabaseBytes } from "@/lib/gallery-upload";
import { getPrisma } from "@/lib/prisma";
import { galleryUploadChunkBytes } from "@/lib/gallery-validation";

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

type ChunkRouteContext = { params: Promise<{ id: string; index: string }> };

export async function PUT(request: Request, context: ChunkRouteContext) {
  if (!(await isAuthorized(request))) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const { id, index: rawIndex } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !/^\d{1,2}$/.test(rawIndex)) {
    return json({ message: "Nie znaleziono przesyłania." }, 404);
  }

  const chunkIndex = Number(rawIndex);
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= 8) {
    return json({ message: "Nieprawidłowy fragment zdjęcia." }, 400);
  }
  if (request.headers.get("content-type") !== "application/octet-stream") {
    return json({ message: "Nieprawidłowy typ danych zdjęcia." }, 415);
  }

  const prisma = getPrisma();
  const photo = await prisma.galleryPhoto.findUnique({
    select: { sizeBytes: true, status: true },
    where: { id },
  });
  if (!photo) return json({ message: "Nie znaleziono przesyłania." }, 404);
  if (photo.status !== "PENDING" || !photo.sizeBytes) {
    return json({ message: "Przesyłanie zdjęcia nie jest już aktywne." }, 409);
  }

  const expectedSize = getExpectedGalleryChunkSize(photo.sizeBytes, chunkIndex);
  if (expectedSize <= 0) return json({ message: "Nieprawidłowy fragment zdjęcia." }, 400);

  let data: Buffer;
  try {
    data = await readGalleryUploadBody(request, galleryUploadChunkBytes);
  } catch (error) {
    if (error instanceof GalleryUploadBodyError) return json({ message: "Fragment zdjęcia jest zbyt duży." }, 413);
    return json({ message: "Nie udało się odczytać fragmentu zdjęcia." }, 400);
  }
  if (data.byteLength !== expectedSize) {
    return json({ message: "Fragment zdjęcia ma nieprawidłowy rozmiar." }, 400);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const refreshed = await transaction.galleryPhoto.updateMany({
        data: { expiresAt: new Date(Date.now() + galleryPendingExpiryMs) },
        where: { id, status: "PENDING" },
      });
      if (refreshed.count !== 1) throw new Error("Gallery upload is no longer pending.");

      await transaction.galleryPhotoUploadChunk.upsert({
        create: { chunkIndex, data: toDatabaseBytes(data), photoId: id, sizeBytes: data.byteLength },
        update: { data: toDatabaseBytes(data), sizeBytes: data.byteLength },
        where: { photoId_chunkIndex: { chunkIndex, photoId: id } },
      });
    });
  } catch (error) {
    console.error("Gallery upload chunk could not be stored", { chunkIndex, error, id });
    return json({ message: "Nie udało się zapisać fragmentu zdjęcia. Spróbuj ponownie." }, 503);
  }

  return new NextResponse(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
