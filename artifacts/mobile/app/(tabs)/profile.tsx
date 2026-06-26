import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: number;
}

function MenuItem({ icon, label, onPress, badge }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
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
  const { user, logout } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "Not signed in";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  function handleMenuPress(label: string) {
    if (Platform.OS !== "web") Alert.alert(label, `${label} is coming soon.`);
  }

  async function handleSignOut() {
    if (!user) { router.push("/(auth)/login"); return; }
    if (Platform.OS === "web") { await logout(); router.replace("/(auth)/login"); return; }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{displayEmail}</Text>
            {user?.referralCode && (
              <Text style={[styles.referralCode, { color: colors.primary }]}>
                Code: {user.referralCode}
              </Text>
            )}
          </View>
          {user ? (
            <Pressable style={[styles.editBtn, { borderColor: colors.border }]} onPress={() => handleMenuPress("Edit Profile")}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <Pressable style={[styles.signInSmallBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.signInSmallText}>Sign In</Text>
            </Pressable>
          )}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Pressable onPress={() => router.push("/orders")}>
              <Text style={[styles.statNum, { color: colors.text }]}>View</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
            </Pressable>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{wishlist.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wishlist</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{cartCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cart Items</Text>
          </View>
        </View>

        {/* Wallet */}
        {user && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WALLET</Text>
            <Pressable style={[styles.walletCard, { backgroundColor: colors.primary }]} onPress={() => handleMenuPress("Wallet")}>
              <View>
                <Text style={styles.walletLabel}>Coin Balance</Text>
                <Text style={styles.walletBalance}>{user.walletBalance} coins</Text>
                <Text style={styles.walletInr}>≈ ₹{(user.walletBalance / 100).toFixed(2)} INR</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </>
        )}

        {/* Account Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="user" label="Personal Information" onPress={() => handleMenuPress("Personal Information")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="map-pin" label="Saved Addresses" onPress={() => handleMenuPress("Saved Addresses")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="credit-card" label="Payment Methods" onPress={() => handleMenuPress("Payment Methods")} />
        </View>

        {/* Orders Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDERS</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="package" label="Order History" onPress={() => router.push("/orders")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="refresh-cw" label="Returns & Refunds" onPress={() => handleMenuPress("Returns & Refunds")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="truck" label="Track Orders" onPress={() => router.push("/orders")} />
        </View>

        {/* Referrals Section */}
        {user && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REFERRALS</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MenuItem icon="users" label="My Referral Network" onPress={() => router.push("/referrals" as any)} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <MenuItem icon="gift" label="Invite & Earn" onPress={() => router.push("/referrals" as any)} />
            </View>
          </>
        )}

        {/* Preferences Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="bell" label="Notifications" onPress={() => handleMenuPress("Notifications")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="moon" label="Appearance" onPress={() => handleMenuPress("Appearance")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="globe" label="Language & Region" onPress={() => handleMenuPress("Language & Region")} />
        </View>

        {/* Support Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="help-circle" label="Help Center" onPress={() => handleMenuPress("Help Center")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="message-circle" label="Contact Us" onPress={() => handleMenuPress("Contact Us")} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="star" label="Rate the App" onPress={() => handleMenuPress("Rate the App")} />
        </View>

        {/* Legal Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LEGAL</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="file-text" label="Terms & Conditions" onPress={() => router.push("/policies" as any)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="shield" label="Privacy Policy" onPress={() => router.push("/policies" as any)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="info" label="General Policies" onPress={() => router.push("/policies" as any)} />
        </View>

        {/* Admin Panel — only shown to admin users or as login gateway */}
        <Pressable
          style={[styles.adminBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin")}
        >
          <Feather name="shield" size={18} color="#fff" />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </Pressable>

        {/* Sign In / Sign Out */}
        {!user ? (
          <Pressable
            style={[styles.signOutBtn, { borderColor: colors.primary, backgroundColor: colors.accent }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Feather name="log-in" size={18} color={colors.primary} />
            <Text style={[styles.signOutText, { color: colors.primary }]}>Sign In / Register</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.signOutBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  referralCode: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  signInSmallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  signInSmallText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, marginBottom: 16, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  walletCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 16, marginBottom: 16 },
  walletLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium" },
  walletBalance: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  walletInr: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  menuGroup: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginLeft: 62 },
  adminBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  adminBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
