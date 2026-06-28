import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function Empty3DCart() {
  const colors = useColors();
  const router = useRouter();
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);

  React.useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(14,  { duration: 1700, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
        withTiming(10,  { duration: 2100, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotateZ: `${tilt.value}deg` }, { perspective: 500 }],
  }));

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyScene}>
        <View style={styles.emptyIconBox}>
          <Animated2.View style={[styles.emptyIconCircle, { backgroundColor: colors.card }, iconStyle]}>
            <Feather name="shopping-cart" size={42} color={colors.primary} />
          </Animated2.View>
        </View>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
        Browse the shop and add something you love
      </Text>
      <Pressable
        style={[styles.startBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/(tabs)")}
      >
        <Feather name="shopping-bag" size={16} color="#fff" />
        <Text style={styles.startBtnText}>Browse Products</Text>
      </Pressable>
    </View>
  );
}

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, removeFromCart, cartTotal, cartRemovalNotice, dismissCartRemovalNotice, checkCartStock } = useApp();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const checkingRef = useRef(false);
  const [storeOpen, setStoreOpen] = useState(true);

  const delivery = 0;
  const total = Number(cartTotal) + delivery;

  useEffect(() => {
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => setStoreOpen((d.store_status ?? "on") !== "off"))
      .catch(() => {});
  }, []);

  // Check live stock every time the cart screen is focused
  useFocusEffect(
    useCallback(() => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      checkCartStock(apiRequest).finally(() => {
        checkingRef.current = false;
      });
    }, [checkCartStock, apiRequest])
  );

  if (cart.length === 0 && !cartRemovalNotice) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyWrap, { paddingTop: topPadding + 24 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 0 }}>
            <Image source={require("@/assets/logo-nobg.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
            <Text style={[styles.title, { color: colors.text }]}>Cart</Text>
          </View>
          <Empty3DCart />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 24, paddingBottom: 260 + bottomInset }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image source={require("@/assets/logo-nobg.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Cart</Text>
        </View>

        {/* Out-of-stock removal banner */}
        {cartRemovalNotice && (
          <View style={styles.removalBanner}>
            <View style={styles.removalLeft}>
              <View style={styles.removalIconBox}>
                <Feather name="alert-triangle" size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.removalTitle}>Item Removed from Cart</Text>
                <Text style={styles.removalBody}>
                  <Text style={styles.removalProductName}>"{cartRemovalNotice.productName}"</Text>
                  {" "}went out of stock and was removed from your cart. Your total has been updated.
                </Text>
              </View>
            </View>
            <Pressable style={styles.removalDismiss} onPress={dismissCartRemovalNotice}>
              <Feather name="x" size={15} color="#92400E" />
            </Pressable>
          </View>
        )}

        {/* Store Closed Banner */}
        {!storeOpen && (
          <View style={[styles.storeClosedBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <View style={[styles.policyIconBox, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="x-circle" size={14} color="#DC2626" />
            </View>
            <Text style={[styles.policyText, { color: "#991B1B" }]}>
              The store is currently closed. You can browse items but cannot place orders right now.
            </Text>
          </View>
        )}

        {/* Policy Banner */}
        {cart.length > 0 && (
          <View style={[styles.policyBanner, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <View style={[styles.policyIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="alert-circle" size={14} color="#D97706" />
            </View>
            <Text style={[styles.policyText, { color: "#92400E" }]}>
              One item per order · No returns or refunds · All sales final
            </Text>
          </View>
        )}

        {/* Cart Items */}
        {cart.map((cartItem) => {
          const src: any = (cartItem as any).image
            ? (cartItem as any).image
            : cartItem.imageUrl
            ? { uri: cartItem.imageUrl }
            : null;

          const hasDiscount =
            (cartItem as any).originalPrice &&
            Number((cartItem as any).originalPrice) > Number(cartItem.price);

          const discountPct = hasDiscount
            ? Math.round(
                ((Number((cartItem as any).originalPrice) - Number(cartItem.price)) /
                  Number((cartItem as any).originalPrice)) *
                  100
              )
            : 0;

          return (
            <View
              key={cartItem.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Image */}
              <View style={styles.imageWrap}>
                {src ? (
                  <Image source={src} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
                    <Feather name="package" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{discountPct}%</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.info}>
                <Text style={[styles.category, { color: colors.primary }]}>
                  {cartItem.category.toUpperCase()}
                </Text>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {cartItem.name}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: colors.text }]}>
                    ₹{Number(cartItem.price).toLocaleString("en-IN")}
                  </Text>
                  {hasDiscount && (
                    <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                      ₹{Number((cartItem as any).originalPrice).toLocaleString("en-IN")}
                    </Text>
                  )}
                </View>

                <View style={[styles.qtyPill, { backgroundColor: colors.secondary }]}>
                  <Feather name="check" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.qtyText, { color: colors.mutedForeground }]}>Qty: 1</Text>
                </View>
              </View>

              {/* Delete */}
              <Pressable
                style={[styles.deleteBtn, { backgroundColor: "#FEF2F2" }]}
                onPress={() => removeFromCart(cartItem.id)}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
              </Pressable>
            </View>
          );
        })}

        {/* Order Summary Card */}
        {cart.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                ₹{Number(cartTotal).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery</Text>
              <Text style={[styles.summaryValue, { color: "#16A34A" }]}>Free</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.text }]}>
                ₹{total.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        )}

        {/* Removed-item empty state with notice still showing */}
        {cart.length === 0 && cartRemovalNotice && (
          <Empty3DCart />
        )}
      </ScrollView>

      {/* Fixed Footer */}
      {cart.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: bottomInset + (Platform.OS === "web" ? 80 : 90),
            },
          ]}
        >
          {storeOpen ? (
            <Pressable
              style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/checkout" as any)}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
              <View style={[styles.checkoutArrow, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="arrow-right" size={16} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <View style={[styles.checkoutBtn, { backgroundColor: "#9CA3AF" }]}>
              <Text style={styles.checkoutText}>Store Closed</Text>
              <View style={[styles.checkoutArrow, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="x" size={16} color="#fff" />
              </View>
            </View>
          )}

          <Text style={[styles.secureNote, { color: colors.mutedForeground }]}>
            {storeOpen
              ? <><Feather name="lock" size={11} color={colors.mutedForeground} /> Secure checkout</>
              : "Store is currently closed. Please check back later."
            }
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  /* Empty state */
  emptyWrap: { flex: 1, paddingHorizontal: 16 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 100 },
  emptyScene: { width: "100%", height: 190, alignItems: "center", justifyContent: "center", overflow: "visible", marginBottom: 8 },
  emptyIconBox: { width: 130, height: 130, alignItems: "center", justifyContent: "center" },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 24 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, borderRadius: 26, paddingHorizontal: 28, paddingVertical: 14 },
  startBtnText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },

  /* Header */
  title: { fontSize: 30, fontFamily: "DMSans_700Bold", marginBottom: 16 },

  /* Removal banner */
  removalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  removalLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  removalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  removalTitle: { fontSize: 13, fontFamily: "DMSans_700Bold", color: "#92400E" },
  removalBody: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#92400E", lineHeight: 18, marginTop: 2 },
  removalProductName: { fontFamily: "DMSans_600SemiBold" },
  removalDismiss: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },

  /* Store closed banner */
  storeClosedBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 12 },

  /* Policy banner */
  policyBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  policyIconBox: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  policyText: { flex: 1, fontSize: 12, fontFamily: "DMSans_500Medium", lineHeight: 18 },

  /* Cart card */
  card: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden", alignItems: "center", marginBottom: 12 },
  imageWrap: { position: "relative" },
  image: { width: 100, height: 120 },
  imagePlaceholder: { width: 100, height: 120, alignItems: "center", justifyContent: "center" },
  discountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: "#fff", fontSize: 10, fontFamily: "DMSans_700Bold" },
  info: { flex: 1, padding: 14, gap: 4 },
  category: { fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.8 },
  name: { fontSize: 15, fontFamily: "DMSans_600SemiBold", lineHeight: 21 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  price: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  originalPrice: { fontSize: 12, fontFamily: "DMSans_400Regular", textDecorationLine: "line-through" },
  qtyPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  qtyText: { fontSize: 11, fontFamily: "DMSans_500Medium" },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },

  /* Summary card */
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, marginTop: 4 },
  summaryTitle: { fontSize: 16, fontFamily: "DMSans_700Bold", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  totalAmount: { fontSize: 22, fontFamily: "DMSans_700Bold" },

  /* Footer */
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 16, paddingHorizontal: 16, borderTopWidth: 1, gap: 10 },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, paddingVertical: 16, paddingLeft: 24, paddingRight: 12 },
  checkoutText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" },
  checkoutArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  secureNote: { fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center", paddingBottom: 4 },
});
