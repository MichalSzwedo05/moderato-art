import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
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

function isRecordNotFound(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2025";
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2025");
}

type DeleteRouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: DeleteRouteContext) {
  if (!(await isAuthorized(request))) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return json({ message: "Nie znaleziono artykułu." }, 404);
  }

  let article: { slug: string };
  try {
    article = await getPrisma().article.delete({
      select: { slug: true },
      where: { id },
    });
  } catch (error) {
    if (isRecordNotFound(error)) return json({ message: "Nie znaleziono artykułu." }, 404);
    console.error("Article deletion failed", { id });
    return json({ message: "Nie udało się usunąć artykułu." }, 503);
  }

  console.info("Article deleted", { id });
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/articles/${article.slug}`);
  return new NextResponse(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
