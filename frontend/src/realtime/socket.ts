import { io, type Socket } from "socket.io-client";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";

export type RealtimeSocket = Socket;

/**
 * Erstellt eine authentifizierte Socket.IO-Verbindung zum Backend.
 */
export function createRealtimeSocket(token: string): RealtimeSocket {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: {
      token,
    },
    transports: ["websocket"],
  });
}

export const REALTIME_REFRESH_EVENT = "diario:refresh";

/**
 * Verteilt ein Realtime-Ereignis innerhalb des Frontends.
 */
export function dispatchRealtimeRefresh(): void {
  window.dispatchEvent(new Event(REALTIME_REFRESH_EVENT));
}
