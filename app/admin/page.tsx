import type { Metadata } from "next";
import { createArticle, updateArticle } from "./actions";
import { getAdminSession, isAdminCmsEnabled } from "@/lib/admin-auth";
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

function LoginForm({ notice }: { notice?: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-card admin-login-card">
        <p className="admin-eyebrow">Moderato Art</p>
        <h1>Panel administracyjny</h1>
        <p>Podaj adres e-mail administratora. Jeśli dostęp jest możliwy, otrzymasz link do logowania.</p>
        {notice === "sent" ? <p className="admin-success" role="status">Jeśli adres ma dostęp, link do logowania został wysłany.</p> : null}
        {notice && notice !== "sent" ? <p className="admin-notice" role="status">Nie można teraz zalogować się. Spróbuj ponownie.</p> : null}
        <form action="/admin/auth/request" method="post" className="admin-form">
          <label htmlFor="admin-email">Adres e-mail</label>
          <input autoComplete="email" id="admin-email" name="email" required type="email" />
          <button type="submit">Wyślij link</button>
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
  if (!isAdminCmsEnabled()) {
    return (
      <main className="admin-shell">
        <section className="admin-card"><p>Panel administracyjny jest chwilowo niedostępny.</p></section>
      </main>
    );
  }

  const session = await getAdminSession();
  if (!session) {
    return <LoginForm notice={params.login} />;
  }

  const articles = await getArticles();
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
            <h1>Artykuły</h1>
          </div>
          <form action="/admin/auth/logout" method="post">
            <button className="admin-secondary-button" type="submit">Wyloguj</button>
          </form>
        </header>
        {params.article === "created" ? <p className="admin-success" role="status">Artykuł został zapisany.</p> : null}
        {params.article === "updated" ? <p className="admin-success" role="status">Artykuł został zaktualizowany.</p> : null}
        {params.article === "invalid" ? <p className="admin-notice" role="alert">Nie udało się zapisać artykułu. Sprawdź pola oraz unikalność slugu.</p> : null}
        <form action={createArticle} className="admin-form admin-article-form">
          <h2>Nowy artykuł</h2>
          <label htmlFor="article-title">Tytuł</label>
          <input id="article-title" maxLength={200} name="title" required />
          <label htmlFor="article-slug">Slug</label>
          <input id="article-slug" maxLength={220} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          <label htmlFor="article-category">Kategoria</label>
          <input id="article-category" maxLength={100} name="category" required />
          <label htmlFor="article-excerpt">Krótki opis</label>
          <textarea id="article-excerpt" maxLength={500} name="excerpt" required rows={3} />
          <label htmlFor="article-image">Adres obrazka (opcjonalnie)</label>
          <input id="article-image" maxLength={2048} name="imageUrl" type="url" />
          <label htmlFor="article-status">Status</label>
          <select defaultValue="DRAFT" id="article-status" name="status">
            <option value="DRAFT">Szkic</option>
            <option value="PUBLISHED">Opublikowany</option>
            <option value="ARCHIVED">Zarchiwizowany</option>
          </select>
          <label htmlFor="article-content">Treść Markdown</label>
          <textarea id="article-content" name="content" required rows={14} />
          <button type="submit">Zapisz artykuł</button>
        </form>
        <section className="admin-article-list" aria-labelledby="articles-list-heading">
          <h2 id="articles-list-heading">Ostatnio zmienione</h2>
          {articles.length === 0 ? <p>Nie ma jeszcze artykułów.</p> : (
            <ul>
              {articles.map((article) => (
                <li key={article.id}>
                  <strong>{article.title}</strong>
                  <span>{article.category} | {article.slug} | {article.status}</span>
                  <details>
                    <summary>Edytuj</summary>
                    <form action={updateArticle.bind(null, article.id)} className="admin-form">
                      <label>Tytuł<input defaultValue={article.title} maxLength={200} name="title" required /></label>
                      <label>Slug<input defaultValue={article.slug} maxLength={220} name="slug" required /></label>
                      <label>Kategoria<input defaultValue={article.category} maxLength={100} name="category" required /></label>
                      <label>Krótki opis<textarea defaultValue={article.excerpt} maxLength={500} name="excerpt" required rows={3} /></label>
                      <label>Adres obrazka<input defaultValue={article.imageUrl || ""} maxLength={2048} name="imageUrl" type="url" /></label>
                      <label>Status<select defaultValue={article.status} name="status"><option value="DRAFT">Szkic</option><option value="PUBLISHED">Opublikowany</option><option value="ARCHIVED">Zarchiwizowany</option></select></label>
                      <label>Treść Markdown<textarea defaultValue={article.content} name="content" required rows={12} /></label>
                      <button type="submit">Zapisz zmiany</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
