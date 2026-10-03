import type { ShoppingListItem } from '../../../domain/shopping-list-item';

export const LIST_SHOPPING_LIST_ITEMS_USE_CASE = Symbol(
  'LIST_SHOPPING_LIST_ITEMS_USE_CASE',
);

export interface ListShoppingListItemsQuery {
  householdId: string;
  userId: string;
}

export interface ListShoppingListItemsUseCase {
  execute(query: ListShoppingListItemsQuery): Promise<ShoppingListItem[]>;
}
