"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submissionDeletedEvent } from "./submission-list";

type DeleteSubmissionButtonProps = {
  id: string;
  parentName: string;
};

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json() as { message?: string };
    return body.message || "Nie udało się usunąć zgłoszenia.";
  } catch {
    return "Nie udało się usunąć zgłoszenia.";
  }
}

export function DeleteSubmissionButton({ id, parentName }: DeleteSubmissionButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteSubmission() {
    if (!window.confirm(`Czy na pewno usunąć zgłoszenie od „${parentName}”? Tej operacji nie można cofnąć.`)) return;

    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/submissions/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      window.dispatchEvent(new CustomEvent(submissionDeletedEvent, { detail: { parentName } }));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć zgłoszenia.");
    } finally {
      setIsDeleting(false);
    }
  }

  return <div className="admin-submission-actions">
    <button className="admin-destructive-button" disabled={isDeleting} onClick={deleteSubmission} type="button">
      {isDeleting ? "Usuwanie…" : "Usuń zgłoszenie"}
    </button>
    {error ? <p className="admin-notice" role="alert">{error}</p> : null}
  </div>;
}
