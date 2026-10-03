import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/adapters/input/rest/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/adapters/input/rest/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/application/authenticated-user';
import { HouseholdAccessDeniedError } from '../../../../households/application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../../../households/application/errors/household-not-found.error';
import { RealtimeEventsService } from '../../../../realtime/realtime-events.service';
import { CalendarEventNotFoundError } from '../../../application/errors/calendar-event-not-found.error';
import {
  CREATE_CALENDAR_EVENT_USE_CASE,
  type CreateCalendarEventUseCase,
} from '../../../application/ports/input/create-calendar-event.use-case';
import {
  DELETE_CALENDAR_EVENT_USE_CASE,
  type DeleteCalendarEventUseCase,
} from '../../../application/ports/input/delete-calendar-event.use-case';
import {
  GET_CALENDAR_EVENT_USE_CASE,
  type GetCalendarEventUseCase,
} from '../../../application/ports/input/get-calendar-event.use-case';
import {
  LIST_CALENDAR_EVENTS_USE_CASE,
  type ListCalendarEventsUseCase,
} from '../../../application/ports/input/list-calendar-events.use-case';
import {
  UPDATE_CALENDAR_EVENT_USE_CASE,
  type UpdateCalendarEventUseCase,
} from '../../../application/ports/input/update-calendar-event.use-case';
import { CalendarEventValidationError } from '../../../domain/calendar-event';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

/**
 * Stellt die REST-Endpunkte für Kalendereinträge einer Wohnung bereit.
 */
@Controller('households/:householdId/calendar/events')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  /**
   * Verbindet die Kalender-Use-Cases mit Realtime-Updates.
   */
  constructor(
    @Inject(CREATE_CALENDAR_EVENT_USE_CASE)
    private readonly createCalendarEventUseCase: CreateCalendarEventUseCase,

    @Inject(LIST_CALENDAR_EVENTS_USE_CASE)
    private readonly listCalendarEventsUseCase: ListCalendarEventsUseCase,

    @Inject(GET_CALENDAR_EVENT_USE_CASE)
    private readonly getCalendarEventUseCase: GetCalendarEventUseCase,

    @Inject(UPDATE_CALENDAR_EVENT_USE_CASE)
    private readonly updateCalendarEventUseCase: UpdateCalendarEventUseCase,

    @Inject(DELETE_CALENDAR_EVENT_USE_CASE)
    private readonly deleteCalendarEventUseCase: DeleteCalendarEventUseCase,

    @Optional()
    private readonly realtimeEvents?: RealtimeEventsService,
  ) {}

  /**
   * Erstellt einen neuen Kalendereintrag.
   */
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Body() dto: CreateCalendarEventDto,
  ) {
    try {
      const event = await this.createCalendarEventUseCase.execute({
        householdId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isAllDay: dto.isAllDay,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'calendar',
        action: 'created',
        entityId: event.id,
        changedByUserId: user.id,
        payload: event,
      });

      return event;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert die Kalendereinträge der Wohnung im optionalen Zeitraum.
   */
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Query() query: ListCalendarEventsQueryDto,
  ) {
    try {
      return await this.listCalendarEventsUseCase.execute({
        householdId,
        userId: user.id,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert einen einzelnen Kalendereintrag.
   */
  @Get(':eventId')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('eventId')
    eventId: string,
  ) {
    try {
      return await this.getCalendarEventUseCase.execute({
        householdId,
        eventId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Aktualisiert einen vorhandenen Kalendereintrag.
   */
  @Patch(':eventId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('eventId')
    eventId: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    try {
      const event = await this.updateCalendarEventUseCase.execute({
        householdId,
        eventId,
        userId: user.id,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isAllDay: dto.isAllDay,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'calendar',
        action: 'updated',
        entityId: event.id,
        changedByUserId: user.id,
        payload: event,
      });

      return event;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Löscht einen Kalendereintrag.
   */
  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('eventId')
    eventId: string,
  ): Promise<void> {
    try {
      await this.deleteCalendarEventUseCase.execute({
        householdId,
        eventId,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'calendar',
        action: 'deleted',
        entityId: eventId,
        changedByUserId: user.id,
        payload: { id: eventId },
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Wandelt fachliche Fehler in passende HTTP-Fehler um.
   */
  private throwHttpError(error: unknown): never {
    if (error instanceof HouseholdAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof HouseholdNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof CalendarEventNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof CalendarEventValidationError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
