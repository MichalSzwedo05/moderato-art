import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { attendanceActivityNameSchema, attendanceDateSchema, attendanceTimeSchema, parseAttendanceDateTime } from "@/lib/attendance";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  activityDate: attendanceDateSchema,
  endsAt: attendanceTimeSchema.optional().or(z.literal("")),
  name: attendanceActivityNameSchema,
  participants: z.array(z.object({ present: z.boolean(), submissionId: z.string().trim().min(1).max(100) })).max(1_000),
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
  if (!parsed.success || new Set(parsed.data.participants.map((participant) => participant.submissionId)).size !== parsed.data.participants.length) return errorResponse("Nieprawidłowa lista uczestników.", 400);
  const start = parseAttendanceDateTime(parsed.data.activityDate, parsed.data.startsAt);
  const end = parsed.data.endsAt ? parseAttendanceDateTime(parsed.data.activityDate, parsed.data.endsAt) : undefined;
  if (!start || (parsed.data.endsAt && !end) || (end && end <= start)) return errorResponse("Podaj prawidłowe godziny aktywności.", 400);

  try {
    const prisma = getPrisma();
    const result = await prisma.$transaction(async (transaction) => {
      const activity = await transaction.attendanceActivity.findFirst({ where: { id, invalid: false }, select: { id: true } });
      if (!activity) return undefined;
      const ids = parsed.data.participants.map((participant) => participant.submissionId);
      const submissions = await transaction.contactSubmission.findMany({ select: { id: true }, where: { id: { in: ids } } });
      if (submissions.length !== ids.length) return null;
      await transaction.attendanceParticipant.deleteMany({ where: { activityId: id } });
      await transaction.attendanceParticipant.createMany({ data: parsed.data.participants.map((participant) => ({ activityId: id, present: participant.present, submissionId: participant.submissionId })) });
      return transaction.attendanceActivity.update({ where: { id }, data: { activityDate: new Date(`${parsed.data.activityDate}T00:00:00`), endsAt: end, name: parsed.data.name, startsAt: start }, select: { id: true } });
    });
    if (result === undefined) return errorResponse("Nie znaleziono aktywności.", 404);
    if (result === null) return errorResponse("Nie znaleziono wybranej osoby.", 404);
    return NextResponse.json(result, { status: 200 });
  } catch {
    console.error("Attendance activity update failed");
    return errorResponse("Nie udało się zapisać obecności.", 503);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  try {
    const result = await getPrisma().attendanceActivity.updateMany({ where: { id: (await context.params).id, invalid: false }, data: { invalid: true } });
    if (result.count === 0) return errorResponse("Nie znaleziono aktywności.", 404);
    return new NextResponse(null, { status: 204 });
  } catch {
    return errorResponse("Nie udało się usunąć aktywności.", 503);
  }
}
