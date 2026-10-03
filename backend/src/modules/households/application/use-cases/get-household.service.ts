import { Injectable } from '@nestjs/common';

import type { Household } from '../../domain/household';
import type {
  GetHouseholdQuery,
  GetHouseholdUseCase,
} from '../ports/input/get-household.use-case';
import { HouseholdAccessService } from '../services/household-access.service';

/**
 * Lädt eine einzelne Wohnung nach erfolgreicher Zugriffsprüfung.
 */
@Injectable()
export class GetHouseholdService implements GetHouseholdUseCase {
  constructor(
    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und gibt die gefundene Wohnung zurück.
   */
  async execute(query: GetHouseholdQuery): Promise<Household> {
    return this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );
  }
}
