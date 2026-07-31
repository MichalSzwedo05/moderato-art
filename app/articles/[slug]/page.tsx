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
    <main className="article-page site-shell">
      <Link className="text-link" href="/">Wróć do strony głównej</Link>
      <p className="eyebrow">{article.category}</p>
      <h1>{article.title}</h1>
      <time dateTime={article.publishedAt.toISOString()}>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(article.publishedAt)}</time>
      {article.imageUrl ? <Image alt="" height={600} src={article.imageUrl} unoptimized width={1200} /> : null}
      <div className="article-markdown"><ReactMarkdown skipHtml>{article.content}</ReactMarkdown></div>
    </main>
  );
}
