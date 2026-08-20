import { NextResponse } from "next/server";
import { cleanupStaleGalleryPhotos } from "@/lib/gallery-cleanup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.GALLERY_CLEANUP_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Brak dostępu." }, { headers: { "Cache-Control": "no-store" }, status: 401 });
  }

  try {
    const result = await cleanupStaleGalleryPhotos();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" }, status: result.failed > 0 ? 503 : 200 });
  } catch {
    console.error("Gallery cleanup job failed");
    return NextResponse.json({ message: "Nie udało się posprzątać zdjęć." }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
}
