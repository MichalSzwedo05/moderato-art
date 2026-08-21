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

function imageHeaders(contentType: string, size: number) {
  return {
    "Cache-Control": "no-store",
    "Content-Length": String(size),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request, context: GalleryAssetRouteContext) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return new Response("Not found", { status: 404 });

  const variantParam = new URL(request.url).searchParams.get("variant");
  if (variantParam !== null && variantParam !== "thumbnail") return new Response("Not found", { status: 404 });
  const variant = variantParam === "thumbnail" ? "THUMBNAIL" : "FULL";

  try {
    const photo = await getPrisma().galleryPhoto.findFirst({
      select: { id: true, imageUrl: true, status: true },
      where: { id, status: "ACTIVE" },
    });
    if (!photo) return new Response("Not found", { status: 404 });

    const asset = await getPrisma().galleryPhotoAsset.findUnique({
      select: { data: true, sizeBytes: true },
      where: { photoId_variant: { photoId: id, variant } },
    });
    if (asset) {
      if (asset.sizeBytes <= 0 || asset.data.byteLength !== asset.sizeBytes) return new Response("Not found", { status: 404 });
      return new Response(asset.data, { headers: imageHeaders("image/webp", asset.sizeBytes), status: 200 });
    }

    const assetName = staticGalleryAssets[id];
    if (variant !== "FULL" && variant !== "THUMBNAIL") return new Response("Not found", { status: 404 });
    if (photo.imageUrl !== `/gallery/${id}` || !assetName) return new Response("Not found", { status: 404 });

    const file = await readFile(join(process.cwd(), "gallery-assets", "gallery", assetName));
    return new Response(file, {
      headers: imageHeaders("image/jpeg", file.byteLength),
      status: 200,
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
