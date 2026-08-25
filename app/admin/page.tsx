import type { Metadata } from "next";
import Link from "next/link";
import { createArticle, updateArticle } from "./actions";
import { DeleteArticleButton } from "./delete-article-button";
import { DownloadUserGuideButton } from "./download-user-guide-button";
import { ArticleEditor } from "./article-editor";
import { ArticleEditorDetails } from "./article-editor-details";
import { ArticleListStatus } from "./article-list-status";
import { GalleryManager } from "./gallery-manager";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getAdminGalleryPhotos } from "@/lib/gallery-data";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Panel administracyjny",
};

type AdminPageProps = {
  searchParams: Promise<{ article?: string; login?: string }>;
};

function LoginForm({ mode, notice }: { mode: "magic_link" | "password"; notice?: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-card admin-login-card">
        <p className="admin-eyebrow">Moderato Art</p>
        <h1>Panel administracyjny</h1>
        <p>{mode === "password" ? "Podaj nazwę użytkownika i hasło administratora." : "Podaj adres e-mail administratora. Jeśli dostęp jest możliwy, otrzymasz link do logowania."}</p>
        {mode === "magic_link" && notice === "sent" ? <p className="admin-success" role="status">Jeśli adres ma dostęp, link do logowania został wysłany.</p> : null}
        {notice && notice !== "sent" ? <p className="admin-notice" role="status">Nie można teraz zalogować się. Spróbuj ponownie.</p> : null}
        <form action={mode === "password" ? "/admin/auth/password" : "/admin/auth/request"} method="post" className="admin-form">
          {mode === "password" ? <><label htmlFor="admin-username">Nazwa użytkownika</label><input autoComplete="username" id="admin-username" maxLength={100} name="username" required /><label htmlFor="admin-password">Hasło</label><input autoComplete="current-password" id="admin-password" maxLength={1024} name="password" required type="password" /></> : <><label htmlFor="admin-email">Adres e-mail</label><input autoComplete="email" id="admin-email" name="email" required type="email" /></>}
          <button type="submit">{mode === "password" ? "Zaloguj" : "Wyślij link"}</button>
        </form>
      </section>
    </main>
  );
}

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

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const config = getAdminAuthConfig();
  if (!config) {
    return (
      <main className="admin-shell">
        <section className="admin-card"><p>Panel administracyjny jest chwilowo niedostępny.</p></section>
      </main>
    );
  }

  const session = await getAdminSession();
  if (!session) {
    return <LoginForm mode={config.mode} notice={params.login} />;
  }

  const articles = await getArticles();
  const galleryPhotos = await getAdminGalleryPhotos();
  if (!articles) {
    return (
      <main className="admin-shell">
        <section className="admin-card"><p>Panel administracyjny jest chwilowo niedostępny.</p></section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-card admin-content-card">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Moderato Art</p>
            <h1>Panel administracyjny</h1>
          </div>
          <div className="admin-header-actions">
            <DownloadUserGuideButton />
            <Link className="admin-secondary-button" href="/admin/submissions">Zgłoszenia kontaktowe</Link>
            <form action="/admin/auth/logout" method="post">
              <button className="admin-secondary-button" type="submit">Wyloguj</button>
            </form>
          </div>
        </header>
        <section className="admin-gallery-section" aria-labelledby="gallery-section-heading">
          <h2 id="gallery-section-heading">Galeria zdjęć</h2>
          <p>Dodawaj zdjęcia przestrzeni i usuwaj te, których nie chcesz już pokazywać na stronie.</p>
          {galleryPhotos ? <GalleryManager initialPhotos={galleryPhotos} /> : <p className="admin-notice" role="status">Galeria jest chwilowo niedostępna. Zarządzanie artykułami pozostaje dostępne.</p>}
        </section>
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
      </section>
    </main>
  );
}
