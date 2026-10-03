import type { Household } from '../../../domain/household';

export const CREATE_HOUSEHOLD_USE_CASE = Symbol('CREATE_HOUSEHOLD_USE_CASE');

export interface CreateHouseholdCommand {
  name: string;
  userId: string;
}

export interface CreateHouseholdUseCase {
  execute(command: CreateHouseholdCommand): Promise<Household>;
}
