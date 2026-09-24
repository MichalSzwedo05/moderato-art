import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const requestSchema = z.object({ submissionIds: z.array(z.string().trim().min(1).max(100)).max(1_000) }).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { headers: { "Cache-Control": "private, no-store, max-age=0" }, status });
}

async function authorize(request: Request) {
  const config = getAdminAuthConfig();
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!config || !isSameAdminOrigin(requestOrigin, config) || !(await getAdminSession())) return false;
  return true;
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  const groupId = (await context.params).id;
  if (!groupId || groupId.length > 100) return errorResponse("Nieprawidłowa grupa.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Nieprawidłowy format żądania.", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || new Set(parsed.data.submissionIds).size !== parsed.data.submissionIds.length) return errorResponse("Nieprawidłowa lista osób.", 400);

  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const group = await transaction.contactGroup.findUnique({ where: { id: groupId }, select: { id: true } });
      if (!group) return undefined;
      const submissions = await transaction.contactSubmission.findMany({ select: { id: true }, where: { id: { in: parsed.data.submissionIds } } });
      if (submissions.length !== parsed.data.submissionIds.length) return null;
      await transaction.contactGroupMembership.deleteMany({ where: { groupId } });
      if (parsed.data.submissionIds.length) {
        await transaction.contactGroupMembership.createMany({ data: parsed.data.submissionIds.map((submissionId) => ({ groupId, submissionId })) });
      }
      await transaction.contactGroup.update({ where: { id: groupId }, data: { updatedAt: new Date() } });
      return { count: parsed.data.submissionIds.length };
    });
    if (result === undefined) return errorResponse("Nie znaleziono grupy.", 404);
    if (result === null) return errorResponse("Nie znaleziono wybranego zgłoszenia.", 404);
    return NextResponse.json(result, { status: 200 });
  } catch {
    console.error("Contact group membership update failed");
    return errorResponse("Nie udało się zapisać członków grupy.", 503);
  }
}
