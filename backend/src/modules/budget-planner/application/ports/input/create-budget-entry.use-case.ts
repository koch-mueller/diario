import type {
  BudgetEntry,
  BudgetEntryType,
} from '../../../domain/budget-entry';

export const CREATE_BUDGET_ENTRY_USE_CASE = Symbol(
  'CREATE_BUDGET_ENTRY_USE_CASE',
);

export interface CreateBudgetEntryCommand {
  householdId: string;
  description: string;
  amountCents: number;
  type?: BudgetEntryType;
  category?: string | null;
  userId: string;
  bookedAt?: Date;
  createdAt?: Date;
  isRecurring?: boolean;
}

export interface CreateBudgetEntryUseCase {
  execute(command: CreateBudgetEntryCommand): Promise<BudgetEntry>;
}
