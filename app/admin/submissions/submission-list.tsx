"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const submissionDeletedEvent = "admin-contact-submission-deleted";

type SubmissionDeletedDetail = {
  parentName?: string;
};

export function SubmissionList({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; sequence: number }>();
  const deletionSequence = useRef(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    function handleDeleted(event: Event) {
      const detail = (event as CustomEvent<SubmissionDeletedDetail>).detail;
      deletionSequence.current += 1;
      setNotice({
        message: detail?.parentName ? `Usunięto zgłoszenie od „${detail.parentName}”.` : "Zgłoszenie zostało usunięte.",
        sequence: deletionSequence.current,
      });
    }

    window.addEventListener(submissionDeletedEvent, handleDeleted);
    return () => window.removeEventListener(submissionDeletedEvent, handleDeleted);
  }, []);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  return <>
    {notice ? <p className="admin-success admin-submissions-status" key={notice.sequence} ref={noticeRef} role="status" tabIndex={-1}>{notice.message}</p> : null}
    <div className="admin-submissions-list">{children}</div>
  </>;
}

export { submissionDeletedEvent };
