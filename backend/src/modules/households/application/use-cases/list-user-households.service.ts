import { Inject, Injectable } from '@nestjs/common';

import type { Household } from '../../domain/household';
import type { ListUserHouseholdsUseCase } from '../ports/input/list-user-households.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';

/**
 * Lädt alle Wohnungen, in denen der Benutzer Mitglied ist.
 */
@Injectable()
export class ListUserHouseholdsService implements ListUserHouseholdsUseCase {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,
  ) {}

  /**
   * Liefert die dem Benutzer zugeordneten Wohnungen aus dem Repository.
   */
  execute(userId: string): Promise<Household[]> {
    return this.householdRepository.findByUserId(userId);
  }
}
