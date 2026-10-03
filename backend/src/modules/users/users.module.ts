import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from './adapters/output/persistence/user.entity';
import { UserRepository } from './adapters/output/persistence/user.repository';
import { USER_REPOSITORY } from './application/ports/user-repository.port';

/**
 * Stellt die Benutzerpersistenz für die übrigen Module der Anwendung bereit.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],

  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],

  exports: [USER_REPOSITORY],
})
export class UsersModule {}
