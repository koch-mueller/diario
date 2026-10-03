import { apiFetch } from "./api";
import type { BudgetEntry, BudgetEntryType, BudgetSummary } from "./types";

export type BudgetEntryPayload = {
  description: string;
  amountCents: number;
  type: BudgetEntryType;
  category?: string | null;
  bookedAt?: string;
  isRecurring?: boolean;
};

export const budgetApi = {
  /**
   * Lädt die Budgeteinträge einer Wohnung.
   */
  entries(householdId: string): Promise<BudgetEntry[]> {
    return apiFetch<BudgetEntry[]>(`/households/${householdId}/budget/entries`);
  },

  /**
   * Berechnet und liefert eine Zusammenfassung.
   */
  summary(householdId: string): Promise<BudgetSummary> {
    return apiFetch<BudgetSummary>(`/households/${householdId}/budget/summary`);
  },

  /**
   * Lädt die gespeicherten Budgetkategorien einer Wohnung.
   * @param householdId ID der Wohnung.
   * @returns Die gespeicherten Kategorien.
   */
  categories(householdId: string): Promise<string[]> {
    return apiFetch<string[]>(`/households/${householdId}/budget/categories`);
  },

  /**
   * Erstellt einen neuen Budgeteintrag.
   */
  create(
    householdId: string,
    payload: BudgetEntryPayload,
  ): Promise<BudgetEntry> {
    return apiFetch<BudgetEntry>(`/households/${householdId}/budget/entries`, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Löscht den angegebenen Budgeteintrag.
   */
  delete(householdId: string, entryId: string): Promise<void> {
    return apiFetch<void>(
      `/households/${householdId}/budget/entries/${entryId}`,
      {
        method: "DELETE",
      },
    );
  },
};
