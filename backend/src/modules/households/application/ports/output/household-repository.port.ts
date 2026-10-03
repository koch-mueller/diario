import type { Household } from '../../../domain/household';
import type { HouseholdMember } from '../../../domain/household-member';

export const HOUSEHOLD_REPOSITORY = Symbol('HOUSEHOLD_REPOSITORY');

export interface HouseholdRepositoryPort {
  save(household: Household): Promise<void>;
  findById(id: string): Promise<Household | null>;
  findByInviteCode(inviteCode: string): Promise<Household | null>;
  findByUserId(userId: string): Promise<Household[]>;
  addMember(member: HouseholdMember): Promise<void>;
  isMember(householdId: string, userId: string): Promise<boolean>;
  findMembersByHouseholdId(householdId: string): Promise<HouseholdMember[]>;
  deleteById(householdId: string): Promise<void>;
}
