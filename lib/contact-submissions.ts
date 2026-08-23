import { z } from "zod";
import { getPrisma } from "./prisma";
import { Prisma, type ContactSubmissionStatus } from "../generated/prisma/client";

export const contactSubmissionPageSize = 50;
export const contactSubmissionExportMaxRecords = 1_000;
export const contactSubmissionExportMaxBytes = 4 * 1024 * 1024;
export const contactSubmissionFilters = ["ALL", "NEW", "CONTACTED", "ARCHIVED"] as const;

export type ContactSubmissionFilter = typeof contactSubmissionFilters[number];

const contactSubmissionFilterSchema = z.enum(contactSubmissionFilters);
const contactSubmissionPageSchema = z.coerce.number().int().min(1).max(1_000);

export type ContactSubmissionRow = {
  childAgeRange: string | null;
  createdAt: Date;
  deleteAfter: Date | null;
  email: string;
  id: string;
  lessonType: string | null;
  message: string;
  parentName: string;
  phone: string | null;
  status: ContactSubmissionStatus;
};

export type ContactSubmissionExportRow = ContactSubmissionRow & {
  retentionAnchorAt: Date;
  updatedAt: Date;
};

export class ContactSubmissionExportLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactSubmissionExportLimitError";
  }
}

export function parseContactSubmissionQuery(input: { page?: string; status?: string }) {
  const status = contactSubmissionFilterSchema.safeParse(input.status || "ALL");
  const page = contactSubmissionPageSchema.safeParse(input.page || "1");
  return {
    page: page.success ? page.data : 1,
    status: status.success ? status.data : "ALL" as const,
  };
}

export async function getContactSubmissions({ page, status }: { page: number; status: ContactSubmissionFilter }) {
  try {
    const submissions = await getPrisma().contactSubmission.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
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
      },
      skip: (page - 1) * contactSubmissionPageSize,
      take: contactSubmissionPageSize + 1,
      where: status === "ALL" ? undefined : { status },
    });

    return {
      hasNext: submissions.length > contactSubmissionPageSize,
      submissions: submissions.slice(0, contactSubmissionPageSize) as ContactSubmissionRow[],
    };
  } catch {
    console.error("Contact submissions query failed");
    return undefined;
  }
}

export async function getContactSubmissionExportRows() {
  const prisma = getPrisma();
  const [summary] = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM (
      SELECT 1
      FROM "ContactSubmission"
      LIMIT ${contactSubmissionExportMaxRecords + 1}
    ) AS "bounded"
  `);
  const recordCount = summary?.count ?? 0;
  if (recordCount > contactSubmissionExportMaxRecords) {
    throw new ContactSubmissionExportLimitError("Contact submission export exceeds the configured limit.");
  }

  const submissions = await prisma.contactSubmission.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      childAgeRange: true,
      createdAt: true,
      deleteAfter: true,
      email: true,
      id: true,
      lessonType: true,
      message: true,
      parentName: true,
      phone: true,
      retentionAnchorAt: true,
      status: true,
      updatedAt: true,
    },
    take: contactSubmissionExportMaxRecords + 1,
  });
  if (submissions.length > contactSubmissionExportMaxRecords) {
    throw new ContactSubmissionExportLimitError("Contact submission export contains too many records.");
  }
  return submissions as ContactSubmissionExportRow[];
}

export function escapeXml(value: string) {
  let sanitized = "";
  for (let index = 0; index < value.length;) {
    const codePoint = value.codePointAt(index) ?? 0xfffd;
    const characterLength = codePoint > 0xffff ? 2 : 1;
    const isValidXmlCharacter = codePoint === 0x9 || codePoint === 0xa || codePoint === 0xd
      || (codePoint >= 0x20 && codePoint <= 0xd7ff)
      || (codePoint >= 0xe000 && codePoint <= 0xfffd)
      || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
    sanitized += isValidXmlCharacter ? String.fromCodePoint(codePoint) : "\ufffd";
    index += characterLength;
  }
  return sanitized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlElement(name: string, value: Date | string | null) {
  if (value === null) return `<${name} xsi:nil="true" />`;
  const serialized = value instanceof Date ? value.toISOString() : value;
  return `<${name}>${escapeXml(serialized)}</${name}>`;
}

export function buildContactSubmissionsXml(rows: readonly ContactSubmissionExportRow[], exportedAt = new Date()) {
  const submissions = rows.map((row) => [
    "  <submission>",
    `    ${xmlElement("id", row.id)}`,
    `    ${xmlElement("parentName", row.parentName)}`,
    `    ${xmlElement("email", row.email)}`,
    `    ${xmlElement("phone", row.phone)}`,
    `    ${xmlElement("lessonType", row.lessonType)}`,
    `    ${xmlElement("childAgeRange", row.childAgeRange)}`,
    `    ${xmlElement("message", row.message)}`,
    `    ${xmlElement("status", row.status)}`,
    `    ${xmlElement("retentionAnchorAt", row.retentionAnchorAt)}`,
    `    ${xmlElement("deleteAfter", row.deleteAfter)}`,
    `    ${xmlElement("createdAt", row.createdAt)}`,
    `    ${xmlElement("updatedAt", row.updatedAt)}`,
    "  </submission>",
  ].join("\n")).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<contactSubmissions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
      + ` exportedAt="${escapeXml(exportedAt.toISOString())}" count="${rows.length}">`,
    submissions,
    "</contactSubmissions>",
  ].join("\n");
}

export function encodeContactSubmissionsXml(rows: readonly ContactSubmissionExportRow[], exportedAt = new Date()) {
  const bytes = new TextEncoder().encode(buildContactSubmissionsXml(rows, exportedAt));
  if (bytes.byteLength > contactSubmissionExportMaxBytes) {
    throw new ContactSubmissionExportLimitError("Contact submission export is too large.");
  }
  return bytes;
}
