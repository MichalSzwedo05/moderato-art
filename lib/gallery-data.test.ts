import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
vi.mock("./prisma", () => ({ getPrisma: () => ({ galleryPhoto: { findMany } }) }));

import { getAdminGalleryPhotos, getGalleryPhotos } from "./gallery-data";

describe("gallery data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not resurrect deleted static photos when the database is unavailable", async () => {
    findMany.mockRejectedValue(new Error("database unavailable"));

    await expect(getGalleryPhotos()).resolves.toEqual([]);
    await expect(getAdminGalleryPhotos()).resolves.toBeUndefined();
  });

  it("maps only active database records to public display fields", async () => {
    findMany.mockResolvedValue([{ altText: "Mikrofon", height: 800, id: "photo", imageUrl: "https://cdn/full.webp", thumbnailUrl: "https://cdn/thumb.webp", width: 1200 }]);

    await expect(getGalleryPhotos()).resolves.toEqual([expect.objectContaining({ alt: "Mikrofon", id: "photo", src: "https://cdn/full.webp", thumbnailSrc: "https://cdn/thumb.webp" })]);
  });

  it("reads active photos in their persisted order", async () => {
    findMany.mockResolvedValue([]);

    await getGalleryPhotos();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 200,
      where: { status: "ACTIVE" },
    }));
  });
});
