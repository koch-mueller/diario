import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../errors/household-not-found.error';
import { HouseholdOwnerRequiredError } from '../errors/household-owner-required.error';
import type {
  DeleteHouseholdCommand,
  DeleteHouseholdUseCase,
} from '../ports/input/delete-household.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';

/**
 * Löscht eine Wohnung, wenn der anfragende Benutzer ihr Eigentümer ist.
 */
@Injectable()
export class DeleteHouseholdService implements DeleteHouseholdUseCase {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,
  ) {}

  /**
   * Prüft Mitgliedschaft und Eigentümerrolle und löscht anschließend die Wohnung.
   */
  async execute(command: DeleteHouseholdCommand): Promise<void> {
    const household = await this.householdRepository.findById(
      command.householdId,
    );

    if (!household) {
      throw new HouseholdNotFoundError();
    }

    const members = await this.householdRepository.findMembersByHouseholdId(
      command.householdId,
    );
    const currentMember = members.find(
      (member) => member.userId === command.userId,
    );

    if (!currentMember) {
      throw new HouseholdAccessDeniedError();
    }

    if (currentMember.role !== 'OWNER') {
      throw new HouseholdOwnerRequiredError();
    }

    await this.householdRepository.deleteById(command.householdId);
  }
}
