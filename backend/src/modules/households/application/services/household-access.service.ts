import { Inject, Injectable } from '@nestjs/common';

import type { Household } from '../../domain/household';
import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../errors/household-not-found.error';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';

/**
 * Prüft zentral den Zugriff eines Benutzers auf eine Wohnung.
 */
@Injectable()
export class HouseholdAccessService {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,
  ) {}

  /**
   * Stellt sicher, dass die Wohnung existiert und der Benutzer Mitglied ist.
   */
  async ensureAccess(householdId: string, userId: string): Promise<Household> {
    const household = await this.householdRepository.findById(householdId);

    if (!household) {
      throw new HouseholdNotFoundError();
    }

    const isMember = await this.householdRepository.isMember(
      householdId,
      userId,
    );

    if (!isMember) {
      throw new HouseholdAccessDeniedError();
    }

    return household;
  }
}
