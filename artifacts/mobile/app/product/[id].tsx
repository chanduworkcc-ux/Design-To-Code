import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { products as staticProducts } from "@/data/products";
import LoadingScreen from "@/components/LoadingScreen";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const IMAGE_HEIGHT = width * 0.82;

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  description?: string;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

function StarRow({ rating }: { rating: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={15}
          color={i <= Math.round(rating) ? "#F59E0B" : colors.border}
        />
      ))}
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginLeft: 4 }}>
        {Number(rating).toFixed(1)}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { apiRequest } = useAuth();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedAnim] = useState(new Animated.Value(1));
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({ inputRange: [IMAGE_HEIGHT - 80, IMAGE_HEIGHT - 40], outputRange: [0, 1], extrapolate: "clamp" });

  const inWishlist = product ? isInWishlist(product.id) : false;
  const inCart = product ? isInCart(product.id) : false;

  useEffect(() => {
    fetchProduct();
    fetchConfig();
  }, [id]);

  async function fetchProduct() {
    try {
      const res = await apiRequest(`/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        fetchRelated(data.product.category, data.product.id);
        setLoading(false);
        return;
      }
    } catch {}
    // Fallback: check static product list (for local/seed products with short IDs)
    const fallback = staticProducts.find((p) => p.id === id);
    if (fallback) {
      setProduct(fallback as any);
      setRelated(staticProducts.filter((p) => p.category === fallback.category && p.id !== fallback.id).slice(0, 6) as any);
    }
    setLoading(false);
  }

  async function fetchRelated(category: string, excludeId: string) {
    try {
      const res = await apiRequest("/products");
      if (res.ok) {
        const data = await res.json();
        setRelated(
          (data.products as Product[])
            .filter((p) => p.category === category && p.id !== excludeId)
            .slice(0, 6)
        );
      }
    } catch {}
  }

  async function fetchConfig() {
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/config/public`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data as Record<string, string>);
      }
    } catch {}
  }

  function handleAddToCart() {
    if (!product || product.stock <= 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart(product as any);
    Animated.sequence([
      Animated.timing(addedAnim, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.spring(addedAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  function handleWishlist() {
    if (!product) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inWishlist) removeFromWishlist(product.id);
    else addToWishlist(product as any);
  }

  const delivery = parseFloat(config["delivery_charge"]) || 0;
  const taxPct = parseFloat(config["tax_percentage"]) || 0;
  const service = parseFloat(config["service_charge"]) || 0;
  const maintenance = parseFloat(config["maintenance_charge"]) || 0;
  const subtotal = product?.price ?? 0;
  const taxAmt = parseFloat(((subtotal * taxPct) / 100).toFixed(2));
  const total = subtotal + delivery + taxAmt + service + maintenance;
  const savings = product?.originalPrice && product.originalPrice > product.price
    ? product.originalPrice - product.price : 0;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingScreen visible={true} message="Loading product" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12 }}>
          Product not found
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const stockCount = (product as any).stock ?? 100;
  const isOutOfStock = stockCount <= 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Floating header — appears when scrolled past image */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { paddingTop: insets.top, backgroundColor: colors.card, opacity: headerBg },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
      </Animated.View>

      {/* Always-visible back + wishlist buttons */}
      <View style={[styles.topButtons, { paddingTop: insets.top + 8 }]}>
        <Pressable style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.88)" }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: inWishlist ? "#FEE2E2" : "rgba(255,255,255,0.88)" }]}
          onPress={handleWishlist}
        >
          <Feather name="heart" size={20} color={inWishlist ? "#EF4444" : "#0F1740"} />
        </Pressable>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero image */}
        <View style={[styles.heroContainer, { backgroundColor: colors.secondary }]}>
          {(product as any).image || product.imageUrl ? (
            <Image
              source={(product as any).image ? (product as any).image : { uri: product.imageUrl! }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Feather name="package" size={64} color={colors.mutedForeground} />
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {!isOutOfStock && !!product.discount && product.discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.discountText}>-{product.discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>

          {/* Category + stock */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {product.category.toUpperCase()}
              </Text>
            </View>
            <View style={[
              styles.stockBadge,
              { backgroundColor: isOutOfStock ? "#FEF2F2" : "#ECFDF5" },
            ]}>
              <View style={[styles.stockDot, { backgroundColor: isOutOfStock ? "#EF4444" : "#10B981" }]} />
              <Text style={[styles.stockText, { color: isOutOfStock ? "#EF4444" : "#10B981" }]}>
                {isOutOfStock ? "Out of Stock" : `${stockCount} in stock`}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <StarRow rating={product.rating} />
            <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
              ({Math.floor(product.rating * 31 + 12)} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>
                ₹{Number(product.price).toLocaleString("en-IN")}
              </Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                  ₹{Number(product.originalPrice).toLocaleString("en-IN")}
                </Text>
              )}
            </View>
            {savings > 0 && (
              <View style={styles.savingsRow}>
                <Feather name="tag" size={12} color="#10B981" />
                <Text style={styles.savingsText}>
                  You save ₹{savings.toLocaleString("en-IN")}
                </Text>
              </View>
            )}

            {/* Price breakdown toggle */}
            <Pressable style={styles.breakdownToggle} onPress={() => setShowBreakdown(!showBreakdown)}>
              <Text style={[styles.breakdownLabel, { color: colors.primary }]}>
                {showBreakdown ? "Hide" : "View"} price breakdown
              </Text>
              <Feather name={showBreakdown ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
            </Pressable>

            {showBreakdown && (
              <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
                <BreakdownRow label="Subtotal" value={subtotal} colors={colors} />
                {delivery > 0 && <BreakdownRow label="Delivery charge" value={delivery} colors={colors} />}
                {taxAmt > 0 && <BreakdownRow label={`GST (${taxPct}%)`} value={taxAmt} colors={colors} />}
                {service > 0 && <BreakdownRow label="Service charge" value={service} colors={colors} />}
                {maintenance > 0 && <BreakdownRow label="Maintenance charge" value={maintenance} colors={colors} />}
                <View style={[styles.breakdownTotal, { borderTopColor: colors.border }]}>
                  <Text style={[styles.breakdownTotalLabel, { color: colors.text }]}>Est. Total</Text>
                  <Text style={[styles.breakdownTotalValue, { color: colors.text }]}>
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          {!!product.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Policy badges */}
          {(config["no_returns"] === "true" || config["no_refunds"] === "true" || config["no_exchanges"] === "true") && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Policy</Text>
              <View style={styles.policyRow}>
                {config["no_returns"] === "true" && (
                  <View style={[styles.policyBadge, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                    <Feather name="x-circle" size={13} color="#EF4444" />
                    <Text style={[styles.policyText, { color: "#EF4444" }]}>No Returns</Text>
                  </View>
                )}
                {config["no_refunds"] === "true" && (
                  <View style={[styles.policyBadge, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                    <Feather name="x-circle" size={13} color="#EF4444" />
                    <Text style={[styles.policyText, { color: "#EF4444" }]}>No Refunds</Text>
                  </View>
                )}
                {config["no_exchanges"] === "true" && (
                  <View style={[styles.policyBadge, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                    <Feather name="x-circle" size={13} color="#EF4444" />
                    <Text style={[styles.policyText, { color: "#EF4444" }]}>No Exchanges</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Delivery info */}
          {!!config["delivery_info"] && (
            <View style={[styles.deliveryBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
              <Feather name="truck" size={15} color="#2563EB" />
              <Text style={[styles.deliveryText, { color: "#1D4ED8" }]}>{config["delivery_info"]}</Text>
            </View>
          )}

          {/* Disclaimer */}
          {!!config["product_disclaimer"] && (
            <View style={[styles.disclaimerBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                {config["product_disclaimer"]}
              </Text>
            </View>
          )}

          {/* Related products */}
          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>More from {product.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {related.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[styles.relatedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                  >
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.relatedImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.relatedImagePlaceholder, { backgroundColor: colors.secondary }]}>
                        <Feather name="package" size={24} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={styles.relatedInfo}>
                      <Text style={[styles.relatedName, { color: colors.text }]} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.bottomPrice}>
          <Text style={[styles.bottomPriceLabel, { color: colors.mutedForeground }]}>Price</Text>
          <Text style={[styles.bottomPriceValue, { color: colors.text }]}>
            ₹{Number(product.price).toLocaleString("en-IN")}
          </Text>
        </View>
        <Animated.View style={{ flex: 1, transform: [{ scale: addedAnim }] }}>
          <Pressable
            style={[
              styles.addToCartBtn,
              {
                backgroundColor: isOutOfStock ? "#E5E7EB" : inCart ? colors.accent : colors.primary,
              },
            ]}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
          >
            <Feather
              name={isOutOfStock ? "x" : inCart ? "check" : "shopping-cart"}
              size={18}
              color={isOutOfStock ? "#9CA3AF" : inCart ? colors.primary : "#fff"}
            />
            <Text style={[styles.addToCartText, { color: isOutOfStock ? "#9CA3AF" : inCart ? colors.primary : "#fff" }]}>
              {isOutOfStock ? "Out of Stock" : inCart ? "Added to Cart" : "Add to Cart"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function BreakdownRow({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownRowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.breakdownRowValue, { color: colors.text }]}>
        ₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 10,
    paddingHorizontal: 70,
    alignItems: "center",
  },
  floatingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  topButtons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroContainer: { width, height: IMAGE_HEIGHT, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  discountBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 20, gap: 18 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  stockBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  productName: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 30 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ratingCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  price: { fontSize: 26, fontFamily: "Inter_700Bold" },
  originalPrice: { fontSize: 15, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  savingsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  savingsText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981" },
  breakdownToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  breakdownLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  breakdown: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 8 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between" },
  breakdownRowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  breakdownRowValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  breakdownTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  breakdownTotalValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  policyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  policyBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  policyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deliveryBox: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 12, borderWidth: 1 },
  deliveryText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  disclaimerBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  relatedCard: { width: 130, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  relatedImage: { width: 130, height: 100 },
  relatedImagePlaceholder: { width: 130, height: 100, alignItems: "center", justifyContent: "center" },
  relatedInfo: { padding: 8, gap: 4 },
  relatedName: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 16 },
  relatedPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomPrice: { gap: 2 },
  bottomPriceLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomPriceValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addToCartText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
