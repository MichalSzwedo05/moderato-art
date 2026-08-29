import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminSession: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getEffectivePasswordHash: vi.fn(),
  getTrustedClientAddress: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  takePasswordLoginRateLimit: vi.fn(),
  verifyAdminPassword: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  adminSessionCookie: vi.fn(() => ({ httpOnly: true, path: "/", secure: true, value: "session-token" })),
  adminSessionCookieName: "__Host-moderato-admin-session",
  createAdminSession: mocks.createAdminSession,
  getAdminAuthConfig: mocks.getAdminAuthConfig,
  getEffectivePasswordHash: mocks.getEffectivePasswordHash,
  getTrustedClientAddress: mocks.getTrustedClientAddress,
  takePasswordLoginRateLimit: mocks.takePasswordLoginRateLimit,
}));
vi.mock("@/lib/admin-password", () => ({ verifyAdminPassword: mocks.verifyAdminPassword }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));

import { POST } from "./route";

const config = {
  authOrigin: "https://moderato-art.vercel.app",
  authUrl: "https://moderato-art.vercel.app",
  mode: "password" as const,
  passwordHash: "$argon2id$test",
  rateLimitSecret: "a-very-long-secret-that-is-at-least-thirty-two-characters",
  username: "admin",
};

function request(body = new URLSearchParams({ password: "correct", username: "admin" }), origin = config.authOrigin) {
  return new Request("https://moderato-art.vercel.app/admin/auth/password", {
    body,
    headers: { "content-length": String(body.toString().length), "content-type": "application/x-www-form-urlencoded", origin, "x-forwarded-for": "203.0.113.10" },
    method: "POST",
  });
}

describe("POST /admin/auth/password", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(config);
    mocks.getEffectivePasswordHash.mockResolvedValue(config.passwordHash);
    mocks.getTrustedClientAddress.mockReturnValue("203.0.113.10");
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.takePasswordLoginRateLimit.mockResolvedValue(true);
    mocks.verifyAdminPassword.mockResolvedValue(false);
  });

  it("creates the existing secure session only after a valid password", async () => {
    mocks.verifyAdminPassword.mockResolvedValue(true);
    mocks.createAdminSession.mockResolvedValue("session-token");

    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://moderato-art.vercel.app/admin");
    expect(response.headers.get("set-cookie")).toContain("__Host-moderato-admin-session=session-token");
    expect(mocks.createAdminSession).toHaveBeenCalledWith(config);
  });

  it("returns the same generic redirect for invalid credentials and rejected origins", async () => {
    const invalidCredentials = await POST(request());
    mocks.isSameAdminOrigin.mockReturnValue(false);
    const rejectedOrigin = await POST(request(new URLSearchParams({ password: "wrong", username: "admin" }), "https://attacker.example"));

    expect(invalidCredentials.status).toBe(303);
    expect(rejectedOrigin.status).toBe(303);
    expect(invalidCredentials.headers.get("location")).toBe("https://moderato-art.vercel.app/admin?login=invalid");
    expect(rejectedOrigin.headers.get("location")).toBe("https://moderato-art.vercel.app/admin?login=invalid");
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("does not verify passwords after the database rate limit rejects a request", async () => {
    mocks.takePasswordLoginRateLimit.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(mocks.verifyAdminPassword).not.toHaveBeenCalled();
  });

  it("rejects missing, invalid, and oversized body metadata before rate limiting", async () => {
    const missingLength = await POST(new Request(request(), { headers: { "content-type": "application/x-www-form-urlencoded", origin: config.authOrigin } }));
    const invalidType = await POST(new Request(request(), { headers: { "content-length": "20", "content-type": "text/plain", origin: config.authOrigin } }));
    const oversized = await POST(new Request(request(), { headers: { "content-length": "10001", "content-type": "application/x-www-form-urlencoded", origin: config.authOrigin } }));
    const malformedLength = await POST(new Request("https://moderato-art.vercel.app/admin/auth/password", { headers: { "content-length": "1e2", "content-type": "application/x-www-form-urlencoded", origin: config.authOrigin }, method: "POST" }));

    expect(missingLength.status).toBe(303);
    expect(invalidType.status).toBe(303);
    expect(oversized.status).toBe(303);
    expect(malformedLength.status).toBe(303);
    expect(mocks.takePasswordLoginRateLimit).not.toHaveBeenCalled();
  });
});
