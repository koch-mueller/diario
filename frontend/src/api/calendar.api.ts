import { apiFetch } from "./api";
import type { CalendarEvent } from "./types";

export type CalendarEventPayload = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  isAllDay?: boolean;
};

type CalendarListQuery = {
  from?: string;
  to?: string;
};

/**
 * Erstellt die Query-Parameter für einen Kalenderzeitraum.
 */
function buildCalendarQuery(query?: CalendarListQuery): string {
  const params = new URLSearchParams();

  if (query?.from) {
    params.set("from", query.from);
  }

  if (query?.to) {
    params.set("to", query.to);
  }

  return params.toString() ? `?${params.toString()}` : "";
}

export const calendarApi = {
  /**
   * Lädt die Kalendereinträge der ausgewählten Wohnung im optionalen Zeitraum.
   */
  list(
    householdId: string,
    query?: CalendarListQuery,
  ): Promise<CalendarEvent[]> {
    return apiFetch<CalendarEvent[]>(
      `/households/${householdId}/calendar/events${buildCalendarQuery(query)}`,
    );
  },

  /**
   * Erstellt einen neuen Kalendereintrag.
   */
  create(
    householdId: string,
    payload: CalendarEventPayload,
  ): Promise<CalendarEvent> {
    return apiFetch<CalendarEvent>(
      `/households/${householdId}/calendar/events`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  /**
   * Löscht den angegebenen Kalendereintrag.
   */
  delete(householdId: string, eventId: string): Promise<void> {
    return apiFetch<void>(
      `/households/${householdId}/calendar/events/${eventId}`,
      {
        method: "DELETE",
      },
    );
  },
};
