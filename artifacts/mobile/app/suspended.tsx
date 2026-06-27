import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const { width: W } = Dimensions.get("window");

function formatCountdown(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function CountUnit({ value, label }: { value: number; label: string }) {
  const prev = useRef(value);
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      flip.setValue(0);
      Animated.timing(flip, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [value]);

  const scale = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1.08, 1] });

  return (
    <View style={styles.unit}>
      <Animated.View style={[styles.unitBox, { transform: [{ scale }] }]}>
        <Text style={styles.unitNum}>{pad(value)}</Text>
      </Animated.View>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
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
    if (user?.status === "active") {
      router.replace("/(tabs)");
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="slash" size={44} color="#EF4444" />
        </View>

        <Text style={styles.title}>Account Suspended</Text>
        <Text style={styles.sub}>
          {isExpired
            ? "Your suspension period has ended. Tap 'Check Status' to regain access."
            : "Your account has been temporarily restricted. Please wait for the suspension to lift."}
        </Text>

        {!isExpired && (
          <View style={styles.countdownRow}>
            <CountUnit value={days} label="DAYS" />
            <Text style={styles.colon}>:</Text>
            <CountUnit value={hours} label="HRS" />
            <Text style={styles.colon}>:</Text>
            <CountUnit value={minutes} label="MIN" />
            <Text style={styles.colon}>:</Text>
            <CountUnit value={seconds} label="SEC" />
          </View>
        )}

        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <Feather name="file-text" size={16} color="#B45309" />
            <Text style={styles.reasonHeaderText}>Suspension Reason</Text>
          </View>
          <Text style={styles.reasonText}>{reason}</Text>
          {suspendedUntil && (
            <Text style={styles.reasonUntil}>
              Suspended until: {suspendedUntil.toLocaleString("en-IN", {
                dateStyle: "long", timeStyle: "short",
              })}
            </Text>
          )}
        </View>

        <View style={styles.helpBox}>
          <Feather name="info" size={14} color="#6B7280" />
          <Text style={styles.helpText}>
            If you believe this is an error, please contact XyloCart support with your registered email.
          </Text>
        </View>

        <Pressable style={[styles.btn, { backgroundColor: isExpired ? "#10B981" : "#2563EB" }]} onPress={handleCheckStatus}>
          <Feather name="refresh-cw" size={18} color="#fff" />
          <Text style={styles.btnText}>{isExpired ? "Regain Access" : "Check Status"}</Text>
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color="#9CA3AF" />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  content: { width: W - 40, alignItems: "center", gap: 20 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FECACA",
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#0F1740", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  colon: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#EF4444", marginBottom: 18 },
  unit: { alignItems: "center", gap: 6 },
  unitBox: {
    width: 64, height: 68, borderRadius: 14,
    backgroundColor: "#fff", borderWidth: 2, borderColor: "#FECACA",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#EF4444", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  unitNum: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#EF4444" },
  unitLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#9CA3AF", letterSpacing: 0.8 },
  reasonCard: {
    width: "100%", backgroundColor: "#FFFBEB", borderRadius: 14,
    borderWidth: 1, borderColor: "#FDE68A", padding: 16, gap: 8,
  },
  reasonHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reasonHeaderText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#B45309" },
  reasonText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#78350F", lineHeight: 20 },
  reasonUntil: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#92400E" },
  helpBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 12 },
  helpText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", flex: 1, lineHeight: 18 },
  btn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  logoutText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#9CA3AF" },
});
