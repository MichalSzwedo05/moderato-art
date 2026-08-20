import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { processGalleryImage } from "./gallery-image";

describe("processGalleryImage", () => {
  it("validates and creates optimized WebP variants without source metadata", async () => {
    const source = await readFile(resolve(process.cwd(), "gallery-assets/gallery/music-room.jpg"));
    const result = await processGalleryImage(source, "image/jpeg");

    expect(result.originalMimeType).toBe("image/jpeg");
    expect(result.mimeType).toBe("image/webp");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
    expect(result.full.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(result.full.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(result.thumbnail.byteLength).toBeGreaterThan(0);
  });

  it("rejects a declared type that does not match the decoded image", async () => {
    const source = await readFile(resolve(process.cwd(), "gallery-assets/gallery/music-room.jpg"));

    await expect(processGalleryImage(source, "image/png")).rejects.toThrow();
  });
});
