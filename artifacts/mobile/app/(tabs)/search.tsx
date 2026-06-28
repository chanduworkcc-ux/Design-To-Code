import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Image,
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
import { products } from "@/data/products";
import { useColors } from "@/hooks/useColors";

const TRENDING = ["Wireless Earbuds", "Linen Shirt", "Dark Chocolate", "Yoga Mat", "Smart Watch"];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const results = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image source={require("@/assets/logo-nobg.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Search</Text>
        </View>

        {/* Search Input */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search products, categories..."
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

        {/* Trending or Results */}
        {query.trim() === "" ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending</Text>
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
        ) : results.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Results ({results.length})
            </Text>
            <View style={styles.grid}>
              {results.map((product) => (
                <ProductCard key={product.id} product={product} style={{ width: "47%" }} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Try a different search term
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
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    padding: 0,
  },
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
