import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import LoadingScreen from "@/components/LoadingScreen";

interface Order {
  id: string;
  productId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  serviceCharge: number;
  maintenanceCharge: number;
  discountAmount: number;
  quantity: number;
  shippingAddress: string | null;
  couponId: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:   { color: "#F59E0B", bg: "#FFFBEB", icon: "clock",        label: "Order Created" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", icon: "check",        label: "Order Accepted" },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", icon: "truck",        label: "Order Shipped" },
  delivered: { color: "#10B981", bg: "#ECFDF5", icon: "check-circle", label: "Order Delivered" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", icon: "x-circle",     label: "Cancelled" },
};

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

const POLL_INTERVAL_MS = 10_000;

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function AnimatedTrackerDot({ color, icon, isActive, done }: { color: string; icon: string; isActive: boolean; done: boolean }) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ), -1, false
      );
      ringScale.value = withRepeat(
        withTiming(2, { duration: 1400, easing: Easing.out(Easing.quad) }),
        -1, false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 200 }),
          withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) }),
        ), -1, false
      );
    }
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { perspective: 300 }, { rotateX: isActive ? `${scale.value * 5}deg` : "0deg" }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const bg = done ? color : "#E5E7EB";
  return (
    <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
      {isActive && (
        <Animated2.View style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: 14, borderWidth: 2, borderColor: color },
          ringStyle,
        ]} />
      )}
      <Animated2.View style={[
        styles.trackerDot,
        { backgroundColor: bg, borderColor: bg },
        dotStyle,
      ]}>
        {done && <Feather name={icon as any} size={10} color="#fff" />}
      </Animated2.View>
    </View>
  );
}

function StatusTracker({ status }: { status: string }) {
  const colors = useColors();
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
        const isActive = i === currentIdx;
        return (
          <React.Fragment key={step}>
            <View style={styles.trackerStep}>
              <AnimatedTrackerDot color={cfg.color} icon={cfg.icon} isActive={isActive} done={done} />
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

function PriceRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const colors = useColors();
  if (value === 0) return null;
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, { color: highlight ? "#10B981" : colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.priceValue, { color: highlight ? "#10B981" : colors.text }]}>
        {highlight ? "-" : ""}₹{Number(value).toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

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
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [updateBanner, setUpdateBanner] = useState<string | null>(null);

  const highlightAnims = useRef<Record<string, Animated.Value>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevOrdersRef = useRef<Order[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const getHighlightAnim = useCallback((id: string) => {
    if (!highlightAnims.current[id]) {
      highlightAnims.current[id] = new Animated.Value(0);
    }
    return highlightAnims.current[id];
  }, []);

  const flashHighlight = useCallback((id: string) => {
    const anim = getHighlightAnim(id);
    anim.setValue(1);
    Animated.timing(anim, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [getHighlightAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!user) { setLoading(false); return; }
    if (!silent) setIsPolling(true);
    try {
      const res = await apiRequest("/orders");
      if (res.ok) {
        const d = await res.json();
        const incoming: Order[] = d.orders ?? [];
        const prev = prevOrdersRef.current;

        const newlyChanged = new Set<string>();
        const statusChangedNames: string[] = [];

        incoming.forEach((order) => {
          const old = prev.find((o) => o.id === order.id);
          if (old && old.status !== order.status) {
            newlyChanged.add(order.id);
            statusChangedNames.push(
              `Order #${order.id.slice(0, 6).toUpperCase()} → ${STATUS_CONFIG[order.status]?.label ?? order.status}`
            );
            flashHighlight(order.id);
          }
        });

        if (newlyChanged.size > 0) {
          setChangedIds((prev) => new Set([...prev, ...newlyChanged]));
          setUpdateBanner(statusChangedNames.join(", "));
          setTimeout(() => setUpdateBanner(null), 5000);
        }

        prevOrdersRef.current = incoming;
        setOrders(incoming);
        setLastPolledAt(new Date());
      }
    } catch {}
    setLoading(false);
    setIsPolling(false);
  }, [user, apiRequest, flashHighlight]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!user) return;
    pollIntervalRef.current = setInterval(() => {
      fetchOrders(true);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user, fetchOrders]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }


  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>

        {/* Live badge */}
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <Pressable onPress={() => fetchOrders()} disabled={isPolling}>
          {isPolling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Poll info bar */}
      {lastPolledAt && (
        <View style={[styles.pollBar, { backgroundColor: colors.accent }]}>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.pollText, { color: colors.mutedForeground }]}>
            Auto-refreshing every 10s · Last checked {timeAgo(lastPolledAt.toISOString())}
          </Text>
        </View>
      )}

      {/* Update banner */}
      {!!updateBanner && (
        <View style={styles.updateBanner}>
          <Feather name="bell" size={14} color="#fff" />
          <Text style={styles.updateBannerText} numberOfLines={1}>{updateBanner}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { key: "all", label: `All (${orders.length})` },
          { key: "pending",   label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "shipped",   label: "Shipped" },
          { key: "delivered", label: "Delivered" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => {
          const cfg = tab.key === "all" ? null : STATUS_CONFIG[tab.key];
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, active && { backgroundColor: cfg?.color ?? colors.primary }]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, active && { color: "#fff" }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!user ? (
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view orders</Text>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login" as any)}>
            <Text style={styles.actionBtnText}>Sign In</Text>
          </Pressable>
        </View>
      ) : loading ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
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
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)" as any)}>
                  <Text style={styles.actionBtnText}>Start Shopping</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtered.map((order, orderIdx) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedId === order.id;
              const isChanged = changedIds.has(order.id);
              const hlAnim = getHighlightAnim(order.id);
              const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const time = new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              const updatedAgo = timeAgo(order.updatedAt);

              return (
                <Animated.View
                  key={order.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hlAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [colors.border, cfg.color],
                      }),
                      shadowColor: hlAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["transparent", cfg.color],
                      }) as any,
                      shadowOpacity: hlAnim as any,
                      shadowRadius: 8,
                      elevation: isChanged ? 4 : 1,
                    },
                  ]}
                >
                  <Pressable onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                    <View style={styles.cardTop}>
                      <View style={[styles.orderIcon, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.orderIdRow}>
                          <Text style={[styles.orderId, { color: colors.text }]}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          {isChanged && (
                            <View style={styles.updatedPill}>
                              <Text style={styles.updatedPillText}>Updated</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                          {date} at {time}
                        </Text>
                        {order.updatedAt !== order.createdAt && (
                          <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
                            Status updated {updatedAgo}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[styles.orderTotal, { color: colors.text }]}>
                          ₹{Number(order.total).toLocaleString("en-IN")}
                        </Text>
                        <Text style={[styles.paymentTag, { color: colors.mutedForeground }]}>
                          {order.paymentMethod.toUpperCase()}
                        </Text>
                      </View>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                      {/* Status Tracker */}
                      <StatusTracker status={order.status} />

                      {/* Price Breakdown */}
                      <View style={[styles.priceBreakdown, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <Text style={[styles.breakdownTitle, { color: colors.mutedForeground }]}>PRICE BREAKDOWN</Text>
                        <PriceRow label="Item Price" value={order.subtotal} />
                        <PriceRow label="Delivery" value={order.deliveryCharge} />
                        <PriceRow label="Tax" value={order.taxAmount} />
                        <PriceRow label="Service Charge" value={order.serviceCharge} />
                        <PriceRow label="Maintenance" value={order.maintenanceCharge} />
                        {order.discountAmount > 0 && (
                          <PriceRow label="Discount" value={order.discountAmount} highlight />
                        )}
                        <View style={[styles.priceRow, styles.totalRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
                          <Text style={[styles.totalValue, { color: colors.primary }]}>
                            ₹{Number(order.total).toLocaleString("en-IN")}
                          </Text>
                        </View>
                      </View>

                      {/* Shipping Address */}
                      {order.shippingAddress && (
                        <View style={[styles.addressBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.addressText, { color: colors.text }]}>{order.shippingAddress}</Text>
                        </View>
                      )}

                      {/* Payment status */}
                      <View style={[styles.metaRow, { borderColor: colors.border }]}>
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Payment</Text>
                          <Text style={[styles.metaVal, { color: colors.text }]}>{order.paymentMethod.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Pay Status</Text>
                          <Text style={[styles.metaVal, { color: order.paymentStatus === "paid" ? "#10B981" : "#F59E0B" }]}>
                            {order.paymentStatus.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Qty</Text>
                          <Text style={[styles.metaVal, { color: colors.text }]}>{order.quantity}</Text>
                        </View>
                      </View>

                      {/* ── CUSTOMER CANCELLATION POLICY ─────────────────────
                           Customers are strictly prohibited from cancelling
                           orders at ANY stage. All cancellation authority
                           belongs exclusively to the administration.
                           Active orders show "Contact Support" instead.
                      ──────────────────────────────────────────────────────── */}
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <Pressable
                          style={styles.contactSupportBtn}
                          onPress={() => router.push("/(tabs)/profile" as any)}
                        >
                          <Feather name="headphones" size={15} color="#2563EB" />
                          <Text style={styles.contactSupportText}>Contact Support</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#10B981", letterSpacing: 0.5 },
  pollBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 6 },
  pollText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  updateBannerText: { flex: 1, color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  orderCard: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  orderIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  orderId: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  updatedPill: { backgroundColor: "#2563EB", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  updatedPillText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  orderDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  lastUpdated: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  orderTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  paymentTag: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 12 },
  trackerRow: { flexDirection: "row", alignItems: "center" },
  trackerStep: { alignItems: "center", gap: 4 },
  trackerDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  trackerLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  trackerLine: { flex: 1, height: 2, marginBottom: 14 },
  cancelBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  cancelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  priceBreakdown: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 7 },
  breakdownTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalRow: { paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  addressBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  metaRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  metaItem: { flex: 1, alignItems: "center", padding: 10, gap: 3 },
  metaKey: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metaVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metaDivider: { width: 1 },
  contactSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    marginTop: 4,
  },
  contactSupportText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
});
