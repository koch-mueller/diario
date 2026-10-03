import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Bildet Benutzer auf die Datenbanktabelle `users` ab.
 */
@Entity({
  name: 'users',
})
@Index('UQ_users_email', ['email'], {
  unique: true,
})
export class UserEntity {
  @PrimaryColumn({
    type: 'uuid',
  })
  id!: string;

  @Column({
    type: 'varchar',
    length: 80,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 254,
  })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 100,
  })
  passwordHash!: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
