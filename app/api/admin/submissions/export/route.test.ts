import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ $queryRaw: mocks.queryRaw, contactSubmission: { findMany: mocks.findMany } }) }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example" } as const;
const submission = {
  childAgeRange: "6-9",
  createdAt: new Date("2026-08-22T12:00:00.000Z"),
  deleteAfter: null,
  email: "anna@example.com",
  id: "submission",
  lessonType: "rytmika",
  message: "<script>alert(1)</script> & wiadomość\nDruga linia",
  parentName: "Anna & Jan",
  phone: null,
  privacyNoticeAcknowledgedAt: new Date("2026-08-22T12:00:00.000Z"),
  privacyNoticeVersion: "draft-db-only-2026-08-23",
  retentionAnchorAt: new Date("2026-08-22T12:00:00.000Z"),
  status: "NEW",
  updatedAt: new Date("2026-08-22T12:00:00.000Z"),
};

function request(origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/submissions/export", {
    headers: { origin },
    method: "POST",
  });
}

describe("POST /api/admin/submissions/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.queryRaw.mockResolvedValue([{ count: 1 }]);
    mocks.findMany.mockResolvedValue([submission]);
  });

  it("requires authentication and trusted origin before querying PII", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects a hostile origin before reading the session or database", async () => {
    mocks.isSameAdminOrigin.mockReturnValue(false);

    const response = await POST(request("https://evil.example"));

    expect(response.status).toBe(403);
    expect(mocks.getAdminSession).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("fails closed when the CMS is disabled", async () => {
    mocks.getAdminAuthConfig.mockReturnValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.getAdminSession).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns one UTF-8 XML attachment with private no-store headers", async () => {
    const response = await POST(request());
    const bytes = new Uint8Array(await response.arrayBuffer());
    const xml = new TextDecoder().decode(bytes);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="moderato-art-contact-submissions-\d{8}T\d{6}Z\.xml"$/);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-length")).toBe(String(bytes.byteLength));
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("Anna &amp; Jan");
    expect(xml).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; wiadomość");
    expect(xml).toContain("wiadomość\nDruga linia");
    expect(xml).toContain('count="1"');
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(xml).toMatch(/\r\n$/);
    expect(xml.replace("wiadomość\nDruga linia", "wiadomośćDruga linia").replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("returns a bounded error instead of truncating an oversized export", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1_001 }]);

    const response = await POST(request());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ message: "Eksport jest zbyt duży. Zmniejsz liczbę przechowywanych zgłoszeń i spróbuj ponownie." });
  });

  it("rejects a large encoded payload after loading only bounded records", async () => {
    mocks.findMany.mockResolvedValue([{ ...submission, message: "x".repeat(4_200_000) }]);

    const response = await POST(request());

    expect(response.status).toBe(422);
  });

  it("rejects records added after the preflight instead of truncating them", async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 1_001 }, (_, index) => ({ ...submission, id: `submission-${index}` })));

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1_001 }));
  });

  it("returns a generic error when the database is unavailable", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.findMany.mockRejectedValue(new Error("database password leaked"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Nie udało się przygotować eksportu zgłoszeń." });
    expect(consoleError).toHaveBeenCalledWith("Contact submission export failed");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("database password"));
    consoleError.mockRestore();
  });
});
