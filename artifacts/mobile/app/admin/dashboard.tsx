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
  comingSoon?: boolean;
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

interface WalletSummary {
  lifetimeCoinsGiven: number;
  lifetimeCoinsDeducted: number;
  adminAdjustmentsTotal: number;
  thisWeekCoinsGiven: number;
  totalUsersWithWallet: number;
  totalCurrentBalance: number;
  generatedAt: string;
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
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeStatus, setStoreStatus] = useState<"on" | "off">("on");
  const [togglingStore, setTogglingStore] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [currentRefreshAt, setCurrentRefreshAt] = useState<Date | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  function toIST(date: Date): string {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(date.getTime() + istOffset - date.getTimezoneOffset() * 60 * 1000);
    return ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) + " IST";
  }

  useEffect(() => { fetchStats(); fetchStoreStatus(); }, []);

  async function fetchStoreStatus() {
    try {
      const res = await apiRequest("/admin/config");
      if (res.ok) {
        const d = await res.json();
        setStoreStatus((d.config?.store_status ?? "on") as "on" | "off");
      }
    } catch {}
  }

  async function handleToggleStore() {
    const next = storeStatus === "on" ? "off" : "on";
    setTogglingStore(true);
    try {
      const res = await apiRequest("/admin/config", {
        method: "PUT",
        body: JSON.stringify({ store_status: next }),
      });
      if (res.ok) {
        setStoreStatus(next);
      }
    } catch {}
    setTogglingStore(false);
  }

  async function fetchStats() {
    const now = new Date();
    setCurrentRefreshAt(now);
    try {
      const [statsRes, walletRes] = await Promise.all([
        apiRequest("/admin/stats"),
        apiRequest("/admin/wallet/summary"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setRecentOrders(data.recentOrders ?? []);
      }
      if (walletRes.ok) {
        const wData = await walletRes.json();
        setWalletSummary(wData);
      }
    } catch {}
    setLastRefreshAt(new Date());
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
    { icon: "package", label: "Products", id: "products", route: "/admin/products" },
    { icon: "shopping-bag", label: "Orders", id: "orders", route: "/admin/orders", badge: stats?.pendingOrders },
    { icon: "life-buoy", label: "Support Tickets", id: "support", route: "/admin/tickets", badge: stats?.openTickets },
    { icon: "share-2", label: "Referrals", id: "referrals", comingSoon: true },
    { icon: "download", label: "Withdrawals", id: "withdrawals", route: "/admin/withdrawals", badge: stats?.pendingWithdrawals },
    { icon: "tag", label: "Coupons", id: "coupons", route: "/admin/coupons" },
    { icon: "image", label: "Banners", id: "banners", route: "/admin/banners" },
    { icon: "bell", label: "Notifications", id: "notifications", route: "/admin/notifications" },
    { icon: "activity", label: "Activity Logs", id: "activity", route: "/admin/activity" },
    { icon: "settings", label: "Settings", id: "settings", route: "/admin/settings" },
  ];

  function handleNavPress(item: NavItem) {
    setActiveNav(item.id);
    closeDrawer();
    if (item.comingSoon) return;
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
    { label: "Withdrawals", key: "pendingWithdrawals", icon: "download", color: "#F59E0B", bg: "#FFFBEB" },
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
            <Feather name="zap" size={14} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerBrand}>FX PRIME 26</Text>
            <Text style={styles.headerSub}>Admin Console</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", marginRight: 8 }}>
          {currentRefreshAt && (
            <Text style={styles.tsText}>Now: {toIST(currentRefreshAt)}</Text>
          )}
          {lastRefreshAt && (
            <Text style={styles.tsText}>Last: {toIST(lastRefreshAt)}</Text>
          )}
        </View>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn} disabled={refreshing}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {[
            { label: "Analytics", icon: "bar-chart-2", route: "/admin/analytics", color: "#2563EB", bg: "#EFF6FF" },
            { label: "Users", icon: "users", route: "/admin/users", color: "#10B981", bg: "#ECFDF5" },
            { label: "Orders", icon: "shopping-bag", route: "/admin/orders", color: "#8B5CF6", bg: "#F5F3FF" },
            { label: "Products", icon: "package", route: "/admin/products", color: "#F97316", bg: "#FFF7ED" },
            { label: "Banners", icon: "image", route: "/admin/banners", color: "#3B82F6", bg: "#EFF6FF" },
            { label: "Notifs", icon: "bell", route: "/admin/notifications", color: "#EF4444", bg: "#FEF2F2" },
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
        </ScrollView>

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
                      <Text style={styles.orderTotal}>₹{Number(o.total ?? 0).toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Alerts */}
          {(stats?.openTickets ?? 0) > 0 && (
            <Pressable style={[styles.alertCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={() => router.push("/admin/tickets")}>
              <Feather name="alert-circle" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: "#991B1B" }]}>{stats?.openTickets} open ticket(s)</Text>
                <Text style={[styles.alertSub, { color: "#B91C1C" }]}>Tap to review support tickets →</Text>
              </View>
            </Pressable>
          )}
          {(stats?.pendingWithdrawals ?? 0) > 0 && (
            <Pressable style={[styles.alertCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]} onPress={() => router.push("/admin/withdrawals")}>
              <Feather name="download" size={20} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: "#92400E" }]}>{stats?.pendingWithdrawals} pending withdrawal(s)</Text>
                <Text style={[styles.alertSub, { color: "#B45309" }]}>Tap to review and approve →</Text>
              </View>
            </Pressable>
          )}

          {/* Store Status Toggle */}
          <View style={[styles.section, { backgroundColor: storeStatus === "off" ? "#FEF2F2" : "#F0FDF4", borderColor: storeStatus === "off" ? "#FECACA" : "#BBF7D0" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.settingsIcon, { backgroundColor: storeStatus === "off" ? "#FEE2E2" : "#DCFCE7" }]}>
                <Feather name={storeStatus === "off" ? "shopping-cart" : "shopping-cart"} size={20} color={storeStatus === "off" ? "#DC2626" : "#16A34A"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: storeStatus === "off" ? "#991B1B" : "#15803D" }]}>
                  Store is {storeStatus === "on" ? "Open" : "Closed"}
                </Text>
                <Text style={[styles.noDataText, { paddingTop: 0, color: storeStatus === "off" ? "#B91C1C" : "#16A34A" }]}>
                  {storeStatus === "off" ? "Customers cannot place new orders right now." : "Customers can browse and place orders."}
                </Text>
              </View>
              <Pressable
                style={[styles.storeToggleBtn, { backgroundColor: storeStatus === "off" ? "#DC2626" : "#16A34A", opacity: togglingStore ? 0.6 : 1 }]}
                onPress={handleToggleStore}
                disabled={togglingStore}
              >
                {togglingStore
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.storeToggleBtnText}>{storeStatus === "on" ? "Close Store" : "Open Store"}</Text>
                }
              </Pressable>
            </View>
          </View>

          {/* Quick Nav Grid */}
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Quick Navigation</Text>
            <View style={styles.quickNavGrid}>
              {[
                { icon: "package", label: "Products", route: "/admin/products", color: "#F97316", bg: "#FFF7ED" },
                { icon: "tag", label: "Coupons", route: "/admin/coupons", color: "#8B5CF6", bg: "#F5F3FF" },
                { icon: "download", label: "Withdrawals", route: "/admin/withdrawals", color: "#F59E0B", bg: "#FFFBEB" },
                { icon: "image", label: "Banners", route: "/admin/banners", color: "#3B82F6", bg: "#EFF6FF" },
                { icon: "bell", label: "Notifications", route: "/admin/notifications", color: "#EF4444", bg: "#FEF2F2" },
                { icon: "settings", label: "Settings", route: "/admin/settings", color: "#6B7280", bg: "#F3F4F6" },
              ].map((item) => (
                <Pressable key={item.label} style={[styles.quickNavItem, { backgroundColor: item.bg }]} onPress={() => router.push(item.route as any)}>
                  <View style={[styles.quickNavIcon, { backgroundColor: item.color + "20" }]}>
                    <Feather name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.quickNavLabel, { color: item.color }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Financial Summary */}
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="dollar-sign" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.sectionTitle}>Wallet Financial Summary</Text>
              </View>
              <Pressable onPress={() => router.push("/admin/users")}>
                <Text style={styles.sectionLink}>Adjust →</Text>
              </Pressable>
            </View>
            {walletSummary ? (
              <View style={{ gap: 8 }}>
                <View style={styles.finRow}>
                  <View style={[styles.finIcon, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="trending-up" size={14} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finLabel}>Lifetime Coins Given</Text>
                    <Text style={styles.finValue}>{walletSummary.lifetimeCoinsGiven.toLocaleString()} coins</Text>
                  </View>
                </View>
                <View style={styles.finRow}>
                  <View style={[styles.finIcon, { backgroundColor: "#FEF2F2" }]}>
                    <Feather name="trending-down" size={14} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finLabel}>Lifetime Coins Deducted</Text>
                    <Text style={styles.finValue}>{walletSummary.lifetimeCoinsDeducted.toLocaleString()} coins</Text>
                  </View>
                </View>
                <View style={styles.finRow}>
                  <View style={[styles.finIcon, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="users" size={14} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finLabel}>Total Live Wallet Balance</Text>
                    <Text style={styles.finValue}>{walletSummary.totalCurrentBalance.toLocaleString()} coins across {walletSummary.totalUsersWithWallet} users</Text>
                  </View>
                </View>
                <View style={[styles.finRow, { backgroundColor: "#FFFBEB", borderRadius: 10, paddingHorizontal: 10 }]}>
                  <View style={[styles.finIcon, { backgroundColor: "#FDE68A" }]}>
                    <Feather name="calendar" size={14} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finLabel}>This Week (since Sunday)</Text>
                    <Text style={[styles.finValue, { color: "#B45309" }]}>{walletSummary.thisWeekCoinsGiven.toLocaleString()} coins given</Text>
                  </View>
                </View>
                <Text style={[styles.noDataText, { textAlign: "right", paddingTop: 0 }]}>
                  Updated {new Date(walletSummary.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ) : (
              <Text style={styles.noDataText}>Loading summary...</Text>
            )}
          </View>

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
                {item.comingSoon && <Text style={styles.soonTag}>SOON</Text>}
                {item.route && !item.comingSoon && <Feather name="chevron-right" size={14} color="#D1D5DB" style={{ marginLeft: "auto" }} />}
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
  tsText: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#6B7280", letterSpacing: 0.2 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0F1740" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  quickRow: { gap: 10, paddingRight: 4 },
  quickBtn: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 6, minWidth: 70 },
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
  quickNavGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickNavItem: { width: "30%", borderRadius: 12, padding: 12, alignItems: "center", gap: 8 },
  quickNavIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickNavLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
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
  soonTag: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#9CA3AF", backgroundColor: "#F3F4F6", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  drawerSignOut: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#E5EAF8" },
  drawerSignOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  finRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  finIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  finLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#6B7280" },
  finValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F1740", marginTop: 1 },
  storeToggleBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minWidth: 90, alignItems: "center", justifyContent: "center" },
  storeToggleBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});
