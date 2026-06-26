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

interface AnalyticsData {
  dailyOrders: { day: string; count: number; revenue: number }[];
  dailyUsers: { day: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { productId: string; name: string; orders: number; revenue: number }[];
  totalRevenue: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, flex: 1 }}>
      <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

function formatDay(dayStr: string) {
  const d = new Date(dayStr);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await apiRequest("/admin/analytics");
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const maxRevenue = Math.max(...(data?.dailyOrders.map((d) => d.revenue) ?? [1]));
  const maxOrders = Math.max(...(data?.dailyOrders.map((d) => d.count) ?? [1]));
  const maxUsers = Math.max(...(data?.dailyUsers.map((d) => d.count) ?? [1]));
  const totalOrderCount = data?.ordersByStatus.reduce((s, o) => s + o.count, 0) ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Revenue */}
          <View style={[styles.revCard, { backgroundColor: "#2563EB" }]}>
            <Text style={styles.revLabel}>Total Delivered Revenue</Text>
            <Text style={styles.revValue}>₹{data?.totalRevenue.toFixed(2) ?? "0.00"}</Text>
            <Text style={styles.revSub}>All-time from delivered orders</Text>
          </View>

          {/* Revenue Last 7 Days */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenue – Last 7 Days</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {data?.dailyOrders.length === 0 && (
                <Text style={styles.emptyText}>No orders in the last 7 days</Text>
              )}
              {data?.dailyOrders.map((d) => (
                <View key={d.day} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatDay(d.day)}</Text>
                  <MiniBar value={d.revenue} max={maxRevenue} color="#2563EB" />
                  <Text style={styles.barValue}>₹{d.revenue.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Orders Last 7 Days */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Orders – Last 7 Days</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {data?.dailyOrders.length === 0 && (
                <Text style={styles.emptyText}>No orders in the last 7 days</Text>
              )}
              {data?.dailyOrders.map((d) => (
                <View key={d.day} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatDay(d.day)}</Text>
                  <MiniBar value={d.count} max={maxOrders} color="#8B5CF6" />
                  <Text style={styles.barValue}>{d.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* New Users Last 7 Days */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Users – Last 7 Days</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {data?.dailyUsers.length === 0 && (
                <Text style={styles.emptyText}>No new users in the last 7 days</Text>
              )}
              {data?.dailyUsers.map((d) => (
                <View key={d.day} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatDay(d.day)}</Text>
                  <MiniBar value={d.count} max={maxUsers} color="#10B981" />
                  <Text style={styles.barValue}>{d.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Orders By Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Orders by Status</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {data?.ordersByStatus.map((o) => {
                const pct = totalOrderCount > 0 ? Math.round((o.count / totalOrderCount) * 100) : 0;
                const color = STATUS_COLORS[o.status] ?? "#6B7280";
                return (
                  <View key={o.status} style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <Text style={styles.statusLabel}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</Text>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <MiniBar value={o.count} max={totalOrderCount} color={color} />
                    </View>
                    <Text style={styles.statusCount}>{o.count} ({pct}%)</Text>
                  </View>
                );
              })}
              {totalOrderCount === 0 && <Text style={styles.emptyText}>No orders yet</Text>}
            </View>
          </View>

          {/* Top Products */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Products</Text>
            <View style={{ gap: 12, marginTop: 12 }}>
              {data?.topProducts.length === 0 && <Text style={styles.emptyText}>No product data yet</Text>}
              {data?.topProducts.map((p, i) => (
                <View key={p.productId} style={styles.productRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productSub}>{p.orders} orders</Text>
                  </View>
                  <Text style={styles.productRevenue}>₹{Number(p.revenue).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  content: { padding: 16, gap: 16 },
  revCard: { borderRadius: 16, padding: 20, gap: 4 },
  revLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_500Medium" },
  revValue: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" },
  revSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", padding: 16 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  emptyText: { color: "#9CA3AF", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 52, fontSize: 11, fontFamily: "Inter_500Medium", color: "#6B7280" },
  barValue: { width: 40, fontSize: 12, fontFamily: "Inter_700Bold", color: "#0F1740", textAlign: "right" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { width: 72, fontSize: 13, fontFamily: "Inter_500Medium", color: "#374151" },
  statusCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#6B7280", minWidth: 60, textAlign: "right" },
  productRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#2563EB" },
  productName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  productSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  productRevenue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#10B981" },
});
