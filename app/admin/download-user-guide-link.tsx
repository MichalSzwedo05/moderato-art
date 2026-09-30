"use client";

import { useState } from "react";

const userGuideFilename = "instrukcja-cms-moderato-art.md";
const userGuideUrl = "/api/admin/user-guide";

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json() as { message?: string };
    return body.message || "Nie udało się pobrać instrukcji.";
  } catch {
    return "Nie udało się pobrać instrukcji.";
  }
}

export function DownloadUserGuideLink() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [isDownloaded, setIsDownloaded] = useState(false);

  async function downloadGuide(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    setError("");
    setIsDownloaded(false);
    setIsDownloading(true);
    try {
      const response = await fetch(userGuideUrl);
      if (!response.ok) throw new Error(await getErrorMessage(response));

      const objectUrl = URL.createObjectURL(await response.blob());
      try {
        const link = document.createElement("a");
        link.download = userGuideFilename;
        link.href = objectUrl;
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      setIsDownloaded(true);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Nie udało się pobrać instrukcji.");
    } finally {
      setIsDownloading(false);
    }
  }

  return <div className="admin-guide-link">
    <a aria-busy={isDownloading} className="admin-text-link" href={userGuideUrl} onClick={downloadGuide}>
      {isDownloading ? "Pobieranie…" : "Pobierz instrukcję"}
    </a>
    {isDownloaded ? <span className="admin-download-feedback" role="status">Instrukcja została pobrana.</span> : null}
    {error ? <span className="admin-download-feedback admin-download-feedback-error" role="alert">{error}</span> : null}
  </div>;
}
