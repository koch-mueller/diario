import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HouseholdsController } from './adapters/input/rest/households.controller';
import { HouseholdEntity } from './adapters/output/persistence/household.entity';
import { HouseholdMemberEntity } from './adapters/output/persistence/household-member.entity';
import { TypeOrmHouseholdRepository } from './adapters/output/persistence/typeorm-household.repository';
import { CREATE_HOUSEHOLD_USE_CASE } from './application/ports/input/create-household.use-case';
import { DELETE_HOUSEHOLD_USE_CASE } from './application/ports/input/delete-household.use-case';
import { GET_HOUSEHOLD_USE_CASE } from './application/ports/input/get-household.use-case';
import { JOIN_HOUSEHOLD_USE_CASE } from './application/ports/input/join-household.use-case';
import { LIST_HOUSEHOLD_MEMBERS_USE_CASE } from './application/ports/input/list-household-members.use-case';
import { LIST_USER_HOUSEHOLDS_USE_CASE } from './application/ports/input/list-user-households.use-case';
import { HOUSEHOLD_REPOSITORY } from './application/ports/output/household-repository.port';
import { HouseholdAccessService } from './application/services/household-access.service';
import { CreateHouseholdService } from './application/use-cases/create-household.service';
import { DeleteHouseholdService } from './application/use-cases/delete-household.service';
import { GetHouseholdService } from './application/use-cases/get-household.service';
import { JoinHouseholdService } from './application/use-cases/join-household.service';
import { ListHouseholdMembersService } from './application/use-cases/list-household-members.service';
import { ListUserHouseholdsService } from './application/use-cases/list-user-households.service';

/**
 * Konfiguriert Wohnungsverwaltung, zentrale Zugriffsprüfung und Persistenz.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([HouseholdEntity, HouseholdMemberEntity]),
  ],
  controllers: [HouseholdsController],
  providers: [
    TypeOrmHouseholdRepository,
    HouseholdAccessService,
    {
      provide: HOUSEHOLD_REPOSITORY,
      useExisting: TypeOrmHouseholdRepository,
    },
    {
      provide: CREATE_HOUSEHOLD_USE_CASE,
      useClass: CreateHouseholdService,
    },
    {
      provide: JOIN_HOUSEHOLD_USE_CASE,
      useClass: JoinHouseholdService,
    },
    {
      provide: LIST_USER_HOUSEHOLDS_USE_CASE,
      useClass: ListUserHouseholdsService,
    },
    {
      provide: GET_HOUSEHOLD_USE_CASE,
      useClass: GetHouseholdService,
    },
    {
      provide: LIST_HOUSEHOLD_MEMBERS_USE_CASE,
      useClass: ListHouseholdMembersService,
    },
    {
      provide: DELETE_HOUSEHOLD_USE_CASE,
      useClass: DeleteHouseholdService,
    },
  ],
  exports: [HOUSEHOLD_REPOSITORY, HouseholdAccessService],
})
export class HouseholdsModule {}
