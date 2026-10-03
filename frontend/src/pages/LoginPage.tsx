import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";

/**
 * Zeigt das Loginformular an.
 */
export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  /**
   * Meldet den Benutzer mit den eingegebenen Zugangsdaten an.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login fehlgeschlagen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <h1>Welcome back</h1>
        <p className="muted">Melde dich bei Diario an.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            E-Mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-Mail"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Passwort"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird angemeldet..." : "Einloggen"}
          </button>
        </form>

        <p className="auth-switch">
          Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
        </p>
      </section>
    </main>
  );
}
