/**
 * Signalisiert, dass ein Benutzer der Wohnung bereits angehört.
 */
export class AlreadyHouseholdMemberError extends Error {
  constructor() {
    super('Der Benutzer ist bereits Mitglied dieser Wohnung.');
    this.name = 'AlreadyHouseholdMemberError';
  }
}
