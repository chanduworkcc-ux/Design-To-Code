import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SocketProvider } from "@/context/SocketContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import MaintenanceScreen from "./maintenance";

const LOCAL_LOGO = require("@/assets/logo-transparent.png");

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
const { width, height } = Dimensions.get("window");
const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const MAX_SPLASH_MS = 15000;

function AppSplash({ onDone, logoUrl }: { onDone: () => void; logoUrl: string | null }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(20)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(logoTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const maxTimer = setTimeout(dismiss, MAX_SPLASH_MS);
    return () => clearTimeout(maxTimer);
  }, []);

  function dismiss() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onDone());
  }

  const logoSource = logoUrl ? { uri: logoUrl } : LOCAL_LOGO;

  return (
    <Animated.View style={[styles.splashRoot, { opacity: screenOpacity }]}>
      {/* White base */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: "#fff" }} />
      </View>

      {/* Slanted blue top panel */}
      <View style={styles.slantTop} pointerEvents="none" />

      {/* Logo centred over the slant line */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] },
        ]}
      >
        <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message?: string }>({ active: false });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
        if (d?.logo_url) {
          setLogoUrl(d.logo_url);
        }
      })
      .catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
                if (d?.logo_url) setLogoUrl(d.logo_url);
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
            <PushNotificationInit />
            <AppProvider>
              <SocketInit>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    {showSplash && (
                      <AppSplash
                        logoUrl={logoUrl}
                        onDone={() => setShowSplash(false)}
                      />
                    )}
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SocketInit>
            </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backgroundColor: "#fff",
  },
  slantTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.58,
    backgroundColor: "#2563EB",
    transform: [{ skewY: "-12deg" }, { translateY: -(height * 0.08) }],
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImg: {
    width: width * 0.58,
    height: width * 0.58 * 0.42,
  },
});
