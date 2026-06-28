import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

const QUEUE_KEY = "@xlc_offline_notif_queue";

interface QueuedNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  retries: number;
}

async function readQueue(): Promise<QueuedNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {}
}

export async function enqueueOfflineNotification(title: string, body: string, icon = "bell"): Promise<void> {
  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    body,
    icon,
    timestamp: Date.now(),
    retries: 0,
  });
  // Keep at most 50 queued items
  if (queue.length > 50) queue.splice(0, queue.length - 50);
  await writeQueue(queue);
}

export async function flushOfflineQueue(
  send: (title: string, body: string, icon: string) => Promise<boolean>,
): Promise<void> {
  const queue = await readQueue();
  if (!queue.length) return;

  const surviving: QueuedNotification[] = [];
  for (const item of queue) {
    // Discard items older than 48 hours
    if (Date.now() - item.timestamp > 48 * 60 * 60 * 1000) continue;
    const ok = await send(item.title, item.body, item.icon ?? "bell");
    if (!ok && item.retries < 3) {
      surviving.push({ ...item, retries: item.retries + 1 });
    }
  }
  await writeQueue(surviving);
}

/**
 * Hook that flushes the offline notification queue whenever the app
 * comes back to the foreground (AppState active) or on first mount.
 *
 * @param sendFn  Async function that delivers one notification. Returns true on success.
 */
export function useOfflineNotificationQueue(
  sendFn: (title: string, body: string, icon: string) => Promise<boolean>,
): void {
  const sendRef = useRef(sendFn);
  sendRef.current = sendFn;

  useEffect(() => {
    // Flush on mount
    flushOfflineQueue((...args) => sendRef.current(...args));

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        flushOfflineQueue((...args) => sendRef.current(...args));
      }
    });
    return () => sub.remove();
  }, []);
}
