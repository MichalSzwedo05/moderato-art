import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assetUpsert: vi.fn(),
  chunkDeleteMany: vi.fn(),
  chunksFindMany: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  GalleryImageValidationError: class GalleryImageValidationError extends Error {},
  isSameAdminOrigin: vi.fn(),
  processGalleryImage: vi.fn(),
  transaction: vi.fn(),
  transactionPhotoUpdateMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/gallery-image", () => ({ GalleryImageValidationError: mocks.GalleryImageValidationError, processGalleryImage: mocks.processGalleryImage }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: mocks.transaction,
    galleryPhoto: { deleteMany: mocks.deleteMany, findFirst: mocks.findFirst, findUnique: mocks.findUnique, updateMany: mocks.updateMany },
    galleryPhotoUploadChunk: { findMany: mocks.chunksFindMany },
  }),
}));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;
const pendingPhoto = {
  altText: "Mikrofon na scenie",
  height: null,
  id: "photo-id",
  imageUrl: null,
  mimeType: "image/jpeg",
  sizeBytes: 6,
  status: "PENDING",
  thumbnailUrl: null,
  width: null,
};

function request() {
  return new Request("https://moderato-art.example/api/admin/gallery/photo-id/complete", {
    body: "{}",
    headers: { "content-type": "application/json", origin: "https://moderato-art.example" },
    method: "POST",
  });
}

function context() {
  return { params: Promise.resolve({ id: "photo-id" }) };
}

describe("POST /api/admin/gallery/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.findUnique.mockResolvedValue(pendingPhoto);
    mocks.chunksFindMany.mockResolvedValue([{ chunkIndex: 0, data: Buffer.from("source"), sizeBytes: 6 }]);
    mocks.findFirst.mockResolvedValue({ sortOrder: 0 });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionPhotoUpdateMany.mockResolvedValue({ count: 1 });
    mocks.assetUpsert.mockResolvedValue({});
    mocks.chunkDeleteMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      galleryPhoto: { updateMany: mocks.transactionPhotoUpdateMany },
      galleryPhotoAsset: { upsert: mocks.assetUpsert },
      galleryPhotoUploadChunk: { deleteMany: mocks.chunkDeleteMany },
    }));
    mocks.processGalleryImage.mockResolvedValue({ full: Buffer.from("full"), height: 800, mimeType: "image/webp", thumbnail: Buffer.from("thumb"), width: 1200 });
  });

  it("processes chunks, persists both variants, and activates the record", async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ photo: { id: "photo-id", imageUrl: "/gallery/photo-id", thumbnailUrl: "/gallery/photo-id?variant=thumbnail" } });
    expect(mocks.processGalleryImage).toHaveBeenCalledWith(Buffer.from("source"), "image/jpeg");
    expect(mocks.assetUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.chunkDeleteMany).toHaveBeenCalledWith({ where: { photoId: "photo-id" } });
    expect(mocks.transactionPhotoUpdateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ imageUrl: "/gallery/photo-id", status: "ACTIVE" }), where: { id: "photo-id", status: "PROCESSING" } });
  });

  it("keeps the upload retryable when a chunk is missing", async () => {
    mocks.chunksFindMany.mockResolvedValue([]);

    const response = await POST(request(), context());

    expect(response.status).toBe(409);
    expect(mocks.updateMany).toHaveBeenLastCalledWith({ data: expect.objectContaining({ status: "PENDING" }), where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.processGalleryImage).not.toHaveBeenCalled();
  });

  it("deletes invalid image data after processing validation fails", async () => {
    mocks.processGalleryImage.mockRejectedValue(new mocks.GalleryImageValidationError("invalid image"));

    const response = await POST(request(), context());

    expect(response.status).toBe(400);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "photo-id", status: "PROCESSING" } });
  });

  it("keeps a retryable pending record when processing has an infrastructure failure", async () => {
    mocks.processGalleryImage.mockRejectedValue(new Error("decoder unavailable"));

    const response = await POST(request(), context());

    expect(response.status).toBe(503);
    expect(mocks.updateMany).toHaveBeenLastCalledWith({ data: expect.objectContaining({ status: "PENDING" }), where: { id: "photo-id", status: "PROCESSING" } });
  });

  it("returns an active photo for an idempotent completion retry", async () => {
    mocks.findUnique.mockResolvedValue({ ...pendingPhoto, imageUrl: "/gallery/photo-id", status: "ACTIVE", thumbnailUrl: "/gallery/photo-id?variant=thumbnail", width: 1200, height: 800 });

    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    expect(mocks.processGalleryImage).not.toHaveBeenCalled();
  });
});
