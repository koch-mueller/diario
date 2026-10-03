import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import { ShoppingListItemNotFoundError } from '../errors/shopping-list-item-not-found.error';
import type {
  UpdateShoppingListItemCommand,
  UpdateShoppingListItemUseCase,
} from '../ports/input/update-shopping-list-item.use-case';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepositoryPort,
} from '../ports/output/shopping-list-repository.port';

/**
 * Aktualisiert einen Eintrag der Einkaufsliste.
 */
@Injectable()
export class UpdateShoppingListItemService implements UpdateShoppingListItemUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Eintragszuordnung und speichert die Änderungen.
   */
  async execute(
    command: UpdateShoppingListItemCommand,
  ): Promise<ShoppingListItem> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const item = await this.shoppingListRepository.findById(command.itemId);

    if (!item || item.householdId !== command.householdId) {
      throw new ShoppingListItemNotFoundError();
    }

    const updatedItem = item.update({
      name: command.name,
      quantity: command.quantity,
      isChecked: command.isChecked,
      changedByUserId: command.userId,
    });

    return this.shoppingListRepository.save(updatedItem);
  }
}
