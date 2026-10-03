import { apiFetch } from "../../api/api";
import type { TranslatedItem, TranslationItem, TranslationMode } from "./types";

export const translationsApi = {
  /**
   * Sendet Textfelder zur Übersetzung an das Backend.
   */
  translateItems(
    householdId: string,
    mode: TranslationMode,
    items: TranslationItem[],
  ): Promise<TranslatedItem[]> {
    return apiFetch<TranslatedItem[]>(
      `/households/${householdId}/translations/items`,
      {
        method: "POST",
        body: {
          mode,
          items,
        },
      },
    );
  },
};
