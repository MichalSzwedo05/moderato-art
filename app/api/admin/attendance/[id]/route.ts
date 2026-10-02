import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { attendanceActivityNameSchema, attendanceDateSchema, attendanceDateStart, attendanceTimeSchema, parseAttendanceDateTime } from "@/lib/attendance";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  activityDate: attendanceDateSchema,
  endsAt: attendanceTimeSchema.optional().or(z.literal("")),
  groupId: z.string().trim().max(64).optional().or(z.literal("")),
  groupIds: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  name: attendanceActivityNameSchema,
  participants: z.array(z.object({ present: z.boolean(), submissionId: z.string().trim().min(1).max(100) })).max(1_000).optional(),
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

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  const id = (await context.params).id;
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Nieprawidłowy format żądania.", 400); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Nieprawidłowe dane aktywności.", 400);
  if (parsed.data.participants && new Set(parsed.data.participants.map((participant) => participant.submissionId)).size !== parsed.data.participants.length) return errorResponse("Nieprawidłowa lista uczestników.", 400);
  if (parsed.data.groupIds && new Set(parsed.data.groupIds).size !== parsed.data.groupIds.length) return errorResponse("Nieprawidłowa lista grup.", 400);
  const start = parseAttendanceDateTime(parsed.data.activityDate, parsed.data.startsAt);
  const end = parsed.data.endsAt ? parseAttendanceDateTime(parsed.data.activityDate, parsed.data.endsAt) : undefined;
  if (!start || (parsed.data.endsAt && !end) || (end && end <= start)) return errorResponse("Podaj prawidłowe godziny aktywności.", 400);

  try {
    const prisma = getPrisma();
    const result = await prisma.$transaction(async (transaction) => {
       const activity = await transaction.attendanceActivity.findFirst({ where: { id, invalid: false }, select: { groupId: true, groups: { select: { groupId: true } }, id: true } });
       if (!activity) return undefined;
       const selectedGroupIds = parsed.data.groupIds ?? (parsed.data.groupId !== undefined ? (parsed.data.groupId ? [parsed.data.groupId] : []) : activity.groups?.map((group) => group.groupId) || (activity.groupId ? [activity.groupId] : []));
       const selectedGroups = await Promise.all(selectedGroupIds.map((groupId) => transaction.contactGroup.findUnique({ select: { id: true }, where: { id: groupId } })));
       if (selectedGroups.some((group) => !group)) return null;
       const memberships = selectedGroupIds.length && transaction.contactGroupMembership?.findMany
         ? await transaction.contactGroupMembership.findMany({ select: { submissionId: true }, where: { groupId: { in: selectedGroupIds } } })
         : [];
       let participants = parsed.data.participants;
       if (participants) {
         const participantIds = new Set(participants.map((participant) => participant.submissionId));
         participants = [...participants];
         for (const membership of memberships) {
           if (participantIds.has(membership.submissionId)) continue;
           participantIds.add(membership.submissionId);
           participants.push({ present: false, submissionId: membership.submissionId });
         }
         if (participants.length > 1_000) return null;
       }
       if (participants) {
         const ids = participants.map((participant) => participant.submissionId);
         const submissions = await transaction.contactSubmission.findMany({ select: { id: true }, where: { id: { in: ids } } });
         if (submissions.length !== ids.length) return null;
         await transaction.attendanceParticipant.deleteMany({ where: { activityId: id } });
         await transaction.attendanceParticipant.createMany({ data: participants.map((participant) => ({ activityId: id, present: participant.present, submissionId: participant.submissionId })) });
       }
      if (parsed.data.groupId) {
        const group = await transaction.contactGroup.findUnique({ select: { id: true }, where: { id: parsed.data.groupId } });
        if (!group) return null;
      }
      const conflict = await transaction.attendanceActivity.findFirst({
        select: { name: true },
        where: {
          activityDate: attendanceDateStart(parsed.data.activityDate),
          endsAt: end ? { gt: start } : undefined,
          id: { not: id },
          invalid: false,
          startsAt: end ? { lt: end } : { lte: start },
        },
      });
      if (conflict) return { conflict: conflict.name };
       if (parsed.data.groupIds !== undefined && transaction.attendanceActivityGroup) {
         await transaction.attendanceActivityGroup.deleteMany({ where: { activityId: id } });
         if (selectedGroupIds.length > 0) await transaction.attendanceActivityGroup.createMany({ data: selectedGroupIds.map((groupId) => ({ activityId: id, groupId })) });
       }
       return transaction.attendanceActivity.update({ where: { id }, data: { activityDate: attendanceDateStart(parsed.data.activityDate), endsAt: end, groupId: parsed.data.groupIds !== undefined ? (selectedGroupIds[0] || null) : parsed.data.groupId || activity.groupId, name: parsed.data.name, startsAt: start }, select: { id: true } });
    });
    if (result === undefined) return errorResponse("Nie znaleziono aktywności.", 404);
    if (result === null) return errorResponse("Nie znaleziono wybranej osoby.", 404);
    if ("conflict" in result) return errorResponse(`Nie można zapisać zajęć. Termin koliduje z zajęciami „${result.conflict}”. Wybierz inną godzinę.`, 409);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Attendance activity update failed", error instanceof Error ? error.message : String(error));
    return errorResponse("Nie udało się zapisać zajęć. Sprawdź dane uczestników, grupę i godziny.", 503);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  const id = (await context.params).id;
  const scope = new URL(request.url).searchParams.get("scope") ?? "single";
  if (!["single", "series", "future"].includes(scope)) return errorResponse("Nieznany zakres usuwania.", 400);

  try {
    const prisma = getPrisma();
    if (scope === "single") {
      const result = await prisma.attendanceActivity.updateMany({ where: { id, invalid: false }, data: { invalid: true } });
      if (result.count === 0) return errorResponse("Nie znaleziono aktywności.", 404);
      return NextResponse.json({ deleted: 1 }, { status: 200 });
    }

    const activity = await prisma.attendanceActivity.findFirst({ select: { activityDate: true, seriesId: true }, where: { id, invalid: false } });
    if (!activity) return errorResponse("Nie znaleziono aktywności.", 404);
    if (!activity.seriesId) return errorResponse("Ta aktywność nie jest powtórzona.", 400);

    const result = await prisma.attendanceActivity.updateMany({
      data: { invalid: true },
      where: {
        invalid: false,
        seriesId: activity.seriesId,
        ...(scope === "future" ? { activityDate: { gte: activity.activityDate } } : {}),
      },
    });
    if (result.count === 0) return errorResponse("Nie znaleziono aktywności.", 404);
    return NextResponse.json({ deleted: result.count }, { status: 200 });
  } catch {
    return errorResponse("Nie udało się usunąć aktywności.", 503);
  }
}
