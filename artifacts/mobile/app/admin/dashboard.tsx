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

interface NavItem {
  icon: string;
  label: string;
  id: string;
  route?: string;
  badge?: number;
}

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
  bannedUsers: number;
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
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

  const NAV_ITEMS: NavItem[] = [
    { icon: "grid", label: "Dashboard", id: "dashboard" },
    { icon: "bar-chart-2", label: "Analytics", id: "analytics", route: "/admin/analytics" },
    { icon: "users", label: "Users", id: "users", route: "/admin/users", badge: stats?.onlineNow },
    { icon: "package", label: "Products", id: "products" },
    { icon: "shopping-bag", label: "Orders", id: "orders", route: "/admin/orders", badge: stats?.pendingOrders },
    { icon: "life-buoy", label: "Support Tickets", id: "support", route: "/admin/tickets", badge: stats?.openTickets },
    { icon: "share-2", label: "Referrals", id: "referrals" },
    { icon: "download", label: "Withdrawals", id: "withdrawals", badge: stats?.pendingWithdrawals },
    { icon: "book-open", label: "Token Ledger", id: "ledger" },
    { icon: "tag", label: "Coupons", id: "coupons" },
    { icon: "credit-card", label: "Payment Logs", id: "payments" },
    { icon: "activity", label: "Activity Logs", id: "activity", route: "/admin/activity" },
    { icon: "shield", label: "Security", id: "security" },
    { icon: "bell", label: "Notifications", id: "notifications" },
    { icon: "settings", label: "Settings", id: "settings", route: "/admin/settings" },
  ];

  function handleNavPress(item: NavItem) {
    setActiveNav(item.id);
    closeDrawer();
    if (item.route) {
      setTimeout(() => router.push(item.route as any), 240);
    }
  }

  const STATS_CONFIG = [
    { label: "Total Users", key: "totalUsers", icon: "users", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Online Now", key: "onlineNow", icon: "wifi", color: "#10B981", bg: "#ECFDF5", live: true },
    { label: "Total Orders", key: "totalOrders", icon: "shopping-bag", color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "Pending Orders", key: "pendingOrders", icon: "alert-triangle", color: "#F97316", bg: "#FFF7ED" },
    { label: "Open Tickets", key: "openTickets", icon: "message-square", color: "#EF4444", bg: "#FEF2F2" },
    { label: "Shipped", key: "shippedOrders", icon: "truck", color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Delivered", key: "deliveredOrders", icon: "check-circle", color: "#10B981", bg: "#ECFDF5" },
    { label: "Banned Users", key: "bannedUsers", icon: "user-x", color: "#EF4444", bg: "#FEF2F2" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
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
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={18} color="#2563EB" />
        </Pressable>
        <Pressable style={[styles.signOutBtn, { borderColor: "#E5EAF8" }]} onPress={() => router.replace("/(tabs)/profile")}>
          <Feather name="log-out" size={16} color="#EF4444" />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Real-time platform overview</Text>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickRow}>
          {[
            { label: "Analytics", icon: "bar-chart-2", route: "/admin/analytics", color: "#2563EB", bg: "#EFF6FF" },
            { label: "Users", icon: "users", route: "/admin/users", color: "#10B981", bg: "#ECFDF5" },
            { label: "Orders", icon: "shopping-bag", route: "/admin/orders", color: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Tickets", icon: "life-buoy", route: "/admin/tickets", color: "#EF4444", bg: "#FEF2F2" },
          ].map((q) => (
            <Pressable
              key={q.label}
              style={[styles.quickBtn, { backgroundColor: q.bg, borderColor: q.color + "40" }]}
              onPress={() => router.push(q.route as any)}
            >
              <Feather name={q.icon as any} size={20} color={q.color} />
              <Text style={[styles.quickLabel, { color: q.color }]}>{q.label}</Text>
            </Pressable>
          ))}
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

        {/* Sections */}
        <View style={styles.sections}>
          {/* Recent Orders */}
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <Pressable onPress={() => router.push("/admin/orders")}>
                <Text style={styles.sectionLink}>View all →</Text>
              </Pressable>
            </View>
            {recentOrders.length === 0 ? (
              <Text style={styles.noDataText}>No orders yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {recentOrders.slice(0, 5).map((o) => {
                  const STATUS_COLORS: Record<string, string> = { pending: "#F59E0B", confirmed: "#3B82F6", shipped: "#8B5CF6", delivered: "#10B981", cancelled: "#EF4444" };
                  const color = STATUS_COLORS[o.status] ?? "#6B7280";
                  return (
                    <View key={o.id} style={[styles.orderRow, { borderColor: "#E5EAF8" }]}>
                      <View>
                        <Text style={styles.orderIdText}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={[styles.orderStatus, { color }]}>{o.status.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.orderTotal}>₹{o.total?.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Open Tickets Alert */}
          {(stats?.openTickets ?? 0) > 0 && (
            <Pressable style={[styles.alertCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={() => router.push("/admin/tickets")}>
              <Feather name="alert-circle" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: "#991B1B" }]}>{stats?.openTickets} open ticket(s)</Text>
                <Text style={[styles.alertSub, { color: "#B91C1C" }]}>Tap to review support tickets →</Text>
              </View>
            </Pressable>
          )}

          {/* Pending Withdrawals Alert */}
          {(stats?.pendingWithdrawals ?? 0) > 0 && (
            <View style={[styles.alertCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Feather name="download" size={20} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: "#92400E" }]}>{stats?.pendingWithdrawals} pending withdrawal(s)</Text>
                <Text style={[styles.alertSub, { color: "#B45309" }]}>Requires admin approval</Text>
              </View>
            </View>
          )}

          {/* Settings shortcut */}
          <Pressable
            style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8", flexDirection: "row", alignItems: "center" }]}
            onPress={() => router.push("/admin/settings")}
          >
            <View style={[styles.settingsIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="settings" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>System Settings</Text>
              <Text style={[styles.noDataText, { paddingTop: 0 }]}>Toggle features, adjust fees & config</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Sidebar Drawer */}
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
            const hasBadge = item.badge !== undefined && item.badge > 0;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, active && { backgroundColor: "#EFF6FF" }]}
                onPress={() => handleNavPress(item)}
                activeOpacity={0.7}
              >
                <Feather name={item.icon as any} size={18} color={active ? "#2563EB" : "#6B7280"} />
                <Text style={[styles.navLabel, { color: active ? "#2563EB" : "#374151", fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                  {item.label}
                </Text>
                {hasBadge && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{item.badge}</Text>
                  </View>
                )}
                {item.route && <Feather name="chevron-right" size={14} color="#D1D5DB" style={{ marginLeft: "auto" }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Pressable style={styles.drawerSignOut} onPress={() => { closeDrawer(); setTimeout(() => router.replace("/(tabs)/profile"), 240); }}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.drawerSignOutText}>Exit Admin Panel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 10 },
  hamburger: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerBrand: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0F1740" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47.5%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#374151", flex: 1, paddingRight: 8 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#0F1740" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#10B981" },
  sections: { gap: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  sectionLink: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  noDataText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", paddingTop: 4 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 10 },
  orderIdText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  orderStatus: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  orderTotal: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#2563EB" },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  alertSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 4 },
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
  navLabel: { fontSize: 14, flex: 1 },
  navBadge: { backgroundColor: "#EF4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  navBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  drawerSignOut: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#E5EAF8" },
  drawerSignOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
});
