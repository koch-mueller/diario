import { randomUUID } from 'node:crypto';

export interface CreateUserProperties {
  name: string;
  email: string;
  passwordHash: string;
}

export interface RestoreUserProperties {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/**
 * Repräsentiert einen registrierten Benutzer mit gehashtem Passwort.
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Erstellt einen neuen Benutzer und normalisiert Name sowie E-Mail-Adresse.
   */
  static create(properties: CreateUserProperties): User {
    return new User(
      randomUUID(),
      properties.name.trim(),
      properties.email.trim().toLowerCase(),
      properties.passwordHash,
      new Date(),
    );
  }

  /**
   * Baut einen Benutzer aus bereits gespeicherten Daten wieder auf.
   */
  static restore(properties: RestoreUserProperties): User {
    return new User(
      properties.id,
      properties.name,
      properties.email,
      properties.passwordHash,
      new Date(properties.createdAt),
    );
  }
}
