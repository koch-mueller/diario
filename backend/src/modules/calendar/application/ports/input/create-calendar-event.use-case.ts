import type { CalendarEvent } from '../../../domain/calendar-event';

export const CREATE_CALENDAR_EVENT_USE_CASE = Symbol(
  'CREATE_CALENDAR_EVENT_USE_CASE',
);

export interface CreateCalendarEventCommand {
  householdId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  userId: string;
}

export interface CreateCalendarEventUseCase {
  execute(command: CreateCalendarEventCommand): Promise<CalendarEvent>;
}
