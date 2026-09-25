import { z } from "zod";
import { getPrisma } from "./prisma";

export const attendanceActivityNameSchema = z.string().trim().min(1).max(160);
export const attendanceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const attendanceTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseAttendanceDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

export function getAttendanceWeekStart(value = new Date()) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date;
}

export function parseAttendanceWeek(value: string | undefined) {
  if (!value || !calendarDatePattern.test(value)) return getAttendanceWeekStart();
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? getAttendanceWeekStart() : getAttendanceWeekStart(date);
}

export function attendanceDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function shiftAttendanceWeek(value: Date, amount: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + amount * 7);
  return result;
}

export async function getAttendanceCalendarData(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return getPrisma().attendanceActivity.findMany({
    include: { participants: { select: { present: true } } },
    orderBy: [{ activityDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
    where: { activityDate: { gte: weekStart, lt: weekEnd }, invalid: false },
  });
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
