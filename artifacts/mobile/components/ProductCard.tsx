import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  const { addToCart, isInCart } = useApp();

  function handleAddToCart() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCart(product);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <View style={styles.imageContainer}>
        <Image source={product.image} style={styles.image} resizeMode="cover" />
        {product.discount && (
          <View style={[styles.discountBadge, { backgroundColor: colors.orange }]}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
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
            {" "}{product.rating}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.text }]}>
            ${product.price.toFixed(2)}
          </Text>
          <Pressable
            onPress={handleAddToCart}
            style={[styles.addBtn, { backgroundColor: isInCart(product.id) ? colors.accent : colors.primary }]}
          >
            <Feather
              name="plus"
              size={18}
              color={isInCart(product.id) ? colors.primary : colors.primaryForeground}
            />
          </Pressable>
        </View>
      </View>
    </View>
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
    backgroundColor: "#F5F7FF",
  },
  image: {
    width: "100%",
    height: "100%",
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
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
