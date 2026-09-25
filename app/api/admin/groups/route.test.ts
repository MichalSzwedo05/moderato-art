import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/contact-groups", () => ({ getContactGroups: mocks.findMany, contactGroupNameSchema: z.string().trim().min(1).max(120) }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ contactGroup: { create: mocks.create } }) }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example" };

function request(body: unknown, origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/groups", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

describe("POST /api/admin/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.create.mockResolvedValue({ id: "group-one", name: "Junior Voice" });
  });

  it("creates a named group for an authenticated administrator", async () => {
    const response = await POST(request({ name: " Junior Voice " }));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ data: { name: "Junior Voice" } });
  });

  it("rejects unauthenticated requests before creating a group", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ name: "Nie twórz" }));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts a same-origin referer when the browser omits Origin", async () => {
    const refererRequest = request({ name: "Referer group" });
    refererRequest.headers.delete("origin");
    refererRequest.headers.set("referer", "https://moderato-art.example/admin/groups");

    const response = await POST(refererRequest);

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });
});
