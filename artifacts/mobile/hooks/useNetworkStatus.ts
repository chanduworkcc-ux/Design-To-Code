import { BASE_URL } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";


export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  const check = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      return;
    }
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      await fetch(`${BASE_URL}/`, { method: "HEAD", signal: controller.signal });
      clearTimeout(t);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const up = () => setIsOnline(true);
      const down = () => setIsOnline(false);
      window.addEventListener("online", up);
      window.addEventListener("offline", down);
      return () => {
        window.removeEventListener("online", up);
        window.removeEventListener("offline", down);
      };
    } else {
      check();
      const id = setInterval(check, 12_000);
      return () => clearInterval(id);
    }
  }, [check]);

  return { isOnline, retry: check };
}
