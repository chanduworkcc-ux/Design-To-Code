import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useApp } from "@/context/AppContext";
import { Product } from "@/data/products";
import { useColors } from "@/hooks/useColors";

interface ProductCardProps {
  product: Product;
  style?: object;
}

export function ProductCard({ product, style }: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const inWishlist = isInWishlist(product.id);
  const inCart = isInCart(product.id);
  const stock = (product as any).stock ?? 100;
  const isOutOfStock = stock <= 0;

  function handleAddToCart() {
    if (isOutOfStock) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCart(product);
  }

  function handleWishlist() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }

  const imageSource: any = (product as any).image
    ? (product as any).image
    : product.imageUrl
    ? { uri: product.imageUrl }
    : null;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}
      onPress={() => router.push(`/product/${product.id}` as any)}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.secondary }]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="package" size={36} color={colors.mutedForeground} />
          </View>
        )}
        {isOutOfStock ? (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        ) : (
          product.discount && product.discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.orange }]}>
              <Text style={styles.discountText}>-{product.discount}%</Text>
            </View>
          )
        )}
        <Pressable
          style={[
            styles.wishlistBtn,
            { backgroundColor: inWishlist ? "#FEE2E2" : "rgba(255,255,255,0.92)" },
          ]}
          onPress={handleWishlist}
        >
          <Feather
            name="heart"
            size={14}
            color={inWishlist ? "#EF4444" : colors.mutedForeground}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.primary }]}>
          {product.category.toUpperCase()}
        </Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.ratingRow}>
          <Feather name="star" size={12} color={colors.orange} />
          <Text style={[styles.rating, { color: colors.mutedForeground }]}>
            {" "}{Number(product.rating).toFixed(1)}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.price, { color: isOutOfStock ? colors.mutedForeground : colors.text }]}>
              ₹{Number(product.price).toLocaleString("en-IN")}
            </Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                ₹{Number(product.originalPrice).toLocaleString("en-IN")}
              </Text>
            )}
          </View>
          <Pressable
            onPress={handleAddToCart}
            disabled={isOutOfStock}
            style={[
              styles.addBtn,
              {
                backgroundColor: isOutOfStock
                  ? "#E5E7EB"
                  : inCart
                  ? colors.accent
                  : colors.primary,
              },
            ]}
          >
            <Feather
              name={isOutOfStock ? "x" : inCart ? "check" : "plus"}
              size={18}
              color={isOutOfStock ? "#9CA3AF" : inCart ? colors.primary : colors.primaryForeground}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    width: 160,
  },
  imageContainer: {
    position: "relative",
    height: 140,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  wishlistBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 10,
    gap: 3,
  },
  category: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  rating: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
