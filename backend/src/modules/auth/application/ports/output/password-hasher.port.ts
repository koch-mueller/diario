export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasherPort {
  hash(password: string): Promise<string>;

  matches(password: string, passwordHash: string): Promise<boolean>;
}
