import { apiFetch } from "./api";
import type { ShoppingListItem } from "./types";

const shoppingListPath = (householdId: string): string =>
  `/households/${householdId}/shopping-list/items`;

const shoppingListItemPath = (householdId: string, itemId: string): string =>
  `${shoppingListPath(householdId)}/${itemId}`;

export const shoppingListApi = {
  /**
   * Lädt alle Einkaufslisteneinträge der ausgewählten Wohnung.
   */
  list(householdId: string): Promise<ShoppingListItem[]> {
    return apiFetch<ShoppingListItem[]>(shoppingListPath(householdId));
  },

  /**
   * Erstellt einen neuen Einkaufslisteneintrag.
   */
  create(
    householdId: string,
    payload: { name: string; quantity?: string | null },
  ): Promise<ShoppingListItem> {
    return apiFetch<ShoppingListItem>(shoppingListPath(householdId), {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Aktualisiert einen vorhandenen Einkaufslisteneintrag.
   */
  update(
    householdId: string,
    itemId: string,
    payload: { name?: string; quantity?: string | null; isChecked?: boolean },
  ): Promise<ShoppingListItem> {
    return apiFetch<ShoppingListItem>(
      shoppingListItemPath(householdId, itemId),
      {
        method: "PATCH",
        body: payload,
      },
    );
  },

  /**
   * Löscht den angegebenen Einkaufslisteneintrag.
   */
  delete(householdId: string, itemId: string): Promise<void> {
    return apiFetch<void>(shoppingListItemPath(householdId, itemId), {
      method: "DELETE",
    });
  },
};
