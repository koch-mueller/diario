import { compare, hash } from 'bcryptjs';

import type { PasswordHasherPort } from '../../../application/ports/output/password-hasher.port';

/**
 * Implementiert das sichere Hashen und Prüfen von Passwörtern mit bcrypt.
 */
export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly rounds: number) {}

  /**
   * Erzeugt einen sicheren Hash für das Passwort.
   */
  hash(password: string): Promise<string> {
    return hash(password, this.rounds);
  }

  /**
   * Prüft, ob ein Klartextpasswort zum gespeicherten Hash passt.
   */
  matches(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
