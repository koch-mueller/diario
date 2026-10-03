import { apiFetch } from "./api";
import type { Household, HouseholdMember } from "./types";

export const householdsApi = {
  /**
   * Lädt alle Wohnungen des angemeldeten Benutzers.
   */
  list(): Promise<Household[]> {
    return apiFetch<Household[]>("/households");
  },

  /**
   * Erstellt eine neue Wohnung.
   */
  create(name: string): Promise<Household> {
    return apiFetch<Household>("/households", {
      method: "POST",
      body: { name },
    });
  },

  /**
   * Fügt einen Benutzer über einen Einladungscode hinzu.
   */
  join(inviteCode: string): Promise<Household> {
    return apiFetch<Household>("/households/join", {
      method: "POST",
      body: { inviteCode },
    });
  },

  /**
   * Lädt eine einzelne Wohnung anhand ihrer ID.
   */
  get(householdId: string): Promise<Household> {
    return apiFetch<Household>(`/households/${householdId}`);
  },

  /**
   * Lädt die Mitglieder einer Wohnung.
   */
  members(householdId: string): Promise<HouseholdMember[]> {
    return apiFetch<HouseholdMember[]>(`/households/${householdId}/members`);
  },

  /**
   * Löscht die angegebene Wohnung.
   */
  delete(householdId: string): Promise<void> {
    return apiFetch<void>(`/households/${householdId}`, {
      method: "DELETE",
    });
  },
};
