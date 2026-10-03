export const LIST_BUDGET_CATEGORIES_USE_CASE = Symbol(
  'LIST_BUDGET_CATEGORIES_USE_CASE',
);

export interface ListBudgetCategoriesQuery {
  householdId: string;
  userId: string;
}

export interface ListBudgetCategoriesUseCase {
  execute(query: ListBudgetCategoriesQuery): Promise<string[]>;
}
