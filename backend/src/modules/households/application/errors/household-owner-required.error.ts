/**
 * Signalisiert, dass für die Aktion die Eigentümerrolle der Wohnung erforderlich ist.
 */
export class HouseholdOwnerRequiredError extends Error {
  constructor() {
    super('Nur der Besitzer kann diese Wohnung löschen.');
    this.name = 'HouseholdOwnerRequiredError';
  }
}
