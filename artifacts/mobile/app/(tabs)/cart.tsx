import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, removeFromCart, cartTotal } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  if (cart.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: topPadding + 20 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Cart</Text>
          <View style={styles.emptyState}>
            <Feather name="shopping-cart" size={60} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Add a product and it'll appear here
            </Text>
            <Pressable
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)")}
            >
              <Text style={[styles.startBtnText, { color: "#fff" }]}>Start Shopping</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const item = cart[0];
  const imageSource: any = (item as any).image
    ? (item as any).image
    : item.imageUrl
    ? { uri: item.imageUrl }
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={cart}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPadding + 16, paddingBottom: 200 + bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.text }]}>Cart</Text>
            <View style={[styles.policyBanner, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
              <Feather name="info" size={14} color="#92400E" />
              <Text style={[styles.policyText, { color: "#92400E" }]}>
                One item per order · No returns or refunds · All sales final
              </Text>
            </View>
          </>
        }
        renderItem={({ item: cartItem }) => {
          const src: any = (cartItem as any).image
            ? (cartItem as any).image
            : cartItem.imageUrl
            ? { uri: cartItem.imageUrl }
            : null;
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {src ? (
                <Image source={src} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
                  <Feather name="package" size={32} color={colors.mutedForeground} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.category, { color: colors.primary }]}>
                  {cartItem.category.toUpperCase()}
                </Text>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {cartItem.name}
                </Text>
                <Text style={[styles.price, { color: colors.text }]}>
                  ₹{Number(cartItem.price).toLocaleString("en-IN")}
                </Text>
                {(cartItem as any).originalPrice && (cartItem as any).originalPrice > cartItem.price && (
                  <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                    ₹{Number((cartItem as any).originalPrice).toLocaleString("en-IN")}
                  </Text>
                )}
                <Text style={[styles.qtyNote, { color: colors.mutedForeground }]}>Qty: 1 (limit per order)</Text>
              </View>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => removeFromCart(cartItem.id)}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
      >
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Order Total</Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            ₹{Number(cartTotal).toLocaleString("en-IN")}
          </Text>
        </View>
        <Pressable
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/checkout" as any)}
        >
          <Feather name="arrow-right" size={18} color="#fff" />
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyContainer: { flex: 1, paddingHorizontal: 16 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 100,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 8 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  startBtn: {
    marginTop: 12,
    borderRadius: 26,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  startBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 12 },
  policyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  policyText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  image: { width: 90, height: 110, backgroundColor: "#F5F7FF" },
  imagePlaceholder: { width: 90, height: 110, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, padding: 12, gap: 3 },
  category: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  originalPrice: { fontSize: 12, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  qtyNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  deleteBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  totalAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
