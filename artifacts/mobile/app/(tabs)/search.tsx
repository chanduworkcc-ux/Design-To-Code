import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/data/products";
import { useColors } from "@/hooks/useColors";
import { usePageTracker } from "@/hooks/usePageTracker";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { FloatIn, FloatingOrb, PulsingRing, FloatingParticle } from "@/components/ThreeD";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const TRENDING = ["Wireless Earbuds", "Linen Shirt", "Dark Chocolate", "Yoga Mat", "Smart Watch"];

const SORT_OPTIONS = [
  { key: "default",    label: "Default"  },
  { key: "price_asc",  label: "Price ↑"  },
  { key: "price_desc", label: "Price ↓"  },
  { key: "name_asc",   label: "A → Z"   },
  { key: "name_desc",  label: "Z → A"   },
  { key: "top_rated",  label: "⭐ Top"  },
];

function SearchOrb({ colors }: { colors: any }) {
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    rot.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(16, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { scale: scale.value },
      { perspective: 400 },
      { rotateY: `${rot.value}deg` },
      { rotateX: "20deg" },
    ],
  }));

  const ringOuter = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scale.value, [0.92, 1.12], [1.3, 1.6]) }],
    opacity: interpolate(scale.value, [0.92, 1.12], [0.12, 0.04]),
  }));

  return (
    <View style={{ width: 120, height: 140, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary }, ringOuter]} />
      <PulsingRing color={colors.primary} size={90} duration={1800} thickness={1.5} />
      <Animated.View style={[{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, orbStyle]}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: "rgba(255,255,255,0.18)" }} />
        <Feather name="search" size={30} color="#fff" />
      </Animated.View>
    </View>
  );
}

export default function SearchScreen() {
  usePageTracker("search", "Search");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const searchBarScale = useSharedValue(1);
  const searchBarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchBarScale.value }],
  }));

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/products`, { headers });
      if (res.ok) {
        const d = await res.json();
        if (d.products) setAllProducts(d.products);
      }
    } catch {}
  }

  const filtered = query.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      )
    : allProducts;

  const sorted = (() => {
    let list = [...filtered];
    if (sortBy === "top_rated")  list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    if (sortBy === "price_asc")  list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sortBy === "price_desc") list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sortBy === "name_asc")   list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sortBy === "name_desc")  list.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
    return list;
  })();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Decorative background orbs */}
      <FloatingOrb color={colors.primary} size={200} style={{ top: -60, right: -70, opacity: 0.07 } as any} delay={0} amplitude={14} />
      <FloatingOrb color="#818CF8" size={140} style={{ top: 180, left: -60, opacity: 0.06 } as any} delay={800} amplitude={10} />
      <FloatingParticle x={30}  startY={120} color={colors.primary} delay={0}    size={5} duration={4200} />
      <FloatingParticle x={280} startY={200} color="#818CF8"        delay={1200} size={4} duration={3600} />
      <FloatingParticle x={160} startY={300} color={colors.primary} delay={600}  size={3} duration={5000} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <FloatIn delay={0} distance={28}>
          <Text style={[styles.title, { color: colors.text }]}>{t("search")}</Text>
        </FloatIn>

        {/* Search Input */}
        <FloatIn delay={80} distance={22}>
          <Animated.View style={searchBarStyle}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("searchPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCorrect={false}
                onFocus={() => { searchBarScale.value = withSpring(1.02, { damping: 14 }); }}
                onBlur={() => { searchBarScale.value = withSpring(1, { damping: 14 }); }}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </Animated.View>
        </FloatIn>

        {/* Sort Chips */}
        <FloatIn delay={160} distance={18}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={{ marginBottom: 20 }}
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

        {/* Trending or Results */}
        {query.trim() === "" && sortBy === "default" ? (
          <FloatIn delay={240} distance={24}>
            <View>
              <View style={{ alignItems: "center", marginBottom: 24, marginTop: 8 }}>
                <SearchOrb colors={colors} />
                <Text style={[styles.sectionTitle, { color: colors.text, textAlign: "center", marginTop: 12 }]}>{t("popularSearches")}</Text>
              </View>
              <View style={styles.trendingList}>
                {TRENDING.map((term, i) => (
                  <FloatIn key={term} delay={280 + i * 60} distance={16}>
                    <Pressable
                      onPress={() => {
                        setQuery(term);
                        if (Platform.OS !== "web") Haptics.selectionAsync();
                      }}
                      style={[styles.trendingChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Feather name="trending-up" size={13} color={colors.primary} />
                      <Text style={[styles.trendingText, { color: colors.text }]}>{term}</Text>
                    </Pressable>
                  </FloatIn>
                ))}
              </View>
            </View>
          </FloatIn>
        ) : sorted.length > 0 ? (
          <FloatIn delay={100} distance={20}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {query.trim() ? `Results (${sorted.length})` : `All Products (${sorted.length})`}
              </Text>
              <View style={styles.grid}>
                {sorted.map((product) => (
                  <ProductCard key={product.id} product={product} style={{ width: "47%" }} />
                ))}
              </View>
            </View>
          </FloatIn>
        ) : (
          <FloatIn delay={100} distance={30}>
            <View style={styles.emptyState}>
              <SearchOrb colors={colors} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("noResults")}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {t("noResultsSub")}
              </Text>
            </View>
          </FloatIn>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "DMSans_700Bold", marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    padding: 0,
  },
  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  sectionTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 14 },
  trendingList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  trendingText: { fontSize: 13, fontFamily: "DMSans_500Medium" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "DMSans_600SemiBold", marginTop: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "DMSans_400Regular" },
});
