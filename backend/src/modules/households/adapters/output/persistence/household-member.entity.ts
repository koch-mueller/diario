import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { HouseholdMemberRole } from '../../../domain/household-member';

/**
 * Bildet Wohnungsmitgliedschaften auf die Datenbanktabelle `household_members` ab.
 */
@Entity('household_members')
@Index(['householdId', 'userId'], { unique: true })
export class HouseholdMemberEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: HouseholdMemberRole;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;
}
