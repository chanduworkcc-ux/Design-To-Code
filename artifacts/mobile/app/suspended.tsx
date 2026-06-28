import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
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

function pad(n: number) { return String(n).padStart(2, "0"); }

function getISTString(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCountdown(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function FlipUnit({ value, label }: { value: number; label: string }) {
  const prev = useRef(value);
  const sc = useSharedValue(1);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      sc.value = withSequence(
        withTiming(0.7, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(1.1, { duration: 160, easing: Easing.out(Easing.back(3)) }),
        withTiming(1, { duration: 100 }),
      );
      ty.value = withSequence(
        withTiming(-6, { duration: 100 }),
        withTiming(0, { duration: 260, easing: Easing.out(Easing.back(2)) }),
      );
    }
  }, [value]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { translateY: ty.value }],
  }));

  return (
    <View style={styles.unit}>
      <Animated.View style={[styles.unitBox, style]}>
        <Text style={styles.unitNum}>{pad(value)}</Text>
      </Animated.View>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const s = useSharedValue(0.5);
  const op = useSharedValue(0.6);
  useEffect(() => {
    s.value = withDelay(delay, withRepeat(withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.quad) }), -1));
    op.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2200, easing: Easing.out(Easing.quad) }), -1));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: op.value }));
  return (
    <Animated.View style={[{
      position: "absolute",
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: "#EF4444",
    }, style]} />
  );
}

function Lock3D() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const scl = useSharedValue(1);

  useEffect(() => {
    tiltX.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-14, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    tiltY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(18, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    scl.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
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
    <Animated.View style={[styles.lockWrap, style]}>
      {/* Lock shackle (arch on top) */}
      <View style={styles.shackleOuter}>
        <View style={styles.shackleInner} />
      </View>
      {/* Lock body */}
      <View style={styles.lockBody}>
        <View style={styles.keyhole}>
          <View style={styles.keyholeCircle} />
          <View style={styles.keyholeBar} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function SuspendedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  const suspendedUntil = user?.suspendedUntil ? new Date(user.suspendedUntil) : null;
  const reason = user?.banReason ?? "Suspended by administrator";

  const [remaining, setRemaining] = useState(() =>
    suspendedUntil ? Math.max(0, suspendedUntil.getTime() - Date.now()) : 0,
  );

  useEffect(() => {
    const tick = setInterval(() => {
      const ms = suspendedUntil ? Math.max(0, suspendedUntil.getTime() - Date.now()) : 0;
      setRemaining(ms);
      if (ms <= 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [suspendedUntil]);

  const { days, hours, minutes, seconds } = formatCountdown(remaining);
  const isExpired = remaining <= 0;

  async function handleCheckStatus() {
    await refreshUser();
    router.replace("/(tabs)");
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        {/* 3D Lock */}
        <View style={styles.lockStage}>
          <PulseRing delay={0} size={180} />
          <PulseRing delay={900} size={180} />
          <Lock3D />
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>ACCOUNT SUSPENDED</Text>
        </View>

        <Text style={styles.title}>
          {isExpired ? "Suspension Ended" : "Account Suspended"}
        </Text>
        <Text style={styles.subtitle}>
          {isExpired
            ? "Your suspension has ended. Tap 'Check Status' to regain access."
            : "Your account has been temporarily restricted."}
        </Text>

        {/* IST Countdown */}
        {!isExpired && (
          <View style={styles.countdownWrap}>
            <Text style={styles.countdownLabel}>Time remaining (IST)</Text>
            <View style={styles.countdownRow}>
              <FlipUnit value={days} label="DAYS" />
              <Text style={styles.colon}>:</Text>
              <FlipUnit value={hours} label="HRS" />
              <Text style={styles.colon}>:</Text>
              <FlipUnit value={minutes} label="MIN" />
              <Text style={styles.colon}>:</Text>
              <FlipUnit value={seconds} label="SEC" />
            </View>
          </View>
        )}

        {/* Details card */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Reason</Text>
            <Text style={styles.detailVal}>{reason}</Text>
          </View>
          {suspendedUntil && (
            <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: "rgba(239,68,68,0.15)", paddingTop: 10 }]}>
              <Text style={styles.detailKey}>Unbanned at</Text>
              <Text style={[styles.detailVal, { color: "#F87171" }]}>{getISTString(suspendedUntil)}</Text>
            </View>
          )}
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            If you believe this is an error, contact XyloCart support with your registered email.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, { backgroundColor: isExpired ? "#10B981" : "#2563EB", opacity: pressed ? 0.85 : 1 }]}
          onPress={handleCheckStatus}
        >
          <Text style={styles.btnText}>{isExpired ? "Regain Access" : "Check Status"}</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0000", alignItems: "center" },
  center: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 16 },
  lockStage: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  lockWrap: { alignItems: "center" },
  shackleOuter: {
    width: 52, height: 34, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 8, borderBottomWidth: 0, borderColor: "#EF4444",
    alignItems: "center", justifyContent: "flex-start",
    overflow: "hidden",
  },
  shackleInner: {
    width: 18, height: 26, borderTopLeftRadius: 9, borderTopRightRadius: 9,
    backgroundColor: "#0A0000", marginTop: 4,
  },
  lockBody: {
    width: 72, height: 58, borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#EF4444", shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  keyhole: { alignItems: "center", gap: 0 },
  keyholeCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  keyholeBar: {
    width: 8, height: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    backgroundColor: "rgba(0,0,0,0.4)", marginTop: -2,
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(239,68,68,0.15)", paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  badgeText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#EF4444", letterSpacing: 1.5 },
  title: { fontSize: 24, fontFamily: "DMSans_700Bold", color: "#F1F5F9", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#64748B", textAlign: "center", lineHeight: 22 },
  countdownWrap: { alignItems: "center", gap: 8 },
  countdownLabel: { fontSize: 11, fontFamily: "DMSans_500Medium", color: "#64748B", letterSpacing: 0.8 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  colon: { fontSize: 24, fontFamily: "DMSans_700Bold", color: "#EF4444", marginBottom: 20 },
  unit: { alignItems: "center", gap: 4 },
  unitBox: {
    width: 60, height: 64, borderRadius: 12,
    backgroundColor: "#1A0505", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#EF4444", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  unitNum: { fontSize: 24, fontFamily: "DMSans_700Bold", color: "#EF4444" },
  unitLabel: { fontSize: 9, fontFamily: "DMSans_700Bold", color: "#475569", letterSpacing: 0.8 },
  detailCard: {
    width: "100%", backgroundColor: "rgba(30,10,10,0.8)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    padding: 14, gap: 10,
  },
  detailRow: { gap: 4 },
  detailKey: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#6B7280", letterSpacing: 0.5 },
  detailVal: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#94A3B8", lineHeight: 20 },
  helpBox: {
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  helpText: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#475569", textAlign: "center", lineHeight: 18 },
  btn: { width: "100%", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 15 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  logoutBtn: { paddingVertical: 8 },
  logoutText: { fontSize: 14, fontFamily: "DMSans_500Medium", color: "#374151" },
});
