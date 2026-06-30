import { BASE_URL } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { usePageTracker } from "@/hooks/usePageTracker";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS } from "@/lib/i18n";
import { GlobalFooter } from "@/components/GlobalFooter";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FloatIn, FloatingOrb, FloatingParticle, ShimmerWallet, GlowPulse } from "@/components/ThreeD";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: number;
  value?: string;
  loading?: boolean;
}

function MenuItem({ icon, label, onPress, badge, value, loading }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable style={styles.menuItem} onPress={loading ? undefined : onPress} disabled={loading}>
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
      {loading
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      }
    </Pressable>
  );
}

export default function ProfileScreen() {
  usePageTracker("profile", "Profile");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, wishlist } = useApp();
  const { user, logout, loading, apiRequest } = useAuth();
  const { t, language } = useLanguage();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>("1.0");
  const [rateAppUrl, setRateAppUrl] = useState<string>("");
  const [referralBaseUrl, setReferralBaseUrl] = useState<string>("");
  const [recentOrder, setRecentOrder] = useState<{ id: string; orderNumber: string | null; status: string; total: number; productName: string | null; createdAt: string } | null | "loading">("loading");
  const [orderCount, setOrderCount] = useState<number>(0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModal, setUpdateModal] = useState<{ title: string; message: string; isUpdate: boolean } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@xc_avatar_uri").then((uri) => {
      if (uri) setAvatarUri(uri);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/(auth)/login");
  }, [user, loading]);

  useEffect(() => {

    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.app_version) setAppVersion(d.app_version);
        if (d?.rate_app_url) setRateAppUrl(d.rate_app_url);
        if (d?.referral_base_url) setReferralBaseUrl(d.referral_base_url);
      })
      .catch(() => {});
  }, []);

  const fetchRecentOrder = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiRequest("/orders");
      if (res.ok) {
        const d = await res.json();
        const orders = d.orders ?? [];
        setOrderCount(orders.length);
        setRecentOrder(orders.length > 0 ? orders[0] : null);
      } else {
        setRecentOrder(null);
      }
    } catch {
      setRecentOrder(null);
    }
  }, [user, apiRequest]);

  useEffect(() => { fetchRecentOrder(); }, [fetchRecentOrder]);

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
    const code = user.referralCode ?? "";
    const link = referralBaseUrl ? `${referralBaseUrl}?ref=${code}` : null;
    const message = link
      ? `Hey! Join XyloCart using my link and get exclusive rewards. Your code ${code} will be automatically applied: ${link}`
      : `Join XyloCart with my referral code ${code} and earn bonus coins on your first order!`;
    try {
      await Share.share({ message, title: "Invite to XyloCart", url: link ?? undefined });
    } catch {}
  }

  async function handleCheckUpdates() {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const res = await fetch(`${BASE_URL}/config/public`);
      if (!res.ok) {
        setUpdateModal({ title: "Connection Error", message: "Could not reach the server. Please check your connection and try again.", isUpdate: false });
        return;
      }
      const d = await res.json();
      if (d?.force_update === "true") {
        setUpdateModal({
          title: "Update Available",
          message: `A new version (${d.update_version ?? "latest"}) is available.\n\n${d.update_notes ?? "Please update the app to continue using XyloCart."}`,
          isUpdate: true,
        });
      } else {
        setUpdateModal({
          title: "You're up to date!",
          message: `XyloCart v${appVersion} is the latest version. No updates are needed right now.`,
          isUpdate: false,
        });
      }
    } catch {
      setUpdateModal({ title: "Error", message: "Could not check for updates. Please check your connection.", isUpdate: false });
    } finally {
      setCheckingUpdate(false);
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
      {/* Decorative background */}
      <FloatingOrb color={colors.primary} size={200} style={{ top: -70, right: -70, opacity: 0.07 } as any} delay={0} amplitude={14} />
      <FloatingOrb color="#818CF8" size={140} style={{ top: 300, left: -60, opacity: 0.06 } as any} delay={1000} amplitude={10} />
      <FloatingParticle x={30}  startY={120} color={colors.primary} delay={0}    size={5} duration={4500} />
      <FloatingParticle x={290} startY={200} color="#818CF8"        delay={1300} size={4} duration={3900} />
      <FloatingParticle x={160} startY={400} color={colors.primary} delay={700}  size={3} duration={5200} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
      >
        <FloatIn delay={0} distance={24}>
          <View style={styles.pageHeader}>
            <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>{t("profile")}</Text>
          </View>
        </FloatIn>

        {/* User Card — avatar wrapped in GlowPulse */}
        <FloatIn delay={60} distance={28}>
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
                <Text style={[styles.fxBadgeText, { color: "#2563EB" }]}>⚡ XyloCart</Text>
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
        <FloatIn delay={120} distance={22}>
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable style={styles.statItem} onPress={() => router.push("/orders" as any)}>
              <Text style={[styles.statNum, { color: colors.text }]}>{orderCount}</Text>
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

        {/* Recent Order Mini Card */}
        <FloatIn delay={180} distance={20}>
        <View style={[styles.recentOrderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.recentOrderHeader}>
            <Text style={[styles.recentOrderTitle, { color: colors.mutedForeground }]}>RECENT ORDER</Text>
            {recentOrder && recentOrder !== "loading" && (
              <Pressable onPress={() => router.push("/orders" as any)}>
                <Text style={[styles.recentOrderSeeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            )}
          </View>
          {recentOrder === "loading" ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
          ) : recentOrder === null ? (
            <View style={styles.recentOrderEmpty}>
              <Feather name="package" size={22} color={colors.mutedForeground} />
              <Text style={[styles.recentOrderEmptyText, { color: colors.mutedForeground }]}>No orders placed yet</Text>
            </View>
          ) : (
            <Pressable style={styles.recentOrderRow} onPress={() => router.push("/orders" as any)}>
              <View style={[styles.recentOrderStatus, { backgroundColor: recentOrder.status === "delivered" ? "#ECFDF5" : recentOrder.status === "cancelled" ? "#FEF2F2" : recentOrder.status === "shipped" ? "#F5F3FF" : "#FFFBEB" }]}>
                <Feather
                  name={recentOrder.status === "delivered" ? "check-circle" : recentOrder.status === "cancelled" ? "x-circle" : recentOrder.status === "shipped" ? "truck" : "clock"}
                  size={16}
                  color={recentOrder.status === "delivered" ? "#10B981" : recentOrder.status === "cancelled" ? "#EF4444" : recentOrder.status === "shipped" ? "#8B5CF6" : "#F59E0B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentOrderNum, { color: colors.text }]} numberOfLines={1}>
                  {recentOrder.orderNumber ?? `#${recentOrder.id.slice(0, 8).toUpperCase()}`}
                </Text>
                <Text style={[styles.recentOrderProduct, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {recentOrder.productName ?? "Product"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.recentOrderTotal, { color: colors.text }]}>₹{Number(recentOrder.total).toLocaleString("en-IN")}</Text>
                <Text style={[styles.recentOrderStatusText, { color: recentOrder.status === "delivered" ? "#10B981" : recentOrder.status === "cancelled" ? "#EF4444" : colors.mutedForeground }]}>
                  {recentOrder.status.charAt(0).toUpperCase() + recentOrder.status.slice(1)}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
        </FloatIn>

        {/* Wallet — ShimmerWallet 3D tilt card */}
        <FloatIn delay={240} distance={22}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("wallet")}</Text>
          <ShimmerWallet style={[styles.walletCard, { backgroundColor: colors.primary }]}>
            <View>
              <Text style={styles.walletLabel}>{t("coinBalance")}</Text>
              <Text style={styles.walletBalance}>{user.walletBalance} coins</Text>
              <Text style={styles.walletInr}>≈ ₹{(user.walletBalance / 100).toFixed(2)} INR</Text>
            </View>
            <View style={[styles.walletBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="trophy-outline" size={24} color="#fff" />
            </View>
          </ShimmerWallet>
        </FloatIn>

        {/* Account */}
        <FloatIn delay={300} distance={20}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("account").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="user"        label={t("personalInfo")}    onPress={() => router.push("/personal-info" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="map-pin"     label={t("savedAddresses")}  onPress={() => router.push("/addresses" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="credit-card" label={t("paymentMethods")}  onPress={() => router.push("/payment-methods" as any)} />
          </View>
        </FloatIn>

        {/* Orders */}
        <FloatIn delay={340} distance={18}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("orders").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="package"    label={t("orderHistory")}    onPress={() => router.push("/orders" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="refresh-cw" label={t("returnsRefunds")}  onPress={() => router.push("/refunds" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="truck"      label={t("trackOrders")}     onPress={() => router.push("/track-order" as any)} />
          </View>
        </FloatIn>

        {/* Referrals */}
        <FloatIn delay={380} distance={18}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("referrals").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="users" label={t("myReferralNetwork")} onPress={() => router.push("/referrals" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="gift"  label={t("inviteEarn")}        onPress={handleInvite} />
          </View>
        </FloatIn>

        {/* Preferences */}
        <FloatIn delay={420} distance={16}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("preferences").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="bell"  label={t("notifications")}  onPress={() => router.push("/notifications-user" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="moon"  label={t("appearance")}     onPress={() => router.push("/appearance" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="globe"
              label={t("languageRegion")}
              value={LANGUAGE_LABELS[language].native}
              onPress={() => router.push("/language" as any)}
            />
          </View>
        </FloatIn>

        {/* Security */}
        <FloatIn delay={460} distance={16}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("security").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="lock"       label={t("changePassword")}  onPress={() => router.push("/change-password" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="smartphone" label={t("loginDevices")}    onPress={() => router.push("/login-devices" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="shield"     label={t("accountSecurity")} onPress={() => router.push("/account-security" as any)} />
          </View>
        </FloatIn>

        {/* App */}
        <FloatIn delay={500} distance={14}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("app").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="download-cloud" label={t("checkForUpdates")} onPress={handleCheckUpdates} loading={checkingUpdate} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="info"           label={t("appVersion")}       value={`v${appVersion}`} onPress={() => Alert.alert(t("appVersion"), `XyloCart v${appVersion}\n\nBuilt with React Native & Expo.\n© 2025 XyloCart. All rights reserved.`)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="share-2"        label={t("shareApp")}         onPress={handleInvite} />
          </View>
        </FloatIn>

        {/* Support */}
        <FloatIn delay={540} distance={14}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("support").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="help-circle"    label="Q&A / Help"       onPress={() => router.push("/faq" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="message-circle" label={t("contactUs")}   onPress={() => router.push("/support-ticket" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="star"           label={t("rateApp")}     onPress={handleRateApp} />
          </View>
        </FloatIn>

        {/* Legal */}
        <FloatIn delay={580} distance={14}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("legal").toUpperCase()}</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="file-text" label={t("termsConditions")} onPress={() => router.push("/policies" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="shield"    label={t("privacyPolicy")}   onPress={() => router.push("/policies" as any)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem icon="info"      label={t("generalPolicies")} onPress={() => router.push("/policies" as any)} />
          </View>
        </FloatIn>

        {user.role === "admin" && (
          <Pressable style={[styles.adminBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/admin/dashboard" as any)}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>{t("adminPanel")}</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.signOutBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>{t("signOut")}</Text>
        </Pressable>

        <GlobalFooter />
      </ScrollView>

      {/* Check for Updates result modal */}
      <Modal visible={!!updateModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setUpdateModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setUpdateModal(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIconWrap, { backgroundColor: updateModal?.isUpdate ? "#FEF3C7" : "#D1FAE5" }]}>
              <Feather name={updateModal?.isUpdate ? "download-cloud" : "check-circle"} size={28} color={updateModal?.isUpdate ? "#D97706" : "#059669"} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{updateModal?.title}</Text>
            <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>{updateModal?.message}</Text>
            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => setUpdateModal(null)}>
              <Text style={styles.modalBtnText}>{updateModal?.isUpdate ? "OK" : "Great!"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "DMSans_700Bold", marginBottom: 16 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  headerLogo: { width: 36, height: 36 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  avatarText: { color: "#fff", fontSize: 22, fontFamily: "DMSans_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 2 },
  referralCode: { fontSize: 11, fontFamily: "DMSans_600SemiBold", marginTop: 4 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, marginBottom: 16, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  walletCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 16, marginBottom: 16 },
  walletLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "DMSans_500Medium" },
  walletBalance: { color: "#fff", fontSize: 22, fontFamily: "DMSans_700Bold", marginTop: 2 },
  walletInr: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
  walletBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 4, marginLeft: 4 },
  menuGroup: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "DMSans_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "DMSans_400Regular", marginRight: 4 },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "DMSans_700Bold" },
  divider: { height: 1, marginLeft: 62 },
  fxBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  fxBadgeText: { fontSize: 10, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.3 },
  adminBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  adminBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, borderWidth: 1, marginTop: 4 },
  signOutText: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  recentOrderCard: { borderRadius: 14, borderWidth: 1, marginBottom: 16, padding: 14 },
  recentOrderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  recentOrderTitle: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1 },
  recentOrderSeeAll: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  recentOrderEmpty: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  recentOrderEmptyText: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  recentOrderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  recentOrderStatus: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recentOrderNum: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  recentOrderProduct: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
  recentOrderTotal: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  recentOrderStatusText: { fontSize: 11, fontFamily: "DMSans_500Medium", marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 32 },
  modalCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 12 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "DMSans_700Bold", textAlign: "center" },
  modalMessage: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22 },
  modalBtn: { marginTop: 8, paddingHorizontal: 36, paddingVertical: 13, borderRadius: 12 },
  modalBtnText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },
});
