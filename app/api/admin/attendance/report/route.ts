import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reportSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preview: z.boolean().optional(),
  submissionId: z.string().trim().min(1).max(100).optional(),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { headers: { "Cache-Control": "private, no-store, max-age=0" }, status });
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function reportFilename(date: Date) {
  return `raport-obecnosci-${date.toISOString().replaceAll("-", "").slice(0, 8)}.csv`;
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config) || !(await getAdminSession())) return errorResponse("Brak dostępu.", 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Nieprawidłowy format żądania.", 400); }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success || parsed.data.dateFrom > parsed.data.dateTo) return errorResponse("Podaj prawidłowy zakres dat.", 400);

  const from = new Date(`${parsed.data.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.dateTo}T23:59:59.999Z`);
  try {
    const activities = await getPrisma().attendanceActivity.findMany({
      include: { participants: { include: { submission: { select: { childName: true, email: true, parentName: true } } }, orderBy: { submission: { childName: "asc" } }, where: parsed.data.submissionId ? { submissionId: parsed.data.submissionId } : undefined } },
      orderBy: [{ activityDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
      where: { activityDate: { gte: from, lte: to }, invalid: false, ...(parsed.data.submissionId ? { participants: { some: { submissionId: parsed.data.submissionId } } } : {}) },
    });
    const rows = [
      ["Osoba", "E-mail", "Zajęcia", "Data", "Od", "Do", "Status"],
      ...activities.flatMap((activity) => activity.participants.map((participant) => [
        participant.submission.childName || participant.submission.parentName || "Bez podanego imienia",
        participant.submission.email,
        activity.name,
        activity.activityDate.toISOString().slice(0, 10),
        activity.startsAt.toISOString().slice(11, 16),
        activity.endsAt?.toISOString().slice(11, 16) || "",
        participant.present ? "Obecny" : "Nieobecny",
      ])),
    ];
    if (parsed.data.preview) {
      const dates = [...new Set(activities.map((activity) => activity.activityDate.toISOString().slice(0, 10)))];
      const people = new Map<string, { email: string; name: string; statuses: Record<string, boolean> }>();
      for (const activity of activities) {
        const date = activity.activityDate.toISOString().slice(0, 10);
        for (const participant of activity.participants) {
          const id = participant.submission.email;
          const existing = people.get(id) || { email: participant.submission.email, name: participant.submission.childName || participant.submission.parentName || "Bez podanego imienia", statuses: {} };
          existing.statuses[date] = (existing.statuses[date] ?? true) && participant.present;
          people.set(id, existing);
        }
      }
      return NextResponse.json({ dates, people: [...people.values()].sort((left, right) => left.name.localeCompare(right.name, "pl")), selectedPerson: parsed.data.submissionId || null });
    }
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    return new Response(csv, { headers: { "Cache-Control": "private, no-store, max-age=0", "Content-Disposition": `attachment; filename="${reportFilename(new Date())}"`, "Content-Type": "text/csv; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  } catch {
    console.error("Attendance report failed");
    return errorResponse("Nie udało się przygotować raportu obecności.", 503);
  }
}
