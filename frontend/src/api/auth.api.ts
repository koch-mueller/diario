import { apiFetch } from "./api";
import type { AuthResult, AuthUser } from "./types";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const authApi = {
  /**
   * Registriert einen neuen Benutzer.
   */
  register(payload: RegisterPayload): Promise<AuthResult> {
    return apiFetch<AuthResult>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Meldet einen Benutzer mit seinen Zugangsdaten an.
   */
  login(payload: LoginPayload): Promise<AuthResult> {
    return apiFetch<AuthResult>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Liefert die Daten des aktuell angemeldeten Benutzers.
   */
  me(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/me");
  },
};
