import { describe, expect, it } from "vitest";
import { getExpectedGalleryChunkSize, GalleryUploadBodyError, readGalleryUploadBody, toDatabaseBytes } from "./gallery-upload";

describe("gallery upload chunks", () => {
  it("reads a bounded request body", async () => {
    await expect(readGalleryUploadBody(new Request("https://moderato-art.example", { body: "1234", method: "PUT" }), 3)).rejects.toBeInstanceOf(GalleryUploadBodyError);
    await expect(readGalleryUploadBody(new Request("https://moderato-art.example", { body: "1234", method: "PUT" }), 4)).resolves.toEqual(Buffer.from("1234"));
  });

  it("calculates the final chunk size", () => {
    expect(getExpectedGalleryChunkSize(2_500_000, 0)).toBe(1_048_576);
    expect(getExpectedGalleryChunkSize(2_500_000, 2)).toBe(402_848);
    expect(getExpectedGalleryChunkSize(2_500_000, 3)).toBe(0);
  });

  it("converts buffers to Prisma-compatible byte arrays", () => {
    const bytes = toDatabaseBytes(Buffer.from("data"));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes).toString()).toBe("data");
  });
});
