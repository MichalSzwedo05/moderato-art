import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const assetFindUnique = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => ({ ...(await importOriginal()), readFile }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { findFirst }, galleryPhotoAsset: { findUnique: assetFindUnique } }) }));

import { GET } from "./route";

describe("GET /gallery/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue({ id: "music-room", imageUrl: "/gallery/music-room", status: "ACTIVE" });
    assetFindUnique.mockResolvedValue(null);
    readFile.mockResolvedValue(Buffer.from("jpeg"));
  });

  it("serves a seeded image only while its active database row exists", async () => {
    const response = await GET(new Request("https://moderato-art.example/gallery/music-room"), { params: Promise.resolve({ id: "music-room" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Length")).toMatch(/^\d+$/);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("serves a database-backed full variant as WebP", async () => {
    findFirst.mockResolvedValue({ id: "photo", imageUrl: "/gallery/photo", status: "ACTIVE" });
    assetFindUnique.mockResolvedValue({ data: Buffer.from("webp"), sizeBytes: 4 });

    const response = await GET(new Request("https://moderato-art.example/gallery/photo"), { params: Promise.resolve({ id: "photo" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(readFile).not.toHaveBeenCalled();
    expect(assetFindUnique).toHaveBeenCalledWith({ select: { data: true, sizeBytes: true }, where: { photoId_variant: { photoId: "photo", variant: "FULL" } } });
  });

  it("uses the thumbnail variant when requested", async () => {
    findFirst.mockResolvedValue({ id: "photo", imageUrl: "/gallery/photo", status: "ACTIVE" });
    assetFindUnique.mockResolvedValue({ data: Buffer.from("thumb"), sizeBytes: 5 });

    const response = await GET(new Request("https://moderato-art.example/gallery/photo?variant=thumbnail"), { params: Promise.resolve({ id: "photo" }) });

    expect(response.status).toBe(200);
    expect(assetFindUnique).toHaveBeenCalledWith({ select: { data: true, sizeBytes: true }, where: { photoId_variant: { photoId: "photo", variant: "THUMBNAIL" } } });
  });

  it("returns 404 for an inactive, unknown, or invalid variant", async () => {
    findFirst.mockResolvedValue(undefined);
    const inactiveResponse = await GET(new Request("https://moderato-art.example/gallery/music-room"), { params: Promise.resolve({ id: "music-room" }) });
    expect(inactiveResponse.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();

    findFirst.mockResolvedValue({ id: "music-room", imageUrl: "/gallery/music-room", status: "ACTIVE" });
    const invalidVariantResponse = await GET(new Request("https://moderato-art.example/gallery/music-room?variant=other"), { params: Promise.resolve({ id: "music-room" }) });
    expect(invalidVariantResponse.status).toBe(404);
  });
});
