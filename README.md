# Diario

Diario ist eine Webanwendung zur gemeinsamen Organisation einer Wohnung. Die Anwendung bündelt Aufgaben, Einkaufsliste, Budgetplanung und Kalender in einer gemeinsamen Oberfläche. Alle Daten werden wohnungsbezogen gespeichert und können von den Mitgliedern derselben Wohnung gemeinsam verwendet werden.

Das Projekt besteht aus einem NestJS-Backend, einer PostgreSQL-Datenbank und einem React-Frontend.

## Funktionen

### Authentifizierung

- Registrierung und Login
- JWT-basierte Authentifizierung
- geschützte API-Endpunkte im Backend
- geschützte Routen im Frontend
- Laden des aktuell angemeldeten Benutzers über `/auth/me`

### Wohnungsverwaltung

- Wohnung erstellen
- Wohnung über einen Einladungscode beitreten
- zwischen mehreren Wohnungen wechseln
- Mitglieder einer Wohnung anzeigen
- Rollen `OWNER` und `MEMBER`
- nur der `OWNER` kann eine Wohnung löschen
- gemeinsame Daten werden immer einer Wohnung zugeordnet

### Dashboard

Das Dashboard fasst die wichtigsten Daten der aktuell ausgewählten Wohnung zusammen:

- heutige Aufgaben und Termine
- Übersicht über die nächsten sieben Tage
- offene Einträge der Einkaufsliste
- Budgetübersicht des aktuellen Monats

### To-dos

- Aufgaben erstellen
- Aufgaben abhaken und wieder öffnen
- Aufgaben löschen
- Deadline mit Datum und Uhrzeit
- einmalige, wöchentliche und monatliche Aufgaben
- wiederkehrende Folgeaufgaben werden beim Abschließen im Backend erzeugt
- überfällige Aufgaben werden im Frontend hervorgehoben

### Einkaufsliste

- Einträge erstellen
- Mengenangabe
- Einträge abhaken und wieder öffnen
- Einträge löschen
- getrennte Darstellung offener und erledigter Einträge

### Budgetplaner

- Einnahmen und Ausgaben erfassen
- Monatsansicht wechseln
- Kategorien speichern und wiederverwenden
- wiederkehrende Budgeteinträge
- Monatszusammenfassung
- grafische Übersicht der Einnahmen und Ausgaben
- Speicherung der Einträge, Kategorien und Wiederholungen im Backend

### Kalender

- Monatskalender
- Termine direkt über einen Tag anlegen
- Start- und Enddatum mit Uhrzeit
- mehrtägige Termine
- Detailansicht
- deutsche Feiertage
- Export von Terminen als `.ics`

### Übersetzung

Die Übersetzungsfunktion ist als eigenes Modul umgesetzt und kann für Kalender, To-dos, Einkaufsliste, Budget und Dashboard verwendet werden.

Im Nutzermenü stehen drei Modi zur Verfügung:

- **Original**: Einträge werden unverändert angezeigt.
- **Deutsch-Mode**: Übersetzbare Inhalte werden auf Deutsch angezeigt.
- **Marie's-Mode**: Für jeden Eintrag wird stabil eine der Sprachen Französisch, Spanisch, Italienisch oder Japanisch verwendet.

Die Übersetzung erfolgt zentral im Backend über den externen Dienst MyMemory. Die Fachmodule selbst enthalten keine eigene Übersetzungslogik.

### Realtime

Die gemeinsamen Daten einer Wohnung werden über Socket.IO in Echtzeit aktualisiert.

- authentifizierte WebSocket-Verbindung
- Benutzer treten dem Raum der aktiven Wohnung bei
- Änderungen an Aufgaben, Einkaufsliste, Budget und Kalender werden an andere Mitglieder übertragen
- das Frontend lädt die betroffenen Daten nach einem Realtime-Ereignis neu


## Voraussetzungen

Benötigt werden:

- Node.js
- npm
- PostgreSQL

## Datenbank einrichten

Eine lokale PostgreSQL-Datenbank kann zum Beispiel so angelegt werden:

```sql
CREATE USER diario WITH PASSWORD 'diario';
CREATE DATABASE diario OWNER diario;
GRANT ALL PRIVILEGES ON DATABASE diario TO diario;
```

Die Verbindung kann anschließend getestet werden:

```bash
psql -h localhost -p 5432 -U diario -d diario
```

## Backend konfigurieren

Im Ordner `backend` wird eine `.env` benötigt. Als Ausgangspunkt kann `.env.example` verwendet werden.

Beispiel:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=diario
DB_PASSWORD=diario
DB_DATABASE=diario
DB_SYNCHRONIZE=true

JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10

CORS_ORIGIN=http://localhost:5173

MYMEMORY_API_URL=https://api.mymemory.translated.net/get
MYMEMORY_EMAIL=
```

`JWT_SECRET` sollte durch einen eigenen geheimen Wert ersetzt werden.
`MYMEMORY_EMAIL` ist optional und kann für ein höheres Nutzungslimit bei MyMemory gesetzt werden.

Mit `DB_SYNCHRONIZE=true` erstellt beziehungsweise aktualisiert TypeORM die benötigten Tabellen beim Start automatisch. Diese Einstellung ist für die lokale Entwicklung gedacht.

## Backend starten

```bash
cd backend
npm install
npm run start:dev
```

Das Backend läuft standardmäßig unter:

```text
http://localhost:3000
```

## Frontend starten

Für abweichende Backend-Adressen kann im Ordner `frontend` eine `.env` auf Basis von `.env.example` angelegt werden:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft mit der Standardkonfiguration von Vite unter:

```text
http://localhost:5173
```

## Datenbanktabellen

Tabellen in PostgreSQL anzeigen:

```sql
\dt
```

Beispiel zum Anzeigen der Daten:

```sql
SELECT * FROM users;
SELECT * FROM households;
SELECT * FROM household_members;
SELECT * FROM tasks;
SELECT * FROM shopping_list_items;
SELECT * FROM budget_entries;
SELECT * FROM budget_categories;
SELECT * FROM calendar_events;
```

## Übersetzungsdienst

Die Übersetzung wird im Backend über MyMemory ausgeführt. Dadurch sprechen die einzelnen Frontend-Seiten nicht direkt mit dem externen Dienst.

Standardmäßig wird folgende Adresse verwendet:

```env
MYMEMORY_API_URL=https://api.mymemory.translated.net/get
```

Die Anwendung ist nicht davon abhängig, dass eine eigene MyMemory-API-ID im Frontend hinterlegt wird.

## Tests und Qualitätschecks

### Backend

Backend kompilieren:

```bash
cd backend
npm run build
```

ESLint ausführen:

```bash
npm run lint
```

E2E-Tests ausführen:

```bash
npm run test:e2e -- --runInBand
```

Die E2E-Tests decken unter anderem folgende Bereiche ab:

- Authentifizierung
- Wohnungsverwaltung
- To-dos
- Einkaufsliste
- Budgetplaner
- Kalender
- Realtime

### Frontend

Frontend bauen:

```bash
cd frontend
npm run build
```

ESLint ausführen:

```bash
npm run lint
```


## KI-Unterstützung

Teile dieses Projekts wurden mit Unterstützung von ChatGPT entwickelt und anschließend überprüft, angepasst und getestet.
