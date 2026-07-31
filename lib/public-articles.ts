import { getPrisma } from "./prisma";

export type PublicArticleCard = {
  category: string;
  excerpt: string;
  publishedAt: string;
  slug: string;
  title: string;
};

export async function getPublishedArticles(): Promise<PublicArticleCard[]> {
  try {
    const articles = await getPrisma().article.findMany({
      orderBy: { publishedAt: "desc" },
      select: {
        category: true,
        excerpt: true,
        publishedAt: true,
        slug: true,
        title: true,
      },
      where: {
        publishedAt: { lte: new Date() },
        status: "PUBLISHED",
      },
      take: 24,
    });

    return articles.flatMap((article) => article.publishedAt ? [{
      ...article,
      publishedAt: article.publishedAt.toISOString(),
    }] : []);
  } catch {
    console.error("Published article query failed");
    return [];
  }
}

export async function getPublishedArticle(slug: string) {
  return getPrisma().article.findFirst({
      select: {
        category: true,
        content: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        slug: true,
        title: true,
      },
      where: { publishedAt: { lte: new Date() }, slug, status: "PUBLISHED" },
  });
}
