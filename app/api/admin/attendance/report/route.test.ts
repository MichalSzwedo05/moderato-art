import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  isSameAdminOrigin: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ attendanceActivity: { findMany: mocks.findMany } }) }));

import { POST } from "./route";

function request(body: unknown, origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/attendance/report", { body: JSON.stringify(body), headers: { "content-type": "application/json", origin }, method: "POST" });
}

describe("POST /api/admin/attendance/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ authOrigin: "https://moderato-art.example" });
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
  });

  it("returns a filtered CSV attendance report", async () => {
    mocks.findMany.mockResolvedValue([{
      activityDate: new Date("2026-10-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-01T19:00:00.000Z"),
      group: { name: "Grupa A" },
      id: "activity-1",
      name: "Lekcja 5",
      participants: [{ present: true, submission: { childName: "Anna", email: "anna@example.com", parentName: "Rodzic A" } }],
      startsAt: new Date("2026-10-01T18:00:00.000Z"),
    }]);

    const response = await POST(request({ dateFrom: "2026-10-01", dateTo: "2026-10-07", submissionId: "submission-1" }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("raport-obecnosci-");
    expect(body).toContain("\"Osoba\",\"E-mail\",\"Zajęcia\",\"Data\",\"Od\",\"Do\",\"Status\"");
    expect(body).toContain("\"Anna\",\"anna@example.com\",\"Lekcja 5\",\"2026-10-01\",\"18:00\",\"19:00\",\"Obecny\"");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ activityDate: expect.any(Object), participants: { some: { submissionId: "submission-1" } } }) }));
  });

  it("rejects an inverted date range", async () => {
    const response = await POST(request({ dateFrom: "2026-10-08", dateTo: "2026-10-01" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Podaj prawidłowy zakres dat." });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns rows for preview mode", async () => {
    mocks.findMany.mockResolvedValue([{
      activityDate: new Date("2026-10-01T00:00:00.000Z"), endsAt: null, group: { name: "Grupa A" }, id: "activity-1", name: "Lekcja 5",
      participants: [{ present: false, submission: { childName: "Jan", email: "jan@example.com", parentName: "Rodzic B" }, submissionId: "submission-1" }], startsAt: new Date("2026-10-01T18:00:00.000Z"),
    }, {
      activityDate: new Date("2026-10-02T00:00:00.000Z"), endsAt: null, group: { name: "Grupa B" }, id: "activity-2", name: "Lekcja 6",
      participants: [{ present: true, submission: { childName: "Ola", email: "ola@example.com", parentName: "Rodzic C" }, submissionId: "submission-2" }], startsAt: new Date("2026-10-02T18:00:00.000Z"),
    }]);
    const response = await POST(request({ dateFrom: "2026-10-01", dateTo: "2026-10-02", groupId: "group-1", preview: true, submissionId: "submission-1" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ dates: [{ date: "2026-10-01", id: "activity-1", label: "2026-10-01 · Lekcja 5 · 18:00" }], people: [{ email: "jan@example.com", name: "Jan", statuses: { "activity-1": false } }], selectedPerson: "submission-1" });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ groupId: "group-1" }) }));
  });

  it("returns all activity dates for an all-participant preview", async () => {
    mocks.findMany.mockResolvedValue([{
      activityDate: new Date("2026-10-01T00:00:00.000Z"), endsAt: null, group: { name: "Grupa A" }, id: "activity-1", name: "Lekcja 5",
      participants: [{ present: true, submission: { childName: "Jan", email: "jan@example.com", parentName: "Rodzic B" }, submissionId: "submission-1" }], startsAt: new Date("2026-10-01T18:00:00.000Z"),
    }]);
    const response = await POST(request({ dateFrom: "2026-10-01", dateTo: "2026-10-01", preview: true }));
    expect(await response.json()).toMatchObject({ dates: [{ date: "2026-10-01", id: "activity-1", label: "2026-10-01 · Lekcja 5 · 18:00" }], selectedPerson: null });
  });

  it("requires the admin origin and session", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ dateFrom: "2026-10-01", dateTo: "2026-10-07" }));

    expect(response.status).toBe(403);
  });
});
