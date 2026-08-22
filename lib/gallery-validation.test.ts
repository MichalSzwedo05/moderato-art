import { describe, expect, it } from "vitest";
import {
  getGalleryUploadChunkCount,
  getImageMimeType,
  galleryUploadChunkBytes,
  maxGalleryUploadBytes,
  parseGalleryOrderRequest,
  parseGalleryUploadRequest,
} from "./gallery-validation";

describe("gallery upload validation", () => {
  it("accepts supported image metadata and trims alt text", () => {
    const result = parseGalleryUploadRequest({
      altText: "  Mikrofon na scenie  ",
      contentType: "image/jpeg",
      size: 1024,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.altText).toBe("Mikrofon na scenie");
  });

  it("rejects unsupported formats, missing alt text, control characters, and oversized files", () => {
    expect(parseGalleryUploadRequest({ altText: "Zdjęcie", contentType: "image/svg+xml", size: 10 }).success).toBe(false);
    expect(parseGalleryUploadRequest({ altText: "  ", contentType: "image/webp", size: 10 }).success).toBe(false);
    expect(parseGalleryUploadRequest({ altText: "Zdjęcie\nopis", contentType: "image/webp", size: 10 }).success).toBe(false);
    expect(parseGalleryUploadRequest({ altText: "Zdjęcie", contentType: "image/webp", size: maxGalleryUploadBytes + 1 }).success).toBe(false);
  });

  it("maps only the formats accepted by the gallery", () => {
    expect(getImageMimeType("jpeg")).toBe("image/jpeg");
    expect(getImageMimeType("png")).toBe("image/png");
    expect(getImageMimeType("webp")).toBe("image/webp");
    expect(getImageMimeType("svg")).toBeUndefined();
  });

  it("splits uploads into bounded chunks", () => {
    expect(getGalleryUploadChunkCount(galleryUploadChunkBytes)).toBe(1);
    expect(getGalleryUploadChunkCount(galleryUploadChunkBytes + 1)).toBe(2);
    expect(getGalleryUploadChunkCount(maxGalleryUploadBytes)).toBe(8);
  });

  it("accepts a unique gallery order and rejects malformed or duplicated IDs", () => {
    expect(parseGalleryOrderRequest({ basePhotoIds: ["first", "second"], photoIds: ["first", "second"] }).success).toBe(true);
    expect(parseGalleryOrderRequest({ basePhotoIds: [], photoIds: [] }).success).toBe(true);
    expect(parseGalleryOrderRequest({ basePhotoIds: ["first", "second"], photoIds: ["first", "first"] }).success).toBe(false);
    expect(parseGalleryOrderRequest({ basePhotoIds: ["photo with spaces"], photoIds: ["photo"] }).success).toBe(false);
    expect(parseGalleryOrderRequest({ basePhotoIds: ["first"], photoIds: ["first"], extra: true }).success).toBe(false);
  });
});
