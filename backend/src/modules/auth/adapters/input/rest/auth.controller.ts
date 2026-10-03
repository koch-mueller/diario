import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../application/authenticated-user';
import { EmailAlreadyExistsError } from '../../../application/errors/email-already-exists.error';
import { InvalidCredentialsError } from '../../../application/errors/invalid-credentials.error';
import {
  LOGIN_USE_CASE,
  type LoginUseCase,
} from '../../../application/ports/input/login.use-case';
import {
  REGISTER_USER_USE_CASE,
  type RegisterUserUseCase,
} from '../../../application/ports/input/register-user.use-case';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Stellt die REST-Endpunkte für Registrierung, Login und den aktuellen Benutzer bereit.
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USER_USE_CASE)
    private readonly registerUserUseCase: RegisterUserUseCase,

    @Inject(LOGIN_USE_CASE)
    private readonly loginUseCase: LoginUseCase,
  ) {}

  /**
   * Registriert einen neuen Benutzer.
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.registerUserUseCase.execute({
        name: dto.name,
        email: dto.email,
        password: dto.password,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  /**
   * Meldet einen Benutzer mit seinen Zugangsdaten an.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute({
        email: dto.email,
        password: dto.password,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message);
      }

      throw error;
    }
  }

  /**
   * Liefert die Daten des aktuell angemeldeten Benutzers.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
