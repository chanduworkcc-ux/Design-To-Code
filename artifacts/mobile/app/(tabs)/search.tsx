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
import { FloatIn, FloatingOrb, PulsingRing, FloatingParticle, SpinBox3D, GlowPulse } from "@/components/ThreeD";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function SearchOrb({ colors }: { colors: any }) {
  return (
    <View style={{ width: 180, height: 200, alignItems: "center", justifyContent: "center" }}>
      <PulsingRing color={colors.primary} size={160} duration={2000} delay={0}   thickness={1} />
      <PulsingRing color={colors.primary} size={120} duration={2000} delay={600} thickness={1.5} />
      <PulsingRing color="#818CF8"         size={88}  duration={1600} delay={300} thickness={1} />
      <FloatingParticle x={15}  startY={50}  color={colors.primary} delay={0}    size={5} duration={3800} />
      <FloatingParticle x={148} startY={90}  color="#818CF8"        delay={800}  size={4} duration={4200} />
      <FloatingParticle x={85}  startY={130} color={colors.primary} delay={400}  size={3} duration={3400} />
      <GlowPulse color={colors.primary} size={72}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: "rgba(255,255,255,0.18)" }} />
          <Feather name="search" size={30} color="#fff" />
        </View>
      </GlowPulse>
    </View>
  );
}

function IdleSearchScene({ colors }: { colors: any }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 32, gap: 18 }}>
      <View style={{ width: 200, height: 220, alignItems: "center", justifyContent: "center" }}>
        <PulsingRing color={colors.primary} size={190} duration={2400} delay={0}    thickness={0.8} />
        <PulsingRing color="#818CF8"         size={155} duration={2000} delay={500}  thickness={1} />
        <PulsingRing color={colors.primary} size={115} duration={1800} delay={1000} thickness={1.2} />
        <FloatingParticle x={0}   startY={80}  color={colors.primary} delay={0}    size={6} duration={4000} />
        <FloatingParticle x={178} startY={120} color="#818CF8"        delay={700}  size={4} duration={4600} />
        <FloatingParticle x={95}  startY={160} color={colors.primary} delay={350}  size={3} duration={3600} />
        <FloatingParticle x={160} startY={40}  color="#818CF8"        delay={1400} size={5} duration={5200} />
        <FloatingParticle x={20}  startY={150} color={colors.primary} delay={900}  size={4} duration={3200} />
        <SpinBox3D size={100} color={colors.primary} topColor="#60A5FA" sideColor="#1D4ED8" />
      </View>
      <FloatIn delay={200} distance={20}>
        <Text style={{ fontSize: 20, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>
          Discover Products
        </Text>
      </FloatIn>
      <FloatIn delay={350} distance={16}>
        <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 40 }}>
          Type something above to search across all categories
        </Text>
      </FloatIn>
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
    : [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background 3D ambient orbs */}
      <FloatingOrb color={colors.primary} size={260} style={{ top: -90, right: -90, opacity: 0.08 } as any} delay={0}    amplitude={18} duration={3600} />
      <FloatingOrb color="#818CF8"        size={180} style={{ top: 200, left: -80, opacity: 0.07 } as any} delay={800}  amplitude={12} duration={4200} />
      <FloatingOrb color={colors.primary} size={120} style={{ bottom: 160, right: -40, opacity: 0.05 } as any} delay={400} amplitude={10} duration={3000} />
      <FloatingParticle x={30}  startY={120} color={colors.primary} delay={0}    size={5} duration={4200} />
      <FloatingParticle x={280} startY={200} color="#818CF8"        delay={1200} size={4} duration={3600} />
      <FloatingParticle x={160} startY={300} color={colors.primary} delay={600}  size={3} duration={5000} />
      <FloatingParticle x={310} startY={420} color="#818CF8"        delay={2000} size={4} duration={4800} />
      <FloatingParticle x={50}  startY={500} color={colors.primary} delay={1500} size={3} duration={3800} />

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
        ) : (
          <FloatIn delay={150} distance={30}>
            <IdleSearchScene colors={colors} />
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
