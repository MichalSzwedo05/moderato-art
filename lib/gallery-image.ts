// sharp 0.35 exposes its declarations through a path that TypeScript's
// bundler resolver does not currently follow.
// @ts-expect-error -- the runtime package is present and the API is unchanged.
import sharp from "sharp";
import {
  getImageMimeType,
  isGalleryImageContentType,
  maxGalleryInputPixels,
  maxGalleryUploadBytes,
} from "./gallery-validation";

export type ProcessedGalleryImage = {
  full: Buffer;
  height: number;
  mimeType: "image/webp";
  originalMimeType: "image/jpeg" | "image/png" | "image/webp";
  thumbnail: Buffer;
  width: number;
};

export class GalleryImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryImageValidationError";
  }
}

export class GalleryImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryImageProcessingError";
  }
}

const sharpOptions = {
  failOn: "warning" as const,
  limitInputChannels: 4,
  limitInputPixels: maxGalleryInputPixels,
};

export async function processGalleryImage(input: Buffer, declaredContentType: string): Promise<ProcessedGalleryImage> {
  if (input.byteLength === 0 || input.byteLength > maxGalleryUploadBytes) {
    throw new GalleryImageValidationError("Gallery image exceeds the configured upload limit.");
  }

  let metadata;
  try {
    metadata = await sharp(input, sharpOptions).metadata();
  } catch {
    throw new GalleryImageProcessingError("Gallery image could not be decoded safely.");
  }
  const originalMimeType = getImageMimeType(metadata.format);
  if (!originalMimeType || !isGalleryImageContentType(declaredContentType) || originalMimeType !== declaredContentType) {
    throw new GalleryImageValidationError("Gallery image format is not allowed.");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxGalleryInputPixels
    || (metadata.pages !== undefined && metadata.pages > 1)) {
    throw new GalleryImageValidationError("Gallery image dimensions are not allowed.");
  }

  let fullResult;
  let thumbnail;
  try {
    fullResult = await sharp(input, sharpOptions)
      .rotate()
      .resize({ fit: "inside", height: 2400, withoutEnlargement: true, width: 2400 })
      .webp({ effort: 4, quality: 84 })
      .toBuffer({ resolveWithObject: true });
    thumbnail = await sharp(input, sharpOptions)
      .rotate()
      .resize({ fit: "inside", height: 900, withoutEnlargement: true, width: 900 })
      .webp({ effort: 3, quality: 80 })
      .toBuffer();
  } catch {
    throw new GalleryImageProcessingError("Gallery image could not be processed.");
  }

  if (!fullResult.info.width || !fullResult.info.height) {
    throw new GalleryImageValidationError("Processed gallery image has invalid dimensions.");
  }

  return {
    full: fullResult.data,
    height: fullResult.info.height,
    mimeType: "image/webp",
    originalMimeType,
    thumbnail,
    width: fullResult.info.width,
  };
}
