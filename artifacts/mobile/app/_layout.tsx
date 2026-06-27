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
import { usePushNotifications } from "@/hooks/usePushNotifications";
import MaintenanceScreen from "./maintenance";

function PushNotificationInit() {
  const { token } = useAuth();
  usePushNotifications(token);
  return null;
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const { width } = Dimensions.get("window");
const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function AppSplash({ onDone }: { onDone: () => void }) {
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.78)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(bgOpacity, { toValue: 0, duration: 420, useNativeDriver: true })
          .start(() => onDone());
      }, 7000);
    });
  }, []);

  return (
    <Animated.View style={[styles.splashRoot, { opacity: bgOpacity }]}>
      <Animated.View style={[styles.splashLogoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={require("@/assets/logo.png")} style={styles.splashLogo} resizeMode="contain" />
      </Animated.View>
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => <PulseDot key={i} delay={i * 180} />)}
      </View>
    </Animated.View>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 380, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[styles.dot, { opacity }]} />;
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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message?: string }>({ active: false });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Check maintenance mode after fonts load
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.maintenance_mode === "true") {
          setMaintenance({ active: true, message: d.maintenance_message });
        }
      })
      .catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  // Full-screen maintenance overlay (sits above everything)
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
            <NotificationProvider>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                  {showSplash && <AppSplash onDone={() => setShowSplash(false)} />}
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  splashLogoWrap: { alignItems: "center", justifyContent: "center" },
  splashLogo: { width: width * 0.62, height: width * 0.62 * 0.56 },
  dotsRow: { flexDirection: "row", gap: 8, marginTop: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" },
});
