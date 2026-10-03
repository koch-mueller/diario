import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const backendDir = join(projectRoot, "backend");
const frontendDir = join(projectRoot, "frontend");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";

function npmArgs(args) {
  return isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
}

const backendUrl = "http://127.0.0.1:3000/api/auth/me";
const frontendUrl = "http://localhost:5173";

let backendProcess = null;
let frontendProcess = null;
let shuttingDown = false;

function fail(message) {
  console.error(`\nFEHLER: ${message}`);
  process.exit(1);
}

async function isReachable(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
    });

    return response.status >= 100;
  } catch {
    return false;
  }
}

async function waitUntilReachable(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], {
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], {
      stdio: "ignore",
    }).unref();
    return;
  }

  spawn("xdg-open", [url], {
    stdio: "ignore",
  }).unref();
}

function startNpmProcess(cwd, args, label) {
  const child = spawn(npmCommand, npmArgs(args), {
    cwd,
    stdio: "inherit",
    windowsHide: false,
    detached: false,
  });

  child.on("error", (error) => {
    if (!shuttingDown) {
      console.error(`\n${label} konnte nicht gestartet werden: ${error.message}`);
      void shutdown(1);
    }
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason =
      signal !== null
        ? `Signal ${signal}`
        : `Fehlercode ${String(code ?? 0)}`;

    console.error(`\n${label} wurde beendet (${reason}).`);
    void shutdown(code === 0 ? 1 : (code ?? 1));
  });

  return child;
}

function terminateProcess(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    return;
  }

  const pid = child.pid;

  setTimeout(() => {
    try {
      process.kill(pid, 0);
      process.kill(pid, "SIGKILL");
    } catch {
      // Prozess wurde bereits beendet.
    }
  }, 1500).unref();
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("\nDiario wird beendet ...");

  terminateProcess(frontendProcess);
  terminateProcess(backendProcess);

  await new Promise((resolve) => setTimeout(resolve, 250));

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

process.on("SIGHUP", () => {
  void shutdown(0);
});

if (!existsSync(join(backendDir, "dist"))) {
  fail("Backend-Build fehlt. Bitte zuerst setup-diario ausführen.");
}

if (!existsSync(join(frontendDir, "dist"))) {
  fail("Frontend-Build fehlt. Bitte zuerst setup-diario ausführen.");
}

console.log("Diario wird gestartet ...");
console.log("Dieses Fenster geöffnet lassen.");
console.log("Mit Ctrl+C oder durch Schließen des Terminals wird Diario beendet.\n");

backendProcess = startNpmProcess(
  backendDir,
  ["run", "start:prod"],
  "Backend",
);

frontendProcess = startNpmProcess(
  frontendDir,
  [
    "run",
    "preview",
    "--",
    "--host",
    "localhost",
    "--port",
    "5173",
    "--strictPort",
  ],
  "Frontend",
);

const [backendReady, frontendReady] = await Promise.all([
  waitUntilReachable(backendUrl, 15000),
  waitUntilReachable(frontendUrl, 15000),
]);

if (!backendReady || !frontendReady) {
  console.error(
    "\nDiario konnte nicht vollständig gestartet werden. Prüfe die Meldungen oben und ob PostgreSQL läuft.",
  );

  await shutdown(1);
}

console.log("\nDiario läuft:");
console.log(`Backend:  ${backendUrl}`);
console.log(`Frontend: ${frontendUrl}`);
console.log("\nDer Browser wird geöffnet.");
console.log("Dieses Terminal geöffnet lassen, solange Diario laufen soll.");

openBrowser(frontendUrl);

// Das Skript bleibt absichtlich aktiv, solange die beiden Kindprozesse laufen.
