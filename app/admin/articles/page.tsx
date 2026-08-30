import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createArticle, updateArticle } from "../actions";
import { DeleteArticleButton } from "../delete-article-button";
import { ArticleEditor } from "../article-editor";
import { ArticleEditorDetails } from "../article-editor-details";
import { ArticleListStatus } from "../article-list-status";
import { AdminPanel } from "../admin-panel";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Artykuły · Panel administracyjny",
};

type ArticlesPageProps = {
  searchParams: Promise<{ article?: string }>;
};

async function getArticles() {
  try {
    return await getPrisma().article.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        category: true,
        content: true,
        excerpt: true,
        id: true,
        imageUrl: true,
        slug: true,
        status: true,
        title: true,
        updatedAt: true,
      },
      take: 100,
    });
  } catch {
    return undefined;
  }
}

export default async function AdminArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }
  if (!(await getAdminSession())) {
    redirect("/admin");
  }

  const articles = await getArticles();
  if (!articles) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }

  return <AdminPanel title="Zarządzanie artykułami">
    {params.article === "created" ? <p className="admin-success" role="status">Artykuł został zapisany.</p> : null}
    {params.article === "updated" ? <p className="admin-success" role="status">Artykuł został zaktualizowany.</p> : null}
    {params.article === "invalid" ? <p className="admin-notice" role="alert">Nie udało się zapisać artykułu. Sprawdź pola oraz unikalność slugu.</p> : null}
    <ArticleEditor action={createArticle} />
    <section className="admin-article-list" aria-labelledby="articles-list-heading">
      <h2 id="articles-list-heading">Ostatnio zmienione</h2>
      <ArticleListStatus>
        {articles.length === 0 ? <p>Nie ma jeszcze artykułów.</p> : (
          <ul>
            {articles.map((article) => (
              <li key={article.id}>
                <strong>{article.title}</strong>
                <span>{article.category} · /articles/{article.slug} · {article.status === "DRAFT" ? "Szkic" : article.status === "PUBLISHED" ? "Opublikowany" : "Archiwum"}</span>
                <ArticleEditorDetails action={updateArticle.bind(null, article.id)} article={article} />
                <DeleteArticleButton id={article.id} title={article.title} />
              </li>
            ))}
          </ul>
        )}
      </ArticleListStatus>
    </section>
  </AdminPanel>;
}
