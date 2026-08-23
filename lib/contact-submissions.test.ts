import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
vi.mock("./prisma", () => ({ getPrisma: () => ({ contactSubmission: { findMany } }) }));

const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

import {
  contactSubmissionPageSize,
  getContactSubmissions,
  parseContactSubmissionQuery,
} from "./contact-submissions";

describe("contact submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleError.mockClear();
  });

  it("normalizes invalid filters and page numbers", () => {
    expect(parseContactSubmissionQuery({ page: "0", status: "INVALID" })).toEqual({ page: 1, status: "ALL" });
    expect(parseContactSubmissionQuery({ page: "1001", status: "ALL" })).toEqual({ page: 1, status: "ALL" });
    expect(parseContactSubmissionQuery({ page: "3", status: "CONTACTED" })).toEqual({ page: 3, status: "CONTACTED" });
  });

  it("queries only the bounded fields in stable newest-first order", async () => {
    findMany.mockResolvedValue([{ id: "submission", status: "NEW" }]);

    const result = await getContactSubmissions({ page: 2, status: "NEW" });

    expect(result).toEqual({ hasNext: false, submissions: [{ id: "submission", status: "NEW" }] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: contactSubmissionPageSize,
      take: contactSubmissionPageSize + 1,
      where: { status: "NEW" },
    }));
    expect(findMany.mock.calls[0][0].select).toEqual({
      childAgeRange: true,
      createdAt: true,
      deleteAfter: true,
      email: true,
      id: true,
      lessonType: true,
      message: true,
      parentName: true,
      phone: true,
      status: true,
    });
  });

  it("returns the next-page flag without exposing more than one page", async () => {
    findMany.mockResolvedValue(Array.from({ length: contactSubmissionPageSize + 1 }, (_, index) => ({ id: String(index) })));

    const result = await getContactSubmissions({ page: 1, status: "ALL" });

    expect(result?.hasNext).toBe(true);
    expect(result?.submissions).toHaveLength(contactSubmissionPageSize);
  });

  it("fails closed when the database query fails", async () => {
    findMany.mockRejectedValue(new Error("database password and host leaked"));

    await expect(getContactSubmissions({ page: 1, status: "ALL" })).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("Contact submissions query failed");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("database password"));
  });
});
