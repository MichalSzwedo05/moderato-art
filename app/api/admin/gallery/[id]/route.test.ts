import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteGalleryObjects: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getGalleryStorageConfig: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/gallery-storage", () => ({ deleteGalleryObjects: mocks.deleteGalleryObjects, getGalleryStorageConfig: mocks.getGalleryStorageConfig }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { deleteMany: mocks.deleteMany, findUnique: mocks.findUnique, updateMany: mocks.updateMany } }) }));

import { DELETE } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;
const storageConfig = { bucket: "moderato-gallery" };

function request(id: string) {
  return new Request(`https://moderato-art.example/api/admin/gallery/${id}`, {
    headers: { origin: "https://moderato-art.example" },
    method: "DELETE",
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/admin/gallery/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.getGalleryStorageConfig.mockReturnValue(storageConfig);
    mocks.findUnique.mockResolvedValue({ id: "photo", objectKey: null, thumbnailObjectKey: null, uploadObjectKey: null });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.deleteGalleryObjects.mockResolvedValue(undefined);
  });

  it("removes a seeded static photo without requiring object storage", async () => {
    mocks.getGalleryStorageConfig.mockReturnValue(undefined);
    const response = await DELETE(request("music-room"), context("music-room"));

    expect(response.status).toBe(204);
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "DELETING" }), where: { id: "music-room" } });
    expect(mocks.deleteGalleryObjects).not.toHaveBeenCalled();
  });

  it("fails closed when an object-backed photo has no storage configuration", async () => {
    mocks.findUnique.mockResolvedValue({ id: "photo", objectKey: "gallery/photo/full.webp", thumbnailObjectKey: "gallery/photo/thumbnail.webp", uploadObjectKey: null });
    mocks.getGalleryStorageConfig.mockReturnValue(undefined);

    const response = await DELETE(request("photo"), context("photo"));

    expect(response.status).toBe(503);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("hides an object-backed photo before deleting its storage objects", async () => {
    mocks.findUnique.mockResolvedValue({ id: "photo", objectKey: "gallery/photo/full.webp", thumbnailObjectKey: "gallery/photo/thumbnail.webp", uploadObjectKey: "gallery/uploads/photo" });

    const response = await DELETE(request("photo"), context("photo"));

    expect(response.status).toBe(204);
    expect(mocks.deleteGalleryObjects).toHaveBeenCalledWith(storageConfig, ["gallery/uploads/photo", "gallery/photo/full.webp", "gallery/photo/thumbnail.webp"]);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "photo", status: "DELETING" } });
  });

  it("keeps a non-public tombstone when storage cleanup fails", async () => {
    mocks.findUnique.mockResolvedValue({ id: "photo", objectKey: "gallery/photo/full.webp", thumbnailObjectKey: null, uploadObjectKey: null });
    mocks.deleteGalleryObjects.mockRejectedValue(new Error("storage unavailable"));

    const response = await DELETE(request("photo"), context("photo"));

    expect(response.status).toBe(503);
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "DELETING" }), where: { id: "photo" } });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
