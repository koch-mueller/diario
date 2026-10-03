import type { ShoppingListItem } from '../../../domain/shopping-list-item';

export const SHOPPING_LIST_REPOSITORY = Symbol('SHOPPING_LIST_REPOSITORY');

export interface ShoppingListRepositoryPort {
  save(item: ShoppingListItem): Promise<ShoppingListItem>;

  findById(id: string): Promise<ShoppingListItem | null>;

  findByHouseholdId(householdId: string): Promise<ShoppingListItem[]>;

  deleteById(id: string): Promise<void>;
}
