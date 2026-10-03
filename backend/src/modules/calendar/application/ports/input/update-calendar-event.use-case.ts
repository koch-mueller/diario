import type { CalendarEvent } from '../../../domain/calendar-event';

export const UPDATE_CALENDAR_EVENT_USE_CASE = Symbol(
  'UPDATE_CALENDAR_EVENT_USE_CASE',
);

export interface UpdateCalendarEventCommand {
  householdId: string;
  eventId: string;
  userId: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  isAllDay?: boolean;
}

export interface UpdateCalendarEventUseCase {
  execute(command: UpdateCalendarEventCommand): Promise<CalendarEvent>;
}
