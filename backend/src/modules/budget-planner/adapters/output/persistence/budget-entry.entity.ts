import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { BudgetEntryType } from '../../../domain/budget-entry';

/**
 * Beschreibt die Datenbanktabelle für Budgeteinträge.
 */
@Entity('budget_entries')
@Index(['householdId', 'bookedAt'])
@Index(['householdId', 'createdAt'])
@Index(['householdId', 'type'])
export class BudgetEntryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @Column({ length: 160 })
  description!: string;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents!: number;

  @Column({ type: 'varchar', length: 16 })
  type!: BudgetEntryType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  category!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @Column({ name: 'booked_at', type: 'timestamptz', nullable: true })
  bookedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring!: boolean;
}
