export interface AuthUserResult {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUserResult;
}
