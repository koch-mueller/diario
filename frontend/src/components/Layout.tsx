import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../features/translation/TranslationContext";
import type { TranslationDisplayMode } from "../features/translation/types";
import { useHousehold } from "../context/HouseholdContext";
import {
  createRealtimeSocket,
  dispatchRealtimeRefresh,
} from "../realtime/socket";

const realtimeEvents = [
  "task:created",
  "task:updated",
  "task:deleted",
  "shopping-list:created",
  "shopping-list:updated",
  "shopping-list:deleted",
  "shopping-list:item-created",
  "shopping-list:item-updated",
  "shopping-list:item-deleted",
  "budget:created",
  "budget:updated",
  "budget:deleted",
  "calendar:event-created",
  "calendar:event-updated",
  "calendar:event-deleted",
] as const;

const translationModeOptions: Array<{
  mode: TranslationDisplayMode;
  title: string;
  description: string;
}> = [
  {
    mode: "original",
    title: "Original",
    description: "Alle Texte unverändert anzeigen",
  },
  {
    mode: "deutsch",
    title: "Deutsch-Mode",
    description: "Alle Einträge auf Deutsch anzeigen",
  },
  {
    mode: "marie",
    title: "Marie's-Mode",
    description: "Pro Eintrag eine zufällige Sprache",
  },
];

/**
 * Stellt Navigation und Inhaltsbereich der Anwendung bereit.
 */
export function Layout() {
  const { user, token, logout } = useAuth();
  const { mode, setMode } = useTranslation();
  const { activeHousehold, activeHouseholdId } = useHousehold();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !activeHouseholdId) {
      return undefined;
    }

    const socket = createRealtimeSocket(token);

    socket.connect();

    socket.on("connection:ready", () => {
      socket.emit("household:join", { householdId: activeHouseholdId });
    });

    for (const eventName of realtimeEvents) {
      socket.on(eventName, dispatchRealtimeRefresh);
    }

    return () => {
      socket.emit("household:leave", { householdId: activeHouseholdId });

      for (const eventName of realtimeEvents) {
        socket.off(eventName, dispatchRealtimeRefresh);
      }

      socket.disconnect();
    };
  }, [activeHouseholdId, token]);

  /**
   * Meldet den Benutzer ab und wechselt zurück zur Loginseite.
   */
  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          <Logo />
        </Link>

        <nav className="topbar__nav" aria-label="Hauptnavigation">
          <NavLink to="/tasks">To-dos</NavLink>
          <NavLink to="/shopping-list">Einkauf</NavLink>
          <NavLink to="/budget">Budget</NavLink>
          <NavLink to="/calendar">Kalender</NavLink>
        </nav>

        <div className="topbar__user">
          <Link to="/household" className="household-pill">
            🏠 {activeHousehold?.name ?? "Wohnung"}
          </Link>

          <details className="user-menu">
            <summary>{user?.name ?? "Benutzer"}</summary>
            <div className="user-menu__dropdown">
              <div className="user-menu__section">
                <span className="user-menu__label">Anzeigesprache</span>
                {translationModeOptions.map((option) => (
                  <button
                    type="button"
                    className={
                      option.mode === mode
                        ? "user-menu__option user-menu__option--active"
                        : "user-menu__option"
                    }
                    key={option.mode}
                    onClick={() => setMode(option.mode)}
                  >
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="user-menu__logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </details>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
