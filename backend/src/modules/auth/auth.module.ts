import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { AuthController } from './adapters/input/rest/auth.controller';
import { JwtAuthGuard } from './adapters/input/rest/jwt-auth.guard';
import { BcryptPasswordHasher } from './adapters/output/security/bcrypt-password-hasher';
import { JwtTokenService } from './adapters/output/security/jwt-token.service';
import { LOGIN_USE_CASE } from './application/ports/input/login.use-case';
import { REGISTER_USER_USE_CASE } from './application/ports/input/register-user.use-case';
import { PASSWORD_HASHER } from './application/ports/output/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/output/token-service.port';
import { LoginService } from './application/use-cases/login.service';
import { RegisterUserService } from './application/use-cases/register-user.service';

/**
 * Konfiguriert Authentifizierung, JWT-Sicherheit und die zugehörigen Use-Cases.
 */
@Module({
  imports: [
    ConfigModule,
    UsersModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>(
          'JWT_EXPIRES_IN',
          '7d',
        ) as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET fehlt in der Umgebungsdatei.');
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    {
      provide: BcryptPasswordHasher,
      inject: [ConfigService],

      useFactory: (configService: ConfigService): BcryptPasswordHasher => {
        const rounds = Number(configService.get<string>('BCRYPT_ROUNDS', '10'));

        if (!Number.isInteger(rounds) || rounds < 4 || rounds > 31) {
          throw new Error(
            'BCRYPT_ROUNDS muss eine ganze Zahl zwischen 4 und 31 sein.',
          );
        }

        return new BcryptPasswordHasher(rounds);
      },
    },

    JwtTokenService,
    JwtAuthGuard,

    {
      provide: PASSWORD_HASHER,
      useExisting: BcryptPasswordHasher,
    },

    {
      provide: TOKEN_SERVICE,
      useExisting: JwtTokenService,
    },

    {
      provide: REGISTER_USER_USE_CASE,
      useClass: RegisterUserService,
    },

    {
      provide: LOGIN_USE_CASE,
      useClass: LoginService,
    },
  ],

  exports: [JwtAuthGuard, TOKEN_SERVICE],
})
export class AuthModule {}
