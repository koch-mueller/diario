import type { AuthResult } from '../../auth-result';

export const LOGIN_USE_CASE = Symbol('LOGIN_USE_CASE');

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginUseCase {
  execute(command: LoginCommand): Promise<AuthResult>;
}
