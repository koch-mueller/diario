import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { budgetApi } from "../api/budget.api";
import { translationsApi } from "../features/translation/translations.api";
import type { BudgetEntry, BudgetEntryType } from "../api/types";
import { useTranslation } from "../features/translation/TranslationContext";
import { useHousehold } from "../context/HouseholdContext";
import { useRealtimeReload } from "../realtime/useRealtimeReload";

const pieColors = [
  "#2f8f83",
  "#f2b66d",
  "#176d64",
  "#d48b45",
  "#8bbfb8",
  "#c86b5c",
  "#7f9f6f",
  "#9b7a51",
];

type BudgetEntryLike = {
  id: string;
  description: string;
  displayDescription?: string;
  amountCents: number;
  type: BudgetEntryType;
  category: string | null;
  displayCategory?: string | null;
  bookedAt?: string | null;
  createdAt: string;
  isRecurring?: boolean;
  isRecurringVirtual?: boolean;
  recurringId?: string;
};

type BudgetMonthSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  entriesCount: number;
};

type PieSegment = {
  label: string;
  category: string;
  value: number;
  color: string;
  percentage: number;
};

/**
 * Formatiert einen Cent-Betrag als Euro-Wert für die Anzeige.
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * Formatiert einen Monat mit deutschem Monatsnamen und Jahr.
 */
function formatMonth(value: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(value);
}

/**
 * Formatiert einen Monat für ein HTML-Monatsfeld im Format YYYY-MM.
 */
function formatMonthInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/**
 * Erzeugt für einen ausgewählten Budgetmonat ein stabiles ISO-Datum.
 */
function createDateForBudgetMonth(value: Date): string {
  const now = new Date();

  if (
    now.getFullYear() === value.getFullYear() &&
    now.getMonth() === value.getMonth()
  ) {
    return now.toISOString();
  }

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    1,
    12,
    0,
    0,
    0,
  ).toISOString();
}

/**
 * Liefert das Buchungsdatum eines Budgeteintrags mit Fallback auf das Erstellungsdatum.
 */
function getBudgetEntryDate(
  entry: Pick<BudgetEntryLike, "bookedAt" | "createdAt">,
): string {
  return entry.bookedAt ?? entry.createdAt;
}

/**
 * Gibt den ersten Tag des Monats für ein Datum zurück.
 */
function getStartOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

/**
 * Wandelt den Wert eines Monatsfelds in ein Date-Objekt um.
 */
function getMonthFromInput(value: string): Date | null {
  const [yearValue, monthValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

/**
 * Verschiebt einen Monatsschlüssel um die angegebene Anzahl an Monaten.
 */
function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

/**
 * Prüft, ob ein Budgeteintrag im ausgewählten Monat liegt.
 */
function isSameMonth(dateString: string, month: Date): boolean {
  const value = new Date(dateString);

  return (
    value.getFullYear() === month.getFullYear() &&
    value.getMonth() === month.getMonth()
  );
}

/**
 * Prüft, ob ein Budgeteintrag im ausgewählten oder einem früheren Monat liegt.
 */
function isSameOrEarlierMonth(dateString: string, month: Date): boolean {
  const value = new Date(dateString);

  return (
    value.getFullYear() < month.getFullYear() ||
    (value.getFullYear() === month.getFullYear() &&
      value.getMonth() <= month.getMonth())
  );
}

/**
 * Prüft, ob für einen wiederkehrenden Eintrag bereits ein gleichwertiger
 * normaler Eintrag im ausgewählten Monat vorhanden ist.
 * @param realEntries Normale Budgeteinträge des Monats.
 * @param recurringEntry Wiederkehrender Budgeteintrag.
 * @returns true, wenn bereits ein passender normaler Eintrag existiert.
 */
function hasMatchingRealEntry(
  realEntries: BudgetEntryLike[],
  recurringEntry: BudgetEntryLike,
): boolean {
  return realEntries.some(
    (entry) =>
      entry.description === recurringEntry.description &&
      entry.amountCents === recurringEntry.amountCents &&
      entry.type === recurringEntry.type &&
      (entry.category ?? null) === (recurringEntry.category ?? null),
  );
}

/**
 * Wandelt eine Euro-Eingabe in Cent um.
 */
function euroToCents(value: string): number {
  const normalized = value.replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

/**
 * Liefert die übersetzte Beschreibung, falls eine Übersetzung vorhanden ist.
 */
function getEntryDescription(entry: BudgetEntryLike): string {
  return entry.displayDescription ?? entry.description;
}

/**
 * Liefert die übersetzte Kategorie, falls eine Übersetzung vorhanden ist.
 */
function getEntryCategory(entry: BudgetEntryLike): string | null {
  return entry.displayCategory ?? entry.category;
}

/**
 * Erzeugt die sichtbare Beschriftung einer optionalen Kategorie.
 */
function getCategoryLabel(category: string | null | undefined): string {
  const normalizedCategory =
    typeof category === "string" ? normalizeCategory(category) : "";

  return normalizedCategory || "Ohne Kategorie";
}

/**
 * Normalisiert eine Kategorie für Vergleiche unabhängig von Groß- und Kleinschreibung.
 */
function normalizeCategory(value: string): string {
  return value.trim();
}

/**
 * Führt gespeicherte und in Einträgen verwendete Kategorien ohne Duplikate zusammen.
 */
function getUniqueCategories(
  values: Array<string | null | undefined>,
): string[] {
  const categories = values
    .map((value) => (typeof value === "string" ? normalizeCategory(value) : ""))
    .filter(Boolean);

  return [...new Set(categories)].sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory, "de"),
  );
}

/**
 * Ordnet einer Kategorie stabil eine Farbe aus der verfügbaren Palette zu.
 */
function getCategoryColor(
  category: string | null | undefined,
  colorMap: Map<string, string>,
): string {
  return colorMap.get(getCategoryLabel(category)) ?? pieColors[0];
}

/**
 * Liefert die sichtbare Gruppenbezeichnung eines Budgeteintrags.
 */
function getEntryGroupLabel(entry: BudgetEntryLike): string {
  return `${entry.type === "INCOME" ? "Einnahme" : "Ausgabe"} · ${getCategoryLabel(getEntryCategory(entry))}`;
}

/**
 * Erzeugt den stabilen Gruppenschlüssel eines Budgeteintrags.
 */
function getEntryGroupKey(entry: BudgetEntryLike): string {
  return `${entry.type}:${getCategoryLabel(getEntryCategory(entry))}`;
}

/**
 * Berechnet die Segmente für das Kreisdiagramm aus den Budgeteinträgen.
 */
function getPieSegments(
  entries: BudgetEntryLike[],
  colorMap: Map<string, string>,
): PieSegment[] {
  const groupedEntries = new Map<
    string,
    { label: string; category: string; value: number; color: string }
  >();

  for (const entry of entries) {
    const category = getCategoryLabel(getEntryCategory(entry));
    const key = getEntryGroupKey(entry);
    const existingEntry = groupedEntries.get(key);

    if (existingEntry) {
      existingEntry.value += entry.amountCents;
    } else {
      groupedEntries.set(key, {
        label: getEntryGroupLabel(entry),
        category,
        value: entry.amountCents,
        color: getCategoryColor(category, colorMap),
      });
    }
  }

  const total = [...groupedEntries.values()].reduce(
    (sum, value) => sum + value.value,
    0,
  );

  if (total <= 0) {
    return [];
  }

  return [...groupedEntries.values()]
    .sort((firstEntry, secondEntry) => secondEntry.value - firstEntry.value)
    .map((entry) => ({
      ...entry,
      percentage: (entry.value / total) * 100,
    }));
}

/**
 * Erzeugt den CSS-Verlauf für das Kreisdiagramm aus den berechneten Segmenten.
 */
function getPieStyle(segments: PieSegment[]): CSSProperties {
  if (segments.length === 0) {
    return {};
  }

  let currentPercentage = 0;
  const gradientParts = segments.map((segment) => {
    const start = currentPercentage;
    const end = currentPercentage + segment.percentage;
    currentPercentage = end;

    return `${segment.color} ${start}% ${end}%`;
  });

  return {
    background: `conic-gradient(${gradientParts.join(", ")})`,
  };
}

/**
 * Berechnet Einnahmen, Ausgaben und Saldo der angezeigten Budgeteinträge.
 */
function getMonthSummary(entries: BudgetEntryLike[]): BudgetMonthSummary {
  return entries.reduce<BudgetMonthSummary>(
    (summary, entry) => {
      if (entry.type === "INCOME") {
        summary.incomeCents += entry.amountCents;
      } else {
        summary.expenseCents += entry.amountCents;
      }

      summary.balanceCents = summary.incomeCents - summary.expenseCents;
      summary.entriesCount += 1;

      return summary;
    },
    {
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      entriesCount: 0,
    },
  );
}

/**
 * Zeigt Budgeteinträge, Kategorien und Monatsauswertung an.
 */
export function BudgetPage() {
  const { activeHouseholdId, isLoading } = useHousehold();
  const { mode } = useTranslation();
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<BudgetEntryType>("EXPENSE");
  const [category, setCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getStartOfMonth(new Date()),
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadBudget = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const [loadedEntries, loadedCategories] = await Promise.all([
        budgetApi.entries(activeHouseholdId),
        budgetApi.categories(activeHouseholdId),
      ]);
      setSavedCategories(loadedCategories);

      if (mode === "original" || loadedEntries.length === 0) {
        setEntries(loadedEntries);
        return;
      }

      const translatedItems = await translationsApi.translateItems(
        activeHouseholdId,
        mode,
        loadedEntries.map((entry) => ({
          id: entry.id,
          fields: {
            description: entry.description,
            category: entry.category,
          },
        })),
      );
      const translatedById = new Map(
        translatedItems.map((item) => [item.id, item]),
      );

      setEntries(
        loadedEntries.map((entry) => ({
          ...entry,
          displayDescription:
            translatedById.get(entry.id)?.fields.description ??
            entry.description,
          displayCategory:
            translatedById.get(entry.id)?.fields.category ?? entry.category,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Budget konnte nicht geladen werden.",
      );
    }
  }, [activeHouseholdId, mode]);

  useEffect(() => {
    void loadBudget();
  }, [loadBudget]);

  useRealtimeReload(() => {
    void loadBudget();
  });

  const recurringEntries = useMemo(
    () => entries.filter((entry) => entry.isRecurring),
    [entries],
  );

  const monthlyRealEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          !entry.isRecurring &&
          isSameMonth(getBudgetEntryDate(entry), selectedMonth),
      ),
    [entries, selectedMonth],
  );

  const monthlyRecurringEntries = useMemo<BudgetEntryLike[]>(
    () =>
      recurringEntries
        .filter((entry) =>
          isSameOrEarlierMonth(getBudgetEntryDate(entry), selectedMonth),
        )
        .filter((entry) => !hasMatchingRealEntry(monthlyRealEntries, entry))
        .map((entry) => ({
          ...entry,
          id: `${entry.id}:${formatMonthInput(selectedMonth)}`,
          bookedAt: createDateForBudgetMonth(selectedMonth),
          isRecurringVirtual: true,
          recurringId: entry.id,
        })),
    [monthlyRealEntries, recurringEntries, selectedMonth],
  );

  const visibleEntries = useMemo<BudgetEntryLike[]>(
    () =>
      [...monthlyRealEntries, ...monthlyRecurringEntries].sort(
        (firstEntry, secondEntry) =>
          new Date(getBudgetEntryDate(secondEntry)).getTime() -
          new Date(getBudgetEntryDate(firstEntry)).getTime(),
      ),
    [monthlyRealEntries, monthlyRecurringEntries],
  );

  const allCategories = useMemo(
    () =>
      getUniqueCategories([
        ...savedCategories,
        ...entries.map((entry) => entry.category),
        ...entries.map((entry) => entry.displayCategory),
      ]),
    [entries, savedCategories],
  );

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();

    if (!query) {
      return allCategories;
    }

    return allCategories.filter((categoryItem) =>
      categoryItem.toLowerCase().includes(query),
    );
  }, [allCategories, categorySearch]);

  const filteredVisibleEntries = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();

    if (!query) {
      return visibleEntries;
    }

    return visibleEntries.filter((entry) =>
      getCategoryLabel(getEntryCategory(entry)).toLowerCase().includes(query),
    );
  }, [categorySearch, visibleEntries]);

  const categoryColorMap = useMemo(() => {
    const categoryLabels = getUniqueCategories(
      visibleEntries.map((entry) => getEntryCategory(entry)),
    );
    const nextMap = new Map<string, string>();

    if (visibleEntries.some((entry) => !getEntryCategory(entry))) {
      categoryLabels.push("Ohne Kategorie");
    }

    [...new Set(categoryLabels)].forEach((categoryLabel, index) => {
      nextMap.set(categoryLabel, pieColors[index % pieColors.length]);
    });

    return nextMap;
  }, [visibleEntries]);

  const monthlySummary = useMemo(
    () => getMonthSummary(visibleEntries),
    [visibleEntries],
  );
  const pieSegments = useMemo(
    () => getPieSegments(visibleEntries, categoryColorMap),
    [categoryColorMap, visibleEntries],
  );
  const pieStyle = useMemo(() => getPieStyle(pieSegments), [pieSegments]);

  if (!isLoading && !activeHouseholdId) {
    return <Navigate to="/household" replace />;
  }

  /**
   * Validiert das Budgetformular und erstellt einen neuen Eintrag.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeHouseholdId) {
      return;
    }

    const amountCents = euroToCents(amount);
    const normalizedCategory = category.trim()
      ? normalizeCategory(category)
      : null;

    if (!description.trim()) {
      setError("Bitte gib eine Beschreibung ein.");
      return;
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      setError("Bitte gib einen gültigen Betrag ein.");
      return;
    }

    setError(null);

    try {
      const payload = {
        description: description.trim(),
        amountCents,
        type,
        category: normalizedCategory,
        bookedAt: createDateForBudgetMonth(selectedMonth),
      };

      await budgetApi.create(activeHouseholdId, {
        ...payload,
        isRecurring,
      });

      setDescription("");
      setAmount("");
      setType("EXPENSE");
      setCategory("");
      setIsRecurring(false);
      await loadBudget();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Budget-Eintrag konnte nicht erstellt werden.",
      );
    }
  }

  /**
   * Löscht einen normalen Budgeteintrag.
   */
  async function deleteEntry(entry: BudgetEntryLike) {
    if (!activeHouseholdId) {
      return;
    }

    if (entry.isRecurringVirtual && entry.recurringId) {
      await deleteRecurringEntry(entry.recurringId);
      return;
    }

    await budgetApi.delete(activeHouseholdId, entry.id);
    await loadBudget();
  }

  /**
   * Löscht die Vorlage eines wiederkehrenden Budgeteintrags.
   */
  async function deleteRecurringEntry(entryId: string) {
    if (!activeHouseholdId) {
      return;
    }

    await budgetApi.delete(activeHouseholdId, entryId);
    await loadBudget();
  }

  /**
   * Übernimmt eine ausgewählte Kategorie in das Formular.
   */
  function selectCategoryForForm(value: string) {
    setCategory(value);
    setCategorySearch(value);
  }

  return (
    <div className="page-stack">
      <section className="page-header page-header--with-actions">
        <div>
          <p className="eyebrow">Budget</p>
          <h1>Budgetplaner</h1>
          <p>
            Verwalte Einnahmen, Ausgaben, Kategorien und monatliche Übersichten.
          </p>
        </div>
        <div className="month-switcher" aria-label="Monat auswählen">
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              setSelectedMonth((currentMonth) => addMonths(currentMonth, -1))
            }
          >
            Zurück
          </button>
          <label>
            Monat
            <input
              type="month"
              value={formatMonthInput(selectedMonth)}
              onChange={(event) => {
                const nextMonth = getMonthFromInput(event.target.value);

                if (nextMonth) {
                  setSelectedMonth(nextMonth);
                }
              }}
            />
          </label>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              setSelectedMonth((currentMonth) => addMonths(currentMonth, 1))
            }
          >
            Weiter
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setSelectedMonth(getStartOfMonth(new Date()))}
          >
            Aktueller Monat
          </button>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Einnahmen im {formatMonth(selectedMonth)}</span>
          <strong>{formatCurrency(monthlySummary.incomeCents)}</strong>
        </article>
        <article className="summary-card">
          <span>Ausgaben im {formatMonth(selectedMonth)}</span>
          <strong>{formatCurrency(monthlySummary.expenseCents)}</strong>
        </article>
        <article className="summary-card summary-card--highlight">
          <span>Verbleibend</span>
          <strong>{formatCurrency(monthlySummary.balanceCents)}</strong>
        </article>
      </section>

      <form
        className="panel form form--inline budget-form"
        onSubmit={handleSubmit}
      >
        <label>
          Beschreibung
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beschreibung"
            required
          />
        </label>
        <label>
          Betrag in Euro
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            required
          />
        </label>
        <div className="field-group">
          <span className="field-label">Typ</span>
          <div className="type-toggle" role="group" aria-label="Typ auswählen">
            <button
              type="button"
              className={
                type === "EXPENSE"
                  ? "type-toggle__option type-toggle__option--active type-toggle__option--expense"
                  : "type-toggle__option"
              }
              onClick={() => setType("EXPENSE")}
            >
              Ausgabe
            </button>
            <button
              type="button"
              className={
                type === "INCOME"
                  ? "type-toggle__option type-toggle__option--active type-toggle__option--income"
                  : "type-toggle__option"
              }
              onClick={() => setType("INCOME")}
            >
              Einnahme
            </button>
          </div>
        </div>
        <label>
          Kategorie
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Kategorie"
            list="budget-categories"
          />
          <datalist id="budget-categories">
            {allCategories.map((categoryItem) => (
              <option value={categoryItem} key={categoryItem} />
            ))}
          </datalist>
        </label>
        <label className="checkbox-field budget-recurring-field">
          <input
            checked={isRecurring}
            onChange={(event) => setIsRecurring(event.target.checked)}
            type="checkbox"
          />
          Monatlich wiederkehrend
        </label>
        <button type="submit" className="button button--primary">
          Eintrag hinzufügen
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="grid grid--two budget-overview-grid">
        <article className="panel">
          <h2>Visualisierung</h2>
          <p className="muted">
            Alle Einträge im {formatMonth(selectedMonth)}.
          </p>
          <div className="pie-chart-area">
            <div className="pie-chart" style={pieStyle} aria-hidden="true">
              <span>
                <strong>{formatCurrency(monthlySummary.balanceCents)}</strong>
                <small>verbleibend</small>
              </span>
            </div>
            <div className="pie-legend">
              {pieSegments.length === 0 ? (
                <p className="muted">Noch keine Einträge für das Diagramm.</p>
              ) : null}
              {pieSegments.map((segment) => (
                <div
                  className="pie-legend__row"
                  key={`${segment.label}-${segment.category}`}
                >
                  <span
                    className="pie-legend__color"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden="true"
                  />
                  <span>{segment.label}</span>
                  <strong>{formatCurrency(segment.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <header className="panel-header-inline">
            <div>
              <h2>Wiederkehrend</h2>
              <p className="muted">
                Diese Einträge werden jeden Monat automatisch eingerechnet.
              </p>
            </div>
          </header>
          <div className="list list--compact">
            {recurringEntries.length === 0 ? (
              <p className="muted">Noch keine wiederkehrenden Einträge.</p>
            ) : null}
            {recurringEntries.map((entry) => (
              <div
                className="list-row list-row--budget"
                key={entry.id}
                style={{
                  borderLeftColor: getCategoryColor(
                    getEntryCategory(entry),
                    categoryColorMap,
                  ),
                }}
              >
                <span>
                  {entry.type === "INCOME" ? "Einnahme" : "Ausgabe"} ·{" "}
                  {getEntryDescription(entry)}
                  {getEntryCategory(entry) ? (
                    <small> · {getEntryCategory(entry)}</small>
                  ) : null}
                </span>
                <strong>
                  {entry.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(entry.amountCents)}
                </strong>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void deleteRecurringEntry(entry.id)}
                  aria-label="Wiederkehrenden Eintrag löschen"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header-inline panel-header-inline--wrap">
          <div>
            <h2>Einträge im {formatMonth(selectedMonth)}</h2>
            <p className="muted">
              {monthlySummary.entriesCount} Einträge in diesem Monat.
            </p>
          </div>
          <label className="category-search-field">
            Kategorie suchen
            <input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Kategorie suchen"
            />
          </label>
        </header>
        <div className="category-picker category-picker--entries">
          {filteredCategories.slice(0, 10).map((categoryItem) => (
            <button
              type="button"
              className="category-chip"
              key={categoryItem}
              onClick={() => selectCategoryForForm(categoryItem)}
            >
              {categoryItem}
            </button>
          ))}
          {categorySearch.trim() ? (
            <button
              type="button"
              className="category-chip category-chip--add"
              onClick={() => setCategorySearch("")}
            >
              Alle anzeigen
            </button>
          ) : null}
        </div>
        <div className="list list--budget-entries">
          {filteredVisibleEntries.length === 0 ? (
            <p className="muted">Noch keine Einträge.</p>
          ) : null}
          {filteredVisibleEntries.map((entry) => (
            <div
              className="list-row list-row--budget"
              key={entry.id}
              style={{
                borderLeftColor: getCategoryColor(
                  getEntryCategory(entry),
                  categoryColorMap,
                ),
              }}
            >
              <span>
                {entry.type === "INCOME" ? "Einnahme" : "Ausgabe"} ·{" "}
                {getEntryDescription(entry)}
                {getEntryCategory(entry) ? (
                  <small> · {getEntryCategory(entry)}</small>
                ) : null}
                {entry.isRecurringVirtual ? (
                  <small> · wiederkehrend</small>
                ) : null}
              </span>
              <strong>
                {entry.type === "INCOME" ? "+" : "-"}
                {formatCurrency(entry.amountCents)}
              </strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => void deleteEntry(entry)}
                aria-label="Budget-Eintrag löschen"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
