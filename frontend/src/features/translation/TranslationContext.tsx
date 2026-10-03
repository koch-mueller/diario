import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TranslationDisplayMode } from "./types";

const TRANSLATION_MODE_KEY = "diario_language_mode";

const modeLabels: Record<TranslationDisplayMode, string> = {
  original: "Original",
  deutsch: "Deutsch-Mode",
  marie: "Marie's-Mode",
};

const modeDescriptions: Record<TranslationDisplayMode, string> = {
  original: "Einträge werden unverändert angezeigt.",
  deutsch: "Einträge werden für die Wohnung auf Deutsch angezeigt.",
  marie: "Jeder Eintrag wird stabil in genau eine zufällige Sprache übersetzt.",
};

type TranslationContextValue = {
  mode: TranslationDisplayMode;
  modeLabel: string;
  modeDescription: string;
  setMode: (mode: TranslationDisplayMode) => void;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Prüft, ob der gespeicherte Wert ein unterstützter Sprachmodus ist.
 */
function isTranslationDisplayMode(
  value: string | null,
): value is TranslationDisplayMode {
  return value === "original" || value === "deutsch" || value === "marie";
}

/**
 * Liest den zuletzt ausgewählten Sprachmodus aus dem Browser.
 */
function getInitialMode(): TranslationDisplayMode {
  const savedMode = localStorage.getItem(TRANSLATION_MODE_KEY);

  return isTranslationDisplayMode(savedMode) ? savedMode : "original";
}

/**
 * Speichert den gewählten Sprachmodus und stellt ihn allen Seiten bereit.
 */
export function TranslationProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TranslationDisplayMode>(getInitialMode);

  useEffect(() => {
    localStorage.setItem(TRANSLATION_MODE_KEY, mode);
  }, [mode]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      mode,
      modeLabel: modeLabels[mode],
      modeDescription: modeDescriptions[mode],
      setMode: setModeState,
    }),
    [mode],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Liefert den aktuell ausgewählten Sprachmodus.
 */
export function useTranslation() {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error(
      "useTranslation muss innerhalb des TranslationProvider genutzt werden.",
    );
  }

  return context;
}
