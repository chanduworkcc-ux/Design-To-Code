import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type PaymentMethod = "cod" | "razorpay" | "phonepe";

interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

function formatAddress(a: SavedAddress) {
  return `${a.fullName}, ${a.phone}\n${[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}`;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useApp();
  const { user, apiRequest } = useAuth();
  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  useEffect(() => {
    apiRequest("/addresses").then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        const addrs: SavedAddress[] = d.addresses ?? [];
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def && !address) setAddress(formatAddress(def));
      }
    }).catch(() => {});
  }, []);
  const [couponCode, setCouponCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const product = cart[0];

  if (!product) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        </View>
        <View style={styles.center}>
          <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your cart is empty</Text>
          <Pressable style={[styles.backToShopBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/(tabs)" as any)}>
            <Text style={styles.backToShopText}>Back to Shop</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function handlePlaceOrder() {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to place an order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    if (!address.trim() || address.trim().length < 10) {
      Alert.alert("Invalid Address", "Please enter a complete shipping address (at least 10 characters).");
      return;
    }

    setPlacing(true);
    try {
      const res = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          paymentMethod,
          couponCode: couponCode.trim() || undefined,
          shippingAddress: address.trim(),
          items: [{ id: product.id, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await clearCart();
        const total = data.breakdown?.total ?? cartTotal;
        if (Platform.OS === "web") {
          alert(`Order placed successfully!\n\nTotal: ₹${Number(total).toLocaleString("en-IN")}`);
          router.replace("/(tabs)" as any);
        } else {
          Alert.alert(
            "Order Placed!",
            `Your order has been placed successfully.\n\nTotal: ₹${Number(total).toLocaleString("en-IN")}`,
            [{ text: "OK", onPress: () => router.replace("/(tabs)" as any) }]
          );
        }
      } else {
        const msg = data.error ?? "Failed to place order. Please try again.";
        if (Platform.OS === "web") {
          alert(msg);
        } else {
          Alert.alert("Order Failed", msg);
        }
      }
    } catch {
      Alert.alert("Network Error", "Could not connect to server. Please try again.");
    }
    setPlacing(false);
  }

  const paymentOptions: { key: PaymentMethod; label: string; icon: string; desc: string }[] = [
    { key: "cod", label: "Cash on Delivery", icon: "truck", desc: "Pay when your order arrives" },
    { key: "razorpay", label: "Razorpay", icon: "credit-card", desc: "Pay securely via Razorpay" },
    { key: "phonepe", label: "PhonePe", icon: "smartphone", desc: "Pay via PhonePe UPI" },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDER SUMMARY</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
            <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{product.category} · Qty: 1</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Item Price</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>₹{Number(product.price).toLocaleString("en-IN")}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SHIPPING ADDRESS</Text>
          {savedAddresses.length > 0 && (
            <Pressable
              style={[styles.savedAddrBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
              onPress={() => setShowAddressPicker(true)}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.savedAddrText, { color: colors.primary }]}>Use Saved Address</Text>
              <Feather name="chevron-down" size={14} color={colors.primary} />
            </Pressable>
          )}
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.addressInput, { color: colors.text }]}
              placeholder="Enter your full delivery address..."
              placeholderTextColor={colors.mutedForeground}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
          <View style={[styles.paymentGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {paymentOptions.map((opt, i) => (
              <React.Fragment key={opt.key}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod(opt.key)}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: paymentMethod === opt.key ? colors.primary : colors.accent }]}>
                    <Feather name={opt.icon as any} size={16} color={paymentMethod === opt.key ? "#fff" : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: paymentMethod === opt.key ? colors.primary : colors.border }]}>
                    {paymentMethod === opt.key && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </Pressable>
              </React.Fragment>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COUPON CODE (OPTIONAL)</Text>
          <View style={[styles.couponRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="tag" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.couponInput, { color: colors.text }]}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.mutedForeground}
              value={couponCode}
              onChangeText={(v) => setCouponCode(v.toUpperCase())}
              autoCapitalize="characters"
            />
            {!!couponCode && (
              <Pressable onPress={() => setCouponCode("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <View style={[styles.policyBox, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
            <Text style={styles.policyBoxTitle}>Important Policy</Text>
            <Text style={styles.policyBoxText}>
              Strict No-Return, No-Refund, and No-Exchange Policy. All sales are final. Each item can only be purchased once per account.
            </Text>
          </View>
        </ScrollView>

        {/* Saved Address Picker Modal */}
        <Modal visible={showAddressPicker} animationType="slide" presentationStyle="pageSheet" transparent>
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose Address</Text>
                <Pressable onPress={() => setShowAddressPicker(false)}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                {savedAddresses.map((a) => (
                  <Pressable
                    key={a.id}
                    style={[styles.addrOption, { borderColor: colors.border }]}
                    onPress={() => { setAddress(formatAddress(a)); setShowAddressPicker(false); }}
                  >
                    <View style={[styles.addrLabelBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.addrLabelText, { color: colors.primary }]}>{a.label}</Text>
                      {a.isDefault && <Text style={[styles.addrDefault, { color: colors.primary }]}>Default</Text>}
                    </View>
                    <Text style={[styles.addrName, { color: colors.text }]}>{a.fullName} · {a.phone}</Text>
                    <Text style={[styles.addrLine, { color: colors.mutedForeground }]}>
                      {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.addNewAddrBtn, { borderColor: colors.primary }]}
                  onPress={() => { setShowAddressPicker(false); router.push("/addresses" as any); }}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                  <Text style={[styles.addNewAddrText, { color: colors.primary }]}>Add New Address</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 16 : 8) }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>₹{Number(cartTotal).toLocaleString("en-IN")}</Text>
          </View>
          <Pressable
            style={[styles.placeOrderBtn, { backgroundColor: colors.primary, opacity: placing ? 0.7 : 1 }]}
            onPress={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.placeOrderText}>Place Order</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  backToShopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backToShopText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 0 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productCat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  priceLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  inputCard: { borderRadius: 14, borderWidth: 1, padding: 12 },
  addressInput: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 90 },
  paymentGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },
  paymentOption: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  paymentLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  paymentDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  couponInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", padding: 0 },
  policyBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16, gap: 6 },
  policyBoxTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#92400E" },
  policyBoxText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 18 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, gap: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  totalAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  placeOrderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  placeOrderText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  savedAddrBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, alignSelf: "flex-start" },
  savedAddrText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingTop: 8 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  pickerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  addrOption: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  addrLabelBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  addrLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addrDefault: { fontSize: 10, fontFamily: "Inter_500Medium", opacity: 0.7 },
  addrName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addrLine: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  addNewAddrBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, borderStyle: "dashed", paddingVertical: 12 },
  addNewAddrText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
