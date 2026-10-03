/**
 * Signalisiert einen unbekannten oder ungültigen Einladungscode.
 */
export class InvalidInviteCodeError extends Error {
  constructor() {
    super('Der Einladungscode ist ungültig.');
    this.name = 'InvalidInviteCodeError';
  }
}
