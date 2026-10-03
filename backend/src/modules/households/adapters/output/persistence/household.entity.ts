import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Bildet Wohnungen auf die Datenbanktabelle `households` ab.
 */
@Entity('households')
export class HouseholdEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: 'invite_code', length: 8, unique: true })
  inviteCode!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
