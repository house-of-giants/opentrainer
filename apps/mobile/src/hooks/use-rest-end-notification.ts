import { useCallback, useEffect, useRef } from "react";

import {
  cancelRestEndNotification,
  scheduleRestEndNotification,
} from "@/lib/rest-timer-notifications";

// Shared by the rest-timer components: keeps at most one pending "rest over"
// notification alive, replacing it whenever the timer starts or is adjusted
// and cancelling it on pause/skip/complete/unmount.
export function useRestEndNotification() {
  const idRef = useRef<string | null>(null);
  const tokenRef = useRef(0);

  const replace = useCallback(async (secondsFromNow: number | null) => {
    const token = ++tokenRef.current;
    const previous = idRef.current;
    idRef.current = null;
    await cancelRestEndNotification(previous);
    if (secondsFromNow === null) return;
    const id = await scheduleRestEndNotification(secondsFromNow);
    if (tokenRef.current === token) {
      idRef.current = id;
    } else {
      // A newer schedule/cancel superseded this one while awaiting.
      await cancelRestEndNotification(id);
    }
  }, []);

  const scheduleIn = useCallback(
    (secondsFromNow: number) => {
      void replace(secondsFromNow);
    },
    [replace],
  );

  const cancel = useCallback(() => {
    void replace(null);
  }, [replace]);

  useEffect(() => cancel, [cancel]);

  return { scheduleIn, cancel };
}
