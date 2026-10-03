import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type {
  ListBudgetCategoriesQuery,
  ListBudgetCategoriesUseCase,
} from '../ports/input/list-budget-categories.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Lädt die gespeicherten Budgetkategorien einer Wohnung.
 */
@Injectable()
export class ListBudgetCategoriesService implements ListBudgetCategoriesUseCase {
  /**
   * Erstellt den Service mit den benötigten Abhängigkeiten.
   */
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Zugriff und liefert die Kategorien alphabetisch sortiert.
   */
  async execute(query: ListBudgetCategoriesQuery): Promise<string[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    return this.budgetRepository.findCategoriesByHouseholdId(query.householdId);
  }
}
