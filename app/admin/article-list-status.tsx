"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const articleDeletedEvent = "admin-article-deleted";

type ArticleDeletedDetail = {
  title?: string;
};

export function ArticleListStatus({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; sequence: number }>();
  const deletionSequence = useRef(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    function handleDeleted(event: Event) {
      const detail = (event as CustomEvent<ArticleDeletedDetail>).detail;
      deletionSequence.current += 1;
      setNotice({
        message: detail?.title ? `Artykuł „${detail.title}” został usunięty.` : "Artykuł został usunięty.",
        sequence: deletionSequence.current,
      });
    }

    window.addEventListener(articleDeletedEvent, handleDeleted);
    return () => window.removeEventListener(articleDeletedEvent, handleDeleted);
  }, []);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  return <>
    {notice ? <p className="admin-success admin-articles-status" key={notice.sequence} ref={noticeRef} role="status" tabIndex={-1}>{notice.message}</p> : null}
    {children}
  </>;
}
