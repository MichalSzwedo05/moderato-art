import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminAuthConfig, getAdminSession, getTrustedClientAddress, takeGalleryUploadRateLimit } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryPendingExpiryMs } from "@/lib/gallery-cleanup";
import { GalleryUploadBodyError, readGalleryUploadBody } from "@/lib/gallery-upload";
import { getPrisma } from "@/lib/prisma";
import { getGalleryUploadChunkCount, galleryUploadChunkBytes, parseGalleryUploadRequest } from "@/lib/gallery-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
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
