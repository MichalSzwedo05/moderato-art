import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { contactGroupNameSchema, getContactGroups } from "@/lib/contact-groups";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createGroupSchema = z.object({ name: contactGroupNameSchema }).strict();

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

export async function GET(request: Request) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);

  try {
    return NextResponse.json(await getContactGroups(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      status: 200,
    });
  } catch {
    console.error("Contact groups query failed");
    return errorResponse("Nie udało się wczytać grup.", 503);
  }
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return errorResponse("Brak dostępu.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Nieprawidłowy format żądania.", 400);
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Wpisz nazwę grupy.", 400);

  try {
    const group = await getPrisma().contactGroup.create({ data: { name: parsed.data.name } });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("ContactGroup_name_key")) return errorResponse("Grupa o tej nazwie już istnieje.", 409);
    console.error("Contact group creation failed");
    return errorResponse("Nie udało się utworzyć grupy.", 503);
  }
}
