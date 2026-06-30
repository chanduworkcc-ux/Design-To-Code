import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const { width: W } = Dimensions.get("window");

function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const s = useSharedValue(0.4);
  const op = useSharedValue(0.8);
  useEffect(() => {
    s.value = withDelay(delay, withRepeat(withTiming(1.8, { duration: 2600, easing: Easing.out(Easing.quad) }), -1));
    op.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2600, easing: Easing.out(Easing.quad) }), -1));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: op.value }));
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, style]} />
  );
}

function FloatParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  const y = useSharedValue(0);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-80, { duration: 2400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ), -1,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0, { duration: 2100, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 80 }),
      ), -1,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: x }], opacity: op.value }));
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: "#DC2626" }, style]} />;
}

function BanSymbol3D() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const rotZ = useSharedValue(0);
  const scl = useSharedValue(1);

  useEffect(() => {
    tiltX.value = withRepeat(
      withSequence(
        withTiming(16, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-16, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    tiltY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    scl.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { scale: scl.value },
    ],
  }));

  return (
    <Animated.View style={[styles.symbolWrap, style]}>
      {/* Outer circle */}
      <View style={styles.outerCircle}>
        {/* Diagonal slash bar */}
        <View style={styles.slashBar} />
        {/* Inner circle cutout feel */}
        <View style={styles.innerCircleOutline} />
        {/* Exclamation mark */}
        <View style={styles.exclamWrap}>
          <View style={styles.exclamBar} />
          <View style={styles.exclamDot} />
        </View>
      </View>
    </Animated.View>
  );
}

interface Props {
  banReason?: string;
  onLogout?: () => void;
}

function BannedContent({ banReason, onLogout }: Props) {
  return (
    <View style={styles.center}>
      {/* 3D Symbol stage */}
      <View style={styles.symbolStage}>
        <PulseRing delay={0} size={210} color="#DC2626" />
        <PulseRing delay={1000} size={210} color="#DC2626" />
        <PulseRing delay={400} size={160} color="#7F1D1D" />
        <BanSymbol3D />
        <View style={styles.particleOrigin}>
          {[{ d: 0, x: -44, s: 5 }, { d: 500, x: 50, s: 4 }, { d: 900, x: -20, s: 6 }, { d: 300, x: 60, s: 3 }, { d: 700, x: -60, s: 4 }].map((p, i) => (
            <FloatParticle key={i} delay={p.d} x={p.x} size={p.s} />
          ))}
        </View>
      </View>

      {/* Stamp badge */}
      <View style={styles.stamp}>
        <Text style={styles.stampText}>⛔ PERMANENTLY BANNED</Text>
      </View>

      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        Your account has been permanently removed from XyloCart.{"\n"}
        This action cannot be reversed.
      </Text>

      {/* Ban reason card */}
      <View style={styles.reasonCard}>
        <View style={styles.reasonHeader}>
          <Text style={styles.reasonLabel}>BAN REASON</Text>
        </View>
        <Text style={styles.reasonText}>{banReason ?? "Violation of XyloCart terms of service"}</Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          If you believe this is an error, contact{" "}
          <Text style={{ color: "#EF4444" }}>support@xyloPcart.com</Text>{" "}
          with your registered email address and account details.
        </Text>
      </View>

      {onLogout && (
        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function BannedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Image source={require("@/assets/logo-nobg.png")} style={styles.topLogo} resizeMode="contain" />
      <BannedContent banReason={user?.banReason ?? undefined} onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  topLogo: { width: 90, height: 50, alignSelf: "center", marginBottom: 4, marginTop: 8 },
  root: { flex: 1, backgroundColor: "#030000", alignItems: "center" },
  center: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 16 },
  symbolStage: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  symbolWrap: { alignItems: "center", justifyContent: "center" },
  particleOrigin: { position: "absolute", bottom: 10, width: 1, height: 1, alignItems: "center" },
  outerCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#7F1D1D",
    borderWidth: 5, borderColor: "#DC2626",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#DC2626", shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  slashBar: {
    position: "absolute",
    width: 120, height: 10,
    backgroundColor: "#DC2626",
    borderRadius: 5,
    transform: [{ rotate: "-45deg" }],
    opacity: 0.9,
  },
  innerCircleOutline: {
    position: "absolute",
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 4, borderColor: "rgba(220,38,38,0.4)",
  },
  exclamWrap: { alignItems: "center", gap: 3 },
  exclamBar: {
    width: 10, height: 30,
    backgroundColor: "#FCA5A5",
    borderRadius: 5,
  },
  exclamDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#FCA5A5",
  },
  stamp: {
    backgroundColor: "rgba(220,38,38,0.12)",
    borderWidth: 2, borderColor: "rgba(220,38,38,0.4)",
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    transform: [{ rotate: "-2deg" }],
  },
  stampText: { fontSize: 12, fontFamily: "DMSans_700Bold", color: "#EF4444", letterSpacing: 1.2 },
  title: { fontSize: 26, fontFamily: "DMSans_700Bold", color: "#F1F5F9", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#64748B", textAlign: "center", lineHeight: 22 },
  reasonCard: {
    width: "100%", backgroundColor: "rgba(40,5,5,0.9)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,38,38,0.25)",
    padding: 14, gap: 8,
  },
  reasonHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reasonLabel: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#EF4444", letterSpacing: 1.2 },
  reasonText: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#94A3B8", lineHeight: 22 },
  disclaimer: {
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  disclaimerText: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#475569", textAlign: "center", lineHeight: 18 },
  logoutBtn: { paddingVertical: 10 },
  logoutText: { fontSize: 14, fontFamily: "DMSans_500Medium", color: "#374151" },
});
