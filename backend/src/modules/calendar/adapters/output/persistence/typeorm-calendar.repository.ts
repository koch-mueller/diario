import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type {
  CalendarEventDateRange,
  CalendarRepositoryPort,
} from '../../../application/ports/output/calendar-repository.port';
import { CalendarEvent } from '../../../domain/calendar-event';
import { CalendarEventEntity } from './calendar-event.entity';

/**
 * Implementiert den Kalender-Datenzugriff mit TypeORM.
 */
@Injectable()
export class TypeOrmCalendarRepository implements CalendarRepositoryPort {
  constructor(
    @InjectRepository(CalendarEventEntity)
    private readonly repository: Repository<CalendarEventEntity>,
  ) {}

  /**
   * Speichert einen neuen oder veränderten Kalendereintrag.
   */
  async save(event: CalendarEvent): Promise<CalendarEvent> {
    const savedEntity = await this.repository.save({
      id: event.id,
      householdId: event.householdId,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      isAllDay: event.isAllDay,
      createdByUserId: event.createdByUserId,
      updatedByUserId: event.updatedByUserId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });

    return this.toDomain(savedEntity);
  }

  /**
   * Sucht einen Kalendereintrag anhand seiner ID.
   */
  async findById(id: string): Promise<CalendarEvent | null> {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Lädt die Kalendereinträge der angegebenen Wohnung im optionalen Zeitraum.
   */
  async findByHouseholdId(
    householdId: string,
    dateRange?: CalendarEventDateRange,
  ): Promise<CalendarEvent[]> {
    const entities = await this.repository.find({
      where: {
        householdId,
      },
      order: {
        startsAt: 'ASC',
      },
    });

    return entities
      .filter((entity) => {
        if (dateRange?.from && entity.endsAt < dateRange.from) {
          return false;
        }

        if (dateRange?.to && entity.startsAt > dateRange.to) {
          return false;
        }

        return true;
      })
      .map((entity) => this.toDomain(entity));
  }

  /**
   * Löscht den Kalendereintrag mit der angegebenen ID.
   */
  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Wandelt eine TypeORM-Entität in einen fachlichen Kalendereintrag um.
   */
  private toDomain(entity: CalendarEventEntity): CalendarEvent {
    return CalendarEvent.restore({
      id: entity.id,
      householdId: entity.householdId,
      title: entity.title,
      description: entity.description,
      location: entity.location,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      isAllDay: entity.isAllDay,
      createdByUserId: entity.createdByUserId,
      updatedByUserId: entity.updatedByUserId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
