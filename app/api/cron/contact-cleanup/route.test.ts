import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cleanupExpiredContactData = vi.hoisted(() => vi.fn());
vi.mock("@/lib/contact-cleanup", () => ({ cleanupExpiredContactData }));

import { GET } from "./route";

describe("GET /api/cron/contact-cleanup", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    cleanupExpiredContactData.mockResolvedValue({ contactSubmissions: 1, loginRateLimits: 0, magicLinks: 0, sessions: 0 });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.clearAllMocks();
  });

  it("requires the Vercel cron bearer secret", async () => {
    const response = await GET(new Request("https://moderato-art.example/api/cron/contact-cleanup"));

    expect(response.status).toBe(401);
    expect(cleanupExpiredContactData).not.toHaveBeenCalled();
  });

  it("runs cleanup with the configured bearer secret", async () => {
    const response = await GET(new Request("https://moderato-art.example/api/cron/contact-cleanup", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ contactSubmissions: 1, loginRateLimits: 0, magicLinks: 0, sessions: 0 });
  });

  it("returns a generic error when cleanup fails", async () => {
    cleanupExpiredContactData.mockRejectedValue(new Error("database credentials leaked"));

    const response = await GET(new Request("https://moderato-art.example/api/cron/contact-cleanup", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Nie udało się wykonać czyszczenia danych." });
  });
});
