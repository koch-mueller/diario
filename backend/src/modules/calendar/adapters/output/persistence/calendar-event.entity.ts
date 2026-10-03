import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Bildet Kalendereinträge auf die Datenbanktabelle `calendar_events` ab.
 */
@Entity('calendar_events')
@Index(['householdId', 'startsAt', 'endsAt'])
export class CalendarEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @Column({ length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  location!: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'is_all_day', type: 'boolean', default: false })
  isAllDay!: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
