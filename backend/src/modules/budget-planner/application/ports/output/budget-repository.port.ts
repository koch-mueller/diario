import type { BudgetEntry } from '../../../domain/budget-entry';

export const BUDGET_REPOSITORY = Symbol('BUDGET_REPOSITORY');

export interface BudgetRepositoryPort {
  save(entry: BudgetEntry): Promise<BudgetEntry>;

  findById(id: string): Promise<BudgetEntry | null>;

  findByHouseholdId(householdId: string): Promise<BudgetEntry[]>;

  deleteById(id: string): Promise<void>;

  saveCategory(householdId: string, category: string): Promise<void>;

  findCategoriesByHouseholdId(householdId: string): Promise<string[]>;
}
