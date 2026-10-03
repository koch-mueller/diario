import { User } from '../../../domain/user';
import { UserEntity } from './user.entity';

/**
 * Wandelt User zwischen Domainmodell und Persistenz um.
 */
export class UserMapper {
  /**
   * Wandelt ein Domainobjekt in eine Datenbankentität um.
   */
  static toPersistence(user: User): UserEntity {
    const entity = new UserEntity();

    entity.id = user.id;
    entity.name = user.name;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.createdAt = user.createdAt;

    return entity;
  }

  /**
   * Wandelt eine Datenbankentität in ein Domainobjekt um.
   */
  static toDomain(entity: UserEntity): User {
    return User.restore({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      passwordHash: entity.passwordHash,
      createdAt: entity.createdAt,
    });
  }
}
