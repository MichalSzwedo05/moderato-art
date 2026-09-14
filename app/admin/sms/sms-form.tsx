"use client";

import { useState, type FormEvent } from "react";

type SmsRecipient = {
  childName: string | null;
  id: string;
  parentName: string | null;
  phone: string;
};

export function SmsForm({ recipients }: { recipients: SmsRecipient[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; error: boolean }>();
  const [pending, setPending] = useState(false);
  const selectedRecipients = recipients.filter((recipient) => selectedIds.includes(recipient.id));
  const allSelected = recipients.length > 0 && selectedIds.length === recipients.length;

  function toggleRecipient(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : recipients.map((recipient) => recipient.id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(undefined);
    setPending(true);

    try {
      const response = await fetch("/api/admin/sms", {
        body: JSON.stringify({ message, submissionIds: selectedIds }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się wysłać wiadomości SMS.");
      setFeedback({ error: false, message: result.message || "Wiadomość SMS została wysłana." });
      setMessage("");
    } catch (error) {
      setFeedback({
        error: true,
        message: error instanceof Error ? error.message : "Nie udało się wysłać wiadomości SMS.",
      });
    } finally {
      setPending(false);
    }
  }

  return <form className="admin-form admin-sms-form" onSubmit={submit}>
    <div className="admin-sms-toolbar">
      <div>
        <h2>Kontakty</h2>
        <p>Zaznacz osoby, do których chcesz wysłać wiadomość.</p>
      </div>
      <button onClick={toggleAll} type="button">{allSelected ? "Odznacz wszystkich" : "Zaznacz wszystkich"}</button>
    </div>
    <div className="admin-sms-picker">
      <section aria-labelledby="admin-sms-contacts-heading" className="admin-sms-picker-panel">
        <h3 id="admin-sms-contacts-heading">Lista kontaktów</h3>
        <div aria-label="Lista kontaktów SMS" className="admin-sms-recipient-list">
          {recipients.length === 0 ? <p className="admin-submissions-empty">Brak zgłoszeń z numerem telefonu.</p> : recipients.map((recipient) => {
            const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
            return <label className="admin-sms-recipient" key={recipient.id}>
              <input checked={selectedIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} type="checkbox" />
              <span><strong>{name}</strong><small>{recipient.phone}</small></span>
            </label>;
          })}
        </div>
      </section>
      <section aria-labelledby="admin-sms-selected-heading" className="admin-sms-picker-panel admin-sms-selected-panel">
        <div className="admin-sms-selected-heading">
          <h3 id="admin-sms-selected-heading">Odbiorcy</h3>
          <span>{selectedRecipients.length}</span>
        </div>
        {selectedRecipients.length === 0 ? <p className="admin-sms-empty-selected">Zaznaczone kontakty pojawią się tutaj.</p> : <ul className="admin-sms-selected-list">
          {selectedRecipients.map((recipient) => {
            const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
            return <li key={recipient.id}>
              <span><strong>{name}</strong><small>{recipient.phone}</small></span>
              <button aria-label={`Usuń ${name}`} onClick={() => toggleRecipient(recipient.id)} type="button">Usuń</button>
            </li>;
          })}
        </ul>}
      </section>
    </div>
    <label htmlFor="admin-sms-message">Wiadomość
      <textarea id="admin-sms-message" maxLength={1530} onChange={(event) => setMessage(event.target.value)} required rows={5} value={message} />
    </label>
    <p className="admin-sms-counter">{message.length}/1530 znaków · wybrano {selectedIds.length}</p>
    <button disabled={pending || selectedIds.length === 0 || !message.trim()} type="submit">{pending ? "Wysyłanie…" : "Wyślij SMS"}</button>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
  </form>;
}
