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

interface Gateway {
  key: string;
  label: string;
  desc: string;
  icon: string;
  enabled: boolean;
}

export default function PaymentMethodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await apiRequest("/config");
      if (res.ok) {
        const d = await res.json();
        const cfg = d.config ?? {};
        setGateways([
          {
            key: "cod",
            label: "Cash on Delivery",
            desc: "Pay with cash when your order arrives at your doorstep.",
            icon: "dollar-sign",
            enabled: cfg.cod_enabled !== "false",
          },
          {
            key: "razorpay",
            label: "Razorpay",
            desc: "Pay securely using UPI, cards, net banking, or wallets via Razorpay.",
            icon: "zap",
            enabled: cfg.razorpay_enabled === "true",
          },
          {
            key: "phonepe",
            label: "PhonePe",
            desc: "Pay using PhonePe UPI or linked bank account.",
            icon: "smartphone",
            enabled: cfg.phonepe_enabled === "true",
          },
        ]);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Methods</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Payment methods accepted on XyloCart. Available options are enabled by the store admin.
          </Text>

          {gateways.map((gw) => (
            <View
              key={gw.key}
              style={[styles.card, { backgroundColor: colors.card, borderColor: gw.enabled ? colors.border : colors.border, opacity: gw.enabled ? 1 : 0.5 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: gw.enabled ? colors.accent : colors.secondary }]}>
                <Feather name={gw.icon as any} size={22} color={gw.enabled ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardLabel, { color: colors.text }]}>{gw.label}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: gw.enabled ? "#ECFDF5" : "#FEF2F2" }]}>
                    <Text style={[styles.statusText, { color: gw.enabled ? "#10B981" : "#EF4444" }]}>
                      {gw.enabled ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{gw.desc}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.infoBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              All transactions are secured with 256-bit SSL encryption.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  card: { flexDirection: "row", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  cardLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
