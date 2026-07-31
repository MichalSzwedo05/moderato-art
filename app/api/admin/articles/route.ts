import { NextResponse } from "next/server";
import { getArticleInput } from "@/lib/article";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config
    || !isSameAdminOrigin(request.headers.get("origin"), config)
    || !(await getAdminSession())) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 110_000) {
    return json({ message: "Nieprawidłowe dane artykułu." }, 413);
  }

  try {
    const parsed = getArticleInput(await request.json());
    if (!parsed.success) {
      return json({ message: "Nieprawidłowe dane artykułu." }, 400);
    }

    const article = await getPrisma().article.create({
      data: {
        ...parsed.data,
        publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true, slug: true, status: true },
    });
    return json({ article }, 201);
  } catch {
    return json({ message: "Nie udało się zapisać artykułu." }, 400);
  }
}
