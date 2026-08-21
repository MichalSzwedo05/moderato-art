import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chunkUpsert: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getPrisma: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  photoFindUnique: vi.fn(),
  photoUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));

import { PUT } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;

function request(body: BodyInit, contentType = "application/octet-stream") {
  return new Request("https://moderato-art.example/api/admin/gallery/photo/chunks/0", {
    body,
    headers: { "content-type": contentType, origin: "https://moderato-art.example" },
    method: "PUT",
  });
}

function context(index = "0") {
  return { params: Promise.resolve({ id: "photo", index }) };
}

describe("PUT /api/admin/gallery/[id]/chunks/[index]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.photoFindUnique.mockResolvedValue({ sizeBytes: 3, status: "PENDING" });
    mocks.photoUpdateMany.mockResolvedValue({ count: 1 });
    mocks.chunkUpsert.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      galleryPhoto: { updateMany: mocks.photoUpdateMany },
      galleryPhotoUploadChunk: { upsert: mocks.chunkUpsert },
    }));
    mocks.getPrisma.mockReturnValue({
      $transaction: mocks.transaction,
      galleryPhoto: { findUnique: mocks.photoFindUnique },
    });
  });

  it("requires the existing admin session before reading the chunk", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await PUT(request(Buffer.from("bad")), context());

    expect(response.status).toBe(403);
    expect(mocks.photoFindUnique).not.toHaveBeenCalled();
  });

  it("stores an exact chunk and refreshes the pending expiry", async () => {
    const response = await PUT(request(Buffer.from("abc")), context());

    expect(response.status).toBe(204);
    expect(mocks.photoUpdateMany).toHaveBeenCalledWith({ data: { expiresAt: expect.any(Date) }, where: { id: "photo", status: "PENDING" } });
    expect(mocks.chunkUpsert).toHaveBeenCalledWith({
      create: { chunkIndex: 0, data: expect.any(Uint8Array), photoId: "photo", sizeBytes: 3 },
      update: { data: expect.any(Uint8Array), sizeBytes: 3 },
      where: { photoId_chunkIndex: { chunkIndex: 0, photoId: "photo" } },
    });
  });

  it("rejects the wrong content type and chunk size", async () => {
    await expect(PUT(request(Buffer.from("abc"), "image/jpeg"), context())).resolves.toMatchObject({ status: 415 });
    await expect(PUT(request(Buffer.from("ab")), context())).resolves.toMatchObject({ status: 400 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a chunk index outside the declared upload", async () => {
    await expect(PUT(request(Buffer.from("abc")), context("1"))).resolves.toMatchObject({ status: 400 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
