export const DELETE_BUDGET_ENTRY_USE_CASE = Symbol(
  'DELETE_BUDGET_ENTRY_USE_CASE',
);

export interface DeleteBudgetEntryCommand {
  householdId: string;
  entryId: string;
  userId: string;
}

export interface DeleteBudgetEntryUseCase {
  execute(command: DeleteBudgetEntryCommand): Promise<void>;
}
