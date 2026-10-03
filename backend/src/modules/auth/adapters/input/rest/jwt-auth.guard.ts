import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../application/authenticated-user';
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from '../../../application/ports/output/token-service.port';

/**
 * Schützt REST-Endpunkte durch Prüfung des JWT-Zugriffstokens.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  /**
   * Validiert das Bearer-Token und hinterlegt den authentifizierten Benutzer im Request.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization?: string;
      };
      user?: AuthenticatedUser;
    }>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authorization-Header fehlt.');
    }

    const [scheme, token] = authorization.trim().split(/\s+/);

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization-Header muss das Format "Bearer <Token>" haben.',
      );
    }

    try {
      request.user = await this.tokenService.verify(token);

      return true;
    } catch {
      throw new UnauthorizedException(
        'Das Zugriffstoken ist ungültig oder abgelaufen.',
      );
    }
  }
}
