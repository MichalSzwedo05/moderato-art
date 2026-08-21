import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getTrustedClientAddress: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  takeGalleryUploadRateLimit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession, getTrustedClientAddress: mocks.getTrustedClientAddress, takeGalleryUploadRateLimit: mocks.takeGalleryUploadRateLimit }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { create: mocks.create, deleteMany: mocks.deleteMany } }) }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;

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
    mocks.create.mockResolvedValue({ id: "photo" });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("requires the existing admin session before parsing input", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ altText: "Zdjęcie", contentType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a pending record without external object storage", async () => {
    const response = await POST(request({ altText: "  Mikrofon  ", contentType: "image/jpeg", size: 100 }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ chunkCount: 1, chunkSize: 1_048_576, photoId: expect.any(String) });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ altText: "Mikrofon", mimeType: "image/jpeg", status: "PENDING" }) });
  });

  it("returns the expected number of chunks for a large upload", async () => {
    const response = await POST(request({ altText: "Duże zdjęcie", contentType: "image/jpeg", size: 2_500_000 }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ chunkCount: 3, chunkSize: 1_048_576, photoId: expect.any(String) });
  });

  it("rejects invalid metadata", async () => {
    const response = await POST(request({ altText: "", contentType: "image/svg+xml", size: 100 }));

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("bounds the JSON body even when content length is absent", async () => {
    const oversized = new Request("https://moderato-art.example/api/admin/gallery", {
      body: "x".repeat(20_001),
      headers: { "content-type": "application/json", origin: "https://moderato-art.example" },
      method: "POST",
    });
    oversized.headers.delete("content-length");

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
