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

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wishlist, removeFromWishlist, addToCart, isInCart } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  if (wishlist.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: topPadding + 20 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Wishlist</Text>
          <View style={styles.emptyState}>
            <Feather name="heart" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your wishlist is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Save items you love and come back to them later
            </Text>
            <Pressable
              style={[styles.shopBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)")}
            >
              <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>
                Browse Products
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPadding + 16, paddingBottom: 100 + bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.title, { color: colors.text }]}>
            Wishlist{" "}
            <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: "Inter_400Regular" }}>
              {wishlist.length} items
            </Text>
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <View style={styles.info}>
              <Text style={[styles.category, { color: colors.primary }]}>
                {item.category.toUpperCase()}
              </Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.text }]}>
                  ${item.price.toFixed(2)}
                </Text>
                {item.discount && (
                  <View style={[styles.discountBadge, { backgroundColor: colors.orange }]}>
                    <Text style={styles.discountText}>-{item.discount}%</Text>
                  </View>
                )}
              </View>
              <Pressable
                style={[
                  styles.addToCartBtn,
                  { backgroundColor: isInCart(item.id) ? colors.accent : colors.primary },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addToCart(item);
                }}
              >
                <Feather
                  name="shopping-cart"
                  size={14}
                  color={isInCart(item.id) ? colors.primary : "#fff"}
                />
                <Text
                  style={[
                    styles.addToCartText,
                    { color: isInCart(item.id) ? colors.primary : "#fff" },
                  ]}
                >
                  {isInCart(item.id) ? "In Cart" : "Add to Cart"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.deleteBtn, { borderColor: colors.border }]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                removeFromWishlist(item.id);
              }}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
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
    gap: 10,
    paddingBottom: 100,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  shopBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  shopBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 110,
    backgroundColor: "#F5F7FF",
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  category: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  discountBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 6,
  },
  addToCartText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deleteBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    borderLeftWidth: 1,
  },
});
