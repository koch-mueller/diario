/**
 * Signalisiert, dass ein Budgeteintrag nicht existiert oder nicht zur Wohnung gehört.
 */
export class BudgetEntryNotFoundError extends Error {
  constructor() {
    super('Der Budget-Eintrag wurde nicht gefunden.');
    this.name = 'BudgetEntryNotFoundError';
  }
}
