import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { FloatingOrb, PulsingRing } from "@/components/ThreeD";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:   { color: "#F59E0B", bg: "#FFFBEB", icon: "clock",        label: "Order Created" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", icon: "check",        label: "Confirmed"     },
  packed:    { color: "#F97316", bg: "#FFF7ED", icon: "box",          label: "Packed"        },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", icon: "truck",        label: "Shipped"       },
  delivered: { color: "#10B981", bg: "#ECFDF5", icon: "check-circle", label: "Delivered"     },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", icon: "x-circle",     label: "Cancelled"     },
};

const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];

interface TrackResult {
  id: string;
  displayId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
}

function StatusTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <View style={[styles.cancelBanner, { backgroundColor: "#FEF2F2" }]}>
        <Feather name="x-circle" size={14} color="#EF4444" />
        <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: "Inter_600SemiBold", marginLeft: 6 }}>
          Order Cancelled
        </Text>
      </View>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <View style={styles.verticalTracker}>
      {STATUS_STEPS.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const done = i <= currentIdx;
        const isActive = i === currentIdx;
        const isLast = i === STATUS_STEPS.length - 1;
        return (
          <View key={step} style={styles.vtStep}>
            <View style={styles.vtLeft}>
              <View style={[
                styles.vtDot,
                done ? { backgroundColor: cfg.color } : styles.vtDotEmpty,
              ]}>
                <Feather name={cfg.icon as any} size={13} color={done ? "#fff" : "#D1D5DB"} />
              </View>
              {!isLast && (
                <View style={[styles.vtLine, { backgroundColor: i < currentIdx ? cfg.color : "#E5E7EB" }]} />
              )}
            </View>
            <View style={styles.vtContent}>
              <Text style={[
                styles.vtLabel,
                { color: done ? cfg.color : "#9CA3AF", fontFamily: isActive ? "Inter_700Bold" : done ? "Inter_600SemiBold" : "Inter_400Regular" },
              ]}>
                {cfg.label}
              </Text>
              {isActive && (
                <View style={[styles.vtActiveBadge, { backgroundColor: cfg.bg }]}>
                  <View style={[styles.vtActiveDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.vtActiveText, { color: cfg.color }]}>Current Status</Text>
                </View>
              )}
              {done && !isActive && (
                <Text style={styles.vtDoneText}>Completed</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function TrackOrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTrack() {
    const clean = orderId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 6) {
      setError("Please enter at least 6 characters of your Order ID.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE_URL}/orders/track/${clean}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error ?? "Order not found. Please check the ID and try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  }

  const cfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pending) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Track Order</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero 3D section */}
          <View style={styles.heroSection}>
            <FloatingOrb color={colors.primary} size={140} style={{ top: -20, right: -20 }} amplitude={8} duration={3200} />
            <FloatingOrb color="#7C3AED" size={90} style={{ top: 40, left: -20 }} delay={600} amplitude={10} duration={2700} />
            <View style={styles.heroIcon}>
              <PulsingRing color={colors.primary} size={90} duration={2000} />
              <View style={[styles.heroIconCircle, { backgroundColor: colors.card }]}>
                <Feather name="package" size={34} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Track Your Order</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              Enter the Order ID shown in your order details to get live status updates
            </Text>
          </View>

          {/* Search input */}
          <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.searchLabel, { color: colors.mutedForeground }]}>ORDER ID</Text>
            <View style={styles.searchRow}>
              <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="hash" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. A1B2C3D4"
                  placeholderTextColor={colors.mutedForeground}
                  value={orderId}
                  onChangeText={(t) => { setOrderId(t); setError(null); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleTrack}
                  maxLength={8}
                />
                {orderId.length > 0 && (
                  <Pressable onPress={() => { setOrderId(""); setError(null); setResult(null); }}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[styles.trackBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleTrack}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="search" size={20} color="#fff" />}
              </Pressable>
            </View>
            <Text style={[styles.searchHint, { color: colors.mutedForeground }]}>
              Find your Order ID in My Orders — it's the 8-character code shown after #
            </Text>
          </View>

          {/* Error state */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Result card */}
          {!!result && !!cfg && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: cfg.color }]}>
              {/* Order Header */}
              <View style={[styles.resultHeader, { backgroundColor: cfg.bg }]}>
                <View style={[styles.resultIconBox, { backgroundColor: cfg.color + "20" }]}>
                  <Feather name={cfg.icon as any} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultOrderId, { color: colors.text }]}>#{result.displayId}</Text>
                  <Text style={[styles.resultDate, { color: colors.mutedForeground }]}>
                    Placed {new Date(result.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + "40", borderWidth: 1 }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Status Tracker */}
              <View style={styles.trackerSection}>
                <StatusTracker status={result.status} />
              </View>

              {/* Meta info */}
              <View style={[styles.metaGrid, { borderTopColor: colors.border }]}>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Total</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>₹{Number(result.total).toLocaleString("en-IN")}</Text>
                </View>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <View style={styles.metaItem}>
                  <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Payment</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>{result.paymentMethod.toUpperCase()}</Text>
                </View>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <View style={styles.metaItem}>
                  <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Pay Status</Text>
                  <Text style={[styles.metaVal, { color: result.paymentStatus === "paid" ? "#10B981" : "#F59E0B" }]}>
                    {result.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              {result.updatedAt !== result.createdAt && (
                <View style={[styles.lastUpdatedRow, { borderTopColor: colors.border }]}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.lastUpdatedText, { color: colors.mutedForeground }]}>
                    Status updated {timeAgo(result.updatedAt)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Order tracking is public — share your Order ID with anyone to let them check the status.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },

  heroSection: { alignItems: "center", paddingVertical: 28, gap: 10, overflow: "visible" },
  heroIcon: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heroIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },

  searchCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  searchLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  searchRow: { flexDirection: "row", gap: 10 },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 1, padding: 0 },
  trackBtn: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  searchHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, color: "#EF4444", fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },

  resultCard: { borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  resultIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultOrderId: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resultDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  trackerSection: { padding: 16 },
  cancelBanner: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, margin: 4 },
  verticalTracker: { paddingVertical: 4, paddingHorizontal: 2, gap: 0 },
  vtStep: { flexDirection: "row", gap: 14, alignItems: "flex-start", minHeight: 52 },
  vtLeft: { alignItems: "center", width: 32 },
  vtDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  vtDotEmpty: { backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB" },
  vtLine: { width: 2, flex: 1, marginTop: 4, minHeight: 20 },
  vtContent: { flex: 1, paddingTop: 5, paddingBottom: 8, gap: 4 },
  vtLabel: { fontSize: 14 },
  vtActiveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  vtActiveDot: { width: 6, height: 6, borderRadius: 3 },
  vtActiveText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vtDoneText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" },

  metaGrid: { flexDirection: "row", borderTopWidth: 1, padding: 14 },
  metaItem: { flex: 1, alignItems: "center", gap: 4 },
  metaKey: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metaDivider: { width: 1, marginVertical: 4 },
  lastUpdatedRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderTopWidth: 1 },
  lastUpdatedText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
