"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { articleDeletedEvent } from "./article-list-status";

type DeleteArticleButtonProps = {
  id: string;
  title: string;
};

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json() as { message?: string };
    return body.message || "Nie udało się usunąć artykułu.";
  } catch {
    return "Nie udało się usunąć artykułu.";
  }
}

export function DeleteArticleButton({ id, title }: DeleteArticleButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteArticle() {
    if (!window.confirm(`Czy na pewno trwale usunąć artykuł „${title}”? Tej operacji nie można cofnąć. Możesz go najpierw zarchiwizować.`)) return;

    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      window.dispatchEvent(new CustomEvent(articleDeletedEvent, { detail: { title } }));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć artykułu.");
    } finally {
      setIsDeleting(false);
    }
  }

  return <div className="admin-article-actions">
    <button className="admin-destructive-button" disabled={isDeleting} onClick={deleteArticle} type="button">
      {isDeleting ? "Usuwanie…" : "Usuń artykuł"}
    </button>
    {error ? <p className="admin-notice" role="alert">{error}</p> : null}
  </div>;
}
