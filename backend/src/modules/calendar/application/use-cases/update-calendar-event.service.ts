import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { CalendarEvent } from '../../domain/calendar-event';
import { CalendarEventNotFoundError } from '../errors/calendar-event-not-found.error';
import type {
  UpdateCalendarEventCommand,
  UpdateCalendarEventUseCase,
} from '../ports/input/update-calendar-event.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarRepositoryPort,
} from '../ports/output/calendar-repository.port';

/**
 * Aktualisiert einen vorhandenen Kalendereintrag.
 */
@Injectable()
export class UpdateCalendarEventService implements UpdateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Terminzuordnung und speichert die Änderungen.
   */
  async execute(command: UpdateCalendarEventCommand): Promise<CalendarEvent> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const event = await this.calendarRepository.findById(command.eventId);

    if (!event || event.householdId !== command.householdId) {
      throw new CalendarEventNotFoundError();
    }

    const updatedEvent = event.update({
      title: command.title,
      description: command.description,
      location: command.location,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      isAllDay: command.isAllDay,
      changedByUserId: command.userId,
    });

    return this.calendarRepository.save(updatedEvent);
  }
}
