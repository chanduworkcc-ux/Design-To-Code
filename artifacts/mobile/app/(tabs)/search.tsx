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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/data/products";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

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

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>{t("search")}</Text>

        {/* Search Input */}
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
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Sort Chips */}
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

        {/* Trending or Results */}
        {query.trim() === "" && sortBy === "default" ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("popularSearches")}</Text>
            <View style={styles.trendingList}>
              {TRENDING.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => {
                    setQuery(term);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                  style={[styles.trendingChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name="trending-up" size={13} color={colors.primary} />
                  <Text style={[styles.trendingText, { color: colors.text }]}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : sorted.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {query.trim() ? `Results (${sorted.length})` : `All Products (${sorted.length})`}
            </Text>
            <View style={styles.grid}>
              {sorted.map((product) => (
                <ProductCard key={product.id} product={product} style={{ width: "47%" }} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("noResults")}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {t("noResultsSub")}
            </Text>
          </View>
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
