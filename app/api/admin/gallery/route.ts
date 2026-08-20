import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminAuthConfig, getAdminSession, getTrustedClientAddress, takeGalleryUploadRateLimit } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryPendingExpiryMs } from "@/lib/gallery-cleanup";
import { getPrisma } from "@/lib/prisma";
import {
  createGalleryUploadUrl,
  getGalleryStorageConfig,
  makeGalleryStorageKey,
} from "@/lib/gallery-storage";
import { parseGalleryUploadRequest } from "@/lib/gallery-validation";

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

  const storage = getGalleryStorageConfig();
  if (!storage) {
    return json({ message: "Przechowywanie zdjęć nie jest jeszcze skonfigurowane." }, 503);
  }

  let parsed;
  try {
    parsed = parseGalleryUploadRequest(await request.json());
  } catch {
    return json({ message: "Nieprawidłowe dane zdjęcia." }, 400);
  }
  if (!parsed.success) {
    return json({ message: "Wybierz zdjęcie JPEG, PNG lub WebP oraz podaj tekst alternatywny." }, 400);
  }

  const id = randomUUID();
  const uploadObjectKey = makeGalleryStorageKey(storage, "uploads", id);
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
        uploadObjectKey,
      },
    });

    const uploadUrl = await createGalleryUploadUrl(storage, uploadObjectKey, parsed.data.contentType);
    return json({ photoId: id, uploadUrl }, 201);
  } catch {
    await prisma.galleryPhoto.deleteMany({ where: { id, status: "PENDING" } }).catch(() => undefined);
    return json({ message: "Nie udało się przygotować przesyłania zdjęcia." }, 500);
  }
}
