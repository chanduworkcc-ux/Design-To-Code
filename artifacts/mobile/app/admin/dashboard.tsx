import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const STATS = [
  { label: "Total Users", value: "2", icon: "users", color: "#2563EB", bg: "#EFF6FF" },
  { label: "Pending Approvals", value: "0", icon: "clock", color: "#F59E0B", bg: "#FFFBEB" },
  { label: "Online Now", value: "0", icon: "wifi", color: "#10B981", bg: "#ECFDF5", live: true },
  { label: "Total Orders", value: "0", icon: "shopping-bag", color: "#8B5CF6", bg: "#F5F3FF" },
  { label: "Pending Orders", value: "0", icon: "alert-triangle", color: "#F97316", bg: "#FFF7ED" },
  { label: "Open Tickets", value: "0", icon: "message-square", color: "#EF4444", bg: "#FEF2F2" },
  { label: "Shipped Orders", value: "0", icon: "truck", color: "#3B82F6", bg: "#EFF6FF" },
  { label: "Delivered Orders", value: "0", icon: "check-circle", color: "#10B981", bg: "#ECFDF5" },
];

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-280)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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

  function handleNavPress(id: string) {
    setActiveNav(id);
    closeDrawer();
  }

  function handleSignOut() {
    closeDrawer();
    router.replace("/(tabs)/profile");
  }

  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: "#fff",
            borderBottomColor: "#E5EAF8",
            paddingTop: topPadding + 12,
          },
        ]}
      >
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
        <Pressable
          style={[styles.signOutBtn, { borderColor: "#E5EAF8" }]}
          onPress={() => router.replace("/(tabs)/profile")}
        >
          <Feather name="log-out" size={16} color="#EF4444" />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Real-time platform overview and activity.</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat) => (
            <View
              key={stat.id}
              style={[styles.statCard, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}
            >
              <View style={styles.statTop}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                  <Feather name={stat.icon as any} size={16} color={stat.color} />
                </View>
              </View>
              <View style={styles.statBottom}>
                <Text style={styles.statValue}>{stat.value}</Text>
                {stat.live && (
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>live</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Sections */}
        <View style={styles.sections}>
          {/* Pending Approvals */}
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

          {/* Recent Orders */}
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Text style={styles.sectionSubtitle}>Latest orders placed</Text>
            <View style={styles.sectionEmpty}>
              <Text style={styles.noDataText}>No orders yet.</Text>
            </View>
          </View>

          {/* Open Tickets */}
          <View style={[styles.section, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
            <Text style={styles.sectionTitle}>Open Tickets</Text>
            <Text style={styles.sectionSubtitle}>Support tickets needing attention</Text>
            <View style={styles.sectionEmpty}>
              <View style={[styles.checkCircle, { borderColor: "#10B981" }]}>
                <Feather name="check" size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionEmptyText}>No open tickets!</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayAnim }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Sidebar Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: drawerAnim }],
            paddingTop: topPadding + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
        pointerEvents={drawerOpen ? "auto" : "none"}
      >
        {/* Drawer Header */}
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

        {/* Nav Items */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navItem,
                  active && { backgroundColor: "#EFF6FF" },
                ]}
                onPress={() => handleNavPress(item.id)}
                activeOpacity={0.7}
              >
                <Feather
                  name={item.icon as any}
                  size={18}
                  color={active ? "#2563EB" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.navLabel,
                    { color: active ? "#2563EB" : "#374151", fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sign Out */}
        <Pressable style={styles.drawerSignOut} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.drawerSignOutText}>Sign Out</Text>
        </Pressable>
      </Animated.View>
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
  hamburger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F1740" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  signOutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 16 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0F1740" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#374151", flex: 1, paddingRight: 8 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#0F1740" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#10B981" },
  sections: { gap: 12 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  sectionEmpty: { alignItems: "center", paddingVertical: 20, gap: 10 },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionEmptyText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#6B7280" },
  noDataText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", paddingVertical: 8 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#fff",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EAF8",
    marginBottom: 8,
  },
  drawerLogoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  drawerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBrand: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  drawerAdminSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  drawerClose: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  navList: { flex: 1, paddingHorizontal: 8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navLabel: { fontSize: 14 },
  drawerSignOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5EAF8",
  },
  drawerSignOutText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
  },
});
