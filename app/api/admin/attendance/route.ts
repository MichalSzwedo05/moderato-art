import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import {
  attendanceActivityNameSchema,
  attendanceDateSchema,
  attendanceDateStart,
  attendanceRepeatDates,
  attendanceRepeatWeeksSchema,
  attendanceTimeSchema,
  parseAttendanceDateTime,
} from "@/lib/attendance";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  activityDate: attendanceDateSchema,
  endsAt: attendanceTimeSchema.optional().or(z.literal("")),
  groupId: z.string().trim().max(64).optional().or(z.literal("")),
  groupIds: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  name: attendanceActivityNameSchema,
  participants: z.array(z.object({ present: z.boolean(), submissionId: z.string().trim().min(1).max(100) })).max(1_000),
  repeatWeeks: attendanceRepeatWeeksSchema.optional(),
  startsAt: attendanceTimeSchema,
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { headers: { "Cache-Control": "private, no-store, max-age=0" }, status });
}

async function authorize(request: Request) {
  const config = getAdminAuthConfig();
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  return Boolean(config && isSameAdminOrigin(requestOrigin, config) && await getAdminSession());
}

function isUniqueViolation(error: unknown) {
  return error instanceof Error && ("code" in error ? error.code === "P2002" : error.message.includes("AttendanceActivity_name_activityDate_key"));
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Nieprawidłowy format żądania.", 400); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || new Set(parsed.data.participants.map((participant) => participant.submissionId)).size !== parsed.data.participants.length) return errorResponse("Uzupełnij dane aktywności i wybierz osoby.", 400);
  if (parsed.success && parsed.data.groupIds && new Set(parsed.data.groupIds).size !== parsed.data.groupIds.length) return errorResponse("Nieprawidłowa lista grup.", 400);

  const start = parseAttendanceDateTime(parsed.data.activityDate, parsed.data.startsAt);
  const end = parsed.data.endsAt ? parseAttendanceDateTime(parsed.data.activityDate, parsed.data.endsAt) : undefined;
  if (!start || (parsed.data.endsAt && !end) || (end && end <= start)) return errorResponse("Podaj prawidłowe godziny aktywności.", 400);

  const occurrences = attendanceRepeatDates(parsed.data.activityDate, parsed.data.repeatWeeks ?? 1).flatMap((activityDate) => {
    const occurrenceStart = parseAttendanceDateTime(activityDate, parsed.data.startsAt);
    const occurrenceEnd = parsed.data.endsAt ? parseAttendanceDateTime(activityDate, parsed.data.endsAt) : undefined;
    return occurrenceStart ? [{ activityDate, endsAt: occurrenceEnd ?? null, startsAt: occurrenceStart }] : [];
  });
  if (occurrences.length === 0) return errorResponse("Podaj prawidłowe godziny aktywności.", 400);
  const seriesId = occurrences.length > 1 ? crypto.randomUUID() : null;

  try {
    const prisma = getPrisma();
    const selectedGroupIds = parsed.data.groupIds ?? (parsed.data.groupId ? [parsed.data.groupId] : []);
    const selectedGroups = await Promise.all(selectedGroupIds.map((groupId) => prisma.contactGroup.findUnique({ select: { id: true }, where: { id: groupId } })));
    if (selectedGroups.some((group) => !group)) return errorResponse("Nie znaleziono wybranej grupy.", 404);
    const memberships = selectedGroupIds.length && prisma.contactGroupMembership?.findMany
      ? await prisma.contactGroupMembership.findMany({ select: { submissionId: true }, where: { groupId: { in: selectedGroupIds } } })
      : [];
    const participants = [...parsed.data.participants];
    const participantIds = new Set(participants.map((participant) => participant.submissionId));
    for (const membership of memberships) {
      if (participantIds.has(membership.submissionId)) continue;
      participantIds.add(membership.submissionId);
      participants.push({ present: false, submissionId: membership.submissionId });
    }
    if (participants.length > 1_000) return errorResponse("Wybrano zbyt wiele osób.", 400);
    const submissions = await prisma.contactSubmission.findMany({ select: { id: true }, where: { id: { in: participants.map((participant) => participant.submissionId) } } });
    if (submissions.length !== participants.length) return errorResponse("Nie znaleziono wybranej osoby.", 404);

    for (const occurrence of occurrences) {
      const conflict = await prisma.attendanceActivity.findFirst({
        select: { name: true },
        where: {
          activityDate: attendanceDateStart(occurrence.activityDate),
          endsAt: occurrence.startsAt ? { gt: occurrence.startsAt } : undefined,
          invalid: false,
          startsAt: occurrence.endsAt ? { lt: occurrence.endsAt } : { lte: occurrence.startsAt },
        },
      });
      if (conflict) return errorResponse(`Nie można utworzyć zajęć. Termin ${occurrence.activityDate} koliduje z zajęciami „${conflict.name}”. Wybierz inną godzinę.`, 409);
    }

    const created: Array<{ activityDate: string; id: string }> = [];
    const skippedDates: string[] = [];

    for (const occurrence of occurrences) {
      try {
        const activity = await prisma.attendanceActivity.create({
          data: {
            activityDate: attendanceDateStart(occurrence.activityDate),
            endsAt: occurrence.endsAt,
            groupId: selectedGroupIds[0] || null,
            ...(selectedGroupIds.length ? { groups: { create: selectedGroupIds.map((groupId) => ({ groupId })) } } : {}),
            name: parsed.data.name,
            participants: { create: participants.map((participant) => ({ present: participant.present, submissionId: participant.submissionId })) },
            seriesId,
            startsAt: occurrence.startsAt,
          },
          select: { activityDate: true, id: true },
        });
        created.push({ activityDate: occurrence.activityDate, id: activity.id });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        skippedDates.push(occurrence.activityDate);
      }
    }

    if (created.length === 0) return errorResponse("Aktywność o tej nazwie i dacie już istnieje.", 409);

    return NextResponse.json({
      activities: created,
      id: created[0].id,
      seriesId,
      skippedDates,
    }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return errorResponse("Aktywność o tej nazwie i dacie już istnieje.", 409);
    }
    console.error("Attendance activity creation failed");
    return errorResponse("Nie udało się utworzyć aktywności.", 503);
  }
}
