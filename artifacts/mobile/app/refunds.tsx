import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Order {
  id: string;
  orderNumber: string | null;
  productName: string | null;
  productImage: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  quantity: number;
  cancellationReason: string | null;
  utrNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

const BANK_DISCLAIMER = `Disclaimer: Refunds for orders cancelled by the admin will be processed to the original payment source within 5–7 business days. The UTR (Unique Transaction Reference) number provided above is for your reference and tracking purposes only. XyloCart is not responsible for delays caused by banking systems or intermediary parties. For disputes, please contact your bank using the UTR number. Cash-on-delivery (COD) orders are not eligible for monetary refunds; a wallet credit will be issued instead.`;

export default function RefundsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, apiRequest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const fetchOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await apiRequest("/orders");
      if (res.ok) {
        const d = await res.json();
        const all: Order[] = d.orders ?? [];
        setOrders(all.filter((o) => o.status === "cancelled"));
      }
    } catch {}
    setLoading(false);
  }, [user, apiRequest]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Refunds & Returns</Text>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view refunds</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login" as any)}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Refunds & Returns</Text>
        <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
        <Feather name="info" size={13} color="#EA580C" />
        <Text style={[styles.infoBannerText, { color: "#C2410C" }]}>
          Cancelled orders are shown here. The UTR number (if provided) confirms your refund has been initiated by the admin.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {orders.length === 0 ? (
            <View style={styles.center}>
              <View style={[styles.emptyIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="check-circle" size={36} color="#10B981" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No cancelled orders</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                You have no cancelled orders at this time.
              </Text>
            </View>
          ) : (
            <>
              {orders.map((order) => (
                <View key={order.id} style={[styles.card, { backgroundColor: colors.card, borderColor: "#FECACA" }]}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.orderId, { color: colors.primary }]}>
                        {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                      </Text>
                      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                        {order.productName ?? "Product"}
                      </Text>
                    </View>
                    <View style={styles.cancelBadge}>
                      <Feather name="x-circle" size={12} color="#EF4444" />
                      <Text style={styles.cancelBadgeText}>Cancelled</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Details Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Order Date</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Amount</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>₹{Number(order.total).toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Payment</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{order.paymentMethod.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Cancellation Reason */}
                  {!!order.cancellationReason && (
                    <View style={styles.reasonBanner}>
                      <Feather name="alert-circle" size={13} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reasonLabel}>Cancellation Reason</Text>
                        <Text style={styles.reasonText}>{order.cancellationReason}</Text>
                      </View>
                    </View>
                  )}

                  {/* UTR Number */}
                  {!!order.utrNumber && (
                    <View style={styles.utrBanner}>
                      <Feather name="hash" size={13} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.utrLabel}>UTR Number (Refund Reference)</Text>
                        <Text style={styles.utrValue}>{order.utrNumber}</Text>
                      </View>
                    </View>
                  )}

                  {/* Bank Disclaimer */}
                  <View style={[styles.disclaimerBox, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
                    <View style={styles.disclaimerHeader}>
                      <Feather name="shield" size={12} color="#92400E" />
                      <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
                    </View>
                    <Text style={styles.disclaimerText}>{BANK_DISCLAIMER}</Text>
                  </View>

                  <Pressable
                    style={[styles.supportBtn, { borderColor: colors.primary }]}
                    onPress={() => router.push("/support-ticket" as any)}
                  >
                    <Feather name="life-buoy" size={14} color={colors.primary} />
                    <Text style={[styles.supportBtnText, { color: colors.primary }]}>Contact Support</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerLogo: { width: 32, height: 32 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, margin: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoBannerText: { flex: 1, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 17 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold", textAlign: "center" },
  emptyBody: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", maxWidth: 240, lineHeight: 20 },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden", padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderId: { fontSize: 13, fontFamily: "DMSans_700Bold", marginBottom: 2 },
  productName: { fontSize: 14, fontFamily: "DMSans_500Medium", lineHeight: 20 },
  cancelBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cancelBadgeText: { color: "#EF4444", fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  divider: { height: 1 },
  detailsRow: { flexDirection: "row", gap: 16 },
  detailItem: { gap: 2 },
  detailLabel: { fontSize: 10, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 },
  detailValue: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  reasonBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: 10, backgroundColor: "#FEF2F2" },
  reasonLabel: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#991B1B", letterSpacing: 0.5, marginBottom: 2 },
  reasonText: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#991B1B", lineHeight: 17 },
  utrBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: 10, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  utrLabel: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#065F46", letterSpacing: 0.5, marginBottom: 2 },
  utrValue: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#059669", letterSpacing: 1 },
  disclaimerBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  disclaimerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  disclaimerTitle: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#92400E" },
  disclaimerText: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#92400E", lineHeight: 17 },
  supportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  supportBtnText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
});
