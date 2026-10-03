import type { BudgetSummary } from '../../../domain/budget-summary';

export const GET_BUDGET_SUMMARY_USE_CASE = Symbol(
  'GET_BUDGET_SUMMARY_USE_CASE',
);

export interface GetBudgetSummaryQuery {
  householdId: string;
  userId: string;
}

export interface GetBudgetSummaryUseCase {
  execute(query: GetBudgetSummaryQuery): Promise<BudgetSummary>;
}
