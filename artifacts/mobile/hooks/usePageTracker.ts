import { BASE_URL } from "@/lib/api";
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


/**
 * Tracks how long the user spends on a screen and sends a page-visit event
 * to the server on unmount. Returns a `logAction` helper for in-page events.
 */
export function usePageTracker(pageName: string, pageLabel: string) {
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    enteredAt.current = Date.now();
    // Fire "enter" event immediately (time spent = 0, action = "enter")
    sendEvent(pageName, pageLabel, "enter", 0);

    return () => {
      const timeSpentSec = Math.max(1, Math.round((Date.now() - enteredAt.current) / 1000));
      sendEvent(pageName, pageLabel, "visit", timeSpentSec);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logAction(action: string) {
    sendEvent(pageName, pageLabel, action, 0);
  }

  return { logAction };
}

async function sendEvent(pageName: string, pageLabel: string, action: string, timeSpentSec: number) {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) return;
    fetch(`${BASE_URL}/user/page-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pageName, pageLabel, action, timeSpentSec }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
