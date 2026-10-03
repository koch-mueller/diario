import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { TaskRecurrence } from '../../../domain/task';

/**
 * Beschreibt die Datenbanktabelle für Aufgaben.
 */
@Entity({ name: 'tasks' })
@Index(['householdId', 'completed', 'deadline', 'createdAt'])
export class TaskEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'deadline', type: 'timestamptz', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'NONE' })
  recurrence!: TaskRecurrence;

  @Column({
    name: 'next_occurrence_created',
    type: 'boolean',
    default: false,
  })
  nextOccurrenceCreated!: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
