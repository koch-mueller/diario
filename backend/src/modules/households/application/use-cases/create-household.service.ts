import { Inject, Injectable } from '@nestjs/common';

import { Household } from '../../domain/household';
import { HouseholdMember } from '../../domain/household-member';
import type {
  CreateHouseholdCommand,
  CreateHouseholdUseCase,
} from '../ports/input/create-household.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';

/**
 * Erstellt eine neue Wohnung und trägt den Ersteller als Eigentümer ein.
 */
@Injectable()
export class CreateHouseholdService implements CreateHouseholdUseCase {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,
  ) {}

  /**
   * Erzeugt Wohnung und Eigentümermitgliedschaft und speichert beide gemeinsam.
   */
  async execute(command: CreateHouseholdCommand): Promise<Household> {
    const household = Household.create(command.name, command.userId);
    const owner = HouseholdMember.create(household.id, command.userId, 'OWNER');

    await this.householdRepository.save(household);
    await this.householdRepository.addMember(owner);

    return household;
  }
}
