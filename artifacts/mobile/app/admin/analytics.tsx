import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

interface AnalyticsData {
  dailyOrders: { day: string; count: number; revenue: number }[];
  dailyUsers: { day: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { productId: string; name: string; orders: number; revenue: number }[];
  totalRevenue: number;
}

interface LiveCounters {
  newOrders: number;
  cartAdds: number;
  activeUsers: number;
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

function LiveCounter({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const scale = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1, { duration: 200 }),
      );
      prevValue.current = value;
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[liveStyles.counter, { borderColor: color + "30" }]}>
      <View style={[liveStyles.iconWrap, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Animated.Text style={[liveStyles.value, { color }, animStyle]}>
        {value}
      </Animated.Text>
      <Text style={liveStyles.label}>{label}</Text>
    </View>
  );
}

const liveStyles = StyleSheet.create({
  counter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  label: { fontSize: 11, fontFamily: "DMSans_500Medium", color: "#6B7280", textAlign: "center" },
});

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const { socket } = useSocket();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState<LiveCounters>({ newOrders: 0, cartAdds: 0, activeUsers: 0 });
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("admin:join");

    const onNewOrder = () => {
      setLive((prev) => ({ ...prev, newOrders: prev.newOrders + 1 }));
      fetchData();
    };
    const onCartAdd = () => {
      setLive((prev) => ({ ...prev, cartAdds: prev.cartAdds + 1 }));
    };
    const onUserOnline = () => {
      setLive((prev) => ({ ...prev, activeUsers: prev.activeUsers + 1 }));
    };
    const onUserOffline = () => {
      setLive((prev) => ({ ...prev, activeUsers: Math.max(0, prev.activeUsers - 1) }));
    };

    socket.on("new_order", onNewOrder);
    socket.on("user:cart_add", onCartAdd);
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);

    return () => {
      socket.off("new_order", onNewOrder);
      socket.off("user:cart_add", onCartAdd);
      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
    };
  }, [socket]);

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
          {/* Live Activity */}
          <View style={styles.card}>
            <View style={styles.liveHeader}>
              <Text style={styles.cardTitle}>Live Activity</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Real-time</Text>
              </View>
            </View>
            <View style={styles.liveRow}>
              <LiveCounter label="New Orders" value={live.newOrders} color="#10B981" icon="shopping-bag" />
              <LiveCounter label="Cart Adds" value={live.cartAdds} color="#3B82F6" icon="shopping-cart" />
              <LiveCounter label="Online Now" value={live.activeUsers} color="#F59E0B" icon="users" />
            </View>
          </View>

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

          {/* Orders by Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Orders by Status</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {data?.ordersByStatus.map((o) => (
                <View key={o.status} style={styles.barRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, width: 80 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLORS[o.status] ?? "#9CA3AF" }} />
                    <Text style={styles.barLabel}>{o.status}</Text>
                  </View>
                  <MiniBar value={o.count} max={totalOrderCount} color={STATUS_COLORS[o.status] ?? "#9CA3AF"} />
                  <Text style={styles.barValue}>{o.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top Products */}
          {(data?.topProducts.length ?? 0) > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Products</Text>
              <View style={{ gap: 12, marginTop: 12 }}>
                {data?.topProducts.map((p, i) => (
                  <View key={p.productId} style={styles.productRow}>
                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? "#FEF9C3" : "#F3F4F6" }]}>
                      <Text style={[styles.rankText, { color: i === 0 ? "#B45309" : "#6B7280" }]}>#{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.productSub}>{p.orders} orders · ₹{p.revenue.toFixed(0)} revenue</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#6B7280" },
  content: { padding: 16, gap: 16 },
  liveHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  liveText: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#10B981" },
  liveRow: { flexDirection: "row", gap: 10 },
  revCard: { borderRadius: 18, padding: 24, gap: 4 },
  revLabel: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "rgba(255,255,255,0.75)" },
  revValue: { fontSize: 34, fontFamily: "DMSans_700Bold", color: "#fff" },
  revSub: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: "DMSans_600SemiBold", color: "#0F1740" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#6B7280", width: 52 },
  barValue: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#0F1740", width: 46, textAlign: "right" },
  emptyText: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#9CA3AF", textAlign: "center", paddingVertical: 8 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  productName: { fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#0F1740" },
  productSub: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#6B7280", marginTop: 2 },
});
