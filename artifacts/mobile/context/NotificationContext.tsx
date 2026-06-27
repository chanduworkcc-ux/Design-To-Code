import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

const LAST_SEEN_KEY = "notif_last_seen_at";
const POLL_INTERVAL = 30_000;

interface NotificationContextType {
  unreadCount: number;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, apiRequest } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!token) { setUnreadCount(0); return; }
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
      const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

      const res = await apiRequest("/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const notifs: Array<{ sentAt: string }> = data.notifications ?? [];

      const unseen = notifs.filter(
        (n) => new Date(n.sentAt).getTime() > lastSeenTime
      ).length;
      setUnreadCount(unseen);
    } catch {}
  }, [token, apiRequest]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SEEN_KEY, now);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnread]);

  // Instantly refresh unread count when an order status update arrives via socket
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      fetchUnread();
    };
    socket.on("order_update", handler);
    return () => {
      socket.off("order_update", handler);
    };
  }, [socket, fetchUnread]);

  return (
    <NotificationContext.Provider value={{ unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
