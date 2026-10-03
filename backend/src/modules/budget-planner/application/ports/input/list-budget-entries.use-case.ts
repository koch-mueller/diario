import type { BudgetEntry } from '../../../domain/budget-entry';

export const LIST_BUDGET_ENTRIES_USE_CASE = Symbol(
  'LIST_BUDGET_ENTRIES_USE_CASE',
);

export interface ListBudgetEntriesQuery {
  householdId: string;
  userId: string;
}

export interface ListBudgetEntriesUseCase {
  execute(query: ListBudgetEntriesQuery): Promise<BudgetEntry[]>;
}
