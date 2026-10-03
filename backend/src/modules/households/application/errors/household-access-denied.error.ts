/**
 * Signalisiert, dass ein Benutzer kein Mitglied der angeforderten Wohnung ist.
 */
export class HouseholdAccessDeniedError extends Error {
  constructor() {
    super('Du bist kein Mitglied dieser Wohnung.');
    this.name = 'HouseholdAccessDeniedError';
  }
}
