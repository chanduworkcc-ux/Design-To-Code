import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
}

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cart, wishlist } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 16, paddingBottom: 100 },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>F</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>Fx Prime0.1</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
              fxprime2006@gmail.com
            </Text>
          </View>
          <Pressable style={[styles.editBtn, { borderColor: colors.border }]}>
            <Feather name="edit-2" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>12</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
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

        {/* Account Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="user" label="Personal Information" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="map-pin" label="Saved Addresses" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="credit-card" label="Payment Methods" />
        </View>

        {/* Orders Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDERS</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="package" label="Order History" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="refresh-cw" label="Returns & Refunds" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="truck" label="Track Orders" />
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="bell" label="Notifications" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="moon" label="Appearance" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="globe" label="Language & Region" />
        </View>

        {/* Support Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="help-circle" label="Help Center" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="message-circle" label="Contact Us" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="star" label="Rate the App" />
        </View>

        {/* Admin Panel */}
        <Pressable style={[styles.adminBtn, { backgroundColor: colors.primary }]}>
          <Feather name="shield" size={18} color="#fff" />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </Pressable>

        {/* Sign Out */}
        <Pressable style={[styles.signOutBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginLeft: 62 },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  adminBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
  },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
