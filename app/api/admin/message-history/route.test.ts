import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getMessageHistory: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/message-history", async (importOriginal) => {
  const actual = await importOriginal() as { parseMessageHistoryChannels: (value: string | null) => unknown[] | undefined };
  return { getMessageHistory: mocks.getMessageHistory, parseMessageHistoryChannels: actual.parseMessageHistoryChannels };
});

import { GET } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;

function request(headers: Record<string, string> = { referer: "https://moderato-art.example/admin/sms" }, query = "") {
  return new Request(`https://moderato-art.example/api/admin/message-history${query}`, { headers, method: "GET" });
}

describe("GET /api/admin/message-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.getMessageHistory.mockResolvedValue([]);
  });

  it("returns the message history without caching", async () => {
    const entry = { createdAt: "2026-09-30T10:00:00.000Z", messagePreview: "Cześć", recipientCount: 4, subject: "Temat", truncated: false };
    mocks.getMessageHistory.mockResolvedValue([entry]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({ messages: [entry] });
  });

  it("scopes the history to the requested channels", async () => {
    mocks.getMessageHistory.mockResolvedValue([]);

    await GET(request({ referer: "https://moderato-art.example/admin/sms" }, "?channels=SMS,MMS"));
    expect(mocks.getMessageHistory).toHaveBeenLastCalledWith(["SMS", "MMS"]);

    await GET(request({ referer: "https://moderato-art.example/admin/email" }, "?channels=EMAIL"));
    expect(mocks.getMessageHistory).toHaveBeenLastCalledWith(["EMAIL"]);
  });

  it("rejects an unknown channel before querying", async () => {
    const response = await GET(request(undefined, "?channels=PUSH"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Nieprawidłowy kanał wiadomości." });
    expect(mocks.getMessageHistory).not.toHaveBeenCalled();
  });

  it.each([
    ["disabled CMS", () => mocks.getAdminAuthConfig.mockReturnValue(undefined)],
    ["anonymous session", () => mocks.getAdminSession.mockResolvedValue(undefined)],
    ["untrusted origin", () => mocks.isSameAdminOrigin.mockReturnValue(false)],
  ])("rejects %s", async (_case, setup) => {
    setup();

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.getMessageHistory).not.toHaveBeenCalled();
  });

  it("returns a generic error when the history cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getMessageHistory.mockRejectedValue(new Error("connection string with secret"));

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Nie udało się wczytać historii wiadomości." });
    consoleError.mockRestore();
  });
});
