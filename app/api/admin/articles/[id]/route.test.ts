import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ article: { delete: mocks.delete } }) }));

import { DELETE } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example", authUrl: "https://moderato-art.example", mode: "password", passwordHash: "hash", rateLimitSecret: "secret", username: "admin" } as const;

function request(origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/articles/article", {
    headers: { origin },
    method: "DELETE",
  });
}

function context(id = "article") {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/admin/articles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.delete.mockResolvedValue({ slug: "pierwszy-artykul" });
  });

  it("deletes an authenticated article and revalidates its public paths", async () => {
    const response = await DELETE(request(), context());

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.delete).toHaveBeenCalledWith({ select: { slug: true }, where: { id: "article" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/articles/pierwszy-artykul");
  });

  it.each([
    ["disabled CMS", () => mocks.getAdminAuthConfig.mockReturnValue(undefined)],
    ["anonymous session", () => mocks.getAdminSession.mockResolvedValue(undefined)],
    ["untrusted origin", () => mocks.isSameAdminOrigin.mockReturnValue(false)],
  ])("rejects %s before deleting", async (_case, setup) => {
    setup();

    const response = await DELETE(request(), context());

    expect(response.status).toBe(403);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("rejects an invalid ID without querying the database", async () => {
    const response = await DELETE(request(), context("not valid/for an id"));

    expect(response.status).toBe(404);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("returns not found when the article was already deleted", async () => {
    mocks.delete.mockRejectedValue({ code: "P2025" });

    const response = await DELETE(request(), context());

    expect(response.status).toBe(404);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a generic error without logging database details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.delete.mockRejectedValue(new Error("database password leaked"));

    const response = await DELETE(request(), context());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Nie udało się usunąć artykułu." });
    expect(consoleError).toHaveBeenCalledWith("Article deletion failed", { id: "article" });
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("database password"));
    consoleError.mockRestore();
  });
});
