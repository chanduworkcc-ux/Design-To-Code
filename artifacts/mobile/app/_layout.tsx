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
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TransitionBanner } from "@/components/TransitionBanner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SocketProvider } from "@/context/SocketContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import MaintenanceScreen from "./maintenance";
import ForceUpdateScreen from "./force-update";

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

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.25, duration: 380, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.3, duration: 380, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 380, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return <Animated.View style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
}

function AppSplash({ onDone, logoUrl }: { onDone: () => void; logoUrl: string | null }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const maxTimer = setTimeout(dismiss, MAX_SPLASH_MS);
    return () => clearTimeout(maxTimer);
  }, []);

  function dismiss() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(screenOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onDone());
  }

  const logoSource = logoUrl ? { uri: logoUrl } : LOCAL_LOGO;

  return (
    <Animated.View style={[styles.splashRoot, { opacity: screenOpacity }]}>
      <Animated.View style={[styles.centerContent, { opacity: contentOpacity }]}>
        <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => <PulseDot key={i} delay={i * 180} />)}
        </View>
      </Animated.View>

      <Animated.View style={[styles.brandWrap, { opacity: contentOpacity }]}>
        <Text style={styles.brandBy}>by</Text>
        <Text style={styles.brandName}>FX PRIME 26</Text>
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
  const [showTransition, setShowTransition] = useState(false);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message?: string }>({ active: false });
  const [forceUpdate, setForceUpdate] = useState<{ active: boolean; url: string; version: string; notes: string }>({ active: false, url: "", version: "", notes: "" });
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
        if (d?.force_update === "true" && d?.update_url) {
          setForceUpdate({ active: true, url: d.update_url, version: d.update_version ?? "latest", notes: d.update_notes ?? "" });
        }
        if (d?.logo_url) {
          setLogoUrl(d.logo_url);
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
                        onDone={() => { setShowSplash(false); setShowTransition(true); }}
                      />
                    )}
                    <TransitionBanner
                      visible={showTransition}
                      logoUrl={logoUrl}
                      onDone={() => setShowTransition(false)}
                    />
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
    backgroundColor: "#EEF2FF",
  },
  centerContent: {
    alignItems: "center",
    gap: 28,
  },
  logoImg: {
    width: width * 0.42,
    height: width * 0.42 * 0.72,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  brandWrap: {
    position: "absolute",
    bottom: height * 0.08,
    alignItems: "center",
    gap: 4,
  },
  brandBy: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#1E3A8A",
    letterSpacing: 6,
  },
});
