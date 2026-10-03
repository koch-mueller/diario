import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { BudgetEntry } from '../../domain/budget-entry';
import { BudgetEntryNotFoundError } from '../errors/budget-entry-not-found.error';
import type {
  UpdateBudgetEntryCommand,
  UpdateBudgetEntryUseCase,
} from '../ports/input/update-budget-entry.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Aktualisiert einen vorhandenen Budgeteintrag.
 */
@Injectable()
export class UpdateBudgetEntryService implements UpdateBudgetEntryUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Eintragszuordnung, speichert die Änderungen und übernimmt neue Kategorien.
   */
  async execute(command: UpdateBudgetEntryCommand): Promise<BudgetEntry> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const entry = await this.budgetRepository.findById(command.entryId);

    if (!entry || entry.householdId !== command.householdId) {
      throw new BudgetEntryNotFoundError();
    }

    const updatedEntry = entry.update({
      description: command.description,
      amountCents: command.amountCents,
      type: command.type,
      category: command.category,
      changedByUserId: command.userId,
    });

    const savedEntry = await this.budgetRepository.save(updatedEntry);

    if (savedEntry.category) {
      await this.budgetRepository.saveCategory(
        savedEntry.householdId,
        savedEntry.category,
      );
    }

    return savedEntry;
  }
}
