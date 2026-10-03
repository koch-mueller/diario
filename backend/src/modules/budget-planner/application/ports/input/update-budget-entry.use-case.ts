import type {
  BudgetEntry,
  BudgetEntryType,
} from '../../../domain/budget-entry';

export const UPDATE_BUDGET_ENTRY_USE_CASE = Symbol(
  'UPDATE_BUDGET_ENTRY_USE_CASE',
);

export interface UpdateBudgetEntryCommand {
  householdId: string;
  entryId: string;
  userId: string;
  description?: string;
  amountCents?: number;
  type?: BudgetEntryType;
  category?: string | null;
}

export interface UpdateBudgetEntryUseCase {
  execute(command: UpdateBudgetEntryCommand): Promise<BudgetEntry>;
}
