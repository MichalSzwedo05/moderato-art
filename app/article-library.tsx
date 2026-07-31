"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { PublicArticleCard } from "../lib/public-articles";

type PublicArticle = PublicArticleCard & {
  content: string;
  imageUrl: string | null;
};

type ArticleLibraryProps = {
  articles: PublicArticleCard[];
};

function getArticleFromLocation(articles: PublicArticleCard[]) {
  const slug = new URLSearchParams(window.location.search).get("article");
  return articles.find((article) => article.slug === slug);
}

export function ArticleLibrary({ articles }: ArticleLibraryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement>(null);
  const openedByUser = useRef(false);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [selectedArticle, setSelectedArticle] = useState<PublicArticle | undefined>();

  useEffect(() => {
    const openFromLocation = () => {
      openedByUser.current = false;
      setSelectedSlug(getArticleFromLocation(articles)?.slug);
    };
    openFromLocation();
    window.addEventListener("popstate", openFromLocation);
    return () => window.removeEventListener("popstate", openFromLocation);
  }, [articles]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    let active = true;
    fetch(`/api/articles/${encodeURIComponent(selectedSlug)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<PublicArticle> : undefined)
      .then((article) => { if (active) setSelectedArticle(article); })
      .catch(() => { if (active) setSelectedArticle(undefined); });
    return () => { active = false; };
  }, [selectedSlug]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedSlug && !dialog.open) {
      dialog.showModal();
    }
    if (!selectedSlug && dialog.open) {
      dialog.close();
    }
  }, [selectedSlug]);

  function closeArticle() {
    const url = new URL(window.location.href);
    url.searchParams.delete("article");
    if (openedByUser.current) {
      openedByUser.current = false;
      window.history.back();
    } else {
      window.history.replaceState({}, "", url);
      setSelectedSlug(undefined);
    }
    openerRef.current?.focus();
  }

  function openArticle(article: PublicArticleCard, opener: HTMLAnchorElement) {
    openerRef.current = opener;
    openedByUser.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set("article", article.slug);
    window.history.pushState({}, "", url);
    setSelectedSlug(article.slug);
  }

  if (articles.length === 0) {
    return <p className="article-empty-state">Pierwsze artykuły pojawią się wkrótce.</p>;
  }

  return (
    <>
      <div className="article-grid">
        {articles.map((article) => (
          <a
            className="article-card"
            href={`/articles/${article.slug}`}
            key={article.slug}
            onClick={(event) => {
              event.preventDefault();
              openArticle(article, event.currentTarget);
            }}
          >
            <p>{article.category}</p>
            <h3>{article.title}</h3>
            <span>{article.excerpt}</span>
          </a>
        ))}
      </div>
      <dialog aria-labelledby="article-modal-title" className="article-modal" onClose={() => selectedSlug && closeArticle()} ref={dialogRef}>
        {selectedSlug && !selectedArticle ? <p className="article-modal-loading">Ładowanie artykułu…</p> : null}
        {selectedArticle && selectedArticle.slug === selectedSlug ? (
          <article>
            <header>
              <p>{selectedArticle.category}</p>
              <button aria-label="Zamknij artykuł" onClick={closeArticle} type="button">×</button>
              <h2 id="article-modal-title">{selectedArticle.title}</h2>
              <time dateTime={selectedArticle.publishedAt}>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(new Date(selectedArticle.publishedAt))}</time>
            </header>
            {selectedArticle.imageUrl ? <Image alt="" height={600} src={selectedArticle.imageUrl} unoptimized width={1200} /> : null}
            <div className="article-markdown"><ReactMarkdown skipHtml>{selectedArticle.content}</ReactMarkdown></div>
          </article>
        ) : null}
      </dialog>
    </>
  );
}
