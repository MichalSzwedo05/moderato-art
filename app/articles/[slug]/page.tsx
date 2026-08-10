import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPublishedArticle } from "../../../lib/public-articles";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await getPublishedArticle((await params).slug);
  if (!article) return {};
  return { description: article.excerpt, title: article.title };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getPublishedArticle((await params).slug);
  if (!article?.publishedAt) notFound();

  return (
    <main className="article-page">
      <article className="article-shell site-shell">
        <Link className="text-link article-back-link" href="/#blog">← Wróć do artykułów</Link>
        <header className="article-header">
          <p className="eyebrow">{article.category}</p>
          <h1>{article.title}</h1>
          <p className="article-lede">{article.excerpt}</p>
          <time dateTime={article.publishedAt.toISOString()}>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(article.publishedAt)}</time>
        </header>
        {article.imageUrl ? <figure className="article-cover"><Image alt="" height={720} src={article.imageUrl} unoptimized width={1280} /></figure> : null}
        <div className="article-markdown article-body"><ReactMarkdown skipHtml>{article.content}</ReactMarkdown></div>
        <footer className="article-footer"><Link className="text-link" href="/#kontakt">Porozmawiajmy o zajęciach →</Link></footer>
      </article>
    </main>
  );
}
