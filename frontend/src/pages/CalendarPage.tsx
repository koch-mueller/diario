import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Navigate } from "react-router-dom";

import { calendarApi } from "../api/calendar.api";
import type { CalendarEvent } from "../api/types";
import { useTranslation } from "../features/translation/TranslationContext";
import { translationsApi } from "../features/translation/translations.api";
import { useHousehold } from "../context/HouseholdContext";
import { useRealtimeReload } from "../realtime/useRealtimeReload";
import {
  getGermanPublicHolidays,
  getGermanPublicHolidaysForYears,
  type GermanHoliday,
} from "../utils/german-holidays";
import { downloadIcsFile } from "../utils/ical-export";

const weekDayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Formatiert ein Datum für ein deutsches Datumseingabefeld.
 */
function toGermanDateInputValue(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Formatiert ein Datum für ein deutsches Zeiteingabefeld.
 */
function toGermanTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

/**
 * Wandelt deutsche Datums- und Zeiteingaben in ein Date-Objekt um.
 */
function parseGermanDateTimeInput(dateValue: string, timeValue: string): Date {
  const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    throw new Error("Bitte nutze das Format TT.MM.JJJJ und HH:MM.");
  }

  const [, dayValue, monthValue, yearValue] = dateMatch;
  const [, hourValue, minuteValue] = timeMatch;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    throw new Error(
      "Bitte gib ein gültiges deutsches Datum und eine gültige Uhrzeit ein.",
    );
  }

  return date;
}

/**
 * Wandelt ein Datum in einen vergleichbaren Schlüssel um.
 */
function toDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Gibt den Tagesbeginn für ein Datum zurück.
 */
function getStartOfDay(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Formatiert ein Datum in deutscher Schreibweise.
 */
function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formatiert Datum und Uhrzeit in deutscher Schreibweise.
 */
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Formatiert die Uhrzeit eines Termins oder kennzeichnet Ganztagstermine.
 */
function formatDayTime(value: string, isAllDay: boolean): string {
  if (isAllDay) {
    return "Ganztägig";
  }

  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Erzeugt die Überschrift für den aktuell angezeigten Kalendermonat.
 */
function getMonthTitle(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Erzeugt die vollständigen Kalendertage der Monatsansicht einschließlich Randwochen.
 */
function getCalendarDays(selectedMonth: Date): Date[] {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDay);
    day.setDate(firstVisibleDay.getDate() + index);

    return day;
  });
}

/**
 * Prüft, ob ein Kalendertag zum aktuell ausgewählten Monat gehört.
 */
function isSameMonth(date: Date, selectedMonth: Date): boolean {
  return (
    date.getFullYear() === selectedMonth.getFullYear() &&
    date.getMonth() === selectedMonth.getMonth()
  );
}

/**
 * Prüft, ob der angegebene Kalendertag heute ist.
 */
function isToday(date: Date): boolean {
  return toDateKey(date) === toDateKey(new Date());
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
 * Ermittelt alle Jahre, die für den Kalenderexport der Termine benötigt werden.
 */
function getExportYears(
  events: CalendarEvent[],
  selectedMonth: Date,
): number[] {
  return [
    selectedMonth.getFullYear(),
    ...events.map((event) => new Date(event.startsAt).getFullYear()),
    ...events.map((event) => new Date(event.endsAt).getFullYear()),
  ];
}

/**
 * Liefert den übersetzten Termintitel, falls eine Übersetzung vorhanden ist.
 */
function getEventTitle(event: CalendarEvent): string {
  return event.displayTitle ?? event.title;
}

/**
 * Liefert die übersetzte Terminbeschreibung, falls eine Übersetzung vorhanden ist.
 */
function getEventDescription(event: CalendarEvent): string | null {
  return event.displayDescription ?? event.description;
}

/**
 * Liefert den übersetzten Terminort, falls eine Übersetzung vorhanden ist.
 */
function getEventLocation(event: CalendarEvent): string | null {
  return event.displayLocation ?? event.location;
}

/**
 * Erzeugt einen dateisicheren Zusatz für den Namen der Exportdatei.
 */
function getModeFileSuffix(modeLabel: string): string {
  return modeLabel
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("'", "")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue");
}

/**
 * Erzeugt die Standard-Startzeit für einen neu ausgewählten Kalendertag.
 */
function getDefaultStartForDay(day: Date): Date {
  const selectedDate = new Date(day);
  const now = new Date();

  if (toDateKey(selectedDate) === toDateKey(now)) {
    selectedDate.setHours(now.getHours() + 1, 0, 0, 0);
    return selectedDate;
  }

  selectedDate.setHours(9, 0, 0, 0);
  return selectedDate;
}

/**
 * Erstellt den Tooltip mit Zeit, Titel und optionalem Ort eines Termins.
 */
function getEventTooltip(event: CalendarEvent): string {
  const location = getEventLocation(event);
  const description = getEventDescription(event);
  const parts = [
    getEventTitle(event),
    `${formatDateTime(event.startsAt)} bis ${formatDateTime(event.endsAt)}`,
  ];

  if (location) {
    parts.push(location);
  }

  if (description) {
    parts.push(description);
  }

  return parts.join("\n");
}

/**
 * Erzeugt alle Datumsschlüssel zwischen Start und Ende eines Termins.
 */
function getDatesBetween(startValue: string, endValue: string): string[] {
  const start = getStartOfDay(startValue);
  const end = getStartOfDay(endValue);
  const result: string[] = [];
  const current = new Date(start);
  let safetyCounter = 0;

  while (current.getTime() <= end.getTime() && safetyCounter < 370) {
    result.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
    safetyCounter += 1;
  }

  return result;
}

/**
 * Erzeugt die kompakte Beschriftung eines Termins innerhalb eines Kalendertags.
 */
function getCalendarEntryLabel(event: CalendarEvent, day: Date): string {
  const dayKey = toDateKey(day);
  const startKey = toDateKey(event.startsAt);
  const endKey = toDateKey(event.endsAt);
  const title = getEventTitle(event);

  if (event.isAllDay) {
    return title;
  }

  if (startKey === endKey || dayKey === startKey) {
    return `${formatDayTime(event.startsAt, false)} ${title}`;
  }

  if (dayKey === endKey) {
    return `bis ${formatDayTime(event.endsAt, false)} ${title}`;
  }

  return title;
}

/**
 * Zeigt den Monatskalender und verwaltet Termine.
 */
export function CalendarPage() {
  const { activeHouseholdId, isLoading } = useHousehold();
  const { mode, modeLabel, modeDescription } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() =>
    toGermanDateInputValue(new Date()),
  );
  const [startTime, setStartTime] = useState(() =>
    toGermanTimeInputValue(new Date()),
  );
  const [endDate, setEndDate] = useState(() =>
    toGermanDateInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [endTime, setEndTime] = useState(() =>
    toGermanTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const loadedEvents = await calendarApi.list(activeHouseholdId);

      if (mode === "original" || loadedEvents.length === 0) {
        setEvents(loadedEvents);
        return;
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

        setEvents(
          loadedEvents.map((event) => ({
            ...event,
            displayTitle:
              translatedById.get(event.id)?.fields.title ?? event.title,
            displayDescription:
              translatedById.get(event.id)?.fields.description ??
              event.description,
            displayLocation:
              translatedById.get(event.id)?.fields.location ?? event.location,
            originalTitle: event.title,
            originalDescription: event.description,
            originalLocation: event.location,
          })),
        );
      } catch (translationError) {
        setError(
          translationError instanceof Error
            ? translationError.message
            : "Übersetzung konnte nicht geladen werden.",
        );
        setEvents(loadedEvents);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kalender konnte nicht geladen werden.",
      );
    }
  }, [activeHouseholdId, mode]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useRealtimeReload(() => {
    void loadEvents();
  });

  const holidays = useMemo(
    () => getGermanPublicHolidays(selectedMonth.getFullYear()),
    [selectedMonth],
  );

  const days = useMemo(() => getCalendarDays(selectedMonth), [selectedMonth]);

  const eventsByDate = useMemo(() => {
    const groupedEvents = new Map<string, CalendarEvent[]>();

    for (const event of sortEventsByStartDate(events)) {
      for (const key of getDatesBetween(event.startsAt, event.endsAt)) {
        const currentEvents = groupedEvents.get(key) ?? [];
        currentEvents.push(event);
        groupedEvents.set(key, currentEvents);
      }
    }

    return groupedEvents;
  }, [events]);

  const holidaysByDate = useMemo(() => {
    const groupedHolidays = new Map<string, GermanHoliday[]>();

    for (const holiday of holidays) {
      const key = toDateKey(holiday.startsAt);
      const currentHolidays = groupedHolidays.get(key) ?? [];
      currentHolidays.push(holiday);
      groupedHolidays.set(key, currentHolidays);
    }

    return groupedHolidays;
  }, [holidays]);

  if (!isLoading && !activeHouseholdId) {
    return <Navigate to="/household" replace />;
  }

  /**
   * Wechselt zum vorherigen Kalendermonat.
   */
  function goToPreviousMonth() {
    setSelectedMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  }

  /**
   * Wechselt zum nächsten Kalendermonat.
   */
  function goToNextMonth() {
    setSelectedMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  }

  /**
   * Wechselt zurück zum aktuellen Kalendermonat.
   */
  function goToCurrentMonth() {
    setSelectedMonth(new Date());
  }

  /**
   * Übernimmt Start und Ende in das Terminformular.
   */
  function setFormDateTimes(start: Date, end: Date) {
    setStartDate(toGermanDateInputValue(start));
    setStartTime(toGermanTimeInputValue(start));
    setEndDate(toGermanDateInputValue(end));
    setEndTime(toGermanTimeInputValue(end));
  }

  /**
   * Öffnet das Formular für einen neuen Termin am ausgewählten Tag.
   */
  function selectDayForNewEvent(day: Date) {
    const start = getDefaultStartForDay(day);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setFormDateTimes(start, end);
    setSelectedMonth(new Date(day.getFullYear(), day.getMonth(), 1));

    window.setTimeout(() => {
      document.getElementById("calendar-title-input")?.focus();
    }, 0);
  }

  /**
   * Öffnet bei Tastaturaktivierung das Terminformular für den ausgewählten Tag.
   */
  function handleDayKeyDown(event: KeyboardEvent<HTMLDivElement>, day: Date) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDayForNewEvent(day);
    }
  }

  /**
   * Exportiert die sichtbaren Termine als iCalendar-Datei.
   */
  function exportCalendar() {
    const exportYears = getExportYears(events, selectedMonth);
    const exportHolidays = getGermanPublicHolidaysForYears(exportYears);
    const fileYear = selectedMonth.getFullYear();
    const modeSuffix = getModeFileSuffix(modeLabel);

    downloadIcsFile(`diario-kalender-${fileYear}-${modeSuffix}.ics`, [
      ...events,
      ...exportHolidays,
    ]);
  }

  /**
   * Validiert das Terminformular und erstellt einen neuen Kalendereintrag.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const parsedStart = parseGermanDateTimeInput(startDate, startTime);
      const parsedEnd = parseGermanDateTimeInput(endDate, endTime);

      if (parsedEnd.getTime() <= parsedStart.getTime()) {
        setError("Das Ende muss nach dem Start liegen.");
        return;
      }

      await calendarApi.create(activeHouseholdId, {
        title,
        location: location.trim() ? location : null,
        description: description.trim() ? description : null,
        startsAt: parsedStart.toISOString(),
        endsAt: parsedEnd.toISOString(),
        isAllDay: false,
      });

      setTitle("");
      setLocation("");
      setDescription("");
      setFormDateTimes(new Date(), new Date(Date.now() + 60 * 60 * 1000));
      await loadEvents();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Termin konnte nicht erstellt werden.",
      );
    }
  }

  /**
   * Löscht einen Termin nach Bestätigung.
   */
  async function deleteEvent(eventId: string) {
    if (!activeHouseholdId) {
      return;
    }

    await calendarApi.delete(activeHouseholdId, eventId);
    setSelectedEvent(null);
    await loadEvents();
  }

  return (
    <div className="page-stack">
      <section className="page-header page-header--with-actions">
        <div>
          <p className="eyebrow">Kalender</p>
          <h1>Termine</h1>
          <p>
            Plane Termine für eure Wohnung. Deutsche Feiertage werden
            automatisch im Kalender angezeigt.
          </p>
          <div className="translation-info">
            <span className="mode-pill">Sprache: {modeLabel}</span>
            <span>{modeDescription}</span>
          </div>
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={exportCalendar}
        >
          Kalender exportieren
        </button>
      </section>

      <form className="panel form calendar-form" onSubmit={handleSubmit}>
        <label>
          Titel
          <input
            id="calendar-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titel"
            required
          />
        </label>
        <label>
          Startdatum
          <input
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            placeholder="TT.MM.JJJJ"
            inputMode="numeric"
            required
          />
        </label>
        <label>
          Startzeit
          <input
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            placeholder="HH:MM"
            inputMode="numeric"
            required
          />
        </label>
        <label>
          Enddatum
          <input
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            placeholder="TT.MM.JJJJ"
            inputMode="numeric"
            required
          />
        </label>
        <label>
          Endzeit
          <input
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            placeholder="HH:MM"
            inputMode="numeric"
            required
          />
        </label>
        <label>
          Ort
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ort"
          />
        </label>
        <label>
          Beschreibung
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beschreibung"
          />
        </label>
        <button type="submit" className="button button--primary">
          Termin hinzufügen
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="calendar-layout calendar-layout--single">
        <article className="panel calendar-panel">
          <header className="calendar-toolbar">
            <button
              type="button"
              className="button button--ghost"
              onClick={goToPreviousMonth}
            >
              Zurück
            </button>
            <div>
              <h2>{getMonthTitle(selectedMonth)}</h2>
              <button
                type="button"
                className="calendar-today-button"
                onClick={goToCurrentMonth}
              >
                Heute anzeigen
              </button>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={goToNextMonth}
            >
              Weiter
            </button>
          </header>

          <div className="calendar-weekdays">
            {weekDayLabels.map((weekday) => (
              <strong key={weekday}>{weekday}</strong>
            ))}
          </div>

          <div className="calendar-grid" aria-label="Monatskalender">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const dayHolidays = holidaysByDate.get(key) ?? [];

              return (
                <div
                  className={[
                    "calendar-day",
                    isSameMonth(day, selectedMonth)
                      ? ""
                      : "calendar-day--muted",
                    isToday(day) ? "calendar-day--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={key}
                  onClick={() => selectDayForNewEvent(day)}
                  onKeyDown={(event) => handleDayKeyDown(event, day)}
                  role="button"
                  tabIndex={0}
                  title={`Termin am ${formatDate(day)} hinzufügen`}
                  aria-label={`Termin am ${formatDate(day)} hinzufügen`}
                >
                  <span className="calendar-day__number">{day.getDate()}</span>

                  <span className="calendar-day__items">
                    {dayHolidays.map((holiday) => (
                      <span
                        className="calendar-entry calendar-entry--holiday"
                        key={holiday.id}
                        title={holiday.title}
                      >
                        {holiday.title}
                      </span>
                    ))}

                    {dayEvents.map((eventItem) => (
                      <button
                        type="button"
                        className="calendar-entry"
                        key={`${eventItem.id}-${key}`}
                        title={getEventTooltip(eventItem)}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedEvent(eventItem);
                        }}
                      >
                        {getCalendarEntryLabel(eventItem, day)}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {selectedEvent ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedEvent(null)}
        >
          <article
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Termindetails"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <p className="eyebrow">Termin</p>
                <h2>{getEventTitle(selectedEvent)}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Popup schließen"
              >
                ×
              </button>
            </header>

            <div className="event-detail-grid">
              <span>Start</span>
              <strong>{formatDateTime(selectedEvent.startsAt)}</strong>
              <span>Ende</span>
              <strong>{formatDateTime(selectedEvent.endsAt)}</strong>
              <span>Ort</span>
              <strong>
                {getEventLocation(selectedEvent) ?? "Kein Ort eingetragen"}
              </strong>
              <span>Beschreibung</span>
              <strong>
                {getEventDescription(selectedEvent) ??
                  "Keine Beschreibung eingetragen"}
              </strong>
            </div>

            <footer className="modal-actions">
              <button
                type="button"
                className="button button--danger"
                onClick={() => void deleteEvent(selectedEvent.id)}
              >
                Termin löschen
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setSelectedEvent(null)}
              >
                Schließen
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </div>
  );
}
