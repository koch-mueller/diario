import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { CalendarController } from './adapters/input/rest/calendar.controller';
import { CalendarEventEntity } from './adapters/output/persistence/calendar-event.entity';
import { TypeOrmCalendarRepository } from './adapters/output/persistence/typeorm-calendar.repository';
import { CREATE_CALENDAR_EVENT_USE_CASE } from './application/ports/input/create-calendar-event.use-case';
import { DELETE_CALENDAR_EVENT_USE_CASE } from './application/ports/input/delete-calendar-event.use-case';
import { GET_CALENDAR_EVENT_USE_CASE } from './application/ports/input/get-calendar-event.use-case';
import { LIST_CALENDAR_EVENTS_USE_CASE } from './application/ports/input/list-calendar-events.use-case';
import { UPDATE_CALENDAR_EVENT_USE_CASE } from './application/ports/input/update-calendar-event.use-case';
import { CALENDAR_REPOSITORY } from './application/ports/output/calendar-repository.port';
import { CreateCalendarEventService } from './application/use-cases/create-calendar-event.service';
import { DeleteCalendarEventService } from './application/use-cases/delete-calendar-event.service';
import { GetCalendarEventService } from './application/use-cases/get-calendar-event.service';
import { ListCalendarEventsService } from './application/use-cases/list-calendar-events.service';
import { UpdateCalendarEventService } from './application/use-cases/update-calendar-event.service';

/**
 * Registriert Controller, Repository und Use-Cases des Kalenders.
 */
@Module({
  imports: [
    AuthModule,
    HouseholdsModule,
    TypeOrmModule.forFeature([CalendarEventEntity]),
  ],
  controllers: [CalendarController],
  providers: [
    TypeOrmCalendarRepository,
    {
      provide: CALENDAR_REPOSITORY,
      useExisting: TypeOrmCalendarRepository,
    },
    {
      provide: CREATE_CALENDAR_EVENT_USE_CASE,
      useClass: CreateCalendarEventService,
    },
    {
      provide: LIST_CALENDAR_EVENTS_USE_CASE,
      useClass: ListCalendarEventsService,
    },
    {
      provide: GET_CALENDAR_EVENT_USE_CASE,
      useClass: GetCalendarEventService,
    },
    {
      provide: UPDATE_CALENDAR_EVENT_USE_CASE,
      useClass: UpdateCalendarEventService,
    },
    {
      provide: DELETE_CALENDAR_EVENT_USE_CASE,
      useClass: DeleteCalendarEventService,
    },
  ],
})
export class CalendarModule {}
