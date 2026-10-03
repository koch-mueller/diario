/**
 * Signalisiert, dass ein Einkaufslisteneintrag nicht existiert oder nicht zur Wohnung gehört.
 */
export class ShoppingListItemNotFoundError extends Error {
  constructor() {
    super('Der Einkaufslisten-Eintrag wurde nicht gefunden.');
    this.name = 'ShoppingListItemNotFoundError';
  }
}
