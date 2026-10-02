import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  groupMembershipFindMany: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ attendanceActivity: { create: mocks.create, delete: mocks.delete, findFirst: mocks.findFirst, updateMany: mocks.updateMany }, contactGroup: { findUnique: vi.fn().mockResolvedValue({ id: "group-1" }) }, contactGroupMembership: { findMany: mocks.groupMembershipFindMany }, contactSubmission: { findMany: mocks.findMany } }) }));


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
    mocks.groupMembershipFindMany.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: "activity" });
    mocks.findFirst.mockResolvedValue(null);
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

  it("repeats the activity on the same weekday for the requested weeks", async () => {
    mocks.create.mockImplementation(async ({ data }: { data: { activityDate: Date } }) => ({ activityDate: data.activityDate, id: `activity-${data.activityDate.toISOString().slice(0, 10)}` }));

    const response = await POST(request({ activityDate: "2026-09-28", endsAt: "17:00", name: "Lekcja 1", participants: [{ present: false, submissionId: "one" }], repeatWeeks: 3, startsAt: "16:00" }));

    expect(response.status).toBe(201);
    const body = await response.json() as { activities: Array<{ activityDate: string }>; seriesId: string | null; skippedDates: string[] };
    expect(body.activities.map((activity) => activity.activityDate)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(body.skippedDates).toEqual([]);
    expect(body.seriesId).toEqual(expect.any(String));
    const calls = mocks.create.mock.calls.map((call) => (call[0] as { data: { seriesId: string | null; startsAt: Date } }).data);
    expect(new Set(calls.map((data) => data.seriesId)).size).toBe(1);
    expect(calls.map((data) => data.startsAt.toISOString())).toEqual(["2026-09-28T16:00:00.000Z", "2026-10-05T16:00:00.000Z", "2026-10-12T16:00:00.000Z"]);
  });

  it("keeps the dates that are free and reports the ones that already exist", async () => {
    mocks.create.mockImplementation(async ({ data }: { data: { activityDate: Date } }) => {
      if (data.activityDate.toISOString().slice(0, 10) === "2026-10-05") throw Object.assign(new Error("duplicate"), { code: "P2002" });
      return { activityDate: data.activityDate, id: `activity-${data.activityDate.toISOString().slice(0, 10)}` };
    });

    const response = await POST(request({ activityDate: "2026-09-28", endsAt: "17:00", name: "Lekcja 1", participants: [{ present: false, submissionId: "one" }], repeatWeeks: 3, startsAt: "16:00" }));

    expect(response.status).toBe(201);
    const body = await response.json() as { activities: Array<{ activityDate: string }>; skippedDates: string[] };
    expect(body.activities.map((activity) => activity.activityDate)).toEqual(["2026-09-28", "2026-10-12"]);
    expect(body.skippedDates).toEqual(["2026-10-05"]);
  });

  it("rejects a repeat that is too long", async () => {
    const response = await POST(request({ activityDate: "2026-09-28", name: "Lekcja 1", participants: [{ present: false, submissionId: "one" }], repeatWeeks: 60, startsAt: "16:00" }));

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a time overlap before creating an activity", async () => {
    mocks.findFirst.mockResolvedValue({ name: "Lekcja 4" });

    const response = await POST(request({ activityDate: "2026-09-28", endsAt: "17:00", name: "Lekcja 5", participants: [{ present: false, submissionId: "one" }], startsAt: "16:00" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("koliduje z zajęciami") });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a single activity without a series", async () => {
    const response = await POST(request({ activityDate: "2026-09-28", endsAt: "17:00", name: "Lekcja 1", participants: [{ present: false, submissionId: "one" }], startsAt: "16:00" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ seriesId: null, skippedDates: [] });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("adds the deduplicated members of every selected group", async () => {
    mocks.findMany.mockResolvedValue([{ id: "one" }, { id: "two" }, { id: "three" }]);
    mocks.groupMembershipFindMany.mockResolvedValue([{ submissionId: "one" }, { submissionId: "two" }, { submissionId: "two" }, { submissionId: "three" }]);
    const response = await POST(request({ activityDate: "2026-09-28", endsAt: "17:00", groupId: "group-1", groupIds: ["group-1", "group-2"], name: "Lekcja grupowa", participants: [{ present: true, submissionId: "one" }], startsAt: "16:00" }));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participants: { create: [
      { present: true, submissionId: "one" },
      { present: false, submissionId: "two" },
      { present: false, submissionId: "three" },
    ] } }) }));
  });
});
