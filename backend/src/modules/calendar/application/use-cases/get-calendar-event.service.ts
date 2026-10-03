import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { CalendarEvent } from '../../domain/calendar-event';
import { CalendarEventNotFoundError } from '../errors/calendar-event-not-found.error';
import type {
  GetCalendarEventQuery,
  GetCalendarEventUseCase,
} from '../ports/input/get-calendar-event.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarRepositoryPort,
} from '../ports/output/calendar-repository.port';

/**
 * Lädt einen einzelnen Kalendereintrag der ausgewählten Wohnung.
 */
@Injectable()
export class GetCalendarEventService implements GetCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Terminzuordnung und gibt den Termin zurück.
   */
  async execute(query: GetCalendarEventQuery): Promise<CalendarEvent> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    const event = await this.calendarRepository.findById(query.eventId);

    if (!event || event.householdId !== query.householdId) {
      throw new CalendarEventNotFoundError();
    }

    return event;
  }
}
