import type { Household } from '../../../domain/household';

export const JOIN_HOUSEHOLD_USE_CASE = Symbol('JOIN_HOUSEHOLD_USE_CASE');

export interface JoinHouseholdCommand {
  inviteCode: string;
  userId: string;
}

export interface JoinHouseholdUseCase {
  execute(command: JoinHouseholdCommand): Promise<Household>;
}
