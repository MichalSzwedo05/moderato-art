import { getPrisma } from "./prisma";
import type { GalleryPhoto } from "./gallery";
import { maxGalleryPhotos } from "./gallery-validation";

const gallerySizes = "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem";

function toGalleryPhoto(photo: {
  altText: string;
  height: number | null;
  id: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
}): GalleryPhoto | undefined {
  if (!photo.imageUrl) return undefined;
  return {
    alt: photo.altText,
    ...(photo.height ? { height: photo.height } : {}),
    id: photo.id,
    sizes: gallerySizes,
    src: photo.imageUrl,
    thumbnailSrc: photo.thumbnailUrl || photo.imageUrl,
    ...(photo.width ? { width: photo.width } : {}),
  };
}

async function queryGalleryPhotos() {
  return getPrisma().galleryPhoto.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      altText: true,
      height: true,
      id: true,
      imageUrl: true,
      thumbnailUrl: true,
      width: true,
    },
    where: { status: "ACTIVE" },
    take: maxGalleryPhotos,
  });
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const photos = await queryGalleryPhotos();
    return photos.flatMap((photo) => {
      const mapped = toGalleryPhoto(photo);
      return mapped ? [mapped] : [];
    });
  } catch {
    console.error("Gallery photo query failed");
    return [];
  }
}

export async function getAdminGalleryPhotos(): Promise<GalleryPhoto[] | undefined> {
  try {
    const photos = await queryGalleryPhotos();
    return photos.flatMap((photo) => {
      const mapped = toGalleryPhoto(photo);
      return mapped ? [mapped] : [];
    });
  } catch {
    console.error("Admin gallery photo query failed");
    return undefined;
  }
}
