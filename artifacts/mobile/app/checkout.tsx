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
import { usePageTracker } from "@/hooks/usePageTracker";
import PurchaseSuccessAnimation from "@/components/PurchaseSuccessAnimation";
import PolicyBadges from "@/components/PolicyBadges";

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

interface BillingConfig {
  deliveryCharge: number;
  taxPercent: number;
  serviceCharge: number;
  maintenanceCharge: number;
}

interface CouponInfo {
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "", mobile: "", email: "", line1: "", landmark: "", pincode: "", city: "", state: "",
};

const ALL_PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { key: "cod",      label: "Cash on Delivery", icon: "truck",       desc: "Pay when your order arrives"  },
  { key: "razorpay", label: "Razorpay",          icon: "credit-card", desc: "Pay securely via Razorpay"   },
  { key: "phonepe",  label: "PhonePe",           icon: "smartphone",  desc: "Pay via PhonePe UPI"         },
];

function FormField({
  label, value, onChange, placeholder, keyboard, required, colors, error, errorMsg, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; required?: boolean; colors: any;
  error?: boolean; errorMsg?: string; maxLength?: number;
}) {
  return (
    <View style={fieldStyles.group}>
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
        maxLength={maxLength}
      />
      {error && errorMsg ? (
        <Text style={fieldStyles.errorText}>{errorMsg}</Text>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.4, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, fontFamily: "DMSans_400Regular" },
  errorText: { fontSize: 10, fontFamily: "DMSans_500Medium", color: "#EF4444", marginTop: 3 },
});

function BillingRow({ label, value, valueColor, bold, dividerAbove, secondary }: {
  label: string; value: string; valueColor?: string; bold?: boolean; dividerAbove?: boolean; secondary?: boolean;
}) {
  return (
    <>
      {dividerAbove && <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 }} />}
      <View style={[billingStyles.row, bold && billingStyles.boldRow]}>
        <Text style={[billingStyles.rowLabel, bold && billingStyles.boldLabel, secondary && { opacity: 0.65 }]}>{label}</Text>
        <Text style={[billingStyles.rowValue, bold && billingStyles.boldValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </>
  );
}

const billingStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  boldRow: { paddingVertical: 7 },
  rowLabel: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#374151" },
  boldLabel: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#111827" },
  rowValue: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#374151" },
  boldValue: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#1D4ED8" },
});

export default function CheckoutScreen() {
  usePageTracker("checkout", "Checkout");
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
  const [storeOpen, setStoreOpen] = useState(true);

  // Billing breakdown state
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    deliveryCharge: 40, taxPercent: 18, serviceCharge: 10, maintenanceCharge: 5,
  });

  const product = cart[0];

  // Coupon state
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [couponVerifying, setCouponVerifying] = useState(false);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const couponDiscount = (() => {
    if (!couponInfo) return 0;
    const subtotal = product ? Number(product.price) : 0;
    if (couponInfo.discountType === "percent") {
      const raw = (subtotal * couponInfo.discountValue) / 100;
      return couponInfo.maxDiscount ? Math.min(raw, couponInfo.maxDiscount) : raw;
    }
    return Math.min(couponInfo.discountValue, subtotal);
  })();

  // Purchase limit state
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Success animation state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; total: number } | null>(null);

  // Error messages for form validation (must be here, not after early return)
  const [errorMessages, setErrorMessages] = useState<Partial<Record<keyof ShippingForm, string>>>({});

  // Computed billing breakdown
  const subtotal = product ? Number(product.price) : 0;
  const taxAmount = Math.round((subtotal * billingConfig.taxPercent) / 100);
  const computedTotal = subtotal + billingConfig.deliveryCharge + taxAmount + billingConfig.serviceCharge + billingConfig.maintenanceCharge - couponDiscount;

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  // Fetch config + billing charges
  useEffect(() => {
    fetch(`${BASE_URL}/config/public`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const gw = (d.active_payment_gateway as PaymentMethod) || "cod";
        setActiveGateway(gw);
        setPaymentMethod(gw);
        setStoreOpen((d.store_status ?? "on") !== "off");
        // Use isNaN-safe parse so that 0 is honoured (parseFloat("0") || 40 would wrongly return 40)
        const parseCharge = (val: any, fallback: number): number => {
          const n = parseFloat(val);
          return isNaN(n) ? fallback : n;
        };
        setBillingConfig({
          deliveryCharge:    parseCharge(d.delivery_charge,    40),
          taxPercent:        parseCharge(d.tax_percent,        18),
          serviceCharge:     parseCharge(d.service_charge,     10),
          maintenanceCharge: parseCharge(d.maintenance_charge,  5),
        });
      })
      .catch(() => {
        setActiveGateway("cod");
        setPaymentMethod("cod");
      })
      .finally(() => setGatewayLoading(false));
  }, []);

  // Check one-time purchase limit
  useEffect(() => {
    if (!user || !product) { setCheckingLimit(false); return; }
    apiRequest("/orders")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const orders: any[] = data.orders ?? [];
          const bought = orders.some(
            (o) => o.productId === product.id && !["cancelled", "refunded"].includes(o.status)
          );
          setAlreadyPurchased(bought);
          if (bought) setShowLimitModal(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingLimit(false));
  }, [user, product?.id]);

  // Load saved addresses & prefill user data
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
    setForm((f) => ({
      ...f,
      fullName: f.fullName || user.name || "",
      email: f.email || user.email || "",
    }));
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

  async function verifyCoupon() {
    if (!couponCode.trim()) return;
    setCouponVerifying(true);
    try {
      const res = await apiRequest("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.coupon) {
        if (data.coupon.minOrderValue && subtotal < data.coupon.minOrderValue) {
          Alert.alert("Coupon Not Applicable", `Minimum order value of ₹${data.coupon.minOrderValue} required.`);
          setCouponValid(false);
          setCouponInfo(null);
          return;
        }
        setCouponInfo({
          code: data.coupon.code,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          maxDiscount: data.coupon.maxDiscount ?? null,
          minOrderValue: data.coupon.minOrderValue ?? null,
        });
        setCouponValid(true);
      } else {
        setCouponInfo(null);
        setCouponValid(false);
        Alert.alert("Invalid Coupon", data.error ?? "This coupon is not valid or has expired.");
      }
    } catch {
      setCouponInfo(null);
      setCouponValid(false);
    } finally {
      setCouponVerifying(false);
    }
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
    const newErrors: Partial<Record<keyof ShippingForm, boolean>> = {};
    const newMessages: Partial<Record<keyof ShippingForm, string>> = {};
    let valid = true;

    const addError = (key: keyof ShippingForm, msg: string) => {
      newErrors[key] = true;
      newMessages[key] = msg;
      valid = false;
    };

    if (!form.fullName.trim()) {
      addError("fullName", "Name is required.");
    } else if (form.fullName.trim().length < 4) {
      addError("fullName", "Name must be at least 4 characters.");
    } else if (!/^[A-Za-z\s]+$/.test(form.fullName.trim())) {
      addError("fullName", "Name must contain letters only.");
    }

    if (!form.mobile.trim()) {
      addError("mobile", "Mobile number is required.");
    } else if (!/^\d{10}$/.test(form.mobile.trim())) {
      addError("mobile", "Must be exactly 10 digits.");
    }

    if (!form.email.trim()) {
      addError("email", "Email is required.");
    } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      addError("email", "Enter a valid email address.");
    }

    if (!form.line1.trim()) {
      addError("line1", "Address is required.");
    }

    if (!form.pincode.trim()) {
      addError("pincode", "Pincode is required.");
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      addError("pincode", "Must be exactly 6 digits.");
    }

    if (!form.city.trim()) {
      addError("city", "City is required.");
    } else if (!/^[A-Za-z\s]+$/.test(form.city.trim())) {
      addError("city", "Letters only.");
    }

    if (!form.state.trim()) {
      addError("state", "State is required.");
    } else if (!/^[A-Za-z\s]+$/.test(form.state.trim())) {
      addError("state", "Letters only.");
    }

    setErrors(newErrors);
    setErrorMessages(newMessages);
    return valid;
  }

  async function handlePlaceOrder() {
    if (alreadyPurchased) { setShowLimitModal(true); return; }
    if (!storeOpen) {
      Alert.alert("Store Closed", "The store is currently closed and not accepting new orders. Please check back later.");
      return;
    }
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
          Alert.alert("Item Unavailable", `Sorry, "${product.name}" is not available right now. Please remove it to proceed.`);
          setCheckingStock(false);
          return;
        }
      }
    } catch {}
    setCheckingStock(false);

    const shippingAddress = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      line1: form.line1.trim(),
      landmark: form.landmark.trim(),
      pincode: form.pincode.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
    };

    setPlacing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          paymentMethod: activeGateway,
          couponCode: couponInfo?.code || couponCode.trim() || undefined,
          shippingAddress,
          items: [{ id: product.id, quantity: 1 }],
        }),
      });
      clearTimeout(timer);
      const data = await res.json();

      if (res.ok) {
        await clearCart();
        const total = data.breakdown?.total ?? computedTotal;
        const orderNum = data.order?.orderNumber ?? "";
        setSuccessOrder({ orderNumber: orderNum, total });
        setShowSuccessAnim(true);
      } else if (data.error === "purchase_limit_exceeded") {
        setAlreadyPurchased(true);
        setShowLimitModal(true);
      } else {
        const msg = data.message ?? data.error ?? "Failed to place order. Please try again.";
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
  const canOrder = !alreadyPurchased && !checkingLimit;

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          {/* Header */}
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
            {/* Already purchased banner */}
            {alreadyPurchased && (
              <Pressable
                style={styles.alreadyBanner}
                onPress={() => setShowLimitModal(true)}
              >
                <Feather name="alert-circle" size={16} color="#fff" />
                <Text style={styles.alreadyBannerText}>
                  You've already purchased this item. Tap to learn more.
                </Text>
              </Pressable>
            )}

            {/* Order Summary */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDER SUMMARY</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
              <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{product.category} · Qty: 1</Text>
            </View>

            {/* Billing Breakdown */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BILLING BREAKDOWN</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BillingRow label="Item Price" value={fmt(subtotal)} />
              {billingConfig.deliveryCharge > 0 && (
                <BillingRow label="Delivery Charge" value={`+${fmt(billingConfig.deliveryCharge)}`} secondary />
              )}
              {billingConfig.taxPercent > 0 && (
                <BillingRow label={`GST (${billingConfig.taxPercent}%)`} value={`+${fmt(taxAmount)}`} secondary />
              )}
              {billingConfig.serviceCharge > 0 && (
                <BillingRow label="Service Charge" value={`+${fmt(billingConfig.serviceCharge)}`} secondary />
              )}
              {billingConfig.maintenanceCharge > 0 && (
                <BillingRow label="Maintenance Fee" value={`+${fmt(billingConfig.maintenanceCharge)}`} secondary />
              )}
              {couponDiscount > 0 && (
                <BillingRow label={`Coupon (${couponInfo?.code})`} value={`-${fmt(couponDiscount)}`} valueColor="#10B981" />
              )}
              <BillingRow
                label="Total Payable"
                value={fmt(computedTotal)}
                bold
                dividerAbove
              />
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
                  <FormField
                    label="Full Name" value={form.fullName} required colors={colors}
                    error={errors.fullName} errorMsg={errorMessages.fullName}
                    placeholder="Rajesh Kumar"
                    onChange={(v) => setForm({ ...form, fullName: v.replace(/[^A-Za-z\s]/g, "") })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Mobile Number" value={form.mobile} keyboard="phone-pad" required colors={colors}
                    error={errors.mobile} errorMsg={errorMessages.mobile}
                    placeholder="9876543210" maxLength={10}
                    onChange={(v) => setForm({ ...form, mobile: v.replace(/[^0-9]/g, "") })}
                  />
                </View>
              </View>
              <FormField
                label="Email ID" value={form.email} keyboard="email-address" required colors={colors}
                error={errors.email} errorMsg={errorMessages.email}
                placeholder="you@example.com"
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <FormField
                label="Complete Address" value={form.line1} required colors={colors}
                error={errors.line1} errorMsg={errorMessages.line1}
                placeholder="House/Flat No., Building, Street"
                onChange={(v) => setForm({ ...form, line1: v })}
              />
              <FormField
                label="Landmark" value={form.landmark} colors={colors}
                placeholder="Near Landmark (optional)"
                onChange={(v) => setForm({ ...form, landmark: v.replace(/[^A-Za-z\s]/g, "") })}
              />
              <View style={styles.row3}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Pin Code" value={form.pincode} keyboard="numeric" required colors={colors}
                    error={errors.pincode} errorMsg={errorMessages.pincode}
                    placeholder="400001" maxLength={6}
                    onChange={(v) => setForm({ ...form, pincode: v.replace(/[^0-9]/g, "") })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="City" value={form.city} required colors={colors}
                    error={errors.city} errorMsg={errorMessages.city}
                    placeholder="Mumbai"
                    onChange={(v) => setForm({ ...form, city: v.replace(/[^A-Za-z\s]/g, "") })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="State" value={form.state} required colors={colors}
                    error={errors.state} errorMsg={errorMessages.state}
                    placeholder="Maharashtra"
                    onChange={(v) => setForm({ ...form, state: v.replace(/[^A-Za-z\s]/g, "") })}
                  />
                </View>
              </View>
            </View>

            {/* Payment Method */}
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
            <View style={[styles.couponRow, { backgroundColor: colors.card, borderColor: couponValid === true ? "#10B981" : couponValid === false ? "#EF4444" : colors.border }]}>
              <Feather name="tag" size={16} color={couponValid === true ? "#10B981" : colors.mutedForeground} />
              <TextInput
                style={[styles.couponInput, { color: colors.text }]}
                placeholder="Enter coupon code"
                placeholderTextColor={colors.mutedForeground}
                value={couponCode}
                onChangeText={(v) => {
                  setCouponCode(v.toUpperCase());
                  setCouponValid(null);
                  setCouponInfo(null);
                }}
                autoCapitalize="characters"
                editable={!couponVerifying}
              />
              {!!couponCode && !couponVerifying && (
                <Pressable
                  onPress={() => {
                    if (couponValid === true) {
                      setCouponCode("");
                      setCouponInfo(null);
                      setCouponValid(null);
                    } else {
                      verifyCoupon();
                    }
                  }}
                  style={[styles.verifyBtn, { backgroundColor: couponValid === true ? "#10B981" : colors.primary }]}
                >
                  <Text style={styles.verifyBtnText}>{couponValid === true ? "Applied ✓" : "Verify"}</Text>
                </Pressable>
              )}
              {couponVerifying && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            {couponValid === true && couponDiscount > 0 && (
              <Text style={[styles.couponSavings, { color: "#10B981" }]}>
                🎉 You save {fmt(couponDiscount)} with this coupon!
              </Text>
            )}

            {/* Policy — visual image-style badges */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>STORE POLICY</Text>
            <PolicyBadges />

            {/* One-time purchase notice */}
            <View style={[styles.policyBox, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", marginTop: 12 }]}>
              <Text style={styles.policyBoxTitle}>⚠️ One-Time Purchase Only</Text>
              <Text style={styles.policyBoxText}>
                Each product can only be purchased <Text style={{ fontFamily: "DMSans_700Bold" }}>once per account</Text>. This policy ensures fair access for all customers.
              </Text>
            </View>
          </ScrollView>

          {/* Saved Address Picker */}
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

          {/* Purchase Limit Modal */}
          <Modal visible={showLimitModal} transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={[styles.limitModal, { backgroundColor: colors.card }]}>
                <View style={styles.limitIconWrap}>
                  <Feather name="alert-octagon" size={36} color="#F59E0B" />
                </View>
                <Text style={[styles.limitTitle, { color: colors.text }]}>Already Purchased</Text>
                <Text style={[styles.limitBody, { color: colors.mutedForeground }]}>
                  You have already purchased{"\n"}
                  <Text style={{ fontFamily: "DMSans_600SemiBold", color: colors.text }}>{product.name}</Text>.{"\n\n"}
                  Our one-time purchase policy ensures every customer gets fair access. Each product can only be ordered once per account, regardless of order status.
                </Text>
                <Pressable
                  style={[styles.limitBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowLimitModal(false); router.replace("/(tabs)" as any); }}
                >
                  <Text style={styles.limitBtnText}>Browse Other Products</Text>
                </Pressable>
                <Pressable onPress={() => setShowLimitModal(false)} style={styles.limitDismiss}>
                  <Text style={[styles.limitDismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 16 : 8) }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Payable</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>{fmt(computedTotal)}</Text>
            </View>
            {alreadyPurchased ? (
              <Pressable
                style={[styles.placeOrderBtn, { backgroundColor: "#F59E0B" }]}
                onPress={() => setShowLimitModal(true)}
              >
                <Feather name="alert-circle" size={18} color="#fff" />
                <Text style={styles.placeOrderText}>Already Purchased</Text>
              </Pressable>
            ) : (
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
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 3D Purchase Success Animation */}
      <PurchaseSuccessAnimation
        visible={showSuccessAnim}
        orderNumber={successOrder?.orderNumber}
        total={successOrder?.total}
        onComplete={() => {
          setShowSuccessAnim(false);
          const orderNum = successOrder?.orderNumber ?? "";
          if (orderNum) {
            router.replace((`/track-order?orderId=${orderNum}`) as any);
          } else {
            router.replace("/orders" as any);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "DMSans_500Medium" },
  backToShopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backToShopText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  scroll: { padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 8, marginTop: 14 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  useSavedBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  useSavedText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  row2: { flexDirection: "row", gap: 10 },
  row3: { flexDirection: "row", gap: 8 },
  productName: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  productCat: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  paymentGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  paymentOption: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  paymentLabel: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  paymentDesc: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  couponInput: { flex: 1, fontSize: 14, fontFamily: "DMSans_500Medium", padding: 0 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  verifyBtnText: { color: "#fff", fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  couponSavings: { fontSize: 13, fontFamily: "DMSans_500Medium", marginTop: 6, marginLeft: 4 },
  policyBox: { marginTop: 16, borderRadius: 10, borderWidth: 1, padding: 12 },
  policyBoxTitle: { fontSize: 13, fontFamily: "DMSans_700Bold", color: "#92400E", marginBottom: 5 },
  policyBoxText: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#92400E", lineHeight: 18 },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingTop: 8 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  pickerTitle: { fontSize: 17, fontFamily: "DMSans_700Bold" },
  addrOption: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  addrLabelBadge: { flexDirection: "row", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 2 },
  addrLabelText: { fontSize: 11, fontFamily: "DMSans_700Bold" },
  addrDefault: { fontSize: 11, fontFamily: "DMSans_500Medium" },
  addrName: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  addrLine: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  addNewAddrBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, paddingVertical: 14 },
  addNewAddrText: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  // Already purchased banner
  alreadyBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EF4444", borderRadius: 12, padding: 12, marginBottom: 4 },
  alreadyBannerText: { flex: 1, color: "#fff", fontSize: 13, fontFamily: "DMSans_500Medium" },
  // Purchase limit modal
  limitModal: { margin: 32, borderRadius: 20, padding: 28, alignItems: "center", gap: 12 },
  limitIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  limitTitle: { fontSize: 20, fontFamily: "DMSans_700Bold", textAlign: "center" },
  limitBody: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22 },
  limitBtn: { paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, width: "100%", alignItems: "center" },
  limitBtnText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  limitDismiss: { paddingVertical: 6 },
  limitDismissText: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, fontFamily: "DMSans_500Medium" },
  totalAmount: { fontSize: 20, fontFamily: "DMSans_700Bold" },
  placeOrderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14, gap: 10 },
  placeOrderText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" },
});
