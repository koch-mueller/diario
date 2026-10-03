import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Bildet Einkaufslisteneinträge auf die Datenbanktabelle `shopping_list_items` ab.
 */
@Entity('shopping_list_items')
@Index(['householdId', 'isChecked', 'createdAt'])
export class ShoppingListItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  quantity!: string | null;

  @Column({ name: 'is_checked', type: 'boolean', default: false })
  isChecked!: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'checked_by_user_id', type: 'uuid', nullable: true })
  checkedByUserId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'checked_at', type: 'timestamptz', nullable: true })
  checkedAt!: Date | null;
}
