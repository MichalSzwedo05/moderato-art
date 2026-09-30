"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";
import { messageHistoryPreviewLength, type MessageHistoryChannel, type MessageHistoryEntry } from "@/lib/message-history-channels";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function MessageHistoryModal({ channels }: { channels: MessageHistoryChannel[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<MessageHistoryEntry[]>();
  const channelsKey = channels.join(",");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetch(`/api/admin/message-history?channels=${encodeURIComponent(channelsKey)}`)
      .then(async (response) => {
        const body = await response.json() as { message?: string; messages?: MessageHistoryEntry[] };
        if (!response.ok) throw new Error(body.message || "Nie udało się wczytać historii wiadomości.");
        if (active) setMessages(body.messages ?? []);
      })
      .catch((historyError: unknown) => {
        if (active) setError(historyError instanceof Error ? historyError.message : "Nie udało się wczytać historii wiadomości.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [isOpen, channelsKey]);

  function open() {
    setIsLoading(true);
    setError("");
    setMessages(undefined);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  function closeFromBackdrop(event: ReactPointerEvent<HTMLDialogElement>) {
    const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
  }

  function closeFromCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    close();
  }

  return <>
    <button aria-haspopup="dialog" className="admin-secondary-button" onClick={open} ref={triggerRef} type="button">Historia wiadomości</button>
    <dialog aria-labelledby={titleId} className="admin-modal" onCancel={closeFromCancel} onPointerDown={closeFromBackdrop} ref={dialogRef}>
      <button aria-label="Zamknij okno" className="admin-modal-close" onClick={close} ref={closeButtonRef} type="button">×</button>
      <h2 id={titleId}>Historia wiadomości</h2>
      {isLoading ? <p className="admin-submissions-empty">Wczytywanie historii…</p> : null}
      {error ? <p className="admin-notice" role="alert">{error}</p> : null}
      {!isLoading && !error && messages?.length === 0 ? <p className="admin-submissions-empty">Nie ma jeszcze żadnych wysłanych wiadomości.</p> : null}
      {messages && messages.length > 0 ? <div className="admin-history-table-wrapper">
        <table className="admin-history-table">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Początek wiadomości</th>
              <th scope="col">Liczba odbiorców</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((entry) => <tr key={`${entry.createdAt}-${entry.subject ?? ""}-${entry.messagePreview}`}>
              <td>{formatDate(entry.createdAt)}</td>
              <td>
                {entry.subject ? <span className="admin-history-subject">{entry.subject}</span> : null}
                {entry.messagePreview}{entry.truncated ? "…" : ""}
              </td>
              <td>{entry.recipientCount}</td>
            </tr>)}
          </tbody>
        </table>
        <p className="admin-history-caption">Początek wiadomości pokazuje pierwsze {messageHistoryPreviewLength} znaków.</p>
      </div> : null}
    </dialog>
  </>;
}
