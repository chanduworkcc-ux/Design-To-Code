import { BASE_URL } from "@/lib/api";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
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

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    "a20b7485-1eed-4b26-9ca0-41165ceb9b03";

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

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
