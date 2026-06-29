import { SOCKET_URL } from "@/lib/api";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { io as socketIO, type Socket } from "socket.io-client";


/**
 * Maintains a socket.io connection that tells the server this user is online.
 * Disconnects automatically when the app goes to background / becomes inactive.
 */
export function usePresence(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    function connect() {
      if (socketRef.current?.connected) return;
      const socket = socketIO(SOCKET_URL, {
        path: "/api/socket.io",
        query: { userId },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
      socketRef.current = socket;
    }

    function disconnect() {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }

    connect();

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        connect();
      } else if (nextState.match(/inactive|background/)) {
        disconnect();
      }
      appStateRef.current = nextState;
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, [userId]);
}
