import { Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY } from '../../../users/application/ports/user-repository.port';
import type { UserRepositoryPort } from '../../../users/application/ports/user-repository.port';

import type { AuthResult } from '../auth-result';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import type { LoginCommand, LoginUseCase } from '../ports/input/login.use-case';
import { PASSWORD_HASHER } from '../ports/output/password-hasher.port';
import type { PasswordHasherPort } from '../ports/output/password-hasher.port';
import { TOKEN_SERVICE } from '../ports/output/token-service.port';
import type { TokenServicePort } from '../ports/output/token-service.port';

/**
 * Authentifiziert Benutzer anhand von E-Mail-Adresse und Passwort.
 */
@Injectable()
export class LoginService implements LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  /**
   * Normalisiert die E-Mail-Adresse, prüft die Zugangsdaten und erzeugt ein Zugriffstoken.
   */
  async execute(command: LoginCommand): Promise<AuthResult> {
    const normalizedEmail = command.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (user === null) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.matches(
      command.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.tokenService.sign({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }
}
