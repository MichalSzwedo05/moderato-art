import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), getAdminAuthConfig: vi.fn(), getAdminSession: vi.fn(), isSameAdminOrigin: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ attendanceActivity: { findFirst: mocks.findFirst, updateMany: mocks.updateMany } }) }));

import { DELETE } from "./[id]/route";

const seriesActivity = { activityDate: new Date("2026-10-07T00:00:00.000Z"), seriesId: "series-1" };

function deleteRequest(query = "") {
  return new Request(`https://moderato-art.example/api/admin/attendance/activity${query}`);
}

const context = { params: Promise.resolve({ id: "activity" }) };

describe("DELETE /api/admin/attendance/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ authOrigin: "https://moderato-art.example" });
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue(seriesActivity);
  });

  it("marks the activity invalid instead of deleting it", async () => {
    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 1 });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: { invalid: true },
      where: { id: "activity", invalid: false },
    });
  });

  it("removes the whole series when asked", async () => {
    mocks.updateMany.mockResolvedValue({ count: 8 });

    const response = await DELETE(deleteRequest("?scope=series"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 8 });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: { invalid: true },
      where: { invalid: false, seriesId: "series-1" },
    });
  });

  it("removes the series from the chosen date onwards", async () => {
    const response = await DELETE(deleteRequest("?scope=future"), context);

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: { invalid: true },
      where: { activityDate: { gte: seriesActivity.activityDate }, invalid: false, seriesId: "series-1" },
    });
  });

  it("refuses to delete a series for a one off activity", async () => {
    mocks.findFirst.mockResolvedValue({ activityDate: new Date("2026-10-07T00:00:00.000Z"), seriesId: null });

    const response = await DELETE(deleteRequest("?scope=series"), context);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Ta aktywność nie jest powtórzona." });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an unknown scope", async () => {
    const response = await DELETE(deleteRequest("?scope=everything"), context);

    expect(response.status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("reports a missing activity", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await DELETE(deleteRequest("?scope=series"), context);

    expect(response.status).toBe(404);
  });
});
