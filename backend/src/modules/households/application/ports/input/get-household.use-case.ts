import type { Household } from '../../../domain/household';

export const GET_HOUSEHOLD_USE_CASE = Symbol('GET_HOUSEHOLD_USE_CASE');

export interface GetHouseholdQuery {
  householdId: string;
  userId: string;
}

export interface GetHouseholdUseCase {
  execute(query: GetHouseholdQuery): Promise<Household>;
}
