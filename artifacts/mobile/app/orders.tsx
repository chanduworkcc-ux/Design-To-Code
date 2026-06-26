import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  address: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:   { color: "#F59E0B", bg: "#FFFBEB", icon: "clock",         label: "Pending" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", icon: "check",         label: "Confirmed" },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", icon: "truck",         label: "Shipped" },
  delivered: { color: "#10B981", bg: "#ECFDF5", icon: "check-circle",  label: "Delivered" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", icon: "x-circle",      label: "Cancelled" },
};

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    if (!user) { setLoading(false); return; }
    try {
      const res = await apiRequest("/orders");
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() { setRefreshing(true); await fetchOrders(); setRefreshing(false); }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function StatusTracker({ status }: { status: string }) {
    if (status === "cancelled") {
      return (
        <View style={[styles.cancelBanner, { backgroundColor: "#FEF2F2" }]}>
          <Feather name="x-circle" size={14} color="#EF4444" />
          <Text style={[styles.cancelText, { color: "#EF4444" }]}>Order Cancelled</Text>
        </View>
      );
    }
    const currentIdx = STATUS_STEPS.indexOf(status);
    return (
      <View style={styles.trackerRow}>
        {STATUS_STEPS.map((step, i) => {
          const cfg = STATUS_CONFIG[step];
          const done = i <= currentIdx;
          return (
            <React.Fragment key={step}>
              <View style={styles.trackerStep}>
                <View style={[styles.trackerDot, { backgroundColor: done ? cfg.color : "#E5E7EB", borderColor: done ? cfg.color : "#E5E7EB" }]}>
                  {done && <Feather name={cfg.icon as any} size={10} color="#fff" />}
                </View>
                <Text style={[styles.trackerLabel, { color: done ? cfg.color : "#9CA3AF" }]}>{cfg.label}</Text>
              </View>
              {i < STATUS_STEPS.length - 1 && (
                <View style={[styles.trackerLine, { backgroundColor: i < currentIdx ? STATUS_CONFIG[STATUS_STEPS[i]].color : "#E5E7EB" }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={styles.filterRow}>
        {[
          { key: "all", label: `All (${orders.length})` },
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "shipped", label: "Shipped" },
          { key: "delivered", label: "Delivered" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => {
          const cfg = tab.key === "all" ? null : STATUS_CONFIG[tab.key];
          const active = filter === tab.key;
          return (
            <Pressable key={tab.key} style={[styles.filterTab, active && { backgroundColor: cfg?.color ?? colors.primary }]} onPress={() => setFilter(tab.key)}>
              <Text style={[styles.filterTabText, active && { color: "#fff" }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!user ? (
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view orders</Text>
          <Pressable style={[styles.signInBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>Loading orders...</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.center}>
              <Feather name="package" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                {filter === "all" ? "You haven't placed any orders yet" : `No ${filter} orders`}
              </Text>
              {filter === "all" && (
                <Pressable style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)")}>
                  <Text style={styles.shopBtnText}>Start Shopping</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtered.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedId === order.id;
              const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const time = new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              return (
                <Pressable key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                  {/* Card Header */}
                  <View style={styles.cardTop}>
                    <View style={[styles.orderIcon, { backgroundColor: cfg.bg }]}>
                      <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.orderIdRow}>
                        <Text style={[styles.orderId, { color: colors.text }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>{date} at {time}</Text>
                      <Text style={[styles.orderItemCount, { color: colors.mutedForeground }]}>
                        {(order.items ?? []).length} item(s)
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.orderTotal, { color: colors.text }]}>₹{Number(order.total).toFixed(2)}</Text>
                      {order.couponCode && (
                        <Text style={[styles.couponLabel, { color: "#10B981" }]}>🏷 {order.couponCode}</Text>
                      )}
                    </View>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                  </View>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                      {/* Status Tracker */}
                      <StatusTracker status={order.status} />

                      {/* Items */}
                      <Text style={[styles.itemsLabel, { color: colors.mutedForeground }]}>ORDER ITEMS</Text>
                      {(order.items ?? []).map((item) => (
                        <View key={item.id} style={[styles.itemRow, { borderColor: colors.border }]}>
                          <View style={[styles.itemIcon, { backgroundColor: colors.accent }]}>
                            <Feather name="package" size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.productName ?? "Product"}</Text>
                            <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>Qty: {item.quantity}</Text>
                          </View>
                          <Text style={[styles.itemPrice, { color: colors.text }]}>₹{Number(item.price).toFixed(2)}</Text>
                        </View>
                      ))}

                      {/* Price Breakdown */}
                      <View style={[styles.priceBreakdown, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <View style={styles.priceRow}>
                          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                          <Text style={[styles.priceValue, { color: colors.text }]}>₹{Number(order.subtotal ?? order.total).toFixed(2)}</Text>
                        </View>
                        {Number(order.discount) > 0 && (
                          <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: "#10B981" }]}>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</Text>
                            <Text style={[styles.priceValue, { color: "#10B981" }]}>-₹{Number(order.discount).toFixed(2)}</Text>
                          </View>
                        )}
                        <View style={[styles.priceRow, styles.totalRow]}>
                          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                          <Text style={[styles.totalValue, { color: colors.primary }]}>₹{Number(order.total).toFixed(2)}</Text>
                        </View>
                      </View>

                      {/* Delivery Address */}
                      {order.address && (
                        <View style={[styles.addressBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.addressText, { color: colors.text }]}>{order.address}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  shopBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  signInBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  orderCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  orderIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  orderId: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  orderDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  orderItemCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  orderTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  couponLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 12 },
  trackerRow: { flexDirection: "row", alignItems: "center" },
  trackerStep: { alignItems: "center", gap: 4 },
  trackerDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  trackerLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  trackerLine: { flex: 1, height: 2, marginBottom: 14 },
  cancelBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  cancelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  itemsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  itemQty: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  priceBreakdown: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)", marginTop: 4 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  addressBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
});
