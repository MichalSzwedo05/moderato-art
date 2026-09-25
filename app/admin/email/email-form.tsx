"use client";

import { useState, type FormEvent } from "react";

type EmailRecipient = {
  childName: string | null;
  email: string;
  id: string;
  parentName: string | null;
};

type RecipientGroup = {
  id: string;
  name: string;
  submissionIds: string[];
};

export function EmailForm({ groups = [], recipients }: { groups?: RecipientGroup[]; recipients: EmailRecipient[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
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

  function toggleGroup(group: RecipientGroup) {
    setSelectedIds((current) => {
      const groupSelected = group.submissionIds.length > 0 && group.submissionIds.every((id) => current.includes(id));
      return groupSelected
        ? current.filter((id) => !group.submissionIds.includes(id))
        : [...new Set([...current, ...group.submissionIds])];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(undefined);
    setPending(true);

    try {
      const response = await fetch("/api/admin/email", {
        body: JSON.stringify({ message, subject, submissionIds: selectedIds }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się wysłać wiadomości e-mail.");
      setFeedback({ error: false, message: result.message || "Wiadomość e-mail została wysłana." });
      setSubject("");
      setMessage("");
    } catch (error) {
      setFeedback({
        error: true,
        message: error instanceof Error ? error.message : "Nie udało się wysłać wiadomości e-mail.",
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
      <section aria-labelledby="admin-email-contacts-heading" className="admin-sms-picker-panel">
        <h3 id="admin-email-contacts-heading">Lista kontaktów</h3>
        <div aria-label="Lista kontaktów e-mail" className="admin-sms-recipient-list">
          {groups.length > 0 ? <div className="admin-recipient-groups">
            <h4>Grupy</h4>
            {groups.map((group) => {
              const selected = group.submissionIds.length > 0 && group.submissionIds.every((id) => selectedIds.includes(id));
              return <label className="admin-sms-recipient admin-group-recipient" key={group.id}>
                <input checked={selected} disabled={group.submissionIds.length === 0} onChange={() => toggleGroup(group)} type="checkbox" />
                <span><strong>{group.name}</strong><small>{group.submissionIds.length} osób</small></span>
              </label>;
            })}
          </div> : null}
          {groups.length > 0 ? <h4 className="admin-recipient-list-heading">Osoby</h4> : null}
          {recipients.length === 0 ? <p className="admin-submissions-empty">Brak zgłoszeń z adresem e-mail.</p> : recipients.map((recipient) => {
            const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
            return <label className="admin-sms-recipient" key={recipient.id}>
              <input checked={selectedIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} type="checkbox" />
              <span><strong>{name}</strong><small>{recipient.email}</small></span>
            </label>;
          })}
        </div>
      </section>
      <section aria-labelledby="admin-email-selected-heading" className="admin-sms-picker-panel admin-sms-selected-panel">
        <div className="admin-sms-selected-heading">
          <h3 id="admin-email-selected-heading">Odbiorcy</h3>
          <span>{selectedRecipients.length}</span>
        </div>
        {selectedRecipients.length === 0 ? <p className="admin-sms-empty-selected">Zaznaczone kontakty pojawią się tutaj.</p> : <ul className="admin-sms-selected-list">
          {selectedRecipients.map((recipient) => {
            const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
            return <li key={recipient.id}>
              <span><strong>{name}</strong><small>{recipient.email}</small></span>
              <button aria-label={`Usuń ${name}`} onClick={() => toggleRecipient(recipient.id)} type="button">Usuń</button>
            </li>;
          })}
        </ul>}
      </section>
    </div>
    <label htmlFor="admin-email-subject">Temat
      <input id="admin-email-subject" maxLength={200} onChange={(event) => setSubject(event.target.value)} required value={subject} />
    </label>
    <label htmlFor="admin-email-message">Treść wiadomości
      <textarea id="admin-email-message" maxLength={20000} onChange={(event) => setMessage(event.target.value)} required rows={8} value={message} />
    </label>
    <p className="admin-sms-counter">{message.length}/20000 znaków · wybrano {selectedIds.length}</p>
    <button disabled={pending || selectedIds.length === 0 || !subject.trim() || !message.trim()} type="submit">{pending ? "Wysyłanie…" : "Wyślij e-mail"}</button>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
  </form>;
}
