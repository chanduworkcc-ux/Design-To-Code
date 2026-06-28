import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { GlowPulse, ShimmerWallet, FloatIn } from "@/components/ThreeD";
import { GlobalFooter } from "@/components/GlobalFooter";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: number;
  value?: string;
}

function MenuItem({ icon, label, onPress, badge, value }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, wishlist } = useApp();
  const { user, logout, loading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>("1.0");
  const [rateAppUrl, setRateAppUrl] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem("@xc_avatar_uri").then((uri) => {
      if (uri) setAvatarUri(uri);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/(auth)/login");
  }, [user, loading]);

  useEffect(() => {
    const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.app_version) setAppVersion(d.app_version);
        if (d?.rate_app_url) setRateAppUrl(d.rate_app_url);
      })
      .catch(() => {});
  }, []);

  if (loading || !user) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const avatarLetter = user.name.charAt(0).toUpperCase();

  async function handleSignOut() {
    if (Platform.OS === "web") { await logout(); router.replace("/(auth)/login"); return; }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  }

  async function handleInvite() {
    if (!user) return;
    try {
      await Share.share({
        message: `Join FX PRIME 26 with my referral code ${user.referralCode} and earn bonus coins on your first order! 🎁`,
        title: "Invite to FX PRIME 26",
      });
    } catch {}
  }

  async function handleCheckUpdates() {
    try {
      const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
      const res = await fetch(`${BASE_URL}/config/public`);
      if (!res.ok) { Alert.alert("Error", "Could not reach the server. Please try again."); return; }
      const d = await res.json();
      if (d?.force_update === "true") {
        Alert.alert(
          "Update Required",
          `A new version (${d.update_version ?? "latest"}) is available. Please update the app to continue.\n\n${d.update_notes ?? ""}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("You're up to date!", `FX PRIME 26 v${appVersion} is running the latest version.`, [{ text: "Great" }]);
      }
    } catch {
      Alert.alert("Error", "Could not check for updates. Please check your connection.");
    }
  }

  async function handleRateApp() {
    if (!rateAppUrl) {
      Alert.alert("Thank You!", "Rating will be available in the published app.");
      return;
    }
    const { Linking } = await import("react-native");
    const supported = await Linking.canOpenURL(rateAppUrl).catch(() => false);
    if (supported) {
      await Linking.openURL(rateAppUrl);
    } else {
      Alert.alert("Cannot Open", "Could not open the store link. Please try again later.");
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* User Card — avatar has 3D glow pulse ring */}
        <FloatIn delay={0} distance={24}>
          <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <GlowPulse color={colors.primary} size={54}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                </View>
              )}
            </GlowPulse>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
              {user.referralCode && (
                <Text style={[styles.referralCode, { color: colors.primary }]}>Code: {user.referralCode}</Text>
              )}
              <View style={[styles.fxBadge, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.fxBadgeText, { color: "#2563EB" }]}>⚡ FX Prime 26</Text>
              </View>
            </View>
            <Pressable
              style={[styles.editBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/personal-info" as any)}
            >
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </FloatIn>

        {/* Stats */}
        <FloatIn delay={80} distance={24}>
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable style={styles.statItem} onPress={() => router.push("/orders" as any)}>
              <Text style={[styles.statNum, { color: colors.text }]}>View</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{wishlist.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wishlist</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{cartCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cart</Text>
            </View>
          </View>
        </FloatIn>

        {/* Wallet — 3D shimmer tilt card */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WALLET</Text>
        <FloatIn delay={160} distance={24}>
          <ShimmerWallet style={[styles.walletCard, { backgroundColor: colors.primary }]}>
            <View>
              <Text style={styles.walletLabel}>Coin Balance</Text>
              <Text style={styles.walletBalance}>{user.walletBalance} coins</Text>
              <Text style={styles.walletInr}>≈ ₹{(user.walletBalance / 100).toFixed(2)} INR</Text>
            </View>
            <View style={[styles.walletBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="award" size={24} color="#fff" />
            </View>
          </ShimmerWallet>
        </FloatIn>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <FloatIn delay={240} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="user"        label="Personal Information" onPress={() => router.push("/personal-info" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="map-pin"     label="Saved Addresses"      onPress={() => router.push("/addresses" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="credit-card" label="Payment Methods"      onPress={() => router.push("/payment-methods" as any)} />
          </View>
        </FloatIn>

        {/* Orders */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDERS</Text>
        <FloatIn delay={300} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="package"    label="Order History"    onPress={() => router.push("/orders" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="refresh-cw" label="Returns & Refunds" onPress={() => router.push("/orders" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="truck"      label="Track Orders"     onPress={() => router.push("/track-order" as any)} />
          </View>
        </FloatIn>

        {/* Referrals */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REFERRALS</Text>
        <FloatIn delay={360} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="users" label="My Referral Network" onPress={() => router.push("/referrals" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="gift"  label="Invite & Earn"       onPress={handleInvite} />
          </View>
        </FloatIn>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <FloatIn delay={420} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="bell"  label="Notifications"    onPress={() => router.push("/notifications-user" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="moon"  label="Appearance"       onPress={() => router.push("/appearance" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="globe" label="Language & Region" value="English (IN)" onPress={() => Alert.alert("Coming Soon", "Language settings will be available soon.")} />
          </View>
        </FloatIn>

        {/* App */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APP</Text>
        <FloatIn delay={460} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="download-cloud" label="Check for Updates" onPress={handleCheckUpdates} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="info" label="App Version" value={`v${appVersion}`} />
          </View>
        </FloatIn>

        {/* Support */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <FloatIn delay={480} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="help-circle"    label="Help Center"  onPress={() => router.push("/support-ticket" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="message-circle" label="Contact Us"   onPress={() => router.push("/support-ticket" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="star"           label="Rate the App" onPress={handleRateApp} />
          </View>
        </FloatIn>

        {/* Legal */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LEGAL</Text>
        <FloatIn delay={540} distance={20}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="file-text" label="Terms & Conditions" onPress={() => router.push("/policies" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="shield"    label="Privacy Policy"     onPress={() => router.push("/policies" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="info"      label="General Policies"   onPress={() => router.push("/policies" as any)} />
          </View>
        </FloatIn>

        {user.role === "admin" && (
          <Pressable style={[styles.adminBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/admin" as any)}>
            <Feather name="shield" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>Admin Panel</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.signOutBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>

        <GlobalFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  avatarText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  referralCode: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, marginBottom: 16, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  walletCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 16, marginBottom: 16 },
  walletLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium" },
  walletBalance: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  walletInr: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  walletBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 4, marginLeft: 4 },
  menuGroup: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginRight: 4 },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginLeft: 62 },
  fxBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  fxBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  adminBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  adminBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, borderWidth: 1, marginTop: 4 },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
