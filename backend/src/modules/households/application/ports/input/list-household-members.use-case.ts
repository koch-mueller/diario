import type { HouseholdMember } from '../../../domain/household-member';

export const LIST_HOUSEHOLD_MEMBERS_USE_CASE = Symbol(
  'LIST_HOUSEHOLD_MEMBERS_USE_CASE',
);

export interface ListHouseholdMembersQuery {
  householdId: string;
  userId: string;
}

export interface ListHouseholdMembersUseCase {
  execute(query: ListHouseholdMembersQuery): Promise<HouseholdMember[]>;
}
