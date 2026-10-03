import type { CalendarEvent } from '../../../domain/calendar-event';

export const LIST_CALENDAR_EVENTS_USE_CASE = Symbol(
  'LIST_CALENDAR_EVENTS_USE_CASE',
);

export interface ListCalendarEventsQuery {
  householdId: string;
  userId: string;
  from?: Date;
  to?: Date;
}

export interface ListCalendarEventsUseCase {
  execute(query: ListCalendarEventsQuery): Promise<CalendarEvent[]>;
}
