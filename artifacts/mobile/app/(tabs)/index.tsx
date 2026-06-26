import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import { useApp } from "@/context/AppContext";
import { Category, categories, products } from "@/data/products";
import { useColors } from "@/hooks/useColors";

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [searchText, setSearchText] = useState("");

  const featured = products.filter((p) => p.featured);
  const filtered =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 12, paddingBottom: 100 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.mutedForeground }]}>
              Welcome back
            </Text>
            <Text style={[styles.brandName, { color: colors.text }]}>XyloCart</Text>
          </View>
          <Pressable
            style={[styles.cartBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <Feather name="shopping-cart" size={20} color={colors.text} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/search")}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
            Search products...
          </Text>
        </Pressable>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerLeft, { backgroundColor: "#2563EB" }]}>
            <Text style={styles.bannerTag}>NEW ARRIVALS</Text>
            <Text style={styles.bannerTitle}>Summer Collection{"\n"}2026</Text>
            <Pressable style={styles.shopNowBtn}>
              <Text style={styles.shopNowText}>Shop Now</Text>
            </Pressable>
          </View>
          <View style={[styles.bannerRight, { backgroundColor: "#FEF9EC" }]}>
            <View style={styles.categoryGrid}>
              <View style={[styles.categoryItem, { backgroundColor: "#E8F5E9" }]}>
                <Feather name="monitor" size={22} color="#2563EB" />
                <Text style={styles.categoryItemText}>Electronics</Text>
              </View>
              <View style={[styles.categoryItem, { backgroundColor: "#F3F0FF" }]}>
                <Feather name="home" size={22} color="#7C3AED" />
                <Text style={styles.categoryItemText}>Home Goods</Text>
              </View>
              <View style={[styles.categoryItem, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="home" size={22} color="#3B82F6" />
                <Text style={styles.categoryItemText}>Home Goods</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Featured Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured</Text>
          <Pressable>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        >
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ScrollView>

        {/* All Products Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 16, marginTop: 20 }]}>
          All Products
        </Text>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                setSelectedCategory(cat);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCategory === cat ? colors.primary : colors.card,
                  borderColor: selectedCategory === cat ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedCategory === cat ? colors.primaryForeground : colors.text },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Product Grid */}
        <View style={styles.grid}>
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              style={{ width: "47%" }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  brandName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bannerContainer: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    height: 150,
  },
  bannerLeft: {
    flex: 1.2,
    padding: 16,
    justifyContent: "space-between",
  },
  bannerTag: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  shopNowBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  shopNowText: {
    color: "#2563EB",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  bannerRight: {
    flex: 0.8,
    padding: 8,
    justifyContent: "center",
  },
  categoryGrid: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  categoryItem: {
    width: 64,
    height: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  categoryItemText: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    color: "#374151",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  featuredList: { gap: 12, paddingRight: 16 },
  chips: { gap: 8, paddingBottom: 12, paddingRight: 16 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
});
