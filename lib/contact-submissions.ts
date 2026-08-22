import { z } from "zod";
import { getPrisma } from "./prisma";
import type { ContactSubmissionStatus } from "../generated/prisma/client";

export const contactSubmissionPageSize = 50;
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
