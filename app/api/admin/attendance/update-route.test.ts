import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attendanceFindFirst: vi.fn(),
  attendanceUpdate: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }));

import { PATCH } from "./[id]/route";

const context = { params: Promise.resolve({ id: "activity-1" }) };

function request(body: unknown) {
  return new Request("https://moderato-art.example/api/admin/attendance/activity-1", { body: JSON.stringify(body), headers: { "content-type": "application/json", origin: "https://moderato-art.example" }, method: "PATCH" });
}

describe("PATCH /api/admin/attendance/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ authOrigin: "https://moderato-art.example" });
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.attendanceFindFirst.mockResolvedValueOnce({ groupId: "group-1", id: "activity-1" }).mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValue([{ id: "submission-1" }, { id: "submission-2" }, { id: "submission-3" }]);
    mocks.attendanceUpdate.mockResolvedValue({ id: "activity-1" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ attendanceActivity: { findFirst: mocks.attendanceFindFirst, update: mocks.attendanceUpdate }, attendanceParticipant: { createMany: mocks.createMany, deleteMany: mocks.deleteMany }, contactGroup: { findUnique: vi.fn().mockResolvedValue({ id: "group-1" }) }, contactSubmission: { findMany: mocks.findMany } }));
  });

  it("updates attendance with a participant added outside the group", async () => {
    const response = await PATCH(request({ activityDate: "2026-10-01", endsAt: "19:00", groupId: "group-1", name: "Lekcja 5", participants: [{ present: true, submissionId: "submission-1" }, { present: false, submissionId: "submission-2" }, { present: false, submissionId: "submission-3" }], startsAt: "18:00" }), context);

    expect(response.status).toBe(200);
    expect(mocks.createMany).toHaveBeenCalledWith({ data: [
      { activityId: "activity-1", present: true, submissionId: "submission-1" },
      { activityId: "activity-1", present: false, submissionId: "submission-2" },
      { activityId: "activity-1", present: false, submissionId: "submission-3" },
    ] });
    expect(mocks.attendanceUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: "group-1" }) }));
  });
});
