import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(token: string | null) {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!token || Platform.OS === "web") return;

    registerForPushNotifications(token);

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
  }, [token]);
}

async function registerForPushNotifications(authToken: string) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = pushTokenData.data;

    await fetch(`${BASE_URL}/notifications/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
    });
  } catch {
    // best-effort: silently fail if notifications are unavailable
  }
}
