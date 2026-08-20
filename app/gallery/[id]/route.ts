import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const staticGalleryAssets: Record<string, string> = {
  "music-room": "music-room.jpg",
  "music-studio": "music-studio.jpg",
  "piano-keys": "piano-keys.jpg",
  "stage-microphone": "stage-microphone.jpg",
};

type GalleryAssetRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: GalleryAssetRouteContext) {
  const { id } = await context.params;
  const assetName = staticGalleryAssets[id];
  if (!assetName) return new Response("Not found", { status: 404 });

  try {
    const photo = await getPrisma().galleryPhoto.findFirst({
      select: { id: true, imageUrl: true },
      where: { id, imageUrl: `/gallery/${id}`, objectKey: null, status: "ACTIVE" },
    });
    if (!photo) return new Response("Not found", { status: 404 });

    const file = await readFile(join(process.cwd(), "gallery-assets", "gallery", assetName));
    return new Response(file, {
      headers: { "Cache-Control": "no-store", "Content-Type": "image/jpeg" },
      status: 200,
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
