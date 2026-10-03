import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";

/**
 * Zeigt das Registrierungsformular an.
 */
export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  /**
   * Registriert den Benutzer und meldet ihn anschließend an.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(name, email, password);
      navigate("/household");
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Registrierung fehlgeschlagen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <h1>Konto erstellen</h1>
        <p className="muted">Erstelle dein Diario-Konto.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              autoComplete="name"
              required
            />
          </label>

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
              autoComplete="new-password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird erstellt..." : "Konto erstellen"}
          </button>
        </form>

        <p className="auth-switch">
          Schon registriert? <Link to="/login">Zum Login</Link>
        </p>
      </section>
    </main>
  );
}
