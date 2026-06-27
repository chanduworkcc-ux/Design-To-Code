import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useApp } from "@/context/AppContext";
import { products as staticProducts } from "@/data/products";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Product } from "@/data/products";
import { FloatingOrb, FloatIn, PulsingRing } from "@/components/ThreeD";
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function getISTGreeting(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000);
  const hour = istTime.getUTCHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

interface Announcement { enabled: boolean; text: string; color: string; }
interface ApiBanner {
  id: string; title: string; subtitle: string | null; bgColor: string;
  textColor: string; ctaText: string; imageUrl: string | null;
  isActive: boolean; sortOrder: number;
}

// 3D notification badge
function NotifBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (count === 0) return;
    scale.value = withSequence(
      withTiming(1.4, { duration: 160, easing: Easing.out(Easing.back) }),
      withTiming(1,   { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  }, [count]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count === 0) return null;
  return (
    <Animated2.View style={[styles.notifBadge, style]}>
      <Text style={styles.notifBadgeText}>{count > 9 ? "9+" : count}</Text>
    </Animated2.View>
  );
}

// 3D pulsing cart badge
function CartBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (count === 0) return;
    scale.value = withSequence(
      withTiming(1.4, { duration: 160, easing: Easing.out(Easing.back) }),
      withTiming(1,   { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  }, [count]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count === 0) return null;
  return (
    <Animated2.View style={[styles.cartBadge, style]}>
      <Text style={styles.cartBadgeText}>{count}</Text>
    </Animated2.View>
  );
}

// 3D floating "NEW" label for sections
function FloatingLabel({ label, color }: { label: string; color: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(4,  { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { perspective: 400 }, { rotateX: "8deg" }],
  }));
  return (
    <Animated2.View style={[styles.floatingLabel, { backgroundColor: color }, style]}>
      <Text style={styles.floatingLabelText}>{label}</Text>
    </Animated2.View>
  );
}

// Animated section header that tilts in
function SectionHeader3D({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  const colors = useColors();
  const tilt = useSharedValue(-6);
  const op = useSharedValue(0);
  useEffect(() => {
    tilt.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    op.value = withTiming(1, { duration: 400 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ perspective: 600 }, { rotateX: `${tilt.value}deg` }],
  }));
  return (
    <Animated2.View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && actionLabel && (
        <Pressable onPress={action}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated2.View>
  );
}

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const { token, user } = useAuth();
  const { unreadCount } = useNotifications();

  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const marqueeAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    await Promise.all([fetchProducts(), fetchBanners(), fetchAnnouncement()]);
  }

  async function fetchAnnouncement() {
    try {
      const res = await fetch(`${BASE_URL}/announcement`);
      if (res.ok) { const d = await res.json(); setAnnouncement(d); }
    } catch {}
  }

  async function fetchProducts() {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/products`, { headers });
      if (res.ok) {
        const d = await res.json();
        if (d.products && d.products.length > 0) setProducts(d.products);
      }
    } catch {}
    setLoadingProducts(false);
  }

  async function fetchBanners() {
    try {
      const res = await fetch(`${BASE_URL}/banners`);
      if (res.ok) { const d = await res.json(); setBanners(d.banners ?? []); }
    } catch {}
  }

  useEffect(() => {
    if (banners.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIdx((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners.length]);

  const featured = products.filter((p) => (p as any).featured ?? false).slice(0, 6);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle 3D background orbs — only in top area so they don't cover products */}
      <FloatingOrb color={colors.primary} size={160} style={{ top: -40, right: -50 }} delay={0}   amplitude={14} duration={4000} />
      <FloatingOrb color="#7C3AED"        size={120} style={{ top: 60,  left: -40  }} delay={800} amplitude={10} duration={3600} />

      {/* Announcement Bar */}
      {announcement?.enabled && !!announcement.text && (
        <View style={[styles.announcementBar, { backgroundColor: announcement.color || "#2563EB", paddingTop: topPadding }]}>
          <Text style={styles.announcementText} numberOfLines={1}>{announcement.text}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: (announcement?.enabled && announcement.text ? 0 : topPadding) + 12, paddingBottom: 100 }]}
      >
        {/* Header — float-in from top */}
        <FloatIn delay={0} distance={-20} style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require("@/assets/logo.png")} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={[styles.welcomeText, { color: colors.mutedForeground }]}>{getISTGreeting()} 👋</Text>
              <Text style={[styles.brandName, { color: colors.text }]}>{user?.name?.split(" ")[0] ?? "XyloCart"}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/notifications-user" as any)}
            >
              <Feather name="bell" size={20} color={colors.text} />
              <NotifBadge count={unreadCount} />
            </Pressable>
            <Pressable
              style={[styles.cartBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <Feather name="shopping-cart" size={20} color={colors.text} />
              <CartBadge count={cartCount} />
            </Pressable>
          </View>
        </FloatIn>

        {/* Search Bar — float-in */}
        <FloatIn delay={80} distance={16}>
          <Pressable
            style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/search")}
          >
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>Search products...</Text>
          </Pressable>
        </FloatIn>

        {/* Banners */}
        <FloatIn delay={160} distance={20}>
          {banners.length > 0 ? (
            <View style={[styles.bannerWrapper, { marginBottom: 20 }]}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={BANNER_WIDTH}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                  const newIdx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
                  setBannerIdx(newIdx);
                }}
                contentContainerStyle={{ gap: 0 }}
              >
                {banners.map((banner) => (
                  <View key={banner.id} style={[styles.apiBanner, { backgroundColor: banner.bgColor, width: BANNER_WIDTH }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: banner.textColor }]}>{banner.title}</Text>
                      {banner.subtitle && (
                        <Text style={[styles.bannerSubtitle, { color: banner.textColor + "CC" }]}>{banner.subtitle}</Text>
                      )}
                      <Pressable style={[styles.shopNowBtn, { borderColor: banner.textColor + "60" }]}>
                        <Text style={[styles.shopNowText, { color: banner.textColor }]}>{banner.ctaText}</Text>
                      </Pressable>
                    </View>
                    {/* 3D pulsing ring around banner icon */}
                    <View style={[styles.bannerIconBox, { backgroundColor: banner.textColor + "20" }]}>
                      <PulsingRing color={banner.textColor} size={70} delay={0} duration={2000} thickness={1.5} />
                      <Feather name="shopping-bag" size={32} color={banner.textColor} />
                    </View>
                  </View>
                ))}
              </ScrollView>
              {banners.length > 1 && (
                <View style={styles.bannerDots}>
                  {banners.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, { backgroundColor: i === bannerIdx ? colors.primary : colors.border, width: i === bannerIdx ? 16 : 6 }]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.bannerContainer}>
              <View style={[styles.bannerLeft, { backgroundColor: "#2563EB" }]}>
                <Text style={styles.bannerTag}>NEW ARRIVALS</Text>
                <Text style={styles.bannerTitle2}>Summer Collection{"\n"}2026</Text>
                <Pressable style={styles.shopNowBtnStatic}>
                  <Text style={styles.shopNowTextStatic}>Shop Now</Text>
                </Pressable>
              </View>
              <View style={[styles.bannerRight, { backgroundColor: "#FEF9EC" }]}>
                <View style={styles.categoryGrid}>
                  {[
                    { icon: "monitor", color: "#2563EB", bg: "#E8F5E9", label: "Electronics" },
                    { icon: "home",    color: "#7C3AED", bg: "#F3F0FF", label: "Home Goods"  },
                    { icon: "tag",     color: "#3B82F6", bg: "#EFF6FF", label: "Offers"      },
                  ].map((item) => (
                    <View key={item.icon} style={[styles.categoryItem, { backgroundColor: item.bg }]}>
                      <Feather name={item.icon as any} size={22} color={item.color} />
                      <Text style={styles.categoryItemText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </FloatIn>

        {/* Featured Section */}
        {featured.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <SectionHeader3D title="Featured" />
              <FloatingLabel label="✦ HOT" color="#EF4444" />
            </View>
            <FloatIn delay={240} distance={16}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ScrollView>
            </FloatIn>
          </>
        )}

        {/* All Products */}
        <View style={{ marginTop: featured.length > 0 ? 20 : 0 }}>
          <SectionHeader3D
            title="All Products"
            action={undefined}
          />
          {loadingProducts && (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {products.length === 0 ? (
          <FloatIn delay={300} distance={20} style={{ alignItems: "center", paddingVertical: 40, gap: 0 }}>
            <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <PulsingRing color={colors.primary} size={110} duration={2200} />
              <PulsingRing color={colors.primary} size={110} delay={1100} duration={2200} />
              <Animated2.View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
                <Feather name="package" size={38} color={colors.primary} />
              </Animated2.View>
            </View>
            <Text style={[{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 6 }]}>No products yet</Text>
            <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }]}>Check back soon for new arrivals</Text>
          </FloatIn>
        ) : (
          <FloatIn delay={280} distance={20}>
            <View style={styles.grid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} style={{ width: "47%" }} />
              ))}
            </View>
          </FloatIn>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  announcementBar: { paddingHorizontal: 16, paddingBottom: 10, alignItems: "center" },
  announcementText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 40, height: 40 },
  welcomeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  brandName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, position: "relative" },
  notifBadge: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingHorizontal: 3 },
  notifBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cartBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, position: "relative" },
  cartBadge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  searchPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bannerWrapper: { borderRadius: 16, overflow: "hidden" },
  apiBanner: { height: 140, flexDirection: "row", alignItems: "center", padding: 18, gap: 12, borderRadius: 16 },
  bannerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  bannerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  shopNowBtn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderRadius: 20 },
  shopNowText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bannerIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { height: 6, borderRadius: 3, backgroundColor: "#E5EAF8" },
  bannerContainer: { flexDirection: "row", borderRadius: 16, overflow: "hidden", marginBottom: 20, height: 150 },
  bannerLeft: { flex: 1.2, padding: 16, justifyContent: "space-between" },
  bannerTag: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  bannerTitle2: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  shopNowBtnStatic: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: "flex-start" },
  shopNowTextStatic: { color: "#2563EB", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bannerRight: { flex: 0.8, padding: 8, justifyContent: "center" },
  categoryGrid: { flexWrap: "wrap", flexDirection: "row", gap: 6, justifyContent: "center" },
  categoryItem: { width: 64, height: 64, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 4 },
  categoryItemText: { fontSize: 8, fontFamily: "Inter_500Medium", color: "#374151", textAlign: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  featuredList: { gap: 12, paddingRight: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  floatingLabel: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  floatingLabelText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
