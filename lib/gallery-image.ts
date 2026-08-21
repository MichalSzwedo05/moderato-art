import sharp from "sharp";
import {
  getImageMimeType,
  isGalleryImageContentType,
  maxGalleryInputPixels,
  maxGalleryFullBytes,
  maxGalleryThumbnailBytes,
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

async function renderWebpVariant(input: Buffer, options: { effort: number; height: number; quality: number; width: number }[], maxBytes: number) {
  for (const option of options) {
    const result = await sharp(input, sharpOptions)
      .rotate()
      .resize({ fit: "inside", height: option.height, withoutEnlargement: true, width: option.width })
      .webp({ effort: option.effort, quality: option.quality })
      .toBuffer({ resolveWithObject: true });
    if (result.data.byteLength <= maxBytes) return result;
  }
  throw new GalleryImageValidationError("Processed gallery image exceeds the configured storage limit.");
}

export async function processGalleryImage(input: Buffer, declaredContentType: string): Promise<ProcessedGalleryImage> {
  if (input.byteLength === 0 || input.byteLength > maxGalleryUploadBytes) {
    throw new GalleryImageValidationError("Gallery image exceeds the configured upload limit.");
  }

  let metadata;
  try {
    metadata = await sharp(input, sharpOptions).metadata();
  } catch {
    throw new GalleryImageValidationError("Gallery image could not be decoded safely.");
  }
  const originalMimeType = getImageMimeType(metadata.format);
  if (!originalMimeType || !isGalleryImageContentType(declaredContentType) || originalMimeType !== declaredContentType) {
    throw new GalleryImageValidationError("Gallery image format is not allowed.");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxGalleryInputPixels
    || (metadata.pages !== undefined && metadata.pages > 1)) {
    throw new GalleryImageValidationError("Gallery image dimensions are not allowed.");
  }

  try {
    await sharp(input, sharpOptions)
      .rotate()
      .resize({ fit: "inside", height: 1, withoutEnlargement: true, width: 1 })
      .raw()
      .toBuffer();
  } catch {
    throw new GalleryImageValidationError("Gallery image could not be decoded safely.");
  }

  let fullResult;
  let thumbnail;
  try {
    fullResult = await renderWebpVariant(input, [
      { effort: 4, height: 2400, quality: 84, width: 2400 },
      { effort: 4, height: 2400, quality: 76, width: 2400 },
      { effort: 4, height: 2000, quality: 74, width: 2000 },
      { effort: 4, height: 1600, quality: 70, width: 1600 },
    ], maxGalleryFullBytes);
    thumbnail = (await renderWebpVariant(input, [
      { effort: 3, height: 900, quality: 80, width: 900 },
      { effort: 3, height: 800, quality: 72, width: 800 },
      { effort: 3, height: 640, quality: 68, width: 640 },
    ], maxGalleryThumbnailBytes)).data;
  } catch (error) {
    if (error instanceof GalleryImageValidationError) throw error;
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
