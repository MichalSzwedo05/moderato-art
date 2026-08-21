import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteGalleryObjects: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  getGalleryStorageConfig: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("./gallery-storage", () => ({ deleteGalleryObjects: mocks.deleteGalleryObjects, getGalleryStorageConfig: mocks.getGalleryStorageConfig }));
vi.mock("./prisma", () => ({ getPrisma: () => ({ galleryPhoto: { deleteMany: mocks.deleteMany, findMany: mocks.findMany, updateMany: mocks.updateMany } }) }));

import { cleanupStaleGalleryPhotos } from "./gallery-cleanup";

describe("cleanupStaleGalleryPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGalleryStorageConfig.mockReturnValue({ bucket: "gallery" });
    mocks.deleteGalleryObjects.mockResolvedValue(undefined);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("removes expired pending/deleting records and their object keys", async () => {
    mocks.findMany.mockResolvedValueOnce([
      { id: "pending", objectKey: null, status: "PENDING", thumbnailObjectKey: null, uploadObjectKey: "gallery/uploads/pending" },
      { id: "deleting", objectKey: "gallery/deleting/full.webp", status: "DELETING", thumbnailObjectKey: "gallery/deleting/thumb.webp", uploadObjectKey: null },
    ]).mockResolvedValue([]);

    await expect(cleanupStaleGalleryPhotos(new Date("2026-08-20T12:00:00Z"))).resolves.toEqual({ cleaned: 2, failed: 0, inspected: 2 });
    expect(mocks.deleteGalleryObjects).toHaveBeenCalledTimes(2);
    expect(mocks.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("keeps object-backed records when storage is not configured", async () => {
    mocks.getGalleryStorageConfig.mockReturnValue(undefined);
    mocks.findMany.mockResolvedValueOnce([{ id: "pending", objectKey: null, status: "PENDING", thumbnailObjectKey: null, uploadObjectKey: "gallery/uploads/pending" }]).mockResolvedValue([]);

    await expect(cleanupStaleGalleryPhotos()).resolves.toEqual({ cleaned: 0, failed: 1, inspected: 1 });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("clears a tracked temporary object without deleting its active photo", async () => {
    mocks.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "active", uploadObjectKey: "gallery/uploads/active" }])
      .mockResolvedValue([]);

    await expect(cleanupStaleGalleryPhotos()).resolves.toEqual({ cleaned: 1, failed: 0, inspected: 1 });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: { expiresAt: null, uploadObjectKey: null }, where: { id: "active", status: "ACTIVE", uploadObjectKey: "gallery/uploads/active" } });
  });
});
