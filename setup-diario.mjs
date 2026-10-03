import { randomBytes } from "node:crypto";
import {
  existsSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const backendDir = join(projectRoot, "backend");
const frontendDir = join(projectRoot, "frontend");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
let psqlCommand = "psql";

function npmArgs(args) {
  return isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
}

function printStep(message) {
  console.log(`\n==> ${message}`);
}

function fail(message) {
  console.error(`\nFEHLER: ${message}`);
  process.exit(1);
}

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: false,
  });

  return result.status === 0;
}

function resolvePsqlCommand() {
  if (commandExists("psql")) {
    return "psql";
  }

  const candidates = [];

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    const postgresRoots = new Set([join(programFiles, "PostgreSQL")]);

    if (programFilesX86) {
      postgresRoots.add(join(programFilesX86, "PostgreSQL"));
    }

    if (process.env.POSTGRES_HOME) {
      postgresRoots.add(process.env.POSTGRES_HOME);
    }

    for (let code = "C".charCodeAt(0); code <= "Z".charCodeAt(0); code += 1) {
      const drive = `${String.fromCharCode(code)}:`;
      postgresRoots.add(join(drive, "PostgreSQL"));
      postgresRoots.add(join(drive, "Program Files", "PostgreSQL"));
    }

    for (const postgresRoot of postgresRoots) {
      const directCandidate = join(postgresRoot, "bin", "psql.exe");

      if (existsSync(directCandidate)) {
        candidates.push(directCandidate);
      }

      if (existsSync(postgresRoot)) {
        const versions = readdirSync(postgresRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((left, right) =>
            right.localeCompare(left, undefined, { numeric: true }),
          );

        for (const version of versions) {
          candidates.push(join(postgresRoot, version, "bin", "psql.exe"));
        }
      }
    }
  } else if (process.platform === "darwin") {
    candidates.push(
      "/opt/homebrew/bin/psql",
      "/usr/local/bin/psql",
      "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
    );
  } else {
    candidates.push("/usr/bin/psql", "/usr/local/bin/psql");
  }

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    shell: false,
  });

  if (result.error) {
    if (options.allowFailure) {
      return false;
    }

    fail(`${command} konnte nicht ausgeführt werden: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (options.allowFailure) {
      return false;
    }

    fail(
      `${command} ${args.join(" ")} wurde mit Fehlercode ${String(result.status)} beendet.`,
    );
  }

  return true;
}

function ensureProjectStructure() {
  if (!existsSync(join(backendDir, "package.json"))) {
    fail(
      "backend/package.json wurde nicht gefunden. Lege die Starterdateien in den Hauptordner des Diario-Projekts.",
    );
  }

  if (!existsSync(join(frontendDir, "package.json"))) {
    fail(
      "frontend/package.json wurde nicht gefunden. Lege die Starterdateien in den Hauptordner des Diario-Projekts.",
    );
  }
}

function ensureBackendEnv() {
  const envPath = join(backendDir, ".env");

  if (existsSync(envPath)) {
    console.log("backend/.env ist bereits vorhanden und wird nicht verändert.");
    return;
  }

  const jwtSecret = randomBytes(48).toString("hex");
  const envContent = [
    "PORT=3000",
    "CORS_ORIGIN=http://localhost:5173",
    "DB_HOST=localhost",
    "DB_PORT=5432",
    "DB_USERNAME=diario",
    "DB_PASSWORD=diario",
    "DB_DATABASE=diario",
    "DB_SYNCHRONIZE=true",
    `JWT_SECRET=${jwtSecret}`,
    "JWT_EXPIRES_IN=8h",
    "BCRYPT_ROUNDS=10",
    "MYMEMORY_API_URL=https://api.mymemory.translated.net/get",
    "",
  ].join("\n");

  writeFileSync(envPath, envContent, "utf8");
  console.log("backend/.env wurde mit lokalen Standardwerten erstellt.");
}

function canConnectToDiario() {
  const env = {
    ...process.env,
    PGPASSWORD: "diario",
  };

  return run(
    psqlCommand,
    [
      "-h",
      "localhost",
      "-p",
      "5432",
      "-U",
      "diario",
      "-d",
      "diario",
      "-tAc",
      "SELECT 1;",
    ],
    {
      env,
      stdio: "ignore",
      allowFailure: true,
    },
  );
}

function getAdminCandidates() {
  if (process.platform === "win32") {
    return [
      {
        command: psqlCommand,
        baseArgs: ["-U", "postgres", "-d", "postgres"],
        description: "PostgreSQL-Benutzer postgres",
      },
    ];
  }

  if (process.platform === "linux") {
    return [
      {
        command: psqlCommand,
        baseArgs: ["-d", "postgres"],
        description: "aktueller PostgreSQL-Benutzer",
      },
      {
        command: "sudo",
        baseArgs: ["-u", "postgres", psqlCommand, "-d", "postgres"],
        description: "Linux-Systembenutzer postgres",
      },
    ];
  }

  return [
    {
      command: psqlCommand,
      baseArgs: ["-d", "postgres"],
      description: "lokaler PostgreSQL-Administrator",
    },
    {
      command: psqlCommand,
      baseArgs: ["-U", "postgres", "-d", "postgres"],
      description: "PostgreSQL-Benutzer postgres",
    },
  ];
}

function tryInitializeDatabase() {
  const roleSql =
    "DO $$ BEGIN " +
    "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'diario') THEN " +
    "CREATE ROLE diario LOGIN PASSWORD 'diario'; " +
    "ELSE ALTER ROLE diario WITH LOGIN PASSWORD 'diario'; " +
    "END IF; END $$;";

  const databaseSql = "CREATE DATABASE diario OWNER diario;";

  for (const candidate of getAdminCandidates()) {
    printStep(
      `Versuche Datenbankeinrichtung über ${candidate.description}.`,
    );

    const roleCreated = run(
      candidate.command,
      [...candidate.baseArgs, "-v", "ON_ERROR_STOP=1", "-c", roleSql],
      { allowFailure: true },
    );

    if (!roleCreated) {
      continue;
    }

    // CREATE DATABASE ist nicht direkt idempotent. Ein Fehler wegen einer bereits
    // existierenden Datenbank ist unkritisch; danach wird die echte Verbindung geprüft.
    run(
      candidate.command,
      [...candidate.baseArgs, "-c", databaseSql],
      { allowFailure: true },
    );

    if (canConnectToDiario()) {
      console.log("PostgreSQL-Benutzer und Datenbank sind bereit.");
      return true;
    }
  }

  return false;
}

function installDependencies(directory, label) {
  const lockFile = join(directory, "package-lock.json");
  const installArgs = existsSync(lockFile) ? ["ci"] : ["install"];

  printStep(`${label}: npm ${installArgs[0]}`);
  run(npmCommand, npmArgs(installArgs), { cwd: directory });
}

function buildProject(directory, label) {
  printStep(`${label}: Produktions-Build`);
  run(npmCommand, npmArgs(["run", "build"]), { cwd: directory });
}

console.log("Diario Setup");
console.log("============");

ensureProjectStructure();

printStep("Prüfe Voraussetzungen");

if (!commandExists(npmCommand, npmArgs(["--version"]))) {
  fail(
    "npm wurde nicht gefunden. Bitte zuerst eine aktuelle Node.js-LTS-Version installieren.",
  );
}

const resolvedPsqlCommand = resolvePsqlCommand();

if (!resolvedPsqlCommand) {
  fail(
    "psql wurde nicht gefunden. Bitte PostgreSQL installieren. Unter Windows wird auch automatisch im normalen PostgreSQL-Installationsordner gesucht.",
  );
}

psqlCommand = resolvedPsqlCommand;

console.log("Node.js/npm gefunden.");
console.log(`PostgreSQL/psql gefunden: ${psqlCommand}`);

printStep("Backend-Konfiguration");
ensureBackendEnv();

printStep("Prüfe PostgreSQL-Datenbank");

if (canConnectToDiario()) {
  console.log("Die Datenbank diario ist bereits erreichbar.");
} else {
  console.log(
    "Die Datenbank ist noch nicht mit diario/diario erreichbar. Die Einrichtung wird versucht.",
  );

  if (!tryInitializeDatabase()) {
    fail(
      [
        "Die Datenbank konnte nicht automatisch eingerichtet werden.",
        "PostgreSQL muss lokal laufen. Lege danach einmalig Benutzer und Datenbank an:",
        "  CREATE USER diario WITH PASSWORD 'diario';",
        "  CREATE DATABASE diario OWNER diario;",
        "  GRANT ALL PRIVILEGES ON DATABASE diario TO diario;",
        "Starte anschließend setup-diario erneut.",
      ].join("\n"),
    );
  }
}

installDependencies(backendDir, "Backend");
installDependencies(frontendDir, "Frontend");

buildProject(backendDir, "Backend");
buildProject(frontendDir, "Frontend");

console.log("\n======================================");
console.log("Diario wurde erfolgreich vorbereitet.");
console.log("======================================");
console.log("Windows: start-diario.bat doppelklicken");
console.log("macOS:   start-diario.command doppelklicken");
console.log("Linux:   ./start-diario.sh");
console.log("\nDas Startfenster geöffnet lassen. Beim Schließen werden Backend und Frontend beendet.");
console.log("Beim ersten Start erzeugt TypeORM mit DB_SYNCHRONIZE=true die Tabellen.");
