/**
 * Signalisiert, dass bereits ein Benutzer mit der angegebenen E-Mail-Adresse existiert.
 */
export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(
      `Für die E-Mail-Adresse "${email}" existiert bereits ein Benutzerkonto.`,
    );

    this.name = 'EmailAlreadyExistsError';
  }
}
