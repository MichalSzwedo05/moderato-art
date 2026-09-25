import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ attendanceActivity: { create: mocks.create, delete: mocks.delete, updateMany: mocks.updateMany }, contactSubmission: { findMany: mocks.findMany } }) }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("https://moderato-art.example/api/admin/attendance", { body: JSON.stringify(body), headers: { "content-type": "application/json", origin: "https://moderato-art.example" }, method: "POST" });
}

describe("POST /api/admin/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ authOrigin: "https://moderato-art.example" });
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([{ id: "one" }]);
    mocks.create.mockResolvedValue({ id: "activity" });
  });

  it("creates an activity with selected participants", async () => {
    const response = await POST(request({ activityDate: "2026-09-24", endsAt: "17:00", name: "Studio", participants: [{ present: true, submissionId: "one" }], startsAt: "16:00" }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("rejects invalid time ranges", async () => {
    const response = await POST(request({ activityDate: "2026-09-24", endsAt: "15:00", name: "Studio", participants: [{ present: false, submissionId: "one" }], startsAt: "16:00" }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a conflict when the name and date already exist", async () => {
    mocks.create.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "P2002" }));

    const response = await POST(request({ activityDate: "2026-09-24", endsAt: "17:00", name: "Lekcja 1", startsAt: "16:00", participants: [{ present: false, submissionId: "one" }] }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: "Aktywność o tej nazwie i dacie już istnieje." });
  });
});
