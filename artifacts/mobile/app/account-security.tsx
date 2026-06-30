import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

function SecurityItem({
  icon, label, description, status, statusColor, onPress,
}: {
  icon: string; label: string; description: string;
  status: string; statusColor: string; onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.secItem, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed && onPress ? 0.8 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.secIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.secLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.secDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>
      {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />}
    </Pressable>
  );
}

export default function AccountSecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
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

  const accountAge = security?.createdAt
    ? Math.floor((Date.now() - new Date(security.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
          <Text style={[styles.title, { color: colors.text }]}>Account Security</Text>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>

        {/* Score Card */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 20 }} />
        ) : (
          <View style={[styles.scoreCard, { backgroundColor: colors.primary }]}>
            <View>
              <Text style={styles.scoreLabel}>Security Score</Text>
              <Text style={styles.scoreValue}>Good</Text>
              <Text style={styles.scoreSub}>
                {accountAge !== null ? `Account ${accountAge}d old` : "Account active"}
              </Text>
            </View>
            <View style={styles.shieldWrap}>
              <Feather name="shield" size={48} color="rgba(255,255,255,0.25)" />
              <View style={styles.shieldCheck}>
                <Feather name="check" size={16} color="#fff" />
              </View>
            </View>
          </View>
        )}

        {/* Security Items */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROTECTION</Text>
        <View style={styles.itemsList}>
          <SecurityItem
            icon="lock"
            label="Password"
            description="Use a strong, unique password for your account"
            status="Set"
            statusColor="#10B981"
            onPress={() => router.push("/change-password" as any)}
          />
          <SecurityItem
            icon="shield"
            label="Two-Factor Authentication"
            description="Add a second layer of protection to your account"
            status="Coming Soon"
            statusColor="#F59E0B"
          />
          <SecurityItem
            icon="mail"
            label="Email Verification"
            description="Your email address is verified"
            status="Verified"
            statusColor="#10B981"
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTIVITY</Text>
        <View style={styles.itemsList}>
          <SecurityItem
            icon="smartphone"
            label="Login Devices"
            description="View devices that have accessed your account"
            status="1 Active"
            statusColor="#2563EB"
            onPress={() => router.push("/login-devices" as any)}
          />
          <SecurityItem
            icon="map-pin"
            label="Last Login IP"
            description={security?.lastLoginIp ?? "No login recorded"}
            status="Logged"
            statusColor="#6B7280"
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <View style={[styles.dangerCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <Feather name="alert-triangle" size={18} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Suspicious Activity?</Text>
            <Text style={styles.dangerDesc}>If you notice any unauthorised access, change your password immediately and contact support.</Text>
          </View>
        </View>
        <Pressable
          style={[styles.changePassBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => router.push("/change-password" as any)}
        >
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={[styles.changePassText, { color: colors.primary }]}>Change Password Now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "DMSans_700Bold", flex: 1 },
  headerLogo: { width: 32, height: 32 },
  scoreCard: { borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  scoreLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 4 },
  scoreValue: { color: "#fff", fontSize: 28, fontFamily: "DMSans_700Bold" },
  scoreSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 4 },
  shieldWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  shieldCheck: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", bottom: -4, right: -4 },
  sectionLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 4, marginLeft: 4 },
  itemsList: { gap: 8, marginBottom: 16 },
  secItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  secIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  secLabel: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  secDesc: { fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  dangerCard: { flexDirection: "row", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "flex-start", marginBottom: 10 },
  dangerTitle: { color: "#991B1B", fontSize: 14, fontFamily: "DMSans_600SemiBold", marginBottom: 4 },
  dangerDesc: { color: "#B91C1C", fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 19 },
  changePassBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1, marginBottom: 16 },
  changePassText: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
});
