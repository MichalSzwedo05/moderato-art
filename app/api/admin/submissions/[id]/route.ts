import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

async function isAuthorized(request: Request) {
  const config = getAdminAuthConfig();
  return Boolean(config
    && isSameAdminOrigin(request.headers.get("origin"), config)
    && await getAdminSession());
}

type DeleteRouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: DeleteRouteContext) {
  if (!(await isAuthorized(request))) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return json({ message: "Nie znaleziono zgłoszenia." }, 404);
  }

  try {
    const result = await getPrisma().contactSubmission.deleteMany({ where: { id } });
    if (result.count === 0) return json({ message: "Nie znaleziono zgłoszenia." }, 404);
  } catch {
    console.error("Contact submission deletion failed", { id });
    return json({ message: "Nie udało się usunąć zgłoszenia." }, 503);
  }

  console.info("Contact submission deleted", { id });
  revalidatePath("/admin/submissions");
  return new NextResponse(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
