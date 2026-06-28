import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function LoginDevicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [security, setSecurity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/auth/me/security")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.security) setSecurity(d.security); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatDate(val: string | null | undefined) {
    if (!val) return "—";
    return new Date(val).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  }

  const platformLabel =
    Platform.OS === "ios" ? "iOS" :
    Platform.OS === "android" ? "Android" :
    "Web Browser";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Login Devices</Text>
        </View>

        {/* Current Device Card */}
        <View style={[styles.deviceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.deviceCardTop}>
            <View style={styles.deviceIconBig}>
              <Feather name={Platform.OS === "ios" ? "smartphone" : Platform.OS === "android" ? "smartphone" : "monitor"} size={28} color="#fff" />
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active Now</Text>
            </View>
          </View>
          <Text style={styles.deviceName}>{platformLabel}</Text>
          <Text style={styles.deviceSub}>Current session — this device</Text>
        </View>

        {/* Session Info */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SESSION DETAILS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
          ) : (
            <>
              <InfoRow label="Signed in as" value={user?.email ?? "—"} icon="user" />
              <InfoRow label="Platform" value={platformLabel} icon="monitor" />
              <InfoRow label="Account created" value={formatDate(security?.createdAt)} icon="calendar" />
              <InfoRow label="Registration IP" value={security?.registrationIp ?? "—"} icon="map-pin" />
              <InfoRow label="Last Login IP" value={security?.lastLoginIp ?? "—"} icon="globe" />
              <InfoRow label="Device UUID" value={security?.deviceUuid ? security.deviceUuid.slice(0, 24) + "…" : "—"} icon="cpu" />
            </>
          )}
        </View>

        <View style={[styles.noteCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={15} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            XyloCart currently supports one active session per device. If you believe your account was accessed from an unknown device, change your password immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  deviceCard: { borderRadius: 18, padding: 20, marginBottom: 20 },
  deviceCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  deviceIconBig: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4ADE80" },
  activeBadgeText: { color: "#fff", fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  deviceName: { color: "#fff", fontSize: 20, fontFamily: "DMSans_700Bold", marginBottom: 4 },
  deviceSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "DMSans_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "DMSans_500Medium" },
  noteCard: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 },
});
