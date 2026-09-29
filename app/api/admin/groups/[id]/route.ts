import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { contactGroupNameSchema } from "@/lib/contact-groups";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const updateGroupSchema = z.object({ name: contactGroupNameSchema }).strict();
const idSchema = z.string().trim().min(1).max(100);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

async function authorize(request: Request) {
  const config = getAdminAuthConfig();
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!config || !isSameAdminOrigin(requestOrigin, config) || !(await getAdminSession())) return false;
  return true;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return errorResponse("Nieprawidłowa grupa.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Nieprawidłowy format żądania.", 400);
  }
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Wpisz nazwę grupy.", 400);

  try {
    const group = await getPrisma().contactGroup.update({ where: { id: id.data }, data: { name: parsed.data.name } });
    return NextResponse.json(group, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("ContactGroup_name_key")) return errorResponse("Grupa o tej nazwie już istnieje.", 409);
    return errorResponse("Nie udało się zmienić grupy.", 503);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return errorResponse("Nieprawidłowa grupa.", 400);

  try {
    await getPrisma().contactGroup.delete({ where: { id: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return errorResponse("Nie udało się usunąć grupy.", 503);
  }
}
