import { z } from "zod";
import { getPrisma } from "./prisma";

export const attendanceActivityNameSchema = z.string().trim().min(1).max(160);
export const attendanceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const attendanceTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export function parseAttendanceDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

export async function getAttendanceData() {
  const prisma = getPrisma();
  const [activities, recipients] = await Promise.all([
    prisma.attendanceActivity.findMany({
      where: { invalid: false },
      include: {
        participants: {
          orderBy: { submission: { createdAt: "desc" } },
          select: {
            present: true,
            submission: { select: { childName: true, email: true, id: true, parentName: true, phone: true } },
            submissionId: true,
          },
        },
      },
      orderBy: [{ activityDate: "desc" }, { startsAt: "desc" }, { id: "desc" }],
    }),
    prisma.contactSubmission.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { childName: true, email: true, id: true, parentName: true, phone: true },
      take: 1_000,
    }),
  ]);
  return { activities, recipients };
}
