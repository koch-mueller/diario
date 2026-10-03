export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

const ACCESS_TOKEN_KEY = "diario_access_token";

/**
 * Liest den gespeicherten Zugriffstoken aus dem Browser.
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Speichert den Zugriffstoken für weitere API-Anfragen.
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/**
 * Entfernt den aktuell gespeicherten Zugriffstoken.
 */
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

type ErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

/**
 * Prüft, ob eine unbekannte API-Antwort die erwartete Fehlerstruktur besitzt.
 */
function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object" && value !== null;
}

/**
 * Bereinigt eine Fehlermeldung und entfernt leere Texte.
 */
function normalizeMessage(value: string): string {
  const lowerValue = value.toLowerCase();

  if (lowerValue.includes("invitecode")) {
    return "Der Einladungscode muss aus 8 Zeichen bestehen. Bitte prüfe den Code.";
  }

  if (lowerValue.includes("email must be an email")) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  if (
    lowerValue.includes("password") &&
    lowerValue.includes("longer than or equal to 8")
  ) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }

  if (
    lowerValue.includes("name") &&
    lowerValue.includes("longer than or equal to 2")
  ) {
    return "Der Name muss mindestens 2 Zeichen lang sein.";
  }

  if (
    lowerValue.includes("title") &&
    lowerValue.includes("longer than or equal to 2")
  ) {
    return "Der Titel muss mindestens 2 Zeichen lang sein.";
  }

  if (
    lowerValue.includes("description") &&
    lowerValue.includes("longer than or equal to 2")
  ) {
    return "Die Beschreibung muss mindestens 2 Zeichen lang sein.";
  }

  if (lowerValue.includes("amountcents")) {
    return "Bitte gib einen gültigen Betrag ein.";
  }

  if (lowerValue.includes("startsat") || lowerValue.includes("endsat")) {
    return "Bitte gib ein gültiges Datum und eine gültige Uhrzeit ein.";
  }

  if (lowerValue.includes("must be a string")) {
    return "Bitte fülle das Feld korrekt aus.";
  }

  if (lowerValue.includes("must not be empty")) {
    return "Bitte fülle alle Pflichtfelder aus.";
  }

  if (lowerValue.includes("must be shorter than or equal to")) {
    return "Der eingegebene Text ist zu lang.";
  }

  if (value === "Der Einladungscode ist ungültig.") {
    return "Der Einladungscode ist nicht gültig. Bitte prüfe die 8 Zeichen.";
  }

  if (value === "Der Benutzer ist bereits Mitglied dieser Wohnung.") {
    return "Du bist bereits Mitglied dieser Wohnung.";
  }

  return value;
}

/**
 * Liefert eine verständliche Standardfehlermeldung für den HTTP-Status.
 */
function getStatusFallback(status: number): string {
  switch (status) {
    case 400:
      return "Bitte prüfe deine Eingaben.";
    case 401:
      return "Bitte melde dich erneut an.";
    case 403:
      return "Dafür hast du keine Berechtigung.";
    case 404:
      return "Der gesuchte Eintrag wurde nicht gefunden.";
    case 409:
      return "Dieser Eintrag existiert bereits.";
    case 500:
      return "Auf dem Server ist ein Fehler aufgetreten.";
    default:
      return "Die Anfrage ist fehlgeschlagen.";
  }
}

/**
 * Liest die Fehlermeldung aus einer API-Antwort oder verwendet einen Status-Fallback.
 */
function getErrorMessage(value: unknown, status: number): string {
  const fallback = getStatusFallback(status);

  if (!isErrorResponse(value)) {
    return fallback;
  }

  const message = value.message;

  if (Array.isArray(message)) {
    const normalizedMessages = message.map(normalizeMessage);
    const uniqueMessages = [...new Set(normalizedMessages)];
    return uniqueMessages.length > 0 ? uniqueMessages.join(" ") : fallback;
  }

  if (typeof message === "string") {
    return normalizeMessage(message);
  }

  if (typeof value.error === "string") {
    return normalizeMessage(value.error);
  }

  return fallback;
}

/**
 * Liest eine API-Antwort und behandelt Fehlermeldungen einheitlich.
 */
async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Führt eine authentifizierte Anfrage an das Backend aus.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "Der Server ist gerade nicht erreichbar. Bitte prüfe, ob das Backend läuft.",
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    throw new Error(getErrorMessage(data, response.status));
  }

  return data as T;
}
