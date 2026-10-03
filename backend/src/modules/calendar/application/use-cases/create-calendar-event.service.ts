import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { CalendarEvent } from '../../domain/calendar-event';
import type {
  CreateCalendarEventCommand,
  CreateCalendarEventUseCase,
} from '../ports/input/create-calendar-event.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarRepositoryPort,
} from '../ports/output/calendar-repository.port';

/**
 * Erstellt einen neuen Kalendereintrag für eine Wohnung.
 */
@Injectable()
export class CreateCalendarEventService implements CreateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY)
    private readonly calendarRepository: CalendarRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff, erzeugt den Termin und speichert ihn.
   */
  async execute(command: CreateCalendarEventCommand): Promise<CalendarEvent> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const event = CalendarEvent.create({
      householdId: command.householdId,
      title: command.title,
      description: command.description,
      location: command.location,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      isAllDay: command.isAllDay,
      createdByUserId: command.userId,
    });

    return this.calendarRepository.save(event);
  }
}
