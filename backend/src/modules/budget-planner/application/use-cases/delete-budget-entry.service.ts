import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { BudgetEntryNotFoundError } from '../errors/budget-entry-not-found.error';
import type {
  DeleteBudgetEntryCommand,
  DeleteBudgetEntryUseCase,
} from '../ports/input/delete-budget-entry.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Löscht einen Budgeteintrag aus der ausgewählten Wohnung.
 */
@Injectable()
export class DeleteBudgetEntryService implements DeleteBudgetEntryUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Eintragszuordnung und löscht anschließend den Budgeteintrag.
   */
  async execute(command: DeleteBudgetEntryCommand): Promise<void> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const entry = await this.budgetRepository.findById(command.entryId);

    if (!entry || entry.householdId !== command.householdId) {
      throw new BudgetEntryNotFoundError();
    }

    await this.budgetRepository.deleteById(command.entryId);
  }
}
