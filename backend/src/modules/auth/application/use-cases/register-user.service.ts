import { Inject, Injectable } from '@nestjs/common';

import { User } from '../../../users/domain/user';
import { USER_REPOSITORY } from '../../../users/application/ports/user-repository.port';
import type { UserRepositoryPort } from '../../../users/application/ports/user-repository.port';

import type { AuthResult } from '../auth-result';
import { EmailAlreadyExistsError } from '../errors/email-already-exists.error';
import type {
  RegisterUserCommand,
  RegisterUserUseCase,
} from '../ports/input/register-user.use-case';
import { PASSWORD_HASHER } from '../ports/output/password-hasher.port';
import type { PasswordHasherPort } from '../ports/output/password-hasher.port';
import { TOKEN_SERVICE } from '../ports/output/token-service.port';
import type { TokenServicePort } from '../ports/output/token-service.port';

/**
 * Registriert neue Benutzer mit sicher gehashtem Passwort.
 */
@Injectable()
export class RegisterUserService implements RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  /**
   * Prüft die E-Mail-Adresse auf Duplikate, speichert den Benutzer und erzeugt ein Zugriffstoken.
   */
  async execute(command: RegisterUserCommand): Promise<AuthResult> {
    const normalizedEmail = command.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser !== null) {
      throw new EmailAlreadyExistsError(normalizedEmail);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = User.create({
      name: command.name,
      email: normalizedEmail,
      passwordHash,
    });

    const savedUser = await this.userRepository.save(user);

    const accessToken = await this.tokenService.sign({
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
    });

    return {
      accessToken,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      },
    };
  }
}
