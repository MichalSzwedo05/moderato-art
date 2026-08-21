import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { deleteMany: mocks.deleteMany, findUnique: mocks.findUnique, updateMany: mocks.updateMany } }) }));

import { DELETE } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;

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
    mocks.findUnique.mockResolvedValue({ id: "photo" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("removes a seeded static photo without external storage", async () => {
    const response = await DELETE(request("music-room"), context("music-room"));

    expect(response.status).toBe(204);
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "DELETING" }), where: { id: "music-room" } });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "music-room", status: "DELETING" } });
  });

  it("removes database-backed image assets through the cascading parent delete", async () => {
    const response = await DELETE(request("photo"), context("photo"));

    expect(response.status).toBe(204);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "photo", status: "DELETING" } });
  });

  it("keeps a non-public tombstone when the database delete fails", async () => {
    mocks.deleteMany.mockRejectedValue(new Error("database unavailable"));

    const response = await DELETE(request("photo"), context("photo"));

    expect(response.status).toBe(503);
    expect(mocks.updateMany).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), status: "DELETING" }), where: { id: "photo" } });
  });
});
