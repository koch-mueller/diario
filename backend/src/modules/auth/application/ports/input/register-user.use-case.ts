import type { AuthResult } from '../../auth-result';

export const REGISTER_USER_USE_CASE = Symbol('REGISTER_USER_USE_CASE');

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}

export interface RegisterUserUseCase {
  execute(command: RegisterUserCommand): Promise<AuthResult>;
}
