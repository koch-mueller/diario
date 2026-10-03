import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { BudgetSummary } from '../../domain/budget-summary';
import type {
  GetBudgetSummaryQuery,
  GetBudgetSummaryUseCase,
} from '../ports/input/get-budget-summary.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Berechnet Einnahmen, Ausgaben und Saldo einer Wohnung.
 */
@Injectable()
export class GetBudgetSummaryService implements GetBudgetSummaryUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und fasst alle Budgeteinträge zu einer Übersicht zusammen.
   */
  async execute(query: GetBudgetSummaryQuery): Promise<BudgetSummary> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    const entries = await this.budgetRepository.findByHouseholdId(
      query.householdId,
    );

    const incomeCents = entries
      .filter((entry) => entry.type === 'INCOME')
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const expenseCents = entries
      .filter((entry) => entry.type === 'EXPENSE')
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    return {
      householdId: query.householdId,
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      entriesCount: entries.length,
    };
  }
}
