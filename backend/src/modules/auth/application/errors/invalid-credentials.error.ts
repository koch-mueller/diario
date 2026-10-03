/**
 * Signalisiert ungültige Zugangsdaten bei der Anmeldung.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super(`E-Mail-Adresse oder Passwort falsch.`);

    this.name = 'InvalidCredentialsError';
  }
}
