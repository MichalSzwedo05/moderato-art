import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteGalleryObjects: vi.fn(),
  deleteMany: vi.fn(),
  GalleryImageProcessingError: class GalleryImageProcessingError extends Error {},
  GalleryImageValidationError: class GalleryImageValidationError extends Error {},
  GalleryStorageObjectValidationError: class GalleryStorageObjectValidationError extends Error {},
  findFirst: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getGalleryObject: vi.fn(),
  getGalleryStorageConfig: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  processGalleryImage: vi.fn(),
  putGalleryObject: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/gallery-image", () => ({ GalleryImageProcessingError: mocks.GalleryImageProcessingError, GalleryImageValidationError: mocks.GalleryImageValidationError, processGalleryImage: mocks.processGalleryImage }));
vi.mock("@/lib/gallery-storage", () => ({
  GalleryStorageObjectValidationError: mocks.GalleryStorageObjectValidationError,
  deleteGalleryObjects: mocks.deleteGalleryObjects,
  getGalleryObject: mocks.getGalleryObject,
  getGalleryStorageConfig: mocks.getGalleryStorageConfig,
  makeGalleryPublicUrl: (config: { publicUrl: string }, key: string) => `${config.publicUrl}/${key}`,
  makeGalleryStorageKey: (config: { prefix: string }, ...parts: string[]) => [config.prefix, ...parts].join("/"),
  putGalleryObject: mocks.putGalleryObject,
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { deleteMany: mocks.deleteMany, findFirst: mocks.findFirst, updateMany: mocks.updateMany } }) }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;
const storageConfig = { prefix: "gallery", publicUrl: "https://cdn.example.com" };
const pendingPhoto = { altText: "Mikrofon na scenie", id: "photo-id", mimeType: "image/jpeg", status: "PENDING", uploadObjectKey: "gallery/uploads/photo-id" };

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
    vi.resetAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.getGalleryStorageConfig.mockReturnValue(storageConfig);
    mocks.findFirst.mockResolvedValueOnce(pendingPhoto).mockResolvedValueOnce({ sortOrder: 0 });
    mocks.getGalleryObject.mockResolvedValue(Buffer.from("source"));
    mocks.processGalleryImage.mockResolvedValue({ full: Buffer.from("full"), height: 800, mimeType: "image/webp", thumbnail: Buffer.from("thumb"), width: 1200 });
    mocks.putGalleryObject.mockResolvedValue(undefined);
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.deleteGalleryObjects.mockResolvedValue(undefined);
  });

  it("processes the pending object, publishes variants, and activates the record", async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ photo: { id: "photo-id", imageUrl: "https://cdn.example.com/gallery/photo-id/full.webp", thumbnailUrl: "https://cdn.example.com/gallery/photo-id/thumbnail.webp" } });
    expect(mocks.putGalleryObject).toHaveBeenCalledTimes(2);
    expect(mocks.updateMany).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ expiresAt: expect.any(Date), status: "PROCESSING" }), where: { id: "photo-id", status: "PENDING" } });
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ imageUrl: "https://cdn.example.com/gallery/photo-id/full.webp", objectKey: "gallery/photo-id/full.webp" }), where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.updateMany).toHaveBeenNthCalledWith(3, { data: expect.objectContaining({ expiresAt: expect.any(Date), status: "ACTIVE" }), where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.deleteGalleryObjects).not.toHaveBeenCalled();
  });

  it("cleans up invalid input and removes the pending record", async () => {
    mocks.processGalleryImage.mockRejectedValue(new mocks.GalleryImageValidationError("invalid image"));

    const response = await POST(request(), context());

    expect(response.status).toBe(400);
    expect(mocks.deleteGalleryObjects).toHaveBeenCalledWith(storageConfig, ["gallery/uploads/photo-id"]);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "PROCESSING" }), where: { id: "photo-id", status: "PENDING" } });
  });

  it("keeps a retryable pending record when storage is temporarily unavailable", async () => {
    mocks.getGalleryObject.mockRejectedValue(new Error("storage unavailable"));

    const response = await POST(request(), context());

    expect(response.status).toBe(503);
    expect(mocks.deleteGalleryObjects).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "PENDING" }), where: { id: "photo-id", status: "PROCESSING" } });
  });

  it("keeps a retryable pending record when image processing has an infrastructure failure", async () => {
    mocks.processGalleryImage.mockRejectedValue(new mocks.GalleryImageProcessingError("decoder unavailable"));

    const response = await POST(request(), context());

    expect(response.status).toBe(503);
    expect(mocks.deleteGalleryObjects).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "PENDING" }), where: { id: "photo-id", status: "PROCESSING" } });
  });

  it("persists cleanup keys and tombstones the record when writing variants fails", async () => {
    mocks.putGalleryObject.mockRejectedValueOnce(new Error("storage write failed"));

    const response = await POST(request(), context());

    expect(response.status).toBe(503);
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ objectKey: "gallery/photo-id/full.webp", thumbnailObjectKey: "gallery/photo-id/thumbnail.webp" }), where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "DELETING" }), where: { id: "photo-id", status: "PROCESSING" } });
    expect(mocks.deleteGalleryObjects).toHaveBeenCalledWith(storageConfig, ["gallery/uploads/photo-id", "gallery/photo-id/full.webp", "gallery/photo-id/thumbnail.webp"]);
  });
});
