import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const queryRaw = vi.fn();
const create = vi.fn();
vi.mock("./prisma", () => ({ getPrisma: () => ({ $queryRaw: queryRaw, contactSubmission: { create, findMany } }) }));

const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

import {
  buildContactSubmissionsXml,
  createContactSubmission,
  contactSubmissionPageSize,
  contactSubmissionExportMaxBytes,
  addContactRetentionPeriod,
  encodeContactSubmissionsXml,
  getContactSubmissionExportRows,
  getContactSubmissions,
  parseContactSubmissionQuery,
} from "./contact-submissions";
import type { ContactSubmissionExportRow } from "./contact-submissions";

function exportRow(overrides: Partial<ContactSubmissionExportRow> = {}): ContactSubmissionExportRow {
  return {
    childAgeRange: "6-9",
    createdAt: new Date("2026-08-22T12:00:00.000Z"),
    deleteAfter: null,
    email: "anna@example.com",
    id: "submission",
    lessonType: "rytmika",
    message: "Wiadomość",
    parentName: "Anna Kowalska",
    phone: null,
    privacyNoticeAcknowledgedAt: new Date("2026-08-22T12:00:00.000Z"),
    privacyNoticeVersion: "draft-db-only-2026-08-23",
    retentionAnchorAt: new Date("2026-08-22T12:00:00.000Z"),
    status: "NEW",
    updatedAt: new Date("2026-08-22T12:00:00.000Z"),
    ...overrides,
  };
}

describe("contact submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleError.mockClear();
    queryRaw.mockResolvedValue([{ count: 1 }]);
    create.mockResolvedValue({ id: "submission" });
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
       privacyNoticeAcknowledgedAt: true,
       privacyNoticeVersion: true,
       status: true,
    });
  });

  it("returns the next-page flag without exposing more than one page", async () => {
    findMany.mockResolvedValue(Array.from({ length: contactSubmissionPageSize + 1 }, (_, index) => ({ id: String(index) })));

    const result = await getContactSubmissions({ page: 1, status: "ALL" });

    expect(result?.hasNext).toBe(true);
    expect(result?.submissions).toHaveLength(contactSubmissionPageSize);
  });

  it("preflights and fetches all export fields without a status filter", async () => {
    findMany.mockResolvedValue([exportRow()]);

    await expect(getContactSubmissionExportRows()).resolves.toHaveLength(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 1_001,
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
       privacyNoticeAcknowledgedAt: true,
       privacyNoticeVersion: true,
       retentionAnchorAt: true,
      status: true,
      updatedAt: true,
    });
  });

  it("sets the draft notice audit fields and twelve-month deletion deadline", async () => {
    const acknowledgedAt = new Date("2026-08-23T12:00:00.000Z");

    await expect(createContactSubmission({
      email: "anna@example.com",
      message: "Proszę o informacje o zajęciach.",
      parentName: "Anna Kowalska",
      privacyNoticeAcknowledgedAt: acknowledgedAt,
      privacyNoticeVersion: "draft-2026-08-23",
    })).resolves.toEqual({ id: "submission" });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        deleteAfter: expect.any(Date),
        privacyNoticeAcknowledgedAt: acknowledgedAt,
        privacyNoticeVersion: "draft-2026-08-23",
      }),
      select: { id: true },
    }));
  });

  it("adds twelve calendar months without overflowing month ends", () => {
    expect(addContactRetentionPeriod(new Date("2028-02-29T12:00:00.000Z")).toISOString()).toBe("2029-02-28T12:00:00.000Z");
    expect(addContactRetentionPeriod(new Date("2026-01-31T12:00:00.000Z")).toISOString()).toBe("2027-01-31T12:00:00.000Z");
  });

  it("fails closed when the database query fails", async () => {
    findMany.mockRejectedValue(new Error("database password and host leaked"));

    await expect(getContactSubmissions({ page: 1, status: "ALL" })).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("Contact submissions query failed");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("database password"));
  });

  it("creates well-formed escaped XML with UTF-8 data and explicit nulls", () => {
    const xml = buildContactSubmissionsXml([exportRow({
      message: "<script>alert(1)</script> & \u0001 Zażółć 😀",
      parentName: "Anna & Jan",
    })], new Date("2026-08-23T12:34:56.000Z"));
    const document = new DOMParser().parseFromString(xml, "application/xml");

    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.documentElement.getAttribute("count")).toBe("1");
    expect(document.querySelector("parentName")?.textContent).toBe("Anna & Jan");
    expect(document.querySelector("message")?.textContent).toBe("<script>alert(1)</script> & \ufffd Zażółć 😀");
    expect(document.querySelector("phone")?.getAttribute("xsi:nil")).toBe("true");
    expect(document.querySelector("privacyNoticeVersion")?.textContent).toBe("draft-db-only-2026-08-23");
    expect(document.querySelector("privacyNoticeAcknowledgedAt")?.textContent).toBe("2026-08-22T12:00:00.000Z");
    expect(xml).toContain('exportedAt="2026-08-23T12:34:56.000Z"');
    expect(xml).not.toContain("<!DOCTYPE");

    const encoded = encodeContactSubmissionsXml([exportRow()], new Date("2026-08-23T12:34:56.000Z"));
    expect(Array.from(encoded.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(encoded)).toContain("\r\n");
    expect(new TextDecoder().decode(encoded)).toMatch(/\r\n$/);
  });

  it("keeps empty exports compact and separates multiple submissions visually", () => {
    const exportedAt = new Date("2026-08-23T12:34:56.000Z");
    const empty = buildContactSubmissionsXml([], exportedAt);
    expect(empty.split("\r\n")).toEqual([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<contactSubmissions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" exportedAt="2026-08-23T12:34:56.000Z" count="0">',
      "</contactSubmissions>",
      "",
    ]);

    const single = buildContactSubmissionsXml([exportRow({
      message: "  pierwsza linia\n\n  druga linia",
    })], exportedAt);
    const singleDocument = new DOMParser().parseFromString(single, "application/xml");
    expect(singleDocument.querySelector("message")?.textContent).toBe("  pierwsza linia\n\n  druga linia");
    expect(single).toContain('count="1">\r\n  <submission>');
    expect(single).toContain("  </submission>\r\n</contactSubmissions>\r\n");

    const multiple = buildContactSubmissionsXml([
      exportRow({ id: "first" }),
      exportRow({ id: "second" }),
    ], exportedAt);
    expect(multiple).toContain("  </submission>\r\n\r\n  <submission>");
    expect(multiple).not.toContain('count="2">\r\n\r\n  <submission>');
    expect(multiple).not.toContain("</submission>\r\n\r\n</contactSubmissions>");
  });

  it("rejects an XML payload over the byte limit instead of truncating it", () => {
    expect(() => encodeContactSubmissionsXml([exportRow({ message: "x".repeat(4_200_000) })])).toThrow("too large");
  });

  it("uses the actual encoded size instead of a worst-case text-size estimate", () => {
    const bytes = encodeContactSubmissionsXml([exportRow({ message: "x".repeat(700_000) })]);

    expect(bytes.byteLength).toBeLessThan(contactSubmissionExportMaxBytes);
  });

  it("counts the UTF-8 BOM and structural line endings at the export limit", () => {
    const exportedAt = new Date("2026-08-23T12:34:56.000Z");
    const base = encodeContactSubmissionsXml([exportRow({ message: "" })], exportedAt);
    const paddingLength = contactSubmissionExportMaxBytes - base.byteLength;

    expect(encodeContactSubmissionsXml([exportRow({ message: "x".repeat(paddingLength) })], exportedAt)).toHaveLength(contactSubmissionExportMaxBytes);
    expect(() => encodeContactSubmissionsXml([exportRow({ message: "x".repeat(paddingLength + 1) })], exportedAt)).toThrow("too large");
  });
});
