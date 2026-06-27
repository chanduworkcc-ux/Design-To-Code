import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data?: unknown) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  emit: () => {},
});

export function SocketProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string | null;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sock = io(SOCKET_URL, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      query: userId ? { userId } : {},
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));
    socketRef.current = sock;

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  function emit(event: string, data?: unknown) {
    socketRef.current?.emit(event, data);
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
