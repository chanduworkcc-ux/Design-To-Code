import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  FlatList,
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
  withSequence,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import BurstAnimation, { type BurstHandle } from "@/components/BurstAnimation";
import { useSocket } from "@/context/SocketContext";

function HeartBurst({ onDone }: { onDone?: () => void }) {
  return null;
}

function WishlistEmpty3D() {
  const colors = useColors();
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(14,  { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(12,  { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotateZ: `${tilt.value}deg` }, { perspective: 500 }],
  }));
  return (
    <View style={{ width: "100%", height: 190, alignItems: "center", justifyContent: "center", overflow: "visible", marginBottom: 8 }}>
      <View style={{ width: 130, height: 130, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }, iconStyle]}>
          <Feather name="heart" size={42} color="#EF4444" />
        </Animated.View>
      </View>
    </View>
  );
}

function WishlistCard({
  item,
  onAddToCart,
  onRemove,
  isInCart,
}: {
  item: any;
  onAddToCart: (item: any) => void;
  onRemove: (id: string) => void;
  isInCart: boolean;
}) {
  const colors = useColors();
  const burstRef = useRef<BurstHandle>(null);
  const cartBurstRef = useRef<BurstHandle>(null);
  const heartScale = useSharedValue(1);
  const cartScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));
  const cartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }));

  function handleAddToCart() {
    if (isInCart) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cartScale.value = withSequence(
      withTiming(0.85, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withSpring(1.15, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    cartBurstRef.current?.trigger();
    onAddToCart(item);
  }

  function handleRemove() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 400 }),
      withTiming(0, { duration: 220 }),
    );
    burstRef.current?.trigger();
    setTimeout(() => onRemove(item.id), 300);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            ₹{Number(item.price).toLocaleString("en-IN")}
          </Text>
          {item.discount && (
            <View style={[styles.discountBadge, { backgroundColor: colors.orange }]}>
              <Text style={styles.discountText}>-{item.discount}%</Text>
            </View>
          )}
        </View>

        <View style={{ position: "relative" }}>
          <Animated.View style={cartStyle}>
            <Pressable
              style={[
                styles.addToCartBtn,
                { backgroundColor: isInCart ? colors.accent : colors.primary },
              ]}
              onPress={handleAddToCart}
            >
              <Feather
                name="shopping-cart"
                size={14}
                color={isInCart ? colors.primary : "#fff"}
              />
              <Text style={[styles.addToCartText, { color: isInCart ? colors.primary : "#fff" }]}>
                {isInCart ? "In Cart" : "Add to Cart"}
              </Text>
            </Pressable>
          </Animated.View>
          <BurstAnimation
            ref={cartBurstRef}
            colors={["#2563EB", "#60A5FA", "#93C5FD", "#3B82F6"]}
            count={8}
            size={60}
          />
        </View>
      </View>

      <View style={{ position: "relative" }}>
        <Animated.View style={heartStyle}>
          <Pressable
            style={[styles.deleteBtn, { borderColor: colors.border }]}
            onPress={handleRemove}
          >
            <Feather name="heart" size={18} color="#EF4444" />
          </Pressable>
        </Animated.View>
        <BurstAnimation
          ref={burstRef}
          colors={["#EF4444", "#F87171", "#FCA5A5", "#FEE2E2", "#F59E0B"]}
          count={10}
          size={60}
        />
      </View>
    </View>
  );
}

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wishlist, removeFromWishlist, addToCart, isInCart } = useApp();
  const { emit } = useSocket();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  function handleAddToCart(item: any) {
    addToCart(item);
    emit("user:cart_add", { productId: item.id, productName: item.name });
  }

  if (wishlist.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: topPadding + 20 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Wishlist</Text>
          <View style={styles.emptyState}>
            <WishlistEmpty3D />
            <View style={{ display: "none" }}><Feather name="heart" size={52} color={colors.mutedForeground} /></View>
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
          <WishlistCard
            item={item}
            onAddToCart={handleAddToCart}
            onRemove={removeFromWishlist}
            isInCart={isInCart(item.id)}
          />
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
  shopBtn: { marginTop: 12, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  shopBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "visible",
    alignItems: "center",
  },
  image: { width: 100, height: 110, backgroundColor: "#F5F7FF" },
  info: { flex: 1, padding: 12, gap: 4 },
  category: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  discountBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
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
    height: 110,
    borderLeftWidth: 1,
  },
  emptyScene: { width: "100%", height: 190, alignItems: "center", justifyContent: "center", overflow: "visible", marginBottom: 8 },
  emptyIconBox: { width: 130, height: 130, alignItems: "center", justifyContent: "center" },
  emptyIconCircle3D: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
});
