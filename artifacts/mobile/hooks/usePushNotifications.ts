import { BASE_URL } from "@/lib/api";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


async function registerPushToken(authToken: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_REPL_ID,
  });

  const pushToken = tokenData.data;
  if (!pushToken) return;

  await fetch(`${BASE_URL}/notifications/register-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
  });
}

export function usePushNotifications(authToken: string | null) {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!authToken || Platform.OS === "web") return;
    if (registeredRef.current) return;
    registeredRef.current = true;
    registerPushToken(authToken).catch(() => {});
  }, [authToken]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.targetType === "order" || data?.orderId) {
        router.push("/orders");
      } else {
        router.push("/notifications-user");
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);
}
