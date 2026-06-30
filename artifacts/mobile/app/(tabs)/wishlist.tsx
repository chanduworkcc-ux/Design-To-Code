import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
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
import { usePageTracker } from "@/hooks/usePageTracker";
import { useLanguage } from "@/context/LanguageContext";
import BurstAnimation, { type BurstHandle } from "@/components/BurstAnimation";
import { useSocket } from "@/context/SocketContext";
import { FloatIn, FloatingOrb, FloatingParticle, TiltCard3D } from "@/components/ThreeD";

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
          <Ionicons name="heart" size={42} color="#EF4444" />
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
              <Ionicons
                name={isInCart ? "cart" : "cart-outline"}
                size={15}
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
            <Ionicons name="heart" size={18} color="#EF4444" />
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

const SORT_OPTIONS = [
  { key: "default",    label: "Default"  },
  { key: "price_asc",  label: "Price ↑"  },
  { key: "price_desc", label: "Price ↓"  },
  { key: "name_asc",   label: "A → Z"   },
  { key: "name_desc",  label: "Z → A"   },
  { key: "top_rated",  label: "⭐ Top"  },
];

export default function WishlistScreen() {
  usePageTracker("wishlist", "Wishlist");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { wishlist, removeFromWishlist, addToCart, isInCart } = useApp();
  const { emit } = useSocket();
  const [sortBy, setSortBy] = useState("default");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  function handleAddToCart(item: any) {
    addToCart(item);
    emit("user:cart_add", { productId: item.id, productName: item.name });
  }

  const sortedWishlist = (() => {
    let list = [...wishlist];
    if (sortBy === "top_rated")  list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    if (sortBy === "price_asc")  list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sortBy === "price_desc") list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sortBy === "name_asc")   list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sortBy === "name_desc")  list.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
    return list;
  })();

  if (wishlist.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Decorative background */}
        <FloatingOrb color="#EF4444" size={180} style={{ top: -40, right: -50, opacity: 0.07 } as any} delay={0} amplitude={12} />
        <FloatingOrb color="#F59E0B" size={120} style={{ bottom: 100, left: -40, opacity: 0.06 } as any} delay={700} amplitude={9} />
        <FloatingParticle x={40}  startY={140} color="#EF4444" delay={0}    size={5} duration={4000} />
        <FloatingParticle x={260} startY={220} color="#F59E0B" delay={900}  size={4} duration={3500} />
        <FloatingParticle x={150} startY={320} color="#EF4444" delay={500}  size={3} duration={5200} />
        <View style={[styles.emptyContainer, { paddingTop: topPadding + 20 }]}>
          <FloatIn delay={0} distance={24}>
            <View style={styles.pageHeader}>
              <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
              <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>{t("yourWishlist")}</Text>
            </View>
          </FloatIn>
          <View style={styles.emptyState}>
            <FloatIn delay={100} distance={40}>
              <WishlistEmpty3D />
            </FloatIn>
            <FloatIn delay={280} distance={20}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("wishlistEmpty")}</Text>
            </FloatIn>
            <FloatIn delay={360} distance={16}>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {t("wishlistEmptySub")}
              </Text>
            </FloatIn>
            <FloatIn delay={440} distance={16}>
              <Pressable
                style={[styles.shopBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)")}
              >
                <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>
                  Browse Products
                </Text>
              </Pressable>
            </FloatIn>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle background orbs */}
      <FloatingOrb color="#EF4444" size={160} style={{ top: -30, right: -50, opacity: 0.05 } as any} delay={0} amplitude={10} />
      <FloatingParticle x={20}  startY={100} color="#EF4444" delay={0}    size={4} duration={4500} />
      <FloatingParticle x={300} startY={180} color="#F59E0B" delay={1100} size={3} duration={3800} />
      <FlatList
        data={sortedWishlist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPadding + 16, paddingBottom: 100 + bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <FloatIn delay={0} distance={24}>
              <View style={styles.pageHeader}>
                <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
                <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
                  {t("yourWishlist")}{" "}
                  <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: "DMSans_400Regular" }}>
                    {wishlist.length} items
                  </Text>
                </Text>
              </View>
            </FloatIn>
            <FloatIn delay={80} distance={18}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={{ marginBottom: 16 }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? colors.primary + "18" : "transparent",
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSortBy(opt.key);
                        if (Platform.OS !== "web") Haptics.selectionAsync();
                      }}
                    >
                      <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </FloatIn>
          </View>
        }
        renderItem={({ item, index }) => (
          <TiltCard3D delay={index * 80}>
            <WishlistCard
              item={item}
              onAddToCart={handleAddToCart}
              onRemove={removeFromWishlist}
              isInCart={isInCart(item.id)}
            />
          </TiltCard3D>
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
  emptyTitle: { fontSize: 20, fontFamily: "DMSans_600SemiBold", marginTop: 8 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  shopBtn: { marginTop: 12, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  shopBtnText: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  title: { fontSize: 28, fontFamily: "DMSans_700Bold", marginBottom: 16 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  headerLogo: { width: 36, height: 36 },
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
  category: { fontSize: 10, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: "DMSans_600SemiBold", lineHeight: 20 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  price: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  discountBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: "#fff", fontSize: 11, fontFamily: "DMSans_700Bold" },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 6,
  },
  addToCartText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
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
  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
});
