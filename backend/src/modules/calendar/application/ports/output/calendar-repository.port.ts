import type { CalendarEvent } from '../../../domain/calendar-event';

export const CALENDAR_REPOSITORY = Symbol('CALENDAR_REPOSITORY');

export interface CalendarEventDateRange {
  from?: Date;
  to?: Date;
}

export interface CalendarRepositoryPort {
  save(event: CalendarEvent): Promise<CalendarEvent>;

  findById(id: string): Promise<CalendarEvent | null>;

  findByHouseholdId(
    householdId: string,
    dateRange?: CalendarEventDateRange,
  ): Promise<CalendarEvent[]>;

  deleteById(id: string): Promise<void>;
}
