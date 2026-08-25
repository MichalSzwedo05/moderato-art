import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal() as { default?: Record<string, unknown>; [key: string]: unknown };
  return { ...actual, default: { ...actual.default, readFile }, readFile };
});
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;
const guide = "# Instrukcja CMS\n\nZażółć gęślą jaźń.\n";

function request(origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/user-guide", {
    headers: { origin },
    method: "POST",
  });
}

describe("POST /api/admin/user-guide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    readFile.mockResolvedValue(guide);
  });

  it("downloads the UTF-8 guide with attachment and security headers", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(guide);
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining("USER_GUIDE.md"), "utf8");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename=\"instrukcja-cms-moderato-art.md\"");
    expect(response.headers.get("Content-Length")).toBe(String(Buffer.byteLength(guide, "utf8")));
    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it.each([
    ["disabled CMS", () => mocks.getAdminAuthConfig.mockReturnValue(undefined)],
    ["anonymous session", () => mocks.getAdminSession.mockResolvedValue(undefined)],
    ["untrusted origin", () => mocks.isSameAdminOrigin.mockReturnValue(false)],
  ])("rejects %s before reading the guide", async (_case, setup) => {
    setup();

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("returns a generic error when the guide cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    readFile.mockRejectedValue(new Error("/private/path/should-not-be-exposed"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Nie udało się przygotować instrukcji." });
    expect(consoleError).toHaveBeenCalledWith("CMS user guide download failed");
    consoleError.mockRestore();
  });
});
