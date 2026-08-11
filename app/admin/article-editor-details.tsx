"use client";

import { useState } from "react";
import { ArticleEditor, type ArticleAction, type ArticleEditorArticle } from "./article-editor";

export function ArticleEditorDetails({ action, article }: { action: ArticleAction; article: ArticleEditorArticle }) {
  const [isOpen, setIsOpen] = useState(false);
  return <details onToggle={(event) => setIsOpen(event.currentTarget.open)}><summary>Edytuj artykuł</summary>{isOpen ? <ArticleEditor action={action} article={article} /> : null}</details>;
}
