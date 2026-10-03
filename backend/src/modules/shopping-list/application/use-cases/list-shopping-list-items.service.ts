import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import type {
  ListShoppingListItemsQuery,
  ListShoppingListItemsUseCase,
} from '../ports/input/list-shopping-list-items.use-case';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepositoryPort,
} from '../ports/output/shopping-list-repository.port';

/**
 * Lädt alle Einkaufslisteneinträge der ausgewählten Wohnung.
 */
@Injectable()
export class ListShoppingListItemsService implements ListShoppingListItemsUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und liefert anschließend die Einkaufsliste.
   */
  async execute(
    query: ListShoppingListItemsQuery,
  ): Promise<ShoppingListItem[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    return this.shoppingListRepository.findByHouseholdId(query.householdId);
  }
}
