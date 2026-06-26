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
  pending:   { color: "#F59E0B", bg: "#FFFBEB", label: "Order Created",   icon: "clock" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", label: "Order Accepted",  icon: "check-circle" },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", label: "Order Shipped",   icon: "truck" },
  delivered: { color: "#10B981", bg: "#ECFDF5", label: "Order Delivered", icon: "package" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", label: "Cancelled",       icon: "x-circle" },
};

// Linear pipeline — admin can ONLY advance to the next stage, never skip or reverse.
// pending → confirmed → shipped → delivered  (cancelled only from pending)
const STATUS_ORDER = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function getNextStatus(current: string): string | null {
  const pipeline = ["pending", "confirmed", "shipped", "delivered"];
  const idx = pipeline.indexOf(current);
  if (idx === -1 || idx === pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

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
  const [notification, setNotification] = useState<{ title: string; body: string; orderId: string } | null>(null);
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
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        setExpandedId(null);
        if (data.notification) {
          setNotification({ ...data.notification, orderId });
          setTimeout(() => setNotification(null), 8000);
        }
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

      {/* Notification preview — appears after each admin status update */}
      {!!notification && (
        <View style={styles.notifBanner}>
          <View style={styles.notifIcon}>
            <Feather name="bell" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.notifLabel}>Auto-Notification Dispatched to Customer</Text>
            <Text style={styles.notifTitle}>{notification.title}</Text>
            <Text style={styles.notifBody} numberOfLines={3}>{notification.body}</Text>
          </View>
          <Pressable onPress={() => setNotification(null)}>
            <Feather name="x" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

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

                    {/* Admin Full Override — advance pipeline OR cancel at any stage */}
                    {order.status !== "delivered" && order.status !== "cancelled" && (() => {
                      const next = getNextStatus(order.status);
                      const nextCfg = next ? STATUS_CONFIG[next] : null;
                      return (
                        <View style={{ gap: 8 }}>
                          <Text style={styles.updateLabel}>Admin Actions:</Text>
                          <View style={styles.statusButtons}>
                            {next && nextCfg && (
                              <Pressable
                                style={[styles.statusBtn, { backgroundColor: nextCfg.bg, borderColor: nextCfg.color, flex: 1, opacity: updatingId === order.id ? 0.5 : 1 }]}
                                onPress={() => updateStatus(order.id, next)}
                                disabled={updatingId === order.id}
                              >
                                <Feather name={nextCfg.icon as any} size={14} color={nextCfg.color} />
                                <Text style={[styles.statusBtnText, { color: nextCfg.color }]}>
                                  Mark as {nextCfg.label}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                          {/* Admin cancel override — available at ANY active stage */}
                          <Pressable
                            style={[styles.statusBtn, { backgroundColor: "#FEF2F2", borderColor: "#EF4444", opacity: updatingId === order.id ? 0.5 : 1 }]}
                            onPress={() => updateStatus(order.id, "cancelled")}
                            disabled={updatingId === order.id}
                          >
                            <Feather name="x-circle" size={14} color="#EF4444" />
                            <Text style={[styles.statusBtnText, { color: "#EF4444" }]}>Cancel Order (Admin Override)</Text>
                          </Pressable>
                        </View>
                      );
                    })()}

                    {(order.status === "delivered" || order.status === "cancelled") && (
                      <View style={styles.lockNotice}>
                        <Feather name="check-circle" size={12} color="#6B7280" />
                        <Text style={styles.lockText}>
                          {order.status === "delivered" ? "Order lifecycle complete." : "Order cancelled — no further actions."}
                        </Text>
                      </View>
                    )}
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
  statusBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  lockNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10 },
  lockText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", flex: 1 },
  notifBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1E3A5F",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2563EB",
  },
  notifIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  notifLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#93C5FD", letterSpacing: 0.6, textTransform: "uppercase" },
  notifTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 1 },
  notifBody: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#CBD5E1", lineHeight: 16, marginTop: 2 },
});
