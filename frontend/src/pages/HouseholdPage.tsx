import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { householdsApi } from "../api/households.api";
import type { HouseholdMember } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useHousehold } from "../context/HouseholdContext";

/**
 * Übersetzt die technische Wohnungsrolle in eine verständliche Anzeige.
 */
function formatRole(role: HouseholdMember["role"]): string {
  return role === "OWNER" ? "Besitzer" : "Mitglied";
}

/**
 * Kennzeichnet den aktuell angemeldeten Benutzer in der Mitgliederliste.
 */
function getMemberDisplayName(member: HouseholdMember): string {
  return member.userName?.trim() || member.userId;
}

/**
 * Zeigt die Wohnungsverwaltung und deren Mitglieder an.
 */
export function HouseholdPage() {
  const { user } = useAuth();
  const {
    households,
    activeHousehold,
    activeHouseholdId,
    isLoading,
    createHousehold,
    joinHousehold,
    deleteHousehold,
    setActiveHouseholdId,
  } = useHousehold();
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isActiveHouseholdOwner =
    Boolean(user?.id) && activeHousehold?.createdByUserId === user?.id;

  const loadMembers = useCallback(async () => {
    if (!activeHouseholdId) {
      setMembers([]);
      return;
    }

    const loadedMembers = await householdsApi.members(activeHouseholdId);
    setMembers(loadedMembers);
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  /**
   * Erstellt eine neue Wohnung und wählt sie anschließend aus.
   */
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await createHousehold(newHouseholdName);
      setNewHouseholdName("");
      setSuccess("Wohnung wurde erstellt.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Wohnung konnte nicht erstellt werden.",
      );
    }
  }

  /**
   * Tritt einer Wohnung über den eingegebenen Einladungscode bei.
   */
  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await joinHousehold(inviteCode);
      setInviteCode("");
      setSuccess("Du bist der Wohnung beigetreten.");
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Beitritt fehlgeschlagen.",
      );
    }
  }

  /**
   * Löscht die aktive Wohnung nach Bestätigung und aktualisiert die Auswahl.
   */
  async function handleDeleteActiveHousehold() {
    if (!activeHousehold) {
      return;
    }

    const shouldDelete = window.confirm(
      `Möchtest du die Wohnung "${activeHousehold.name}" wirklich löschen? Alle To-dos, Einkaufslisten, Budget-Einträge und Termine dieser Wohnung werden ebenfalls gelöscht.`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await deleteHousehold(activeHousehold.id);
      setMembers([]);
      setSuccess("Wohnung wurde gelöscht.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Wohnung konnte nicht gelöscht werden.",
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <p className="eyebrow">Benutzerverwaltung</p>
        <h1>Wohnung verwalten</h1>
        <p>
          Hier kannst du eine Wohnung erstellen, einer Wohnung beitreten und den
          Einladungscode kopieren.
        </p>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="grid grid--two">
        <article className="panel">
          <h2>Aktive Wohnung</h2>

          {isLoading ? (
            <p className="muted">Wohnungen werden geladen...</p>
          ) : null}

          {activeHousehold ? (
            <div className="active-household">
              <h3>{activeHousehold.name}</h3>
              <p className="muted">Einladungscode</p>
              <code className="invite-code">{activeHousehold.inviteCode}</code>

              <div className="active-household__actions">
                {isActiveHouseholdOwner ? (
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => void handleDeleteActiveHousehold()}
                  >
                    Wohnung löschen
                  </button>
                ) : (
                  <p className="muted">
                    Nur der Besitzer kann die Wohnung löschen.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">Du bist noch in keiner Wohnung.</p>
          )}

          <div className="list">
            {households.map((household) => (
              <button
                type="button"
                className={
                  household.id === activeHouseholdId
                    ? "list-row list-row--active"
                    : "list-row"
                }
                key={household.id}
                onClick={() => setActiveHouseholdId(household.id)}
              >
                <span>{household.name}</span>
                <small>{household.inviteCode}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Mitglieder</h2>

          {members.length === 0 ? (
            <p className="muted">Noch keine Mitglieder geladen.</p>
          ) : (
            <div className="list">
              {members.map((member) => (
                <div className="list-row" key={member.id}>
                  <span>
                    <strong>{getMemberDisplayName(member)}</strong>
                    {member.userEmail ? (
                      <small>{member.userEmail}</small>
                    ) : null}
                  </span>
                  <small>{formatRole(member.role)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid grid--two">
        <form className="panel form" onSubmit={handleCreate}>
          <h2>Neue Wohnung erstellen</h2>
          <label>
            Name der Wohnung
            <input
              value={newHouseholdName}
              onChange={(event) => setNewHouseholdName(event.target.value)}
              placeholder="Name"
              required
            />
          </label>
          <button type="submit" className="button button--primary">
            Wohnung erstellen
          </button>
        </form>

        <form className="panel form" onSubmit={handleJoin}>
          <h2>Wohnung beitreten</h2>
          <label>
            Einladungscode
            <input
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              placeholder="Code"
              maxLength={8}
              required
            />
          </label>
          <button type="submit" className="button button--secondary">
            Beitreten
          </button>
        </form>
      </section>
    </div>
  );
}
