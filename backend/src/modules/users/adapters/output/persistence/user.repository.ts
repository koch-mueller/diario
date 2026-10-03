import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { UserRepositoryPort } from '../../../application/ports/user-repository.port';
import type { User } from '../../../domain/user';
import { UserEntity } from './user.entity';
import { UserMapper } from './user.mapper';

/**
 * Implementiert den Benutzer-Datenzugriff mit TypeORM.
 */
@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  /**
   * Speichert einen neuen oder veränderten Benutzer.
   */
  async save(user: User): Promise<User> {
    const entity = UserMapper.toPersistence(user);
    const savedEntity = await this.repository.save(entity);

    return UserMapper.toDomain(savedEntity);
  }

  /**
   * Sucht einen Benutzer anhand seiner ID.
   */
  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({
      id,
    });

    return entity === null ? null : UserMapper.toDomain(entity);
  }

  /**
   * Sucht einen Benutzer anhand seiner E-Mail-Adresse.
   */
  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({
      email: email.trim().toLowerCase(),
    });

    return entity === null ? null : UserMapper.toDomain(entity);
  }
}
