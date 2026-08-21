import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("./prisma", () => ({ getPrisma: () => ({ galleryPhoto: { deleteMany: mocks.deleteMany, findMany: mocks.findMany, updateMany: mocks.updateMany } }) }));

import { cleanupStaleGalleryPhotos } from "./gallery-cleanup";

describe("cleanupStaleGalleryPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("removes expired pending/deleting records and cascades their assets and chunks", async () => {
    mocks.findMany.mockResolvedValueOnce([
      { id: "pending", status: "PENDING" },
      { id: "deleting", status: "DELETING" },
    ]).mockResolvedValue([]);

    await expect(cleanupStaleGalleryPhotos(new Date("2026-08-20T12:00:00Z"))).resolves.toEqual({ cleaned: 2, failed: 0, inspected: 2 });
    expect(mocks.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("deletes stale records without an external storage configuration", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "pending", status: "PENDING" }]).mockResolvedValue([]);

    await expect(cleanupStaleGalleryPhotos()).resolves.toEqual({ cleaned: 1, failed: 0, inspected: 1 });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: expect.any(Date) }, id: "pending", status: "PENDING" } });
  });

  it("counts a database cleanup failure without deleting the wrong record", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "pending", status: "PENDING" }]).mockResolvedValue([]);
    mocks.deleteMany.mockRejectedValue(new Error("database unavailable"));

    await expect(cleanupStaleGalleryPhotos()).resolves.toEqual({ cleaned: 0, failed: 1, inspected: 1 });
  });

  it("does not delete a row whose expiry was refreshed during cleanup", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "pending", status: "PENDING" }]).mockResolvedValue([]);
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    await expect(cleanupStaleGalleryPhotos(new Date("2026-08-20T12:00:00Z"))).resolves.toEqual({ cleaned: 0, failed: 0, inspected: 1 });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: new Date("2026-08-20T12:00:00Z") }, id: "pending", status: "PENDING" } });
  });
});
