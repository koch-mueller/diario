import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { ShoppingListItemNotFoundError } from '../errors/shopping-list-item-not-found.error';
import type {
  DeleteShoppingListItemCommand,
  DeleteShoppingListItemUseCase,
} from '../ports/input/delete-shopping-list-item.use-case';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepositoryPort,
} from '../ports/output/shopping-list-repository.port';

/**
 * Löscht einen Eintrag aus der Einkaufsliste einer Wohnung.
 */
@Injectable()
export class DeleteShoppingListItemService implements DeleteShoppingListItemUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Eintragszuordnung und löscht anschließend den Eintrag.
   */
  async execute(command: DeleteShoppingListItemCommand): Promise<void> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const item = await this.shoppingListRepository.findById(command.itemId);

    if (!item || item.householdId !== command.householdId) {
      throw new ShoppingListItemNotFoundError();
    }

    await this.shoppingListRepository.deleteById(command.itemId);
  }
}
