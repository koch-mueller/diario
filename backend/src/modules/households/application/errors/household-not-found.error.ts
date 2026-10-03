/**
 * Signalisiert, dass die angeforderte Wohnung nicht gefunden wurde.
 */
export class HouseholdNotFoundError extends Error {
  constructor() {
    super('Die Wohnung wurde nicht gefunden.');
    this.name = 'HouseholdNotFoundError';
  }
}
