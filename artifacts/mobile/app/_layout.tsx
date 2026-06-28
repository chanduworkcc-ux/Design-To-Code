import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SplashOverlay from "@/components/SplashOverlay";
import { NotificationProvider } from "@/context/NotificationContext";
import { SocketProvider } from "@/context/SocketContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import MaintenanceScreen from "./maintenance";
import ForceUpdateScreen from "./force-update";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function PushNotificationInit() {
  const { token } = useAuth();
  usePushNotifications(token);
  return null;
}

function SocketInit({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <SocketProvider userId={user?.id}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SocketProvider>
  );
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function LandingInitializer() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    AsyncStorage.getItem("has_seen_landing").then((seen) => {
      if (!seen && !user) {
        router.replace("/landing" as any);
      }
    });
  }, [loading, user]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="landing" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance" options={{ headerShown: false }} />
      <Stack.Screen name="policies" options={{ headerShown: false }} />
      <Stack.Screen name="referrals" options={{ headerShown: false }} />
      <Stack.Screen name="personal-info" options={{ headerShown: false }} />
      <Stack.Screen name="notifications-user" options={{ headerShown: false }} />
      <Stack.Screen name="support-ticket" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ headerShown: false }} />
      <Stack.Screen name="payment-methods" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="suspended" options={{ headerShown: false }} />
      <Stack.Screen name="track-order" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ headerShown: false }} />
      <Stack.Screen name="login-devices" options={{ headerShown: false }} />
      <Stack.Screen name="account-security" options={{ headerShown: false }} />
      <Stack.Screen name="language" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message?: string }>({ active: false });
  const [forceUpdate, setForceUpdate] = useState<{ active: boolean; url: string; version: string; notes: string }>({ active: false, url: "", version: "", notes: "" });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.maintenance_mode === "true") {
          setMaintenance({ active: true, message: d.maintenance_message });
        }
        if (d?.force_update === "true" && d?.update_url) {
          setForceUpdate({ active: true, url: d.update_url, version: d.update_version ?? "latest", notes: d.update_notes ?? "" });
        }
      })
      .catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (forceUpdate.active) {
    return (
      <SafeAreaProvider>
        <ForceUpdateScreen
          version={forceUpdate.version}
          url={forceUpdate.url}
          notes={forceUpdate.notes}
        />
      </SafeAreaProvider>
    );
  }

  if (maintenance.active) {
    return (
      <SafeAreaProvider>
        <MaintenanceScreen
          message={maintenance.message}
          onRetry={() => {
            fetch(`${BASE_URL}/config/public`)
              .then((r) => r.json())
              .then((d) => {
                if (d?.maintenance_mode !== "true") setMaintenance({ active: false });
                if (d?.force_update === "true" && d?.update_url) setForceUpdate({ active: true, url: d.update_url, version: d.update_version ?? "latest", notes: d.update_notes ?? "" });
              })
              .catch(() => {});
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LandingInitializer />
            <PushNotificationInit />
            <AppProvider>
            <LanguageProvider>
              <SocketInit>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  {Platform.OS === "web" ? (
                    <RootLayoutNav />
                  ) : (
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  )}
                  {showSplash && (
                    <SplashOverlay onDone={() => setShowSplash(false)} />
                  )}
                </GestureHandlerRootView>
              </SocketInit>
            </LanguageProvider>
            </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});
