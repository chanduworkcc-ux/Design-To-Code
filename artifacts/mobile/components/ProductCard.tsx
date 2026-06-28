import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useApp } from "@/context/AppContext";
import { Product, isNewProduct, PRODUCT_TAGS } from "@/data/products";
import { useColors } from "@/hooks/useColors";

interface ProductCardProps {
  product: Product;
  style?: object;
  index?: number;
}

export function ProductCard({ product, style, index = 0 }: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const inWishlist = isInWishlist(product.id);
  const inCart = isInCart(product.id);
  const stock = (product as any).stock ?? 100;
  const isOutOfStock = stock <= 0;
  const isNew = isNewProduct(product);

  const enterY = useSharedValue(50);
  const enterOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const pressTiltX = useSharedValue(0);
  const pressTiltY = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const addBtnScale = useSharedValue(1);
  const shimmerX = useSharedValue(-160);

  useEffect(() => {
    enterY.value = withDelay(
      index * 70,
      withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
    enterOpacity.value = withDelay(index * 70, withTiming(1, { duration: 500 }));
    shimmerX.value = withDelay(
      index * 70 + 200,
      withRepeat(
        withSequence(
          withTiming(160, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(160, { duration: 2000 }),
          withTiming(-160, { duration: 0 }),
        ),
        3, false
      )
    );
  }, []);

  function handlePressIn() {
    pressScale.value = withSpring(0.955, { damping: 18, stiffness: 380 });
    pressTiltX.value = withTiming(4, { duration: 130 });
    pressTiltY.value = withTiming(-2, { duration: 130 });
  }

  function handlePressOut() {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 250 });
    pressTiltX.value = withSpring(0, { damping: 12 });
    pressTiltY.value = withSpring(0, { damping: 12 });
  }

  function handleAddToCart() {
    if (isOutOfStock) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addBtnScale.value = withSequence(
      withTiming(1.35, { duration: 120, easing: Easing.out(Easing.back()) }),
      withSpring(1, { damping: 10 })
    );
    addToCart(product);
  }

  function handleWishlist() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withTiming(0, { duration: 80 }),
      withTiming(1.5, { duration: 180, easing: Easing.out(Easing.back()) }),
      withSpring(1, { damping: 9 })
    );
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

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [
      { translateY: enterY.value },
      { scale: pressScale.value },
      { perspective: 900 },
      { rotateX: `${pressTiltX.value}deg` },
      { rotateY: `${pressTiltY.value}deg` },
    ],
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const addBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addBtnScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: "20deg" }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.primary,
        },
        style,
        cardAnimStyle,
      ]}
    >
      <Pressable
        onPress={() => router.push(`/product/${product.id}` as any)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.secondary }]}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
            </View>
          )}

          <View style={styles.imageGradient} />

          <Animated.View
            pointerEvents="none"
            style={[styles.shimmerOverlay, shimmerStyle]}
          />

          {isOutOfStock ? (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockPill}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            </View>
          ) : (
            <View style={styles.badgeStack}>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {product.discount && product.discount > 0 ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{product.discount}%</Text>
                </View>
              ) : null}
            </View>
          )}

          <Animated.View style={[styles.wishlistWrapper, heartAnimStyle]}>
            <Pressable
              style={[
                styles.wishlistBtn,
                {
                  backgroundColor: inWishlist
                    ? "rgba(254,226,226,0.95)"
                    : "rgba(255,255,255,0.88)",
                },
              ]}
              onPress={handleWishlist}
              hitSlop={8}
            >
              <Feather
                name={inWishlist ? "heart" : "heart"}
                size={13}
                color={inWishlist ? "#EF4444" : colors.mutedForeground}
              />
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.info}>
          <Text style={[styles.category, { color: colors.primary }]}>
            {product.category.toUpperCase()}
          </Text>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={[styles.rating, { color: colors.mutedForeground }]}>
              {" "}{Number(product.rating).toFixed(1)}
            </Text>
          </View>
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagRow}>
              {product.tags.slice(0, 2).map((tag) => {
                const meta = PRODUCT_TAGS.find((t) => t.key === tag);
                if (!meta) return null;
                return (
                  <View key={tag} style={[styles.tagPill, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.tagText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.priceRow}>
            <View>
              <Text
                style={[
                  styles.price,
                  { color: isOutOfStock ? colors.mutedForeground : colors.text },
                ]}
              >
                ₹{Number(product.price).toLocaleString("en-IN")}
              </Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                  ₹{Number(product.originalPrice).toLocaleString("en-IN")}
                </Text>
              )}
            </View>
            <Animated.View style={addBtnAnimStyle}>
              <Pressable
                onPress={handleAddToCart}
                disabled={isOutOfStock}
                style={[
                  styles.addBtn,
                  {
                    backgroundColor: isOutOfStock
                      ? colors.border
                      : inCart
                      ? colors.accent
                      : colors.primary,
                    shadowColor: isOutOfStock ? "transparent" : colors.primary,
                  },
                ]}
              >
                <Feather
                  name={isOutOfStock ? "x" : inCart ? "check" : "plus"}
                  size={16}
                  color={isOutOfStock ? "#9CA3AF" : inCart ? colors.primary : "#fff"}
                />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    width: 160,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    height: 145,
    overflow: "hidden",
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
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  shimmerOverlay: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  badgeStack: {
    position: "absolute",
    top: 8,
    left: 8,
    gap: 4,
  },
  newBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 3,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.8,
  },
  discountBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  wishlistWrapper: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  wishlistBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    padding: 11,
    gap: 3,
  },
  category: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
  },
  name: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  rating: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  originalPrice: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tagPill: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.2,
  },
});
