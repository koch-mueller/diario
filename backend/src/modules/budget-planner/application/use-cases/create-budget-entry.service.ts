import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { BudgetEntry } from '../../domain/budget-entry';
import type {
  CreateBudgetEntryCommand,
  CreateBudgetEntryUseCase,
} from '../ports/input/create-budget-entry.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../ports/output/budget-repository.port';

/**
 * Erstellt Budgeteinträge nach einer erfolgreichen Zugriffsprüfung.
 */
@Injectable()
export class CreateBudgetEntryService implements CreateBudgetEntryUseCase {
  /**
   * Erstellt den Service mit den benötigten Abhängigkeiten.
   */
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und speichert den neuen Eintrag.
   */
  async execute(command: CreateBudgetEntryCommand): Promise<BudgetEntry> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const entry = BudgetEntry.create({
      householdId: command.householdId,
      description: command.description,
      amountCents: command.amountCents,
      type: command.type,
      category: command.category,
      createdByUserId: command.userId,
      bookedAt: command.bookedAt,
      createdAt: command.createdAt,
      isRecurring: command.isRecurring,
    });

    if (entry.isRecurring) {
      const existingEntries = await this.budgetRepository.findByHouseholdId(
        command.householdId,
      );
      const duplicate = existingEntries.find(
        (existingEntry) =>
          existingEntry.isRecurring &&
          existingEntry.description === entry.description &&
          existingEntry.amountCents === entry.amountCents &&
          existingEntry.type === entry.type &&
          existingEntry.category === entry.category,
      );

      if (duplicate) {
        if (duplicate.category) {
          await this.budgetRepository.saveCategory(
            duplicate.householdId,
            duplicate.category,
          );
        }

        return duplicate;
      }
    }

    const savedEntry = await this.budgetRepository.save(entry);

    if (savedEntry.category) {
      await this.budgetRepository.saveCategory(
        savedEntry.householdId,
        savedEntry.category,
      );
    }

    return savedEntry;
  }
}
