import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAdminAuthConfig: vi.fn(), getAdminSession: vi.fn(), isSameAdminOrigin: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ attendanceActivity: { updateMany: mocks.updateMany } }) }));

import { DELETE } from "./[id]/route";

describe("DELETE /api/admin/attendance/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ authOrigin: "https://moderato-art.example" });
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks the activity invalid instead of deleting it", async () => {
    const response = await DELETE(new Request("https://moderato-art.example/api/admin/attendance/activity"), { params: Promise.resolve({ id: "activity" }) });

    expect(response.status).toBe(204);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: { invalid: true },
      where: { id: "activity", invalid: false },
    });
  });
});
