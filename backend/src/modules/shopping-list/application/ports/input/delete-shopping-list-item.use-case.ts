export const DELETE_SHOPPING_LIST_ITEM_USE_CASE = Symbol(
  'DELETE_SHOPPING_LIST_ITEM_USE_CASE',
);

export interface DeleteShoppingListItemCommand {
  householdId: string;
  itemId: string;
  userId: string;
}

export interface DeleteShoppingListItemUseCase {
  execute(command: DeleteShoppingListItemCommand): Promise<void>;
}
