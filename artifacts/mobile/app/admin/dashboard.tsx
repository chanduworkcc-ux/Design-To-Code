import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const NAV_ITEMS = [
  { icon: "grid", label: "Dashboard", id: "dashboard" },
  { icon: "bar-chart-2", label: "Analytics", id: "analytics" },
  { icon: "users", label: "Users", id: "users" },
  { icon: "package", label: "Products", id: "products" },
  { icon: "shopping-bag", label: "Orders", id: "orders" },
  { icon: "life-buoy", label: "Support Tickets", id: "support" },
  { icon: "share-2", label: "Referrals", id: "referrals" },
  { icon: "download", label: "Withdrawals", id: "withdrawals" },
  { icon: "book-open", label: "Token Ledger", id: "ledger" },
  { icon: "tag", label: "Coupons", id: "coupons" },
  { icon: "credit-card", label: "Payment Logs", id: "payments" },
  { icon: "activity", label: "Activity Logs", id: "activity" },
  { icon: "shield", label: "Security", id: "security" },
  { icon: "bell", label: "Notifications", id: "notifications" },
  { icon: "settings", label: "Settings", id: "settings" },
];

interface Stats {
  totalUsers: number;
  pendingApprovals: number;
  onlineNow: number;
  totalOrders: number;
  pendingOrders: number;
  openTickets: number;
  shippedOrders: number;
  deliveredOrders: number;
  pendingWithdrawals: number;
}

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-280)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      const res = await apiRequest("/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentOrders(data.recentOrders ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -280, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }

  function handleSignOut() {
    closeDrawer();
    router.replace("/(tabs)/profile");
  }

  const STATS_CONFIG = [
    { label: "Total Users", key: "totalUsers", icon: "users", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Pending Approvals", key: "pendingApprovals", icon: "clock", color: "#F59E0B", bg: "#FFFBEB" },
    { label: "Online Now", key: "onlineNow", icon: "wifi", color: "#10B981", bg: "#ECFDF5", live: true },
    { label: "Total Orders", key: "totalOrders", icon: "shopping-bag", color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "Pending Orders", key: "pendingOrders", icon: "alert-triangle", color: "#F97316", bg: "#FFF7ED" },
    { label: "Open Tickets", key: "openTickets", icon: "message-square", color: "#EF4444", bg: "#FEF2F2" },
    { label: "Shipped Orders", key: "shippedOrders", icon: "truck", color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Delivered Orders", key: "deliveredOrders", icon: "check-circle", color: "#10B981", bg: "#ECFDF5" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { backgroundColor: "#fff", borderBottomColor: "#E5EAF8", paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.hamburger} onPress={openDrawer}>
          <Feather name="menu" size={22} color="#0F1740" />
        </Pressable>
        <View style={styles.headerTitle}>
          <View style={[styles.headerLogo, { backgroundColor: "#2563EB" }]}>
            <Feather name="shopping-cart" size={14} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerBrand}>XyloCart</Text>
            <Text style={styles.headerSub}>Admin Console</Text>
          </View>
        </View>
        <Pressable style={[styles.signOutBtn, { borderColor: "#E5EAF8" }]} onPress={() => router.replace("/(tabs)/profile")}>
          <Feather name="log-out" size={16} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Real-time platform overview and activity.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {STATS_CONFIG.map((s) => (
              <View key={s.key} style={[styles.statCard, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
                <View style={styles.statTop}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon as any} size={16} color={s.color} />
                  </View>
                </View>
                <View style={styles.statBottom}>
                  <Text style={styles.statValue}>{(stats as any)?.[s.key] ?? 0}</Text>
                  {(s as any).live && (
                    <View style={styles.liveRow}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>live</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sections}>
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <Text style={styles.sectionSubtitle}>Users awaiting account approval</Text>
            <View style={styles.sectionEmpty}>
              <View style={[styles.checkCircle, { borderColor: "#10B981" }]}>
                <Feather name="check" size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionEmptyText}>All caught up!</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Text style={styles.sectionSubtitle}>Latest orders placed</Text>
            {recentOrders.length === 0 ? (
              <View style={styles.sectionEmpty}>
                <Text style={styles.noDataText}>No orders yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 8, paddingTop: 8 }}>
                {recentOrders.slice(0, 5).map((o) => (
                  <View key={o.id} style={[styles.orderRow, { borderColor: "#E5EAF8" }]}>
                    <View>
                      <Text style={styles.orderIdText}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={styles.orderStatus}>{o.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.orderTotal}>₹{o.total?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={styles.sectionTitle}>Open Tickets</Text>
            <Text style={styles.sectionSubtitle}>Support tickets needing attention</Text>
            <View style={styles.sectionEmpty}>
              {(stats?.openTickets ?? 0) === 0 ? (
                <>
                  <View style={[styles.checkCircle, { borderColor: "#10B981" }]}>
                    <Feather name="check" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.sectionEmptyText}>No open tickets!</Text>
                </>
              ) : (
                <Text style={{ color: "#EF4444", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  {stats?.openTickets} ticket(s) need attention
                </Text>
              )}
            </View>
          </View>

          {(stats?.pendingWithdrawals ?? 0) > 0 && (
            <View style={[styles.section, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Text style={[styles.sectionTitle, { color: "#92400E" }]}>Pending Withdrawals</Text>
              <Text style={[styles.sectionSubtitle, { color: "#B45309" }]}>{stats?.pendingWithdrawals} withdrawal request(s) awaiting approval</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }], paddingTop: topPadding + 16, paddingBottom: insets.bottom + 16 }]}
        pointerEvents={drawerOpen ? "auto" : "none"}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerLogoRow}>
            <View style={[styles.drawerLogo, { backgroundColor: "#2563EB" }]}>
              <Feather name="shopping-cart" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.drawerBrand}>XyloCart</Text>
              <Text style={styles.drawerAdminSub}>Admin Console</Text>
            </View>
          </View>
          <Pressable style={styles.drawerClose} onPress={closeDrawer}>
            <Feather name="x" size={20} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, active && { backgroundColor: "#EFF6FF" }]}
                onPress={() => { setActiveNav(item.id); closeDrawer(); }}
                activeOpacity={0.7}
              >
                <Feather name={item.icon as any} size={18} color={active ? "#2563EB" : "#6B7280"} />
                <Text style={[styles.navLabel, { color: active ? "#2563EB" : "#374151", fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Pressable style={styles.drawerSignOut} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.drawerSignOutText}>Exit Admin Panel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  hamburger: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerBrand: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0F1740" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47.5%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#374151", flex: 1, paddingRight: 8 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#0F1740" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#10B981" },
  sections: { gap: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  sectionEmpty: { alignItems: "center", paddingVertical: 20, gap: 10 },
  checkCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  sectionEmptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#6B7280" },
  noDataText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", paddingVertical: 8 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 10 },
  orderIdText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  orderStatus: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#6B7280", marginTop: 2 },
  orderTotal: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#2563EB" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 10 },
  drawer: { position: "absolute", left: 0, top: 0, bottom: 0, width: 280, backgroundColor: "#fff", zIndex: 20, shadowColor: "#000", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20 },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5EAF8", marginBottom: 8 },
  drawerLogoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  drawerLogo: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  drawerBrand: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  drawerAdminSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  drawerClose: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  navList: { flex: 1, paddingHorizontal: 8 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginBottom: 2 },
  navLabel: { fontSize: 14 },
  drawerSignOut: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#E5EAF8" },
  drawerSignOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
});
