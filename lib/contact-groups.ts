import { z } from "zod";
import { getPrisma } from "./prisma";

export const contactGroupNameMaxLength = 120;
export const contactGroupNameSchema = z.string().trim().min(1).max(contactGroupNameMaxLength);

export async function getContactGroups() {
  return getPrisma().contactGroup.findMany({
    include: {
      memberships: {
        select: { submissionId: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });
}

export async function getContactGroupRecipients() {
  return getPrisma().contactSubmission.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { childName: true, email: true, id: true, parentName: true, phone: true },
    take: 1_000,
  });
}
