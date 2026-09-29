"use client";

import { useState } from "react";

type Recipient = {
  childName: string | null;
  email: string;
  id: string;
  parentName: string | null;
  phone: string | null;
};

type Group = {
  id: string;
  memberships: { submissionId: string }[];
  name: string;
};

type Feedback = { error: boolean; message: string };

export function GroupsManager({ groups: initialGroups, recipients }: { groups: Group[]; recipients: Recipient[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [pendingId, setPendingId] = useState<string>();
  const [addingGroupId, setAddingGroupId] = useState<string>();
  const [newMemberId, setNewMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string>();

  function updateGroup(id: string, update: Partial<Group>) {
    setGroups((current) => current.map((group) => group.id === id ? { ...group, ...update } : group));
  }

  function moveGroupToFront(id: string) {
    setGroups((current) => {
      const group = current.find((item) => item.id === id);
      return group ? [group, ...current.filter((item) => item.id !== id)] : current;
    });
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(undefined);
    setPendingId("new");
    try {
      const response = await fetch("/api/admin/groups", {
        body: JSON.stringify({ name: newName }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as Group & { message?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się utworzyć grupy.");
      setGroups((current) => [{ id: result.id, memberships: [], name: result.name }, ...current]);
      setExpandedGroupId(result.id);
      setAddingGroupId(result.id);
      setNewName("");
      setFeedback({ error: false, message: "Grupa została utworzona." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się utworzyć grupy." });
    } finally {
      setPendingId(undefined);
    }
  }

  async function renameGroup(group: Group) {
    const name = window.prompt("Nowa nazwa grupy", group.name)?.trim();
    if (!name || name === group.name) return;
    setFeedback(undefined);
    setPendingId(group.id);
    try {
      const response = await fetch(`/api/admin/groups/${encodeURIComponent(group.id)}`, {
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = await response.json() as { message?: string; name?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się zmienić grupy.");
      updateGroup(group.id, { name: result.name || name });
      moveGroupToFront(group.id);
      setFeedback({ error: false, message: "Nazwa grupy została zmieniona." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zmienić grupy." });
    } finally {
      setPendingId(undefined);
    }
  }

  async function deleteGroup(group: Group) {
    if (!window.confirm(`Usunąć grupę „${group.name}”? Przypisania zostaną usunięte.`)) return;
    setFeedback(undefined);
    setPendingId(group.id);
    try {
      const response = await fetch(`/api/admin/groups/${encodeURIComponent(group.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się usunąć grupy.");
      setGroups((current) => current.filter((item) => item.id !== group.id));
      if (expandedGroupId === group.id) setExpandedGroupId(undefined);
      if (addingGroupId === group.id) cancelAddingMember();
      setFeedback({ error: false, message: "Grupa została usunięta." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się usunąć grupy." });
    } finally {
      setPendingId(undefined);
    }
  }

  async function updateMembers(group: Group, submissionIds: string[]) {
    setFeedback(undefined);
    setPendingId(group.id);
    try {
      const response = await fetch(`/api/admin/groups/${encodeURIComponent(group.id)}/members`, {
        body: JSON.stringify({ submissionIds }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Nie udało się zapisać członków grupy.");
      moveGroupToFront(group.id);
      setFeedback({ error: false, message: `Zaktualizowano grupę „${group.name}”.` });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zapisać członków grupy." });
    } finally {
      setPendingId(undefined);
    }
  }

  function startAddingMember(groupId: string) {
    setExpandedGroupId(groupId);
    setAddingGroupId(groupId);
    setNewMemberId("");
    setMemberSearch("");
    setFeedback(undefined);
  }

  function cancelAddingMember() {
    setAddingGroupId(undefined);
    setNewMemberId("");
    setMemberSearch("");
  }

  function addMember(group: Group) {
    if (!newMemberId) return;
    const ids = group.memberships.map((membership) => membership.submissionId);
    if (!ids.includes(newMemberId)) {
      const nextIds = [...ids, newMemberId];
      updateGroup(group.id, { memberships: nextIds.map((submissionId) => ({ submissionId })) });
      void updateMembers(group, nextIds);
    }
    cancelAddingMember();
  }

  function toggleMember(group: Group, submissionId: string) {
    const ids = group.memberships.map((membership) => membership.submissionId);
    const nextIds = ids.includes(submissionId) ? ids.filter((id) => id !== submissionId) : [...ids, submissionId];
    updateGroup(group.id, { memberships: nextIds.map((id) => ({ submissionId: id })) });
    void updateMembers(group, nextIds);
  }

  return <>
    <form className="admin-form admin-group-create-form" onSubmit={createGroup}>
      <label htmlFor="new-contact-group">Nowa grupa
        <input id="new-contact-group" maxLength={120} onChange={(event) => setNewName(event.target.value)} required value={newName} />
      </label>
      <button disabled={pendingId === "new" || !newName.trim()} type="submit">{pendingId === "new" ? "Tworzenie…" : "Utwórz grupę"}</button>
    </form>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
    <div className="admin-groups-list">
      {groups.length === 0 ? <p className="admin-submissions-empty">Nie ma jeszcze żadnych grup.</p> : groups.map((group) => <details className="admin-group-card" key={group.id} open={expandedGroupId === group.id} onToggle={(event) => setExpandedGroupId(event.currentTarget.open ? group.id : undefined)}>
        <summary className="admin-group-card-header">
          <h2>{group.name}</h2>
        </summary>
        <div className="admin-group-expanded-actions">
          <div className="admin-group-actions">
            <button className="admin-group-action-button" disabled={Boolean(pendingId)} onClick={() => renameGroup(group)} type="button">Zmień nazwę grupy</button>
            <button className="admin-group-action-button admin-destructive-button" disabled={Boolean(pendingId)} onClick={() => deleteGroup(group)} type="button">Usuń grupę</button>
          </div>
        </div>
        <div className="admin-group-members-list">
          {group.memberships.length === 0 ? <p className="admin-submissions-empty">Brak członków grupy.</p> : group.memberships.map((membership) => {
            const recipient = recipients.find((item) => item.id === membership.submissionId);
            if (!recipient) return null;
            const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
            return <div className="admin-group-member" key={recipient.id}>
              <span><strong>{name}</strong><small>{recipient.email}{recipient.phone ? ` · ${recipient.phone}` : ""}</small></span>
              <button aria-label={`Usuń ${name} z grupy`} className="admin-group-remove-member" disabled={Boolean(pendingId)} onClick={() => toggleMember(group, recipient.id)} type="button">×</button>
            </div>;
          })}
        </div>
        {addingGroupId === group.id ? <div className="admin-group-add-member">
          <label htmlFor={`group-member-search-${group.id}`}>Dodaj użytkownika
            <input autoComplete="off" id={`group-member-search-${group.id}`} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Wyszukaj po imieniu, e-mailu lub telefonie" type="search" value={memberSearch} />
          </label>
          <div aria-label="Wyniki wyszukiwania osób" className="admin-group-member-search-results">
            {recipients.filter((recipient) => {
              if (group.memberships.some((membership) => membership.submissionId === recipient.id)) return false;
              const search = memberSearch.trim().toLocaleLowerCase("pl-PL");
              if (!search) return true;
              const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
              return [name, recipient.email, recipient.phone || ""].some((value) => value.toLocaleLowerCase("pl-PL").includes(search));
            }).map((recipient) => {
              const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
              const selected = newMemberId === recipient.id;
              return <button className={selected ? "admin-group-member-search-result admin-group-member-search-result-selected" : "admin-group-member-search-result"} key={recipient.id} onClick={() => setNewMemberId(recipient.id)} type="button">
                <strong>{name}</strong><small>{recipient.email}{recipient.phone ? ` · ${recipient.phone}` : ""}</small>
              </button>;
            })}
            {recipients.filter((recipient) => {
              if (group.memberships.some((membership) => membership.submissionId === recipient.id)) return false;
              const search = memberSearch.trim().toLocaleLowerCase("pl-PL");
              if (!search) return true;
              const name = recipient.childName || recipient.parentName || "Bez podanego imienia";
              return [name, recipient.email, recipient.phone || ""].some((value) => value.toLocaleLowerCase("pl-PL").includes(search));
            }).length === 0 ? <p className="admin-submissions-empty">Nie znaleziono osoby.</p> : null}
          </div>
          <div className="admin-group-add-member-actions">
            <button className="admin-group-action-button" disabled={!newMemberId} onClick={() => addMember(group)} type="button">Dodaj użytkownika</button>
            <button className="admin-secondary-button" onClick={cancelAddingMember} type="button">Anuluj</button>
          </div>
        </div> : null}
        {addingGroupId !== group.id ? <button className="admin-group-action-button admin-group-add-button" disabled={Boolean(pendingId) || recipients.every((recipient) => group.memberships.some((membership) => membership.submissionId === recipient.id))} onClick={() => startAddingMember(group.id)} type="button">Dodaj użytkownika</button> : null}
      </details>)}
    </div>
  </>;
}
