"use client";

import ReactMarkdown from "react-markdown";
import { useState, type ChangeEventHandler } from "react";

type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ArticleAction = (formData: FormData) => void | Promise<void>;

export type ArticleEditorArticle = {
  category: string;
  content: string;
  excerpt: string;
  imageUrl: string | null;
  slug: string;
  status: ArticleStatus;
  title: string;
};

type ArticleEditorProps = {
  action: ArticleAction;
  article?: ArticleEditorArticle;
};

function makeSlug(value: string) {
  return value.replace(/ł/gi, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function ArticleEditor({ action, article }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [slugEdited, setSlugEdited] = useState(Boolean(article));
  const [category, setCategory] = useState(article?.category || "Aktualności");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [imageUrl, setImageUrl] = useState(article?.imageUrl || "");
  const [status, setStatus] = useState<ArticleStatus>(article?.status || "DRAFT");
  const [content, setContent] = useState(article?.content || "");

  const handleTitleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextTitle = event.currentTarget.value;
    setTitle(nextTitle);
    if (!slugEdited) setSlug(makeSlug(nextTitle));
  };

  return <form action={action} className="admin-form admin-article-form">
    <div className="admin-editor-heading"><div><p className="admin-eyebrow">{article ? "Edycja" : "Nowy artykuł"}</p><h2>{article ? "Dopracuj i zapisz tekst" : "Napisz artykuł krok po kroku"}</h2></div><span className={`admin-status admin-status-${status.toLowerCase()}`}>{status === "DRAFT" ? "Szkic" : status === "PUBLISHED" ? "Opublikowany" : "Archiwum"}</span></div>
    <div className="admin-editor-grid">
      <div className="admin-editor-fields">
        <label htmlFor={`article-title-${article?.slug || "new"}`}>Tytuł<input id={`article-title-${article?.slug || "new"}`} maxLength={200} name="title" onChange={handleTitleChange} required value={title} /></label>
        <label htmlFor={`article-slug-${article?.slug || "new"}`}>Adres artykułu<input aria-describedby={`article-slug-help-${article?.slug || "new"}`} id={`article-slug-${article?.slug || "new"}`} maxLength={220} name="slug" onChange={(event) => { setSlugEdited(true); setSlug(event.currentTarget.value); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={slug} /></label><p className="admin-field-help" id={`article-slug-help-${article?.slug || "new"}`}>Powstaje automatycznie z tytułu. Możesz go zmienić, używając małych liter i myślników.</p>
        <label htmlFor={`article-category-${article?.slug || "new"}`}>Kategoria<input id={`article-category-${article?.slug || "new"}`} maxLength={100} name="category" onChange={(event) => setCategory(event.currentTarget.value)} required value={category} /></label>
        <label htmlFor={`article-excerpt-${article?.slug || "new"}`}>Krótki opis<textarea id={`article-excerpt-${article?.slug || "new"}`} maxLength={500} name="excerpt" onChange={(event) => setExcerpt(event.currentTarget.value)} required rows={3} value={excerpt} /></label>
        <label htmlFor={`article-image-${article?.slug || "new"}`}>Adres obrazka <span>(opcjonalnie)</span><input id={`article-image-${article?.slug || "new"}`} maxLength={2048} name="imageUrl" onChange={(event) => setImageUrl(event.currentTarget.value)} type="url" value={imageUrl} /></label>
        <label htmlFor={`article-status-${article?.slug || "new"}`}>Widoczność<select id={`article-status-${article?.slug || "new"}`} name="status" onChange={(event) => setStatus(event.currentTarget.value as ArticleStatus)} value={status}><option value="DRAFT">Szkic — tylko w panelu</option><option value="PUBLISHED">Opublikowany — widoczny na stronie</option><option value="ARCHIVED">Archiwum — ukryty na stronie</option></select></label>
      </div>
      <aside className="admin-preview" aria-label="Podgląd artykułu"><p className="admin-preview-label">Podgląd</p><article><p className="eyebrow">{category || "Kategoria"}</p><h3>{title || "Tytuł artykułu"}</h3><p className="admin-preview-excerpt">{excerpt || "Tutaj pojawi się krótki opis zachęcający do przeczytania artykułu."}</p><div className="article-markdown"><ReactMarkdown skipHtml>{content || "Treść artykułu pojawi się tutaj.\n\nMożesz używać nagłówków, list i linków Markdown."}</ReactMarkdown></div></article></aside>
    </div>
    <label htmlFor={`article-content-${article?.slug || "new"}`}>Treść artykułu (Markdown)<textarea id={`article-content-${article?.slug || "new"}`} name="content" onChange={(event) => setContent(event.currentTarget.value)} required rows={14} value={content} /></label>
    <button type="submit">{article ? "Zapisz zmiany" : "Zapisz artykuł"}</button>
  </form>;
}
