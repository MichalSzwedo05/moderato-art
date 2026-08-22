import { z } from "zod";

export const galleryImageContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxGalleryUploadBytes = 8 * 1024 * 1024;
export const galleryUploadChunkBytes = 1 * 1024 * 1024;
export const maxGalleryFullBytes = 4 * 1024 * 1024;
export const maxGalleryThumbnailBytes = 1 * 1024 * 1024;
export const maxGalleryInputPixels = 40_000_000;
export const maxGalleryAltTextLength = 240;
export const maxGalleryPhotos = 200;

const galleryUploadRequestSchema = z.object({
  altText: z.string().trim().min(3).max(maxGalleryAltTextLength),
  contentType: z.enum(galleryImageContentTypes),
  size: z.number().int().positive().max(maxGalleryUploadBytes),
}).refine(({ altText }) => !/[\u0000-\u001f\u007f]/.test(altText), {
  message: "Tekst alternatywny zawiera niedozwolone znaki.",
  path: ["altText"],
});

const galleryPhotoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const galleryPhotoIdArraySchema = z.array(galleryPhotoIdSchema).max(maxGalleryPhotos);
const galleryOrderRequestSchema = z.object({
  basePhotoIds: galleryPhotoIdArraySchema,
  photoIds: galleryPhotoIdArraySchema,
}).strict().superRefine(({ basePhotoIds, photoIds }, context) => {
  if (new Set(basePhotoIds).size !== basePhotoIds.length) {
    context.addIssue({ code: "custom", message: "Bazowa kolejność zawiera powtórzone zdjęcie.", path: ["basePhotoIds"] });
  }
  if (new Set(photoIds).size !== photoIds.length) {
    context.addIssue({ code: "custom", message: "Kolejność zawiera powtórzone zdjęcie.", path: ["photoIds"] });
  }
});

export type GalleryUploadRequest = z.infer<typeof galleryUploadRequestSchema>;
export type GalleryOrderRequest = z.infer<typeof galleryOrderRequestSchema>;

export function getGalleryUploadChunkCount(size: number) {
  return Math.ceil(size / galleryUploadChunkBytes);
}

export function parseGalleryUploadRequest(input: unknown) {
  return galleryUploadRequestSchema.safeParse(input);
}

export function parseGalleryOrderRequest(input: unknown) {
  return galleryOrderRequestSchema.safeParse(input);
}

export function isGalleryImageContentType(value: string): value is typeof galleryImageContentTypes[number] {
  return (galleryImageContentTypes as readonly string[]).includes(value);
}

export function getImageMimeType(format: string | undefined) {
  if (format === "jpeg") return "image/jpeg" as const;
  if (format === "png") return "image/png" as const;
  if (format === "webp") return "image/webp" as const;
  return undefined;
}
