import type { ShoppingListItem } from '../../../domain/shopping-list-item';

export const CREATE_SHOPPING_LIST_ITEM_USE_CASE = Symbol(
  'CREATE_SHOPPING_LIST_ITEM_USE_CASE',
);

export interface CreateShoppingListItemCommand {
  householdId: string;
  name: string;
  quantity?: string | null;
  userId: string;
}

export interface CreateShoppingListItemUseCase {
  execute(command: CreateShoppingListItemCommand): Promise<ShoppingListItem>;
}
