import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminLoginRateLimitDeleteMany: vi.fn(),
  adminMagicLinkDeleteMany: vi.fn(),
  adminSessionDeleteMany: vi.fn(),
  contactSubmissionDeleteMany: vi.fn(),
  contactSubmissionFindMany: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    adminLoginRateLimit: { deleteMany: mocks.adminLoginRateLimitDeleteMany },
    adminMagicLink: { deleteMany: mocks.adminMagicLinkDeleteMany },
    adminSession: { deleteMany: mocks.adminSessionDeleteMany },
    contactSubmission: {
      deleteMany: mocks.contactSubmissionDeleteMany,
      findMany: mocks.contactSubmissionFindMany,
    },
  }),
}));

import { cleanupExpiredContactData } from "./contact-cleanup";

describe("cleanupExpiredContactData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contactSubmissionFindMany.mockResolvedValueOnce([{ id: "expired" }]).mockResolvedValueOnce([]);
    mocks.contactSubmissionDeleteMany.mockResolvedValue({ count: 1 });
    mocks.adminMagicLinkDeleteMany.mockResolvedValue({ count: 2 });
    mocks.adminSessionDeleteMany.mockResolvedValue({ count: 3 });
    mocks.adminLoginRateLimitDeleteMany.mockResolvedValue({ count: 4 });
  });

  it("deletes expired contact data and authentication records", async () => {
    const now = new Date("2026-08-23T03:00:00.000Z");

    await expect(cleanupExpiredContactData(now)).resolves.toEqual({
      contactSubmissions: 1,
      loginRateLimits: 4,
      magicLinks: 2,
      sessions: 3,
    });
    expect(mocks.contactSubmissionFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(mocks.adminMagicLinkDeleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: now } } });
  });
});
