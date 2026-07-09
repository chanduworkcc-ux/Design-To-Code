import { Platform } from "react-native";

export const BASE_URL: string =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export const SOCKET_URL: string =
  Platform.OS === "web"
    ? (typeof window !== "undefined" ? window.location.origin : "")
    : `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
