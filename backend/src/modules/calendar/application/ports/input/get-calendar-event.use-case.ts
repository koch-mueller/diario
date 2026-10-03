import type { CalendarEvent } from '../../../domain/calendar-event';

export const GET_CALENDAR_EVENT_USE_CASE = Symbol(
  'GET_CALENDAR_EVENT_USE_CASE',
);

export interface GetCalendarEventQuery {
  householdId: string;
  eventId: string;
  userId: string;
}

export interface GetCalendarEventUseCase {
  execute(query: GetCalendarEventQuery): Promise<CalendarEvent>;
}
