import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedUser } from '../../../application/authenticated-user';
import type { TokenServicePort } from '../../../application/ports/output/token-service.port';

interface JwtPayload {
  sub: string;
  name: string;
  email: string;
}

/**
 * Erstellt und validiert JWT-Zugriffstoken für authentifizierte Benutzer.
 */
@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Erstellt ein signiertes Zugriffstoken.
   */
  sign(user: AuthenticatedUser): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
    });
  }

  /**
   * Prüft ein Zugriffstoken und liest die enthaltenen Daten aus.
   */
  async verify(token: string): Promise<AuthenticatedUser> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    };
  }
}
