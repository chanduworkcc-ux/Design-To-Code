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
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
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

const MIN_SPLASH_MS = 5000;
const MAX_SPLASH_MS = 15000;

function Ring({
  size,
  borderColor,
  borderWidth,
  duration,
  rotateAxis,
  delay = 0,
}: {
  size: number;
  borderColor: string;
  borderWidth: number;
  duration: number;
  rotateAxis: "X" | "Y" | "Z";
  delay?: number;
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rotation, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const interpolated = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const transform =
    rotateAxis === "X"
      ? [{ perspective: 600 }, { rotateX: interpolated }]
      : rotateAxis === "Y"
      ? [{ perspective: 600 }, { rotateY: interpolated }]
      : [{ rotateZ: interpolated }];

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        transform,
      }}
    />
  );
}

function GlowOrb({ size, color, opacity, delay }: { size: number; color: string; opacity: number; delay: number }) {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1.2, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: Animated.multiply(pulse, opacity),
        transform: [{ scale: pulse }],
      }}
    />
  );
}

function AppSplash({ onDone, logoUrl }: { onDone: () => void; logoUrl: string | null }) {
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    const fadeIn = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(ringsOpacity, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.timing(brandOpacity, { toValue: 1, duration: 700, delay: 500, useNativeDriver: true }),
    ]);

    fadeIn.start();

    const minTimer = setTimeout(() => {
      if (!doneRef.current) dismiss();
    }, MIN_SPLASH_MS);

    const maxTimer = setTimeout(() => {
      dismiss();
    }, MAX_SPLASH_MS);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  function dismiss() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(bgOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => onDone());
  }

  const logoSource = logoUrl ? { uri: logoUrl } : LOCAL_LOGO;

  return (
    <Animated.View style={[styles.splashRoot, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={["#0A0F2E", "#0E1A4A", "#162260"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle ambient glow blobs */}
      <View style={styles.orbContainer}>
        <GlowOrb size={220} color="#3B82F6" opacity={0.06} delay={0} />
        <GlowOrb size={160} color="#6366F1" opacity={0.08} delay={400} />
      </View>

      {/* 3D rings container */}
      <Animated.View style={[styles.ringsWrap, { opacity: ringsOpacity }]}>
        <Ring size={200} borderColor="rgba(99,102,241,0.85)" borderWidth={2.5} duration={2800} rotateAxis="Y" delay={0} />
        <Ring size={170} borderColor="rgba(59,130,246,0.7)" borderWidth={2} duration={2100} rotateAxis="X" delay={150} />
        <Ring size={140} borderColor="rgba(139,92,246,0.6)" borderWidth={1.5} duration={1700} rotateAxis="Z" delay={80} />
        <Ring size={230} borderColor="rgba(96,165,250,0.3)" borderWidth={1} duration={3500} rotateAxis="Y" delay={200} />
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
      </Animated.View>

      {/* Brand line */}
      <Animated.View style={[styles.brandWrap, { opacity: brandOpacity }]}>
        <Text style={styles.brandBy}>by</Text>
        <Text style={styles.brandName}>FX PRIME 26</Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: brandOpacity }]}>
        {[0, 1, 2].map((i) => <PulseDot key={i} delay={i * 200} />)}
      </Animated.View>
    </Animated.View>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { opacity, transform: [{ scale }] }]} />
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
  },
  orbContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  ringsWrap: {
    position: "absolute",
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoImg: {
    width: width * 0.52,
    height: width * 0.52 * 0.52,
  },
  brandWrap: {
    position: "absolute",
    bottom: height * 0.1,
    alignItems: "center",
    gap: 3,
  },
  brandBy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(148,163,184,0.7)",
    letterSpacing: 1.5,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#93C5FD",
    letterSpacing: 5,
  },
  dotsRow: {
    position: "absolute",
    bottom: height * 0.1 + 56,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#6366F1",
  },
});
