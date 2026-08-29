import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getEffectivePasswordHash: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  resolveAdminSessionVersion: vi.fn(),
  hashAdminPassword: vi.fn(),
  verifyAdminPassword: vi.fn(),
  prismaAdminPasswordUpsert: vi.fn(),
  prismaAdminSessionUpdateMany: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminAuthConfig: mocks.getAdminAuthConfig,
  getAdminSession: mocks.getAdminSession,
  getEffectivePasswordHash: mocks.getEffectivePasswordHash,
  resolveAdminSessionVersion: mocks.resolveAdminSessionVersion,
}));
vi.mock("@/lib/admin-password", () => ({
  hashAdminPassword: mocks.hashAdminPassword,
  minimumAdminPasswordLength: 12,
  verifyAdminPassword: mocks.verifyAdminPassword,
}));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: mocks.getPrisma,
}));

import { POST } from "./route";

const config = {
  authOrigin: "https://moderato-art.vercel.app",
  authUrl: "https://moderato-art.vercel.app",
  mode: "password" as const,
  passwordHash: "$argon2id$env-hash",
  rateLimitSecret: "a-very-long-secret-that-is-at-least-thirty-two-characters",
  username: "admin",
};

const session = {
  authMode: "password",
  credentialVersion: "old-version",
  expiresAt: new Date(Date.now() + 60_000),
  id: "session-1",
  revokedAt: null,
  sessionHash: "abc",
};

function request(body = new URLSearchParams({ currentPassword: "correct", newPassword: "new-password-123", confirmPassword: "new-password-123" }), origin = config.authOrigin) {
  return new Request("https://moderato-art.vercel.app/admin/auth/change-password", {
    body,
    headers: { "content-length": String(body.toString().length), "content-type": "application/x-www-form-urlencoded", origin },
    method: "POST",
  });
}

describe("POST /admin/auth/change-password", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(config);
    mocks.getAdminSession.mockResolvedValue(session);
    mocks.getEffectivePasswordHash.mockResolvedValue(config.passwordHash);
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.resolveAdminSessionVersion.mockResolvedValue("new-version");
    mocks.hashAdminPassword.mockResolvedValue("$argon2id$new-hash");
    mocks.verifyAdminPassword.mockResolvedValue(true);
    mocks.getPrisma.mockReturnValue({
      adminPassword: { upsert: mocks.prismaAdminPasswordUpsert },
      adminSession: { updateMany: mocks.prismaAdminSessionUpdateMany },
    });
    mocks.prismaAdminPasswordUpsert.mockResolvedValue({});
    mocks.prismaAdminSessionUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects requests without an authenticated session", async () => {
    mocks.getAdminSession.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.prismaAdminPasswordUpsert).not.toHaveBeenCalled();
  });

  it("rejects requests for the magic-link mode", async () => {
    mocks.getAdminAuthConfig.mockReturnValue({ ...config, mode: "magic_link" });
    const response = await POST(request());
    expect(response.status).toBe(404);
  });

  it("rejects mismatched or short new passwords", async () => {
    const mismatch = await POST(request(new URLSearchParams({ currentPassword: "correct", newPassword: "new-password-123", confirmPassword: "different-password-456" })));
    const short = await POST(request(new URLSearchParams({ currentPassword: "correct", newPassword: "short", confirmPassword: "short" })));
    expect(mismatch.status).toBe(400);
    expect(short.status).toBe(400);
    expect(mocks.verifyAdminPassword).not.toHaveBeenCalled();
  });

  it("rejects requests with an incorrect current password", async () => {
    mocks.verifyAdminPassword.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.prismaAdminPasswordUpsert).not.toHaveBeenCalled();
  });

  it("persists the new hash and refreshes the current session on success", async () => {
    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://moderato-art.vercel.app/admin/password?password=changed");
    expect(mocks.prismaAdminPasswordUpsert).toHaveBeenCalledWith({
      where: { username: "admin" },
      update: { passwordHash: "$argon2id$new-hash" },
      create: { username: "admin", passwordHash: "$argon2id$new-hash" },
    });
    expect(mocks.prismaAdminSessionUpdateMany).toHaveBeenCalledWith({
      data: { credentialVersion: "new-version" },
      where: { expiresAt: { gt: expect.any(Date) }, revokedAt: null, sessionHash: "abc" },
    });
  });
});
