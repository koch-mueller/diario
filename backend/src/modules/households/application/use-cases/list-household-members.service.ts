import { Inject, Injectable } from '@nestjs/common';

import type { HouseholdMember } from '../../domain/household-member';
import type {
  ListHouseholdMembersQuery,
  ListHouseholdMembersUseCase,
} from '../ports/input/list-household-members.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';
import { HouseholdAccessService } from '../services/household-access.service';

/**
 * Lädt die Mitglieder einer Wohnung nach erfolgreicher Zugriffsprüfung.
 */
@Injectable()
export class ListHouseholdMembersService implements ListHouseholdMembersUseCase {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und liefert anschließend alle Mitglieder der Wohnung.
   */
  async execute(query: ListHouseholdMembersQuery): Promise<HouseholdMember[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    return this.householdRepository.findMembersByHouseholdId(query.householdId);
  }
}
