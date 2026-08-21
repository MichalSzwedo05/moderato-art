import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  createGalleryUploadUrl: vi.fn(),
  deleteMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getGalleryStorageConfig: vi.fn(),
  getTrustedClientAddress: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  takeGalleryUploadRateLimit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession, getTrustedClientAddress: mocks.getTrustedClientAddress, takeGalleryUploadRateLimit: mocks.takeGalleryUploadRateLimit }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/gallery-storage", () => ({ createGalleryUploadUrl: mocks.createGalleryUploadUrl, getGalleryStorageConfig: mocks.getGalleryStorageConfig, makeGalleryStorageKey: (config: { prefix: string }, ...parts: string[]) => [config.prefix, ...parts].join("/") }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { create: mocks.create, deleteMany: mocks.deleteMany } }) }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;
const storageConfig = { prefix: "gallery" };

function request(body: unknown) {
  return new Request("https://moderato-art.example/api/admin/gallery", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "https://moderato-art.example" },
    method: "POST",
  });
}

describe("POST /api/admin/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.getTrustedClientAddress.mockReturnValue("127.0.0.1");
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.takeGalleryUploadRateLimit.mockResolvedValue(true);
    mocks.getGalleryStorageConfig.mockReturnValue(storageConfig);
    mocks.create.mockResolvedValue({ id: "photo" });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.createGalleryUploadUrl.mockResolvedValue("https://storage.example/upload");
  });

  it("requires the existing admin session before parsing input", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ altText: "Zdjęcie", contentType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("fails closed when storage is not configured", async () => {
    mocks.getGalleryStorageConfig.mockReturnValue(undefined);

    const response = await POST(request({ altText: "Zdjęcie", contentType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a pending record and returns a presigned upload URL", async () => {
    const response = await POST(request({ altText: "  Mikrofon  ", contentType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ photoId: expect.any(String), uploadUrl: "https://storage.example/upload" });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ altText: "Mikrofon", mimeType: "image/jpeg", status: "PENDING" }) });
  });

  it("rejects invalid metadata", async () => {
    const response = await POST(request({ altText: "", contentType: "image/svg+xml", size: 100 }));

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
