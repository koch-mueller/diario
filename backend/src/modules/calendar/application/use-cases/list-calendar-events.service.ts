import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { CalendarEvent } from '../../domain/calendar-event';
import { CalendarEvent as CalendarEventDomain } from '../../domain/calendar-event';
import type {
  ListCalendarEventsQuery,
  ListCalendarEventsUseCase,
} from '../ports/input/list-calendar-events.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarRepositoryPort,
} from '../ports/output/calendar-repository.port';

/**
 * Lädt Kalendereinträge einer Wohnung innerhalb eines optionalen Zeitraums.
 */
@Injectable()
export class ListCalendarEventsService implements ListCalendarEventsUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und liefert die Kalendereinträge im angeforderten Zeitraum.
   */
  async execute(query: ListCalendarEventsQuery): Promise<CalendarEvent[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    if (query.from && query.to) {
      CalendarEventDomain.assertDateRange(query.from, query.to);
    }

    return this.calendarRepository.findByHouseholdId(query.householdId, {
      from: query.from,
      to: query.to,
    });
  }
}
