import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { CalendarEventNotFoundError } from '../errors/calendar-event-not-found.error';
import type {
  DeleteCalendarEventCommand,
  DeleteCalendarEventUseCase,
} from '../ports/input/delete-calendar-event.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarRepositoryPort,
} from '../ports/output/calendar-repository.port';

/**
 * Löscht einen Kalendereintrag aus der ausgewählten Wohnung.
 */
@Injectable()
export class DeleteCalendarEventService implements DeleteCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Terminzuordnung und löscht anschließend den Termin.
   */
  async execute(command: DeleteCalendarEventCommand): Promise<void> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const event = await this.calendarRepository.findById(command.eventId);

    if (!event || event.householdId !== command.householdId) {
      throw new CalendarEventNotFoundError();
    }

    await this.calendarRepository.deleteById(command.eventId);
  }
}
