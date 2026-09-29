import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { attendanceActivityNameSchema, attendanceDateSchema, attendanceTimeSchema, parseAttendanceDateTime } from "@/lib/attendance";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  activityDate: attendanceDateSchema,
  endsAt: attendanceTimeSchema.optional().or(z.literal("")),
  name: attendanceActivityNameSchema,
  startsAt: attendanceTimeSchema,
  participants: z.array(z.object({ present: z.boolean(), submissionId: z.string().trim().min(1).max(100) })).max(1_000),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { headers: { "Cache-Control": "private, no-store, max-age=0" }, status });
}

async function authorize(request: Request) {
  const config = getAdminAuthConfig();
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  return Boolean(config && isSameAdminOrigin(requestOrigin, config) && await getAdminSession());
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Nieprawidłowy format żądania.", 400); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || new Set(parsed.data.participants.map((participant) => participant.submissionId)).size !== parsed.data.participants.length) return errorResponse("Uzupełnij dane aktywności i wybierz osoby.", 400);

  const start = parseAttendanceDateTime(parsed.data.activityDate, parsed.data.startsAt);
  const end = parsed.data.endsAt ? parseAttendanceDateTime(parsed.data.activityDate, parsed.data.endsAt) : undefined;
  if (!start || (parsed.data.endsAt && !end) || (end && end <= start)) return errorResponse("Podaj prawidłowe godziny aktywności.", 400);

  try {
    const prisma = getPrisma();
    const submissions = await prisma.contactSubmission.findMany({ select: { id: true }, where: { id: { in: parsed.data.participants.map((participant) => participant.submissionId) } } });
    if (submissions.length !== parsed.data.participants.length) return errorResponse("Nie znaleziono wybranej osoby.", 404);
    const activity = await prisma.attendanceActivity.create({
      data: {
        activityDate: new Date(`${parsed.data.activityDate}T00:00:00`),
        endsAt: end,
        name: parsed.data.name,
        participants: { create: parsed.data.participants.map((participant) => ({ present: participant.present, submissionId: participant.submissionId })) },
        startsAt: start,
      },
      select: { id: true },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ("code" in error ? error.code === "P2002" : error.message.includes("AttendanceActivity_name_activityDate_key"))) {
      return errorResponse("Aktywność o tej nazwie i dacie już istnieje.", 409);
    }
    console.error("Attendance activity creation failed");
    return errorResponse("Nie udało się utworzyć aktywności.", 503);
  }
}
