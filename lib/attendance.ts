import { z } from "zod";
import { getPrisma } from "./prisma";

export const attendanceActivityNameSchema = z.string().trim().min(1).max(160);
export const attendanceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const attendanceTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
export const attendanceRepeatWeeksSchema = z.number().int().min(1).max(52);
export const attendanceMaxRepeatWeeks = 52;

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a validated `YYYY-MM-DD` calendar day into an explicit UTC midnight,
 * so activities keep the same day regardless of the server timezone.
 */
export function attendanceDateStart(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function parseAttendanceDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00Z`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

/**
 * Expands a single date into the dates of a weekly repeat, so one click can
 * create the same activity on the same weekday for several weeks.
 */
export function attendanceRepeatDates(activityDate: string, weeks: number) {
  const [year, month, day] = activityDate.split("-").map(Number);
  if (!year || !month || !day) return [activityDate];

  const dates: string[] = [];
  for (let index = 0; index < Math.max(1, weeks); index += 1) {
    const date = new Date(Date.UTC(year, month - 1, day + index * 7));
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
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

export type AttendanceCalendarActivity = {
  activityDate: Date;
  endsAt: Date | null;
  id: string;
  groupId: string | null;
  name: string;
  participants: Array<{ childName: string | null; id: string; parentName: string | null; present: boolean }>;
  presentCount: number;
  seriesId: string | null;
  startsAt: Date;
  totalParticipants: number;
};

export async function getAttendanceBoardData(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const activities = await getPrisma().attendanceActivity.findMany({
    include: { participants: { select: { present: true, submission: { select: { childName: true, id: true, parentName: true } } } } },
    orderBy: [{ activityDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
    where: { activityDate: { gte: weekStart, lt: weekEnd }, invalid: false },
  });

  return activities.map((activity): AttendanceCalendarActivity => ({
    activityDate: activity.activityDate,
    endsAt: activity.endsAt,
    id: activity.id,
    groupId: activity.groupId,
    name: activity.name,
    participants: activity.participants.map((participant) => ({ childName: participant.submission.childName, id: participant.submission.id, parentName: participant.submission.parentName, present: participant.present })),
    presentCount: activity.participants.filter((participant) => participant.present).length,
    seriesId: activity.seriesId,
    startsAt: activity.startsAt,
    totalParticipants: activity.participants.length,
  }));
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
