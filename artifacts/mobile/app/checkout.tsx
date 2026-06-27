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

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

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

interface ShippingForm {
  fullName: string;
  mobile: string;
  email: string;
  line1: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "", mobile: "", email: "", line1: "", landmark: "", pincode: "", city: "", state: "",
};

const ALL_PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { key: "cod", label: "Cash on Delivery", icon: "truck", desc: "Pay when your order arrives" },
  { key: "razorpay", label: "Razorpay", icon: "credit-card", desc: "Pay securely via Razorpay" },
  { key: "phonepe", label: "PhonePe", icon: "smartphone", desc: "Pay via PhonePe UPI" },
];

function FormField({
  label, value, onChange, placeholder, keyboard, required, colors, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; required?: boolean; colors: any; error?: boolean;
}) {
  return (
    <View style={[fieldStyles.group]}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
        {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      <TextInput
        style={[fieldStyles.input, { color: colors.text, borderColor: error ? "#EF4444" : colors.border, backgroundColor: colors.card }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboard ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
});

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useApp();
  const { user, apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [form, setForm] = useState<ShippingForm>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingForm, boolean>>>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [couponCode, setCouponCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [activeGateway, setActiveGateway] = useState<PaymentMethod>("cod");
  const [gatewayLoading, setGatewayLoading] = useState(true);

  const product = cart[0];

  useEffect(() => {
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        const gw = (d.active_payment_gateway as PaymentMethod) || "cod";
        setActiveGateway(gw);
        setPaymentMethod(gw);
      })
      .catch(() => {
        setActiveGateway("cod");
        setPaymentMethod("cod");
      })
      .finally(() => setGatewayLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiRequest("/addresses").then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        const addrs: SavedAddress[] = d.addresses ?? [];
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def) applySavedAddress(def);
      }
    }).catch(() => {});
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || user.name || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user]);

  function applySavedAddress(a: SavedAddress) {
    setForm((f) => ({
      ...f,
      fullName: a.fullName,
      mobile: a.phone,
      line1: a.line1,
      landmark: a.line2 ?? "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
    }));
    setErrors({});
  }

  if (!product) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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

  function validate(): boolean {
    const required: (keyof ShippingForm)[] = ["fullName", "mobile", "email", "line1", "pincode", "city", "state"];
    const newErrors: Partial<Record<keyof ShippingForm, boolean>> = {};
    let valid = true;
    for (const key of required) {
      if (!form[key].trim()) {
        newErrors[key] = true;
        valid = false;
      }
    }
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      newErrors.email = true;
      valid = false;
    }
    if (form.mobile.trim() && !/^\d{10}$/.test(form.mobile.replace(/\s/g, ""))) {
      newErrors.mobile = true;
      valid = false;
    }
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = true;
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  }

  async function handlePlaceOrder() {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to place an order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    if (!validate()) {
      Alert.alert("Missing Information", "Please fill in all required fields correctly before placing your order.");
      return;
    }

    setCheckingStock(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const stockRes = await fetch(`${BASE_URL}/products/${product.id}`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timer);
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const liveProduct = stockData.product;
        if (!liveProduct || liveProduct.stock === 0 || !liveProduct.isActive) {
          Alert.alert(
            "Item Unavailable",
            `Sorry, "${product.name}" is not available right now. Please remove it to proceed.`,
          );
          setCheckingStock(false);
          return;
        }
      }
    } catch {
      // Stock check timeout or failure — server will re-validate
    }
    setCheckingStock(false);

    const shippingAddress = JSON.stringify({
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      line1: form.line1.trim(),
      landmark: form.landmark.trim(),
      pincode: form.pincode.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
    });

    setPlacing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          paymentMethod: activeGateway,
          couponCode: couponCode.trim() || undefined,
          shippingAddress,
          items: [{ id: product.id, quantity: 1 }],
        }),
      });
      clearTimeout(timer);
      const data = await res.json();
      if (res.ok) {
        await clearCart();
        const total = data.breakdown?.total ?? cartTotal;
        if (Platform.OS === "web") {
          alert(`Order placed successfully!\n\nTotal: ₹${Number(total).toLocaleString("en-IN")}`);
          router.replace("/(tabs)" as any);
        } else {
          Alert.alert(
            "Order Placed! 🎉",
            `Your order has been placed successfully.\n\nTotal: ₹${Number(total).toLocaleString("en-IN")}`,
            [{ text: "OK", onPress: () => router.replace("/(tabs)" as any) }]
          );
        }
      } else {
        const msg = data.error ?? "Failed to place order. Please try again.";
        if (msg.toLowerCase().includes("stock") || msg.toLowerCase().includes("available")) {
          Alert.alert("Item Unavailable", `Sorry, "${product.name}" is not available right now.`);
        } else {
          Alert.alert("Order Failed", msg);
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        Alert.alert("Request Timed Out", "The server took too long to respond. Please check your connection and try again.");
      } else {
        Alert.alert("Network Error", "Could not connect to server. Please try again.");
      }
    } finally {
      setPlacing(false);
    }
  }

  const visiblePaymentOption = ALL_PAYMENT_OPTIONS.find((o) => o.key === activeGateway) ?? ALL_PAYMENT_OPTIONS[0];
  const isLoading = placing || checkingStock || gatewayLoading;

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
          contentContainerStyle={[styles.scroll, { paddingBottom: 130 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Summary */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDER SUMMARY</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
            <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{product.category} · Qty: 1</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Item Price</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>₹{Number(product.price).toLocaleString("en-IN")}</Text>
            </View>
          </View>

          {/* Shipping Address */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>SHIPPING DETAILS</Text>
            {savedAddresses.length > 0 && (
              <Pressable
                style={[styles.useSavedBtn, { backgroundColor: colors.accent }]}
                onPress={() => setShowAddressPicker(true)}
              >
                <Feather name="map-pin" size={12} color={colors.primary} />
                <Text style={[styles.useSavedText, { color: colors.primary }]}>Use Saved</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border, padding: 14 }]}>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="Rajesh Kumar" required colors={colors} error={errors.fullName} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Mobile Number" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} placeholder="9876543210" keyboard="phone-pad" required colors={colors} error={errors.mobile} />
              </View>
            </View>
            <FormField label="Email ID" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" keyboard="email-address" required colors={colors} error={errors.email} />
            <FormField label="Complete Address" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} placeholder="House/Flat No., Building, Street" required colors={colors} error={errors.line1} />
            <FormField label="Landmark" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} placeholder="Near metro station (optional)" colors={colors} />
            <View style={styles.row3}>
              <View style={{ flex: 1 }}>
                <FormField label="Pin Code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} placeholder="400001" keyboard="numeric" required colors={colors} error={errors.pincode} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Mumbai" required colors={colors} error={errors.city} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="Maharashtra" required colors={colors} error={errors.state} />
              </View>
            </View>
          </View>

          {/* Payment Method — only admin-selected gateway */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
          {gatewayLoading ? (
            <View style={[styles.paymentGroup, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: 20 }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={[styles.paymentGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.paymentOption}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.primary }]}>
                  <Feather name={visiblePaymentOption.icon as any} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentLabel, { color: colors.text }]}>{visiblePaymentOption.label}</Text>
                  <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>{visiblePaymentOption.desc}</Text>
                </View>
                <View style={[styles.radio, { borderColor: colors.primary }]}>
                  <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>
          )}

          {/* Coupon */}
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
            {!!couponCode && <Pressable onPress={() => setCouponCode("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
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
                    onPress={() => { applySavedAddress(a); setShowAddressPicker(false); }}
                  >
                    <View style={[styles.addrLabelBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.addrLabelText, { color: colors.primary }]}>{a.label}</Text>
                      {a.isDefault && <Text style={[styles.addrDefault, { color: colors.primary }]}> · Default</Text>}
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
            style={[styles.placeOrderBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handlePlaceOrder}
            disabled={isLoading}
          >
            {isLoading ? (
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
  scroll: { padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 14 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  useSavedBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  useSavedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  row2: { flexDirection: "row", gap: 10 },
  row3: { flexDirection: "row", gap: 8 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productCat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  priceLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  paymentGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
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
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingTop: 8 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  pickerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  addrOption: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  addrLabelBadge: { flexDirection: "row", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  addrLabelText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  addrDefault: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addrName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addrLine: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addNewAddrBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed", padding: 14 },
  addNewAddrText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
