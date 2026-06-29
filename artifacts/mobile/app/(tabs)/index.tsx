import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated as RNAnimated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useApp } from "@/context/AppContext";
import { products as staticProducts } from "@/data/products";
import { useColors } from "@/hooks/useColors";
import { usePageTracker } from "@/hooks/usePageTracker";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import { Product } from "@/data/products";
import LoadingScreen from "@/components/LoadingScreen";
import { GlobalFooter } from "@/components/GlobalFooter";
import { FloatingOrb, FloatIn, PulsingRing, FloatingParticle, SpinBox3D } from "@/components/ThreeD";
import { useSocket } from "@/context/SocketContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function getISTGreeting(): string {
  const istTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const hour = istTime.getUTCHours();
  const min = istTime.getUTCMinutes();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && (hour < 19 || (hour === 19 && min < 50))) return "Good Evening";
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

function NotifBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (count === 0) return;
    scale.value = withSequence(
      withTiming(1.5, { duration: 150, easing: Easing.out(Easing.back()) }),
      withSpring(1, { damping: 10 }),
    );
  }, [count]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count === 0) return null;
  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </Animated.View>
  );
}

function CartBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (count === 0) return;
    scale.value = withSequence(
      withTiming(1.5, { duration: 150, easing: Easing.out(Easing.back()) }),
      withSpring(1, { damping: 10 }),
    );
  }, [count]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count === 0) return null;
  return (
    <Animated.View style={[styles.badge, { backgroundColor: "#2563EB" }, style]}>
      <Text style={styles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

function AnimatedBanner({ banner, width }: { banner: ApiBanner; width: number }) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const iconBob = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 450 });
    iconBob.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconBob.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.apiBanner,
        { backgroundColor: banner.bgColor, width },
        containerStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={[styles.bannerTag, { backgroundColor: banner.textColor + "22" }]}>
          <Text style={[styles.bannerTagText, { color: banner.textColor }]}>FEATURED</Text>
        </View>
        <Text style={[styles.bannerTitle, { color: banner.textColor }]}>{banner.title}</Text>
        {banner.subtitle && (
          <Text style={[styles.bannerSubtitle, { color: banner.textColor + "BB" }]}>
            {banner.subtitle}
          </Text>
        )}
        <Pressable style={[styles.bannerCta, { backgroundColor: banner.textColor + "22", borderColor: banner.textColor + "55" }]}>
          <Text style={[styles.bannerCtaText, { color: banner.textColor }]}>{banner.ctaText}</Text>
          <Feather name="arrow-right" size={12} color={banner.textColor} />
        </Pressable>
      </View>
      <View style={styles.bannerIconArea}>
        <PulsingRing color={banner.textColor} size={72} duration={2000} thickness={1.5} />
        <Animated.View
          style={[
            styles.bannerIconBox,
            { backgroundColor: banner.textColor + "25" },
            iconStyle,
          ]}
        >
          <Feather name="shopping-bag" size={28} color={banner.textColor} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function SectionHeader({ title, onAction, actionLabel }: { title: string; onAction?: () => void; actionLabel?: string }) {
  const colors = useColors();
  const scaleX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scaleX.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, []);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
    opacity: opacity.value,
  }));
  const headerOpacity = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.sectionHeader, headerOpacity]}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Animated.View
          style={[
            styles.sectionUnderline,
            { backgroundColor: colors.primary },
            underlineStyle,
          ]}
        />
      </View>
      {onAction && actionLabel && (
        <Pressable
          style={[styles.seeAllBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
          onPress={onAction}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>{actionLabel}</Text>
          <Feather name="chevron-right" size={12} color={colors.primary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

function HotLabel() {
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { perspective: 400 },
      { rotateX: "10deg" },
    ],
  }));
  return (
    <Animated.View style={[styles.hotLabel, style]}>
      <Text style={styles.hotLabelText}>🔥 HOT</Text>
    </Animated.View>
  );
}

export default function ShopScreen() {
  usePageTracker("home", "Home");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { cartCount } = useApp();
  const { token, user } = useAuth();
  const { unreadCount } = useNotifications();
  const { socket } = useSocket();

  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [sortBy, setSortBy] = useState<string>("default");
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const marqueeAnim = useRef(new RNAnimated.Value(SCREEN_WIDTH)).current;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const searchPressScale = useSharedValue(1);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const onProductsUpdated = () => { fetchProducts(); };
    socket.on("products:updated", onProductsUpdated);
    return () => { socket.off("products:updated", onProductsUpdated); };
  }, [socket]);

  async function fetchData() {
    await Promise.all([fetchProducts(), fetchBanners(), fetchAnnouncement()]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchBanners(), fetchAnnouncement()]);
    setRefreshing(false);
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

  const SORT_OPTIONS = [
    { key: "default",    label: "Default"   },
    { key: "price_asc",  label: "Price ↑"   },
    { key: "price_desc", label: "Price ↓"   },
    { key: "name_asc",   label: "A → Z"     },
    { key: "name_desc",  label: "Z → A"     },
    { key: "top_rated",  label: "⭐ Top"    },
  ];

  const sortedProducts = (() => {
    let list = [...products];
    if (sortBy === "top_rated")  list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    if (sortBy === "price_asc")  list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sortBy === "price_desc") list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sortBy === "name_asc")   list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sortBy === "name_desc")  list.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
    return list;
  })();

  const searchAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchPressScale.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoadingScreen visible={loadingProducts} message="Loading products" />

      {/* Announcement bar */}
      {announcement?.enabled && !!announcement.text && (
        <View
          style={[
            styles.announcementBar,
            { backgroundColor: announcement.color || "#2563EB", paddingTop: topPadding },
          ]}
        >
          <Feather name="zap" size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.announcementText} numberOfLines={1}>
            {announcement.text}
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop:
              (announcement?.enabled && announcement.text ? 0 : topPadding) + 16,
            paddingBottom: 110,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <FloatIn delay={0} distance={30}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Logo */}
              <View style={styles.logoWrapper}>
                <Image
                  source={require("@/assets/logo-nobg.png")}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
                  {(() => { const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000); const h = ist.getUTCHours(); const m = ist.getUTCMinutes(); return h >= 5 && h < 12 ? t("goodMorning") : h >= 12 && h < 17 ? t("goodAfternoon") : h >= 17 && (h < 19 || (h === 19 && m < 50)) ? t("goodEvening") : t("goodNight"); })()} 👋
                </Text>
                <Text style={[styles.brandName, { color: colors.text }]}>
                  {user?.name?.split(" ")[0] ?? "XyloCart"}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/notifications-user" as any)}
              >
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                <NotifBadge count={unreadCount} />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, styles.iconBtnCart, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)/cart")}
              >
                <Ionicons name="cart" size={21} color="#fff" />
                <CartBadge count={cartCount} />
              </Pressable>
            </View>
          </View>
        </FloatIn>

        {/* ── Search Bar ── */}
        <FloatIn delay={80} distance={24}>
          <Animated.View style={searchAnimStyle}>
            <Pressable
              style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/search")}
              onPressIn={() => { searchPressScale.value = withSpring(0.97, { damping: 18 }); }}
              onPressOut={() => { searchPressScale.value = withSpring(1, { damping: 14 }); }}
            >
              <View style={[styles.searchIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="search" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
                {t("searchPlaceholder")}
              </Text>
              <View style={[styles.searchBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.searchBadgeText, { color: colors.mutedForeground }]}>
                  ⌘ K
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </FloatIn>

        {/* ── Banners ── */}
        <FloatIn delay={200} distance={28}>
          {banners.length > 0 ? (
            <View style={[styles.bannerWrapper, { marginBottom: 24 }]}>
              {/* 3D floating particles over banner */}
              <FloatingParticle x={20}  startY={60}  color="#fff" delay={0}    size={4} duration={3800} />
              <FloatingParticle x={260} startY={30}  color="#fff" delay={700}  size={3} duration={4200} />
              <FloatingParticle x={140} startY={100} color="#fff" delay={1400} size={5} duration={3500} />
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
              >
                {banners.map((banner) => (
                  <AnimatedBanner key={banner.id} banner={banner} width={BANNER_WIDTH} />
                ))}
              </ScrollView>
              {banners.length > 1 && (
                <View style={styles.bannerDots}>
                  {banners.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: i === bannerIdx ? colors.primary : colors.border,
                          width: i === bannerIdx ? 20 : 6,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.heroBanner, { marginBottom: 24 }]}>
              {/* Decorative orbs */}
              <FloatingOrb color="#60A5FA" size={120} style={{ top: -20, right: -20 }} delay={0} amplitude={10} />
              <FloatingOrb color="#818CF8" size={80} style={{ bottom: -10, left: 20 }} delay={600} amplitude={8} />
              {/* 3D particles */}
              <FloatingParticle x={18}  startY={50}  color="#fff" delay={0}    size={4} duration={3600} />
              <FloatingParticle x={200} startY={20}  color="#60A5FA" delay={800}  size={3} duration={4200} />
              <FloatingParticle x={120} startY={100} color="#fff" delay={1600} size={5} duration={3900} />

              <View style={styles.heroBannerContent}>
                <View style={[styles.heroBannerLeft, { backgroundColor: "#1E3A8A" }]}>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW 2026</Text>
                  </View>
                  <Text style={styles.heroBannerTitle}>Summer{"\n"}Collection</Text>
                  <Pressable style={styles.heroShopBtn}>
                    <Text style={styles.heroShopBtnText}>Shop Now</Text>
                    <Feather name="arrow-right" size={13} color="#1E3A8A" />
                  </Pressable>
                </View>
                <View style={[styles.heroBannerRight, { backgroundColor: colors.secondary, overflow: "hidden" }]}>
                  {/* Spinning 3D box decoration */}
                  <View style={{ position: "absolute", top: -10, right: -10, opacity: 0.5 }}>
                    <SpinBox3D size={44} color="#2563EB" topColor="#60A5FA" sideColor="#1D4ED8" />
                  </View>
                  {[
                    { icon: "monitor", color: "#2563EB", bg: "#DBEAFE", label: "Electronics" },
                    { icon: "home",    color: "#7C3AED", bg: "#EDE9FE", label: "Home"        },
                    { icon: "tag",     color: "#059669", bg: "#D1FAE5", label: "Offers"      },
                  ].map((item) => (
                    <View key={item.icon} style={[styles.categoryChip, { backgroundColor: item.bg }]}>
                      <Feather name={item.icon as any} size={18} color={item.color} />
                      <Text style={[styles.categoryChipLabel, { color: item.color }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </FloatIn>


        {/* ── Featured ── */}
        {featured.length > 0 && (
          <FloatIn delay={260} distance={24}>
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("shopNow")}</Text>
                  <View style={[styles.sectionUnderline, { backgroundColor: colors.primary }]} />
                </View>
                <HotLabel />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 16 }}
              >
                {featured.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </ScrollView>
            </View>
          </FloatIn>
        )}

        {/* ── All Products ── */}
        <FloatIn delay={290} distance={20}>
          <SectionHeader title={t("allProducts")} />

          {/* Sort chips */}
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
                      shadowColor: "transparent",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    },
                  ]}
                  onPress={() => setSortBy(opt.key)}
                >
                  <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FloatIn>

        {sortedProducts.length === 0 ? (
          <FloatIn delay={360} distance={30}>
            <View style={styles.emptyState}>
              {/* 3-D spinning box with pulsing rings */}
              <View style={{ width: 180, height: 200, alignItems: "center", justifyContent: "center" }}>
                <PulsingRing color={colors.primary} size={160} duration={2000} delay={0}   thickness={1} />
                <PulsingRing color={colors.primary} size={130} duration={2000} delay={700} thickness={1.5} />
                <PulsingRing color="#818CF8"         size={100} duration={1600} delay={400} thickness={1} />
                <FloatingParticle x={10}  startY={60}  color={colors.primary} delay={0}    size={5} duration={3800} />
                <FloatingParticle x={150} startY={100} color="#818CF8"        delay={900}  size={4} duration={4400} />
                <FloatingParticle x={80}  startY={140} color={colors.primary} delay={450}  size={3} duration={3200} />
                <FloatingParticle x={130} startY={50}  color="#818CF8"        delay={1300} size={4} duration={5000} />
                <SpinBox3D size={90} color={colors.primary} topColor="#60A5FA" sideColor="#1D4ED8" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {sortBy === "featured" ? "No featured products" : "No products yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {sortBy === "featured" ? "Featured products will appear here" : "Check back soon for new arrivals"}
              </Text>
            </View>
          </FloatIn>
        ) : (
          <View style={styles.grid}>
            {sortedProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                style={{ width: "47%" }}
              />
            ))}
          </View>
        )}

        <GlobalFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  announcementBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  announcementText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: 0.3,
  },

  scroll: { paddingHorizontal: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrapper: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, overflow: "hidden" },
  logoGlow: { top: 0, left: 0 },
  headerLogo: { width: 52, height: 52 },
  greetingText: { fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 1 },
  brandName: { fontSize: 24, fontFamily: "DMSans_700Bold", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  iconBtnCart: { borderWidth: 0, shadowOpacity: 0.25, shadowColor: "#2563EB" },
  badge: {
    position: "absolute", top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#EF4444", paddingHorizontal: 3,
    borderWidth: 2, borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: "DMSans_700Bold" },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  searchPlaceholder: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular" },
  searchBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  searchBadgeText: { fontSize: 11, fontFamily: "DMSans_500Medium" },

  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  filterChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  bannerWrapper: { borderRadius: 20, overflow: "hidden" },
  apiBanner: {
    height: 148, flexDirection: "row", alignItems: "center",
    padding: 20, gap: 12, borderRadius: 20, overflow: "hidden",
  },
  bannerTag: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, marginBottom: 8,
  },
  bannerTagText: { fontSize: 9, fontFamily: "DMSans_700Bold", letterSpacing: 1 },
  bannerTitle: { fontSize: 19, fontFamily: "DMSans_700Bold", marginBottom: 4, lineHeight: 24 },
  bannerSubtitle: { fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 12 },
  bannerCta: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderRadius: 20,
  },
  bannerCtaText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  bannerIconArea: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  bannerIconBox: {
    width: 62, height: 62, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  bannerDots: {
    flexDirection: "row", justifyContent: "center",
    gap: 6, marginTop: 10,
  },
  dot: { height: 6, borderRadius: 3 },

  heroBanner: { borderRadius: 20, overflow: "hidden" },
  heroBannerContent: { flexDirection: "row", height: 156 },
  heroBannerLeft: {
    flex: 1.3, padding: 18, justifyContent: "space-between", overflow: "hidden",
  },
  newBadge: {
    alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8,
  },
  newBadgeText: { color: "#fff", fontSize: 9, fontFamily: "DMSans_700Bold", letterSpacing: 1 },
  heroBannerTitle: {
    color: "#fff", fontSize: 22, fontFamily: "DMSans_700Bold", lineHeight: 28,
  },
  heroShopBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: "flex-start",
  },
  heroShopBtnText: { color: "#1E3A8A", fontSize: 12, fontFamily: "DMSans_700Bold" },
  heroBannerRight: {
    flex: 0.7, padding: 10, gap: 8, justifyContent: "center",
  },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  categoryChipLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontFamily: "DMSans_700Bold", letterSpacing: -0.3 },
  sectionUnderline: {
    height: 3, width: 32, borderRadius: 2, marginTop: 4,
  },
  seeAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  seeAllText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  hotLabel: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "#EF4444", borderRadius: 10,
    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  hotLabelText: { color: "#fff", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 0.3 },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 12, justifyContent: "space-between",
  },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 0 },
  emptyCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 8 },
  emptySub: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", paddingHorizontal: 24 },
});
