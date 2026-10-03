import { useEffect } from "react";

import { REALTIME_REFRESH_EVENT } from "./socket";

/**
 * Lädt Seitendaten nach passenden Realtime-Ereignissen neu.
 */
export function useRealtimeReload(callback: () => void): void {
  useEffect(() => {
    window.addEventListener(REALTIME_REFRESH_EVENT, callback);

    return () => {
      window.removeEventListener(REALTIME_REFRESH_EVENT, callback);
    };
  }, [callback]);
}
