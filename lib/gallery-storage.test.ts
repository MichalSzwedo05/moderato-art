import { describe, expect, it } from "vitest";
import {
  GalleryStorageInfrastructureError,
  GalleryStorageObjectValidationError,
  getGalleryStorageConfig,
  makeGalleryPublicUrl,
  makeGalleryStorageKey,
  readGalleryObjectBody,
} from "./gallery-storage";

const validEnvironment = {
  GALLERY_STORAGE_ACCESS_KEY_ID: "access-key",
  GALLERY_STORAGE_BUCKET: "moderato-gallery",
  GALLERY_STORAGE_ENDPOINT: "https://s3.example.com",
  GALLERY_STORAGE_FORCE_PATH_STYLE: "false",
  GALLERY_STORAGE_PREFIX: "/gallery/",
  GALLERY_STORAGE_PUBLIC_URL: "https://cdn.example.com/assets/",
  GALLERY_STORAGE_REGION: "eu-central-1",
  GALLERY_STORAGE_SECRET_ACCESS_KEY: "secret-key",
  NODE_ENV: "production",
};

describe("gallery storage configuration", () => {
  it("normalizes a valid S3-compatible configuration", () => {
    const config = getGalleryStorageConfig(validEnvironment);

    expect(config).toMatchObject({
      bucket: "moderato-gallery",
      prefix: "gallery",
      publicUrl: "https://cdn.example.com/assets",
    });
    expect(config && makeGalleryStorageKey(config, "photo-id", "full.webp")).toBe("gallery/photo-id/full.webp");
    expect(config && makeGalleryPublicUrl(config, "gallery/photo-id/full.webp")).toBe("https://cdn.example.com/assets/gallery/photo-id/full.webp");
  });

  it("fails closed for placeholders, insecure production URLs, and invalid options", () => {
    expect(getGalleryStorageConfig({ ...validEnvironment, GALLERY_STORAGE_ACCESS_KEY_ID: "replace-with-key" })).toBeUndefined();
    expect(getGalleryStorageConfig({ ...validEnvironment, GALLERY_STORAGE_PUBLIC_URL: "http://cdn.example.com" })).toBeUndefined();
    expect(getGalleryStorageConfig({ ...validEnvironment, GALLERY_STORAGE_FORCE_PATH_STYLE: "yes" })).toBeUndefined();
    expect(getGalleryStorageConfig({ ...validEnvironment, GALLERY_STORAGE_PREFIX: "../gallery" })).toBeUndefined();
  });

  it("allows localhost HTTP only in development", () => {
    const config = getGalleryStorageConfig({
      ...validEnvironment,
      GALLERY_STORAGE_ENDPOINT: "http://localhost:9000",
      GALLERY_STORAGE_PUBLIC_URL: "http://localhost:9000/moderato",
      NODE_ENV: "development",
    });

    expect(config?.endpoint).toBe("http://localhost:9000");
  });

  it("bounds streamed object buffering instead of trusting the HEAD size alone", async () => {
    async function* body() {
      yield Buffer.from("1234");
      yield Buffer.from("5678");
    }

    await expect(readGalleryObjectBody(body(), 7)).rejects.toBeInstanceOf(GalleryStorageObjectValidationError);
    await expect(readGalleryObjectBody(body(), 12)).resolves.toEqual(Buffer.from("12345678"));
  });

  it("classifies a broken storage stream as infrastructure failure", async () => {
    async function* brokenBody() {
      yield Buffer.from("1234");
      throw new Error("connection reset");
    }

    await expect(readGalleryObjectBody(brokenBody(), 10, 8)).rejects.toBeInstanceOf(GalleryStorageInfrastructureError);
  });
});
