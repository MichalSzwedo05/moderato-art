import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mmsContentCreate: vi.fn(),
  mmsContentDeleteMany: vi.fn(),
  mmsContentFindUnique: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    mmsContent: {
      create: mocks.mmsContentCreate,
      deleteMany: mocks.mmsContentDeleteMany,
      findUnique: mocks.mmsContentFindUnique,
    },
  }),
}));

import { createMmsContent, readMmsContent } from "./mms-content";

describe("MMS content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mmsContentCreate.mockResolvedValue({ id: "short-id" });
    mocks.mmsContentDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("stores the message and returns a short resource id", async () => {
    const now = new Date("2026-09-30T22:00:00.000Z");

    await expect(createMmsContent("Szanowni Państwo, ".repeat(100), now)).resolves.toBe("short-id");

    const { data } = mocks.mmsContentCreate.mock.calls[0][0];
    expect(data.message).toBe("Szanowni Państwo, ".repeat(100));
    expect(data.expiresAt.getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });

  it("returns stored content while it is valid", async () => {
    const now = new Date("2026-09-30T22:00:00.000Z");
    mocks.mmsContentFindUnique.mockResolvedValue({ expiresAt: new Date(now.getTime() + 60_000), message: "Treść" });

    await expect(readMmsContent("short-id", now)).resolves.toBe("Treść");
    expect(mocks.mmsContentDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes and hides expired content", async () => {
    const now = new Date("2026-09-30T22:00:00.000Z");
    mocks.mmsContentFindUnique.mockResolvedValue({ expiresAt: new Date(now.getTime() - 1), message: "Treść" });

    await expect(readMmsContent("short-id", now)).resolves.toBeUndefined();
    expect(mocks.mmsContentDeleteMany).toHaveBeenCalledWith({ where: { id: "short-id" } });
  });

  it("hides unknown content", async () => {
    mocks.mmsContentFindUnique.mockResolvedValue(null);

    await expect(readMmsContent("missing")).resolves.toBeUndefined();
  });
});
