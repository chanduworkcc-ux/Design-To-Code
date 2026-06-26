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

interface Order {
  id: string;
  userId: string;
  productId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  total: number;
  quantity: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: "#F59E0B", bg: "#FFFBEB", label: "Pending", icon: "clock" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", label: "Confirmed", icon: "check-circle" },
  shipped: { color: "#8B5CF6", bg: "#F5F3FF", label: "Shipped", icon: "truck" },
  delivered: { color: "#10B981", bg: "#ECFDF5", label: "Delivered", icon: "package" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", label: "Cancelled", icon: "x-circle" },
};

const STATUS_ORDER = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    try {
      const res = await apiRequest("/admin/orders");
      if (res.ok) { const d = await res.json(); setOrders(d.orders); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId);
    try {
      const res = await apiRequest(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        setExpandedId(null);
      }
    } catch {}
    setUpdatingId(null);
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Orders</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {["all", ...STATUS_ORDER].map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s];
          const n = s === "all" ? orders.length : (counts[s] ?? 0);
          return (
            <Pressable
              key={s}
              style={[styles.filterTab, filter === s && { backgroundColor: cfg?.color ?? "#2563EB" }]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterTabText, filter === s && { color: "#fff" }]}>
                {s === "all" ? `All (${n})` : `${cfg?.label} (${n})`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.center}>
              <Feather name="shopping-bag" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          )}
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const isExpanded = expandedId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <Pressable style={styles.orderHeader} onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                  <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.orderTotal}>₹{order.total.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.orderExpanded}>
                    <View style={styles.orderMeta}>
                      <Text style={styles.metaLabel}>Qty: <Text style={styles.metaValue}>{order.quantity}</Text></Text>
                      <Text style={styles.metaLabel}>Payment: <Text style={styles.metaValue}>{order.paymentMethod.toUpperCase()}</Text></Text>
                      <Text style={styles.metaLabel}>Pay Status: <Text style={styles.metaValue}>{order.paymentStatus}</Text></Text>
                    </View>
                    <Text style={styles.updateLabel}>Update Status:</Text>
                    <View style={styles.statusButtons}>
                      {STATUS_ORDER.filter((s) => s !== order.status).map((s) => {
                        const c = STATUS_CONFIG[s];
                        return (
                          <Pressable
                            key={s}
                            style={[styles.statusBtn, { backgroundColor: c.bg, borderColor: c.color, opacity: updatingId === order.id ? 0.5 : 1 }]}
                            onPress={() => updateStatus(order.id, s)}
                            disabled={updatingId === order.id}
                          >
                            <Text style={[styles.statusBtnText, { color: c.color }]}>{c.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 12 },
  orderCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  statusIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  orderId: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F1740" },
  orderDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  orderTotal: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  orderExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 12 },
  orderMeta: { flexDirection: "row", gap: 16 },
  metaLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  metaValue: { fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  updateLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  statusButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
