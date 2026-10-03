import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { ShoppingListItem } from '../../domain/shopping-list-item';
import type {
  CreateShoppingListItemCommand,
  CreateShoppingListItemUseCase,
} from '../ports/input/create-shopping-list-item.use-case';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepositoryPort,
} from '../ports/output/shopping-list-repository.port';

/**
 * Erstellt einen neuen Eintrag in der Einkaufsliste einer Wohnung.
 */
@Injectable()
export class CreateShoppingListItemService implements CreateShoppingListItemUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff, erzeugt den Eintrag und speichert ihn.
   */
  async execute(
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListItem> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const item = ShoppingListItem.create({
      householdId: command.householdId,
      name: command.name,
      quantity: command.quantity,
      createdByUserId: command.userId,
    });

    return this.shoppingListRepository.save(item);
  }
}
