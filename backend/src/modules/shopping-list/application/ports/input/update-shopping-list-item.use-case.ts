import type { ShoppingListItem } from '../../../domain/shopping-list-item';

export const UPDATE_SHOPPING_LIST_ITEM_USE_CASE = Symbol(
  'UPDATE_SHOPPING_LIST_ITEM_USE_CASE',
);

export interface UpdateShoppingListItemCommand {
  householdId: string;
  itemId: string;
  userId: string;
  name?: string;
  quantity?: string | null;
  isChecked?: boolean;
}

export interface UpdateShoppingListItemUseCase {
  execute(command: UpdateShoppingListItemCommand): Promise<ShoppingListItem>;
}
