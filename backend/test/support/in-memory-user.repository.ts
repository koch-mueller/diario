import type { UserRepositoryPort } from '../../src/modules/users/application/ports/user-repository.port';
import type { User } from '../../src/modules/users/domain/user';

/**
 * Speichert Benutzer für E2E-Tests ausschließlich im Arbeitsspeicher.
 */
export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly users: User[] = [];

  save(user: User): Promise<User> {
    const existingIndex = this.users.findIndex(
      (existingUser) => existingUser.id === user.id,
    );

    if (existingIndex === -1) {
      this.users.push(user);
    } else {
      this.users[existingIndex] = user;
    }

    return Promise.resolve(user);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return Promise.resolve(
      this.users.find((user) => user.email === normalizedEmail) ?? null,
    );
  }
}
