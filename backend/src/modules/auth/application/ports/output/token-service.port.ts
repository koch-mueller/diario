import type { AuthenticatedUser } from '../../authenticated-user';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenServicePort {
  sign(user: AuthenticatedUser): Promise<string>;

  verify(token: string): Promise<AuthenticatedUser>;
}
