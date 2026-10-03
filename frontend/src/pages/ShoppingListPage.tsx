import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { shoppingListApi } from "../api/shopping-list.api";
import { translationsApi } from "../features/translation/translations.api";
import type { ShoppingListItem } from "../api/types";
import { useTranslation } from "../features/translation/TranslationContext";
import { useHousehold } from "../context/HouseholdContext";
import { useRealtimeReload } from "../realtime/useRealtimeReload";

/**
 * Liefert den übersetzten Namen, falls eine Übersetzung vorhanden ist.
 */
function getItemName(item: ShoppingListItem): string {
  return item.displayName ?? item.name;
}

/**
 * Liefert die übersetzte Mengenangabe, falls eine Übersetzung vorhanden ist.
 */
function getItemQuantity(item: ShoppingListItem): string | null {
  return item.displayQuantity ?? item.quantity;
}

/**
 * Zeigt und verwaltet die gemeinsame Einkaufsliste.
 */
export function ShoppingListPage() {
  const { activeHouseholdId, isLoading } = useHousehold();
  const { mode } = useTranslation();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const loadedItems = await shoppingListApi.list(activeHouseholdId);

      if (mode === "original" || loadedItems.length === 0) {
        setItems(loadedItems);
        return;
      }

      const translatedItems = await translationsApi.translateItems(
        activeHouseholdId,
        mode,
        loadedItems.map((item) => ({
          id: item.id,
          fields: {
            name: item.name,
            quantity: item.quantity,
          },
        })),
      );
      const translatedById = new Map(
        translatedItems.map((item) => [item.id, item]),
      );

      setItems(
        loadedItems.map((item) => ({
          ...item,
          displayName: translatedById.get(item.id)?.fields.name ?? item.name,
          displayQuantity:
            translatedById.get(item.id)?.fields.quantity ?? item.quantity,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Einkaufsliste konnte nicht geladen werden.",
      );
    }
  }, [activeHouseholdId, mode]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useRealtimeReload(() => {
    void loadItems();
  });

  const openItems = useMemo(
    () => items.filter((item) => !item.isChecked),
    [items],
  );
  const checkedItems = useMemo(
    () => items.filter((item) => item.isChecked),
    [items],
  );

  if (!isLoading && !activeHouseholdId) {
    return <Navigate to="/household" replace />;
  }

  /**
   * Erstellt aus den Formulardaten einen neuen Einkaufslisteneintrag.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      await shoppingListApi.create(activeHouseholdId, {
        name,
        quantity: quantity.trim() ? quantity : null,
      });
      setName("");
      setQuantity("");
      await loadItems();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Eintrag konnte nicht erstellt werden.",
      );
    }
  }

  /**
   * Wechselt den Erledigt-Status eines Einkaufslisteneintrags.
   */
  async function toggleItem(item: ShoppingListItem) {
    if (!activeHouseholdId) {
      return;
    }

    await shoppingListApi.update(activeHouseholdId, item.id, {
      isChecked: !item.isChecked,
    });
    await loadItems();
  }

  /**
   * Löscht einen Einkaufslisteneintrag.
   */
  async function deleteItem(itemId: string) {
    if (!activeHouseholdId) {
      return;
    }

    await shoppingListApi.delete(activeHouseholdId, itemId);
    await loadItems();
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <p className="eyebrow">Einkauf</p>
        <h1>Einkaufsliste</h1>
        <p>Füge Einträge hinzu, hake sie ab oder lösche sie.</p>
      </section>

      <form className="panel form form--inline" onSubmit={handleSubmit}>
        <label>
          Eintrag
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Eintrag"
            required
          />
        </label>
        <label>
          Menge
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Menge"
          />
        </label>
        <button type="submit" className="button button--primary">
          Hinzufügen
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="grid grid--two">
        <article className="panel">
          <h2>Offen</h2>
          <div className="list">
            {openItems.length === 0 ? (
              <p className="muted">Alles gekauft.</p>
            ) : null}
            {openItems.map((item) => (
              <div className="list-row" key={item.id}>
                <button
                  type="button"
                  className="check-button"
                  onClick={() => void toggleItem(item)}
                >
                  □
                </button>
                <span className="shopping-item-text shopping-item-text--centered">
                  {getItemName(item)}
                  {getItemQuantity(item) ? (
                    <small> · {getItemQuantity(item)}</small>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void deleteItem(item.id)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Erledigt</h2>
          <div className="list">
            {checkedItems.length === 0 ? (
              <p className="muted">Noch nichts abgehakt.</p>
            ) : null}
            {checkedItems.map((item) => (
              <div className="list-row list-row--done" key={item.id}>
                <button
                  type="button"
                  className="check-button"
                  onClick={() => void toggleItem(item)}
                >
                  ✓
                </button>
                <span className="shopping-item-text shopping-item-text--centered">
                  {getItemName(item)}
                  {getItemQuantity(item) ? (
                    <small> · {getItemQuantity(item)}</small>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void deleteItem(item.id)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
