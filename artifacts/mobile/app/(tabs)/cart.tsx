import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  const { cart, removeFromCart, updateQuantity, cartTotal } = useApp();
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
              Add some products and they'll appear here
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPadding + 16, paddingBottom: 180 + bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.title, { color: colors.text }]}>Cart</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <View style={styles.info}>
              <Text style={[styles.category, { color: colors.primary }]}>
                {item.category.toUpperCase()}
              </Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.price, { color: colors.text }]}>
                ${item.price.toFixed(2)}
              </Text>
              <View style={styles.qtyRow}>
                <Pressable
                  style={[styles.qtyBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    updateQuantity(item.id, item.quantity - 1);
                  }}
                >
                  <Feather name="minus" size={14} color={colors.text} />
                </Pressable>
                <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>
                <Pressable
                  style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    updateQuantity(item.id, item.quantity + 1);
                  }}
                >
                  <Feather name="plus" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                removeFromCart(item.id);
              }}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Checkout Footer */}
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
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            ${cartTotal.toFixed(2)}
          </Text>
        </View>
        <Pressable style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}>
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  image: { width: 90, height: 100, backgroundColor: "#F5F7FF" },
  info: { flex: 1, padding: 12, gap: 3 },
  category: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  price: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { fontSize: 15, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "center" },
  deleteBtn: {
    width: 44,
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  checkoutText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
