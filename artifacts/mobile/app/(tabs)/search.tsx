import { Feather } from "@expo/vector-icons";
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

function SearchOrb({ colors }: { colors: any }) {
  return (
    <View style={{ width: 120, height: 140, alignItems: "center", justifyContent: "center" }}>
      <PulsingRing color={colors.primary} size={90} duration={1800} thickness={1.5} />
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: "rgba(255,255,255,0.18)" }} />
        <Feather name="search" size={30} color="#fff" />
      </View>
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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

        {filtered.length > 0 ? (
          <FloatIn delay={100} distance={20}>
            <View>
              {query.trim() ? (
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Results ({filtered.length})
                </Text>
              ) : null}
              <View style={styles.grid}>
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} style={{ width: "47%" }} />
                ))}
              </View>
            </View>
          </FloatIn>
        ) : query.trim() ? (
          <FloatIn delay={100} distance={30}>
            <View style={styles.emptyState}>
              <SearchOrb colors={colors} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("noResults")}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {t("noResultsSub")}
              </Text>
            </View>
          </FloatIn>
        ) : null}
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
  sectionTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 14 },
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
