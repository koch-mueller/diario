import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { BudgetEntry } from '../../domain/budget-entry';
import type {
  ListBudgetEntriesQuery,
  ListBudgetEntriesUseCase,
} from '../ports/input/list-budget-entries.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Lädt alle Budgeteinträge der ausgewählten Wohnung.
 */
@Injectable()
export class ListBudgetEntriesService implements ListBudgetEntriesUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und liefert anschließend die Budgeteinträge.
   */
  async execute(query: ListBudgetEntriesQuery): Promise<BudgetEntry[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    return this.budgetRepository.findByHouseholdId(query.householdId);
  }
}
