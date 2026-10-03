import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Beschreibt eine gespeicherte Budgetkategorie einer Wohnung.
 */
@Entity('budget_categories')
@Index(['householdId', 'name'])
export class BudgetCategoryEntity {
  @PrimaryColumn({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @PrimaryColumn({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
