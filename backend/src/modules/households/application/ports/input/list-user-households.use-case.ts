import type { Household } from '../../../domain/household';

export const LIST_USER_HOUSEHOLDS_USE_CASE = Symbol(
  'LIST_USER_HOUSEHOLDS_USE_CASE',
);

export interface ListUserHouseholdsUseCase {
  execute(userId: string): Promise<Household[]>;
}
