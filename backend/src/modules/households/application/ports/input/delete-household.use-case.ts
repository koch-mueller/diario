export const DELETE_HOUSEHOLD_USE_CASE = Symbol('DELETE_HOUSEHOLD_USE_CASE');

export type DeleteHouseholdCommand = {
  householdId: string;
  userId: string;
};

export interface DeleteHouseholdUseCase {
  execute(command: DeleteHouseholdCommand): Promise<void>;
}
