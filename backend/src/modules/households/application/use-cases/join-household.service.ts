import { Inject, Injectable } from '@nestjs/common';

import { Household } from '../../domain/household';
import { HouseholdMember } from '../../domain/household-member';
import { AlreadyHouseholdMemberError } from '../errors/already-household-member.error';
import { InvalidInviteCodeError } from '../errors/invalid-invite-code.error';
import type {
  JoinHouseholdCommand,
  JoinHouseholdUseCase,
} from '../ports/input/join-household.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../ports/output/household-repository.port';

/**
 * Fügt einen Benutzer über einen Einladungscode zu einer Wohnung hinzu.
 */
@Injectable()
export class JoinHouseholdService implements JoinHouseholdUseCase {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,
  ) {}

  /**
   * Prüft Einladungscode und bestehende Mitgliedschaft und speichert das neue Mitglied.
   */
  async execute(command: JoinHouseholdCommand): Promise<Household> {
    const inviteCode = command.inviteCode.trim().toUpperCase();
    const household =
      await this.householdRepository.findByInviteCode(inviteCode);

    if (!household) {
      throw new InvalidInviteCodeError();
    }

    if (await this.householdRepository.isMember(household.id, command.userId)) {
      throw new AlreadyHouseholdMemberError();
    }

    await this.householdRepository.addMember(
      HouseholdMember.create(household.id, command.userId, 'MEMBER'),
    );

    return household;
  }
}
