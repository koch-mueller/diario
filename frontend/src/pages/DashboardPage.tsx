import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { budgetApi } from "../api/budget.api";
import { calendarApi } from "../api/calendar.api";
import { shoppingListApi } from "../api/shopping-list.api";
import { tasksApi } from "../api/tasks.api";
import { translationsApi } from "../features/translation/translations.api";
import type {
  BudgetEntry,
  BudgetSummary,
  CalendarEvent,
  ShoppingListItem,
  Task,
} from "../api/types";
import { DashboardCard } from "../components/DashboardCard";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../features/translation/TranslationContext";
import { useHousehold } from "../context/HouseholdContext";
import { useRealtimeReload } from "../realtime/useRealtimeReload";

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
 * Formatiert den Beginn eines Termins für die Dashboard-Vorschau.
 */
function formatEventPreview(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Formatiert eine optionale Aufgaben-Deadline für die Dashboard-Vorschau.
 */
function formatTaskDeadlinePreview(value: string | null): string {
  if (!value) {
    return "Keine Deadline";
  }

  return formatEventPreview(value);
}

/**
 * Prüft, ob ein Datum auf den angegebenen Kalendertag fällt.
 */
function isSameDay(dateString: string, date: Date): boolean {
  const value = new Date(dateString);

  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

/**
 * Prüft, ob ein Datum im angegebenen Monat liegt.
 */
function isSameMonth(dateString: string, month: Date): boolean {
  const value = new Date(dateString);

  return (
    value.getFullYear() === month.getFullYear() &&
    value.getMonth() === month.getMonth()
  );
}

/**
 * Prüft, ob ein Datum im angegebenen oder einem früheren Monat liegt.
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
 * Prüft, ob ein Datum innerhalb der nächsten sieben Tage liegt.
 */
function isWithinNextSevenDays(dateString: string): boolean {
  const value = new Date(dateString).getTime();
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;

  return value >= start && value < end;
}

/**
 * Sortiert Termine chronologisch nach ihrem Beginn.
 */
function sortEventsByStartDate(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (firstEvent, secondEvent) =>
      new Date(firstEvent.startsAt).getTime() -
      new Date(secondEvent.startsAt).getTime(),
  );
}

/**
 * Wandelt die optionale Deadline in einen sortierbaren Zeitwert um.
 */
function getTaskDeadlineTime(task: Task): number {
  return task.deadline
    ? new Date(task.deadline).getTime()
    : Number.MAX_SAFE_INTEGER;
}

/**
 * Sortiert Aufgaben nach Deadline und lässt Aufgaben ohne Deadline zuletzt erscheinen.
 */
function sortTasksByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((firstTask, secondTask) => {
    const deadlineDifference =
      getTaskDeadlineTime(firstTask) - getTaskDeadlineTime(secondTask);

    if (deadlineDifference !== 0) {
      return deadlineDifference;
    }

    return (
      new Date(firstTask.createdAt).getTime() -
      new Date(secondTask.createdAt).getTime()
    );
  });
}

/**
 * Prüft, ob eine offene Aufgabe ihre Deadline bereits überschritten hat.
 */
function isTaskOverdue(task: Task): boolean {
  if (task.completed || !task.deadline) {
    return false;
  }

  return new Date(task.deadline).getTime() < Date.now();
}

/**
 * Prüft, ob eine offene Aufgabe heute fällig ist.
 */
function isTaskDueToday(task: Task): boolean {
  return (
    Boolean(task.deadline) && isSameDay(task.deadline as string, new Date())
  );
}

/**
 * Prüft, ob eine offene Aufgabe innerhalb der nächsten sieben Tage fällig ist.
 */
function isTaskDueWithinNextSevenDays(task: Task): boolean {
  return (
    Boolean(task.deadline) && isWithinNextSevenDays(task.deadline as string)
  );
}

/**
 * Liefert den übersetzten Termintitel, falls eine Übersetzung vorhanden ist.
 */
function getEventTitle(event: CalendarEvent): string {
  return event.displayTitle ?? event.title;
}

/**
 * Liefert den übersetzten Aufgabentitel, falls eine Übersetzung vorhanden ist.
 */
function getTaskTitle(task: Task): string {
  return task.displayTitle ?? task.title;
}

/**
 * Liefert den übersetzten Einkaufslistennamen, falls eine Übersetzung vorhanden ist.
 */
function getShoppingItemName(item: ShoppingListItem): string {
  return item.displayName ?? item.name;
}

/**
 * Liefert die übersetzte Mengenangabe, falls eine Übersetzung vorhanden ist.
 */
function getShoppingItemQuantity(item: ShoppingListItem): string | null {
  return item.displayQuantity ?? item.quantity;
}

/**
 * Liefert das Buchungsdatum eines Budgeteintrags mit Fallback auf das Erstellungsdatum.
 */
function getBudgetEntryDate(
  entry: Pick<BudgetEntry, "bookedAt" | "createdAt">,
): string {
  return entry.bookedAt ?? entry.createdAt;
}

/**
 * Prüft, ob ein wiederkehrender Budgeteintrag bereits als normaler Eintrag
 * im aktuellen Monat vorhanden ist.
 * @param realEntries Normale Einträge des aktuellen Monats.
 * @param recurringEntry Wiederkehrender Budgeteintrag.
 * @returns true, wenn ein gleichwertiger Eintrag existiert.
 */
function hasMatchingRealEntry(
  realEntries: BudgetEntry[],
  recurringEntry: BudgetEntry,
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
 * Berechnet Einnahmen, Ausgaben und Saldo für den aktuellen Monat.
 */
function calculateCurrentMonthBudgetSummary(
  householdId: string,
  entries: BudgetEntry[],
): BudgetSummary {
  const currentMonth = new Date();
  const currentMonthEntries = entries.filter(
    (entry) =>
      !entry.isRecurring &&
      isSameMonth(getBudgetEntryDate(entry), currentMonth),
  );
  const recurringEntries = entries
    .filter((entry) => entry.isRecurring)
    .filter((entry) =>
      isSameOrEarlierMonth(getBudgetEntryDate(entry), currentMonth),
    )
    .filter((entry) => !hasMatchingRealEntry(currentMonthEntries, entry));
  const allEntries = [...currentMonthEntries, ...recurringEntries];

  return allEntries.reduce<BudgetSummary>(
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
      householdId,
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      entriesCount: 0,
    },
  );
}

/**
 * Zeigt die wichtigsten Wohnungsdaten in einer Übersicht an.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const { mode, modeLabel } = useTranslation();
  const { activeHouseholdId, isLoading } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarEvents = useCallback(async () => {
    if (!activeHouseholdId) {
      return [];
    }

    const loadedEvents = await calendarApi.list(activeHouseholdId);

    if (mode === "original" || loadedEvents.length === 0) {
      return loadedEvents;
    }

    try {
      const translatedItems = await translationsApi.translateItems(
        activeHouseholdId,
        mode,
        loadedEvents.map((event) => ({
          id: event.id,
          fields: {
            title: event.title,
            description: event.description,
            location: event.location,
          },
        })),
      );
      const translatedById = new Map(
        translatedItems.map((item) => [item.id, item]),
      );

      return loadedEvents.map((event) => ({
        ...event,
        displayTitle: translatedById.get(event.id)?.fields.title ?? event.title,
        displayDescription:
          translatedById.get(event.id)?.fields.description ?? event.description,
        displayLocation:
          translatedById.get(event.id)?.fields.location ?? event.location,
      }));
    } catch (translationError) {
      setError(
        translationError instanceof Error
          ? translationError.message
          : "Übersetzung konnte nicht geladen werden.",
      );

      return loadedEvents;
    }
  }, [activeHouseholdId, mode]);

  const translateTasks = useCallback(
    async (loadedTasks: Task[]) => {
      if (
        !activeHouseholdId ||
        mode === "original" ||
        loadedTasks.length === 0
      ) {
        return loadedTasks;
      }

      try {
        const translatedItems = await translationsApi.translateItems(
          activeHouseholdId,
          mode,
          loadedTasks.map((task) => ({
            id: task.id,
            fields: { title: task.title },
          })),
        );
        const translatedById = new Map(
          translatedItems.map((item) => [item.id, item]),
        );

        return loadedTasks.map((task) => ({
          ...task,
          displayTitle: translatedById.get(task.id)?.fields.title ?? task.title,
        }));
      } catch (translationError) {
        setError(
          translationError instanceof Error
            ? translationError.message
            : "Übersetzung konnte nicht geladen werden.",
        );

        return loadedTasks;
      }
    },
    [activeHouseholdId, mode],
  );

  const translateShoppingItems = useCallback(
    async (loadedItems: ShoppingListItem[]) => {
      if (
        !activeHouseholdId ||
        mode === "original" ||
        loadedItems.length === 0
      ) {
        return loadedItems;
      }

      try {
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

        return loadedItems.map((item) => ({
          ...item,
          displayName: translatedById.get(item.id)?.fields.name ?? item.name,
          displayQuantity:
            translatedById.get(item.id)?.fields.quantity ?? item.quantity,
        }));
      } catch (translationError) {
        setError(
          translationError instanceof Error
            ? translationError.message
            : "Übersetzung konnte nicht geladen werden.",
        );

        return loadedItems;
      }
    },
    [activeHouseholdId, mode],
  );

  const loadDashboard = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const [
        loadedTasks,
        loadedShoppingItems,
        loadedEvents,
        loadedBudgetEntries,
      ] = await Promise.all([
        tasksApi.list(activeHouseholdId),
        shoppingListApi.list(activeHouseholdId),
        loadCalendarEvents(),
        budgetApi.entries(activeHouseholdId),
      ]);

      const [translatedTasks, translatedShoppingItems] = await Promise.all([
        translateTasks(loadedTasks),
        translateShoppingItems(loadedShoppingItems),
      ]);

      setTasks(translatedTasks);
      setShoppingItems(translatedShoppingItems);
      setEvents(loadedEvents);
      setSummary(
        calculateCurrentMonthBudgetSummary(
          activeHouseholdId,
          loadedBudgetEntries,
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Dashboard konnte nicht geladen werden.",
      );
    }
  }, [
    activeHouseholdId,
    loadCalendarEvents,
    translateShoppingItems,
    translateTasks,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRealtimeReload(() => {
    void loadDashboard();
  });

  const todayEvents = useMemo(
    () =>
      sortEventsByStartDate(
        events.filter((event) => isSameDay(event.startsAt, new Date())),
      ),
    [events],
  );

  const weekEvents = useMemo(
    () =>
      sortEventsByStartDate(
        events.filter((event) => isWithinNextSevenDays(event.startsAt)),
      ),
    [events],
  );

  const openTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks],
  );

  const todayTasks = useMemo(
    () =>
      sortTasksByDeadline(
        openTasks.filter((task) => isTaskOverdue(task) || isTaskDueToday(task)),
      ),
    [openTasks],
  );

  const weekTasks = useMemo(
    () =>
      sortTasksByDeadline(
        openTasks.filter(
          (task) =>
            !isTaskOverdue(task) &&
            !isTaskDueToday(task) &&
            isTaskDueWithinNextSevenDays(task),
        ),
      ),
    [openTasks],
  );

  const openShoppingItems = useMemo(
    () => shoppingItems.filter((item) => !item.isChecked),
    [shoppingItems],
  );

  if (!isLoading && !activeHouseholdId) {
    return <Navigate to="/household" replace />;
  }

  return (
    <div className="page-stack">
      <section className="welcome-header">
        <p className="eyebrow">Homepage</p>
        <h1>Home Sweet Home, {user?.name ?? "User"}</h1>
        <p>Dein Überblick für Termine, To-dos, Einkauf und Budget.</p>
        <span className="mode-pill">Sprache: {modeLabel}</span>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="dashboard-grid">
        <DashboardCard
          title="Was heute tun?"
          subtitle="Termine und fällige To-dos für heute"
        >
          <div className="mini-list">
            <h3>Termine heute</h3>
            <div className="mini-list__scroll" aria-label="Termine heute">
              {todayEvents.length === 0 ? (
                <p className="muted">Keine Termine.</p>
              ) : null}
              {todayEvents.map((event) => (
                <p key={event.id}>
                  <strong>{formatEventPreview(event.startsAt)}</strong>
                  <span>{getEventTitle(event)}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="mini-list">
            <h3>To-dos</h3>
            <div
              className="mini-list__scroll"
              aria-label="Fällige To-dos heute"
            >
              {todayTasks.length === 0 ? (
                <p className="muted">Alles erledigt.</p>
              ) : null}
              {todayTasks.map((task) => (
                <p
                  key={task.id}
                  className={
                    isTaskOverdue(task) ? "mini-list__item--overdue" : undefined
                  }
                >
                  <strong>
                    Fällig: {formatTaskDeadlinePreview(task.deadline)}
                  </strong>
                  <span>{getTaskTitle(task)}</span>
                </p>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Was diese Woche tun?"
          subtitle="Termine und To-dos in den nächsten 7 Tagen"
        >
          <div className="mini-list">
            <h3>Termine</h3>
            <div
              className="mini-list__scroll"
              aria-label="Termine der nächsten 7 Tage"
            >
              {weekEvents.length === 0 ? (
                <p className="muted">Keine Termine in den nächsten 7 Tagen.</p>
              ) : null}
              {weekEvents.map((event) => (
                <p key={event.id}>
                  <strong>{formatEventPreview(event.startsAt)}</strong>
                  <span>{getEventTitle(event)}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="mini-list">
            <h3>To-dos</h3>
            <div
              className="mini-list__scroll"
              aria-label="Fällige To-dos der Woche"
            >
              {weekTasks.length === 0 ? (
                <p className="muted">
                  Keine weiteren To-dos in den nächsten 7 Tagen.
                </p>
              ) : null}
              {weekTasks.map((task) => (
                <p key={task.id}>
                  <strong>
                    Fällig: {formatTaskDeadlinePreview(task.deadline)}
                  </strong>
                  <span>{getTaskTitle(task)}</span>
                </p>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Was kaufen?"
          subtitle="Einkaufsliste und Budget des aktuellen Monats"
          footer={
            <div className="budget-preview">
              <span>Budget aktueller Monat</span>
              <strong>
                {summary ? formatCurrency(summary.balanceCents) : "–"}
              </strong>
            </div>
          }
        >
          <div className="mini-list mini-list--single">
            <h3>Einkaufsliste</h3>
            <div
              className="mini-list__scroll"
              aria-label="Offene Einkaufsliste"
            >
              {openShoppingItems.length === 0 ? (
                <p className="muted">Nichts offen.</p>
              ) : null}
              {openShoppingItems.map((item) => (
                <p key={item.id}>
                  <span>{getShoppingItemName(item)}</span>
                  {getShoppingItemQuantity(item) ? (
                    <small>{getShoppingItemQuantity(item)}</small>
                  ) : null}
                </p>
              ))}
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
