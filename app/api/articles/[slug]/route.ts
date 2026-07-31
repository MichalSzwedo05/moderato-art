import { NextResponse } from "next/server";
import { getPublishedArticle } from "../../../../lib/public-articles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const article = await getPublishedArticle(slug);

    if (!article?.publishedAt) {
      return NextResponse.json({ message: "Nie znaleziono artykułu." }, { headers: { "Cache-Control": "no-store" }, status: 404 });
    }

    return NextResponse.json({ ...article, publishedAt: article.publishedAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Published article detail query failed");
    return NextResponse.json({ message: "Artykuł jest chwilowo niedostępny." }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
}
