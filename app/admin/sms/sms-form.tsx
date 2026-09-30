"use client";

import { useState, type FormEvent } from "react";
import { MessageHistoryModal } from "../message-history-modal";
import { smsHistoryChannels } from "@/lib/message-history-channels";

type SmsRecipient = {
  childName: string | null;
  id: string;
  parentName: string | null;
  phone: string;
};

type RecipientGroup = {
  id: string;
  name: string;
  submissionIds: string[];
};

function createDispatchKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function SmsForm({ groups = [], recipients }: { groups?: RecipientGroup[]; recipients: SmsRecipient[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; error: boolean }>();
  const [pending, setPending] = useState(false);
  const [dispatch, setDispatch] = useState<{ fingerprint: string; key: string }>();
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

    const fingerprint = JSON.stringify({ message, submissionIds: selectedIds });
    const isResume = dispatch?.fingerprint === fingerprint;
    const dispatchKey = isResume ? dispatch.key : createDispatchKey();

    try {
      const response = await fetch("/api/admin/sms", {
        body: JSON.stringify({ dispatchKey, message, submissionIds: selectedIds }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { message?: string; partial?: boolean };
      if (!response.ok) {
        setDispatch(undefined);
        throw new Error(result.message || "Nie udało się wysłać wiadomości SMS.");
      }
      setFeedback({ error: false, message: result.message || "Wiadomość SMS została wysłana." });
      // A partial send keeps the same key and the selection, so pressing send
      // again resumes instead of delivering a second copy.
      setDispatch(result.partial ? { fingerprint, key: dispatchKey } : undefined);
      if (!result.partial) {
        setMessage("");
        setSelectedIds([]);
      }
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
      <textarea id="admin-sms-message" maxLength={10000} onChange={(event) => setMessage(event.target.value)} required rows={7} value={message} />
    </label>
    <p className="admin-sms-counter">{message.length}/10000 znaków · do 2 części SMS, dłuższe wiadomości MMS · wybrano {selectedIds.length}</p>
    <button disabled={pending || selectedIds.length === 0 || !message.trim()} type="submit">{pending ? "Wysyłanie…" : "Wyślij SMS"}</button>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
    <div className="admin-sms-history">
      <MessageHistoryModal channels={smsHistoryChannels} />
    </div>
  </form>;
}
