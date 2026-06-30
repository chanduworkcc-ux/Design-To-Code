import { BASE_URL } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { usePageTracker } from "@/hooks/usePageTracker";
import LoadingScreen from "@/components/LoadingScreen";

interface Order {
  id: string;
  orderNumber?: string | null;
  productId: string;
  productName?: string | null;
  productImage?: string | null;
  status: string;
  isLocked?: boolean;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  serviceCharge: number;
  maintenanceCharge: number;
  discountAmount: number;
  quantity: number;
  shippingAddress: string | null;
  couponId: string | null;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  trackingLink?: string | null;
  estimatedDelivery?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:   { color: "#F59E0B", bg: "#FFFBEB", icon: "clock",        label: "Order Created" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", icon: "check",        label: "Confirmed" },
  packed:    { color: "#F97316", bg: "#FFF7ED", icon: "box",          label: "Packed" },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", icon: "truck",        label: "Shipped" },
  delivered: { color: "#10B981", bg: "#ECFDF5", icon: "check-circle", label: "Delivered" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", icon: "x-circle",     label: "Cancelled" },
};

const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];

const POLL_INTERVAL_MS = 10_000;

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function AnimatedDot({ color, isActive }: { color: string; isActive: boolean }) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ), -1, false
      );
      ringScale.value = withRepeat(withTiming(2.2, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 200 }), withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) })),
        -1, false
      );
    }
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringOpacity.value }));

  return (
    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
      {isActive && (
        <Animated2.View style={[StyleSheet.absoluteFillObject, { borderRadius: 16, borderWidth: 2, borderColor: color }, ringStyle]} />
      )}
      <Animated2.View style={[{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: "center", justifyContent: "center" }, dotStyle]} />
    </View>
  );
}

function StatusTracker({ status }: { status: string }) {
  const colors = useColors();

  if (status === "cancelled") {
    return (
      <View style={[styles.cancelBanner, { backgroundColor: "#FEF2F2" }]}>
        <Feather name="x-circle" size={14} color="#EF4444" />
        <Text style={[styles.cancelText, { color: "#EF4444" }]}>Order Cancelled</Text>
      </View>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <View style={styles.verticalTracker}>
      {STATUS_STEPS.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const done = i <= currentIdx;
        const isActive = i === currentIdx;
        const isLast = i === STATUS_STEPS.length - 1;

        return (
          <View key={step} style={styles.vtStep}>
            {/* Left: icon + connector line */}
            <View style={styles.vtLeft}>
              {done ? (
                isActive ? (
                  <AnimatedDot color={cfg.color} isActive />
                ) : (
                  <View style={[styles.vtDot, { backgroundColor: cfg.color }]}>
                    <Feather name={cfg.icon as any} size={13} color="#fff" />
                  </View>
                )
              ) : (
                <View style={[styles.vtDot, styles.vtDotEmpty]}>
                  <Feather name={cfg.icon as any} size={13} color="#D1D5DB" />
                </View>
              )}
              {!isLast && (
                <View style={[styles.vtLine, { backgroundColor: i < currentIdx ? cfg.color : "#E5E7EB" }]} />
              )}
            </View>

            {/* Right: label + timestamp */}
            <View style={styles.vtContent}>
              <Text style={[styles.vtLabel, { color: done ? cfg.color : "#9CA3AF", fontFamily: isActive ? "DMSans_700Bold" : done ? "DMSans_600SemiBold" : "DMSans_400Regular" }]}>
                {cfg.label}
              </Text>
              {isActive && (
                <View style={[styles.vtActiveBadge, { backgroundColor: cfg.bg }]}>
                  <View style={[styles.vtActiveDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.vtActiveText, { color: cfg.color }]}>Current Status</Text>
                </View>
              )}
              {done && !isActive && (
                <Text style={styles.vtDoneText}>Completed</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={8}>
          <Feather name="star" size={32} color={i <= value ? "#F59E0B" : "#D1D5DB"} />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewSection({
  orderId,
  apiRequest,
  colors,
}: {
  orderId: string;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [review, setReview] = useState<{ rating: number; comment: string | null; imageUrl: string | null } | null | undefined>(undefined);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest(`/reviews/order/${orderId}`)
      .then((r) => r.json())
      .then((d) => setReview(d.review ?? null))
      .catch(() => setReview(null));
  }, [orderId]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    setUploadingImage(true);
    try {
      const urlRes = await apiRequest("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          name: asset.fileName ?? `review-${Date.now()}.jpg`,
          size: asset.fileSize ?? 500000,
          contentType: asset.mimeType ?? "image/jpeg",
        }),
      });
      if (!urlRes.ok) throw new Error("Upload URL failed");
      const { uploadURL, objectPath, servingUrl } = await urlRes.json();
      const blob = await (await fetch(asset.uri)).blob();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setImageUrl(servingUrl ?? `${BASE_URL}/storage/objects/${encodeURIComponent(objectPath)}`);
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message ?? "Could not upload image.");
      setImageUri(null);
      setImageUrl(null);
    }
    setUploadingImage(false);
  }

  async function submitReview() {
    if (uploadingImage) { setError("Please wait for the image to finish uploading."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, any> = { orderId, rating };
      if (comment.trim()) body.comment = comment.trim();
      if (imageUrl) body.imageUrl = imageUrl;
      const res = await apiRequest("/reviews", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReview(data.review);
      } else {
        setError(data.error ?? "Failed to submit review.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  if (review === undefined) {
    return (
      <View style={rvStyles.wrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (review !== null) {
    return (
      <View style={[rvStyles.wrap, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
        <View style={rvStyles.header}>
          <Feather name="star" size={16} color="#F59E0B" />
          <Text style={[rvStyles.headerText, { color: "#92400E" }]}>Your Review</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Feather key={i} name="star" size={20} color={i <= review.rating ? "#F59E0B" : "#D1D5DB"} />
          ))}
          <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#92400E", marginLeft: 6 }}>
            {review.rating}/5
          </Text>
        </View>
        {!!review.comment && (
          <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: "#78350F", lineHeight: 18 }}>
            {review.comment}
          </Text>
        )}
        {!!review.imageUrl && (
          <Pressable onPress={() => Linking.openURL(review.imageUrl!)} style={{ position: "relative", marginTop: 8 }}>
            <Image source={{ uri: review.imageUrl }} style={rvStyles.reviewImage} resizeMode="cover" />
            <View style={rvStyles.imageTapHint}>
              <Feather name="external-link" size={10} color="#fff" />
              <Text style={rvStyles.imageTapHintText}>Tap to open</Text>
            </View>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[rvStyles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={rvStyles.header}>
        <Feather name="star" size={16} color="#F59E0B" />
        <Text style={[rvStyles.headerText, { color: colors.text }]}>Rate Your Order</Text>
      </View>
      <Text style={[rvStyles.label, { color: colors.mutedForeground }]}>Your Rating</Text>
      <StarPicker value={rating} onChange={setRating} />
      <Text style={[rvStyles.label, { color: colors.mutedForeground }]}>Comment <Text style={{ fontFamily: "DMSans_400Regular" }}>(optional)</Text></Text>
      <TextInput
        style={[rvStyles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
        value={comment}
        onChangeText={setComment}
        placeholder="Share your experience..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <Text style={[rvStyles.label, { color: colors.mutedForeground }]}>Photo <Text style={{ fontFamily: "DMSans_400Regular" }}>(optional)</Text></Text>
      {imageUri ? (
        <View style={{ position: "relative" }}>
          <Image source={{ uri: imageUri }} style={rvStyles.previewImage} resizeMode="cover" />
          {uploadingImage && (
            <View style={rvStyles.uploadOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "DMSans_500Medium" }}>Uploading…</Text>
            </View>
          )}
          {!uploadingImage && (
            <Pressable
              style={rvStyles.removeBtn}
              onPress={() => { setImageUri(null); setImageUrl(null); }}
            >
              <Feather name="x" size={14} color="#fff" />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          style={[rvStyles.imagePicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={pickImage}
        >
          <Feather name="camera" size={18} color={colors.mutedForeground} />
          <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.mutedForeground }}>
            Tap to attach a photo
          </Text>
        </Pressable>
      )}
      {!!error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Feather name="alert-circle" size={13} color="#EF4444" />
          <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: "#EF4444", flex: 1 }}>{error}</Text>
        </View>
      )}
      <Pressable
        style={[rvStyles.submitBtn, { backgroundColor: colors.primary, opacity: submitting || uploadingImage ? 0.6 : 1 }]}
        onPress={submitReview}
        disabled={submitting || uploadingImage}
      >
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Feather name="send" size={15} color="#fff" /><Text style={rvStyles.submitBtnText}>Submit Review</Text></>
        }
      </Pressable>
    </View>
  );
}

const rvStyles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  headerText: { fontSize: 14, fontFamily: "DMSans_700Bold" },
  label: { fontSize: 12, fontFamily: "DMSans_600SemiBold", marginBottom: -4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "DMSans_400Regular", minHeight: 80 },
  imagePicker: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", padding: 14, justifyContent: "center" },
  previewImage: { width: "100%", height: 150, borderRadius: 10 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 8 },
  removeBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  reviewImage: { width: "100%", height: 150, borderRadius: 10 },
  imageTapHint: { position: "absolute", bottom: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  imageTapHintText: { color: "#fff", fontSize: 10, fontFamily: "DMSans_500Medium" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 2 },
  submitBtnText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
});

function PriceRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const colors = useColors();
  if (value === 0) return null;
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, { color: highlight ? "#10B981" : colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.priceValue, { color: highlight ? "#10B981" : colors.text }]}>
        {highlight ? "-" : ""}₹{Number(value).toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  usePageTracker("orders", "Orders");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [updateBanner, setUpdateBanner] = useState<string | null>(null);

  const highlightAnims = useRef<Record<string, Animated.Value>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevOrdersRef = useRef<Order[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const getHighlightAnim = useCallback((id: string) => {
    if (!highlightAnims.current[id]) {
      highlightAnims.current[id] = new Animated.Value(0);
    }
    return highlightAnims.current[id];
  }, []);

  const flashHighlight = useCallback((id: string) => {
    const anim = getHighlightAnim(id);
    anim.setValue(1);
    Animated.timing(anim, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [getHighlightAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!user) { setLoading(false); return; }
    if (!silent) setIsPolling(true);
    try {
      const res = await apiRequest("/orders");
      if (res.ok) {
        const d = await res.json();
        const incoming: Order[] = d.orders ?? [];
        const prev = prevOrdersRef.current;

        const newlyChanged = new Set<string>();
        const statusChangedNames: string[] = [];

        incoming.forEach((order) => {
          const old = prev.find((o) => o.id === order.id);
          if (old && old.status !== order.status) {
            newlyChanged.add(order.id);
            statusChangedNames.push(
              `Order #${order.id.slice(0, 6).toUpperCase()} → ${STATUS_CONFIG[order.status]?.label ?? order.status}`
            );
            flashHighlight(order.id);
          }
        });

        if (newlyChanged.size > 0) {
          setChangedIds((prev) => new Set([...prev, ...newlyChanged]));
          setUpdateBanner(statusChangedNames.join(", "));
          setTimeout(() => setUpdateBanner(null), 5000);
        }

        prevOrdersRef.current = incoming;
        setOrders(incoming);
        setLastPolledAt(new Date());
      }
    } catch {}
    setLoading(false);
    setIsPolling(false);
  }, [user, apiRequest, flashHighlight]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!user) return;
    pollIntervalRef.current = setInterval(() => {
      fetchOrders(true);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user, fetchOrders]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownloadInvoice(orderId: string) {
    setDownloadingId(orderId);
    try {
      const res = await apiRequest(`/orders/${orderId}/invoice`);
      if (!res.ok) { setDownloadingId(null); return; }
      const html = await res.text();
      if (Platform.OS === "web") {
        // Web: Print.printAsync opens the browser's native print dialog → Save as PDF
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save Invoice" });
      }
    } catch {}
    setDownloadingId(null);
  }


  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>

        {/* Live badge */}

        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <Pressable onPress={() => fetchOrders()} disabled={isPolling}>
          {isPolling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Poll info bar */}
      {lastPolledAt && (
        <View style={[styles.pollBar, { backgroundColor: colors.accent }]}>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.pollText, { color: colors.mutedForeground }]}>
            Auto-refreshing every 10s · Last checked {timeAgo(lastPolledAt.toISOString())}
          </Text>
        </View>
      )}

      {/* Update banner */}
      {!!updateBanner && (
        <View style={styles.updateBanner}>
          <Feather name="bell" size={14} color="#fff" />
          <Text style={styles.updateBannerText} numberOfLines={1}>{updateBanner}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { key: "all", label: `All (${orders.length})` },
          { key: "pending",   label: "Created" },
          { key: "confirmed", label: "Confirmed" },
          { key: "packed",    label: "Packed" },
          { key: "shipped",   label: "Shipped" },
          { key: "delivered", label: "Delivered" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => {
          const cfg = tab.key === "all" ? null : STATUS_CONFIG[tab.key];
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, active && { backgroundColor: cfg?.color ?? colors.primary }]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, active && { color: "#fff" }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!user ? (
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view orders</Text>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login" as any)}>
            <Text style={styles.actionBtnText}>Sign In</Text>
          </Pressable>
        </View>
      ) : loading ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.center}>
              <Feather name="package" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                {filter === "all" ? "You haven't placed any orders yet" : `No ${filter} orders`}
              </Text>
              {filter === "all" && (
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)" as any)}>
                  <Text style={styles.actionBtnText}>Start Shopping</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtered.map((order, orderIdx) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedId === order.id;
              const isChanged = changedIds.has(order.id);
              const hlAnim = getHighlightAnim(order.id);
              const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const time = new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              const updatedAgo = timeAgo(order.updatedAt);

              return (
                <Animated.View
                  key={order.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hlAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [colors.border, cfg.color],
                      }),
                      shadowColor: hlAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["transparent", cfg.color],
                      }) as any,
                      shadowOpacity: hlAnim as any,
                      shadowRadius: 8,
                      elevation: isChanged ? 4 : 1,
                    },
                  ]}
                >
                  <Pressable onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                    <View style={styles.cardTop}>
                      <View style={[styles.orderIcon, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.orderIdRow}>
                          <Text style={[styles.orderId, { color: colors.text }]}>
                            {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          {isChanged && (
                            <View style={styles.updatedPill}>
                              <Text style={styles.updatedPillText}>Updated</Text>
                            </View>
                          )}
                        </View>
                        {order.productName && (
                          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                            {order.productName}
                          </Text>
                        )}
                        <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                          {date} at {time}
                        </Text>
                        {order.updatedAt !== order.createdAt && (
                          <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
                            Status updated {updatedAgo}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[styles.orderTotal, { color: colors.text }]}>
                          ₹{Number(order.total).toLocaleString("en-IN")}
                        </Text>
                        <Text style={[styles.paymentTag, { color: colors.mutedForeground }]}>
                          {order.paymentMethod.toUpperCase()}
                        </Text>
                      </View>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                      {/* Status Tracker */}
                      <StatusTracker status={order.status} />

                      {/* Price Breakdown */}
                      <View style={[styles.priceBreakdown, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <Text style={[styles.breakdownTitle, { color: colors.mutedForeground }]}>PRICE BREAKDOWN</Text>
                        <PriceRow label="Item Price" value={order.subtotal} />
                        <PriceRow label="Delivery" value={order.deliveryCharge} />
                        <PriceRow label="Tax" value={order.taxAmount} />
                        <PriceRow label="Service Charge" value={order.serviceCharge} />
                        <PriceRow label="Maintenance" value={order.maintenanceCharge} />
                        {order.discountAmount > 0 && (
                          <PriceRow label="Discount" value={order.discountAmount} highlight />
                        )}
                        <View style={[styles.priceRow, styles.totalRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
                          <Text style={[styles.totalValue, { color: colors.primary }]}>
                            ₹{Number(order.total).toLocaleString("en-IN")}
                          </Text>
                        </View>
                      </View>

                      {/* Shipping Address */}
                      {order.shippingAddress && (() => {
                        try {
                          const a = JSON.parse(order.shippingAddress);
                          const parts = [a.line1, a.landmark, a.city, a.state, a.pincode].filter(Boolean);
                          return (
                            <View style={[styles.addressBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                              <View style={{ flex: 1 }}>
                                {a.fullName ? <Text style={[styles.addressText, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>{a.fullName} · {a.mobile}</Text> : null}
                                <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{parts.join(", ")}</Text>
                              </View>
                            </View>
                          );
                        } catch {
                          return (
                            <View style={[styles.addressBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                              <Text style={[styles.addressText, { color: colors.text }]}>{order.shippingAddress}</Text>
                            </View>
                          );
                        }
                      })()}

                      {/* Payment status */}
                      <View style={[styles.metaRow, { borderColor: colors.border }]}>
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Payment</Text>
                          <Text style={[styles.metaVal, { color: colors.text }]}>{order.paymentMethod.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Pay Status</Text>
                          <Text style={[styles.metaVal, { color: order.paymentStatus === "paid" ? "#10B981" : "#F59E0B" }]}>
                            {order.paymentStatus.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.metaItem}>
                          <Text style={[styles.metaKey, { color: colors.mutedForeground }]}>Qty</Text>
                          <Text style={[styles.metaVal, { color: colors.text }]}>{order.quantity}</Text>
                        </View>
                      </View>

                      {/* Courier / Tracking info */}
                      {(order.courierPartner || order.trackingNumber || order.trackingLink || order.estimatedDelivery) && (
                        <View style={[styles.shippingCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                          <View style={styles.shippingCardHeader}>
                            <Feather name="truck" size={15} color="#16A34A" />
                            <Text style={[styles.shippingCardTitle, { color: "#16A34A" }]}>Shipping Info</Text>
                          </View>
                          {order.courierPartner && (
                            <Text style={[styles.addressText, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>{order.courierPartner}</Text>
                          )}
                          {order.trackingNumber && (
                            <Text style={[styles.addressText, { color: colors.mutedForeground }]}>Tracking No.: {order.trackingNumber}</Text>
                          )}
                          {order.estimatedDelivery && (
                            <View style={styles.estDeliveryRow}>
                              <Feather name="calendar" size={13} color="#16A34A" />
                              <Text style={[styles.addressText, { color: "#16A34A", fontFamily: "DMSans_600SemiBold" }]}>
                                Est. Delivery: {order.estimatedDelivery}
                              </Text>
                            </View>
                          )}
                          {order.trackingLink && (
                            <Pressable
                              style={styles.trackingLinkBtn}
                              onPress={() => order.trackingLink && Linking.openURL(order.trackingLink)}
                            >
                              <Feather name="external-link" size={14} color="#fff" />
                              <Text style={styles.trackingLinkText}>Track Shipment</Text>
                            </Pressable>
                          )}
                        </View>
                      )}

                      {/* ── CUSTOMER CANCELLATION POLICY ─────────────────────
                           Customers are strictly prohibited from cancelling
                           orders at ANY stage. All cancellation authority
                           belongs exclusively to the administration.
                           Active orders show "Contact Support" instead.
                      ──────────────────────────────────────────────────────── */}
                      {order.status === "delivered" && (
                        <ReviewSection
                          orderId={order.id}
                          apiRequest={apiRequest}
                          colors={colors}
                        />
                      )}

                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <Pressable
                          style={styles.contactSupportBtn}
                          onPress={() => router.push("/support-ticket" as any)}
                        >
                          <Feather name="headphones" size={15} color="#2563EB" />
                          <Text style={styles.contactSupportText}>Contact Support</Text>
                        </Pressable>
                      )}

                      {["confirmed","packed","shipped","delivered"].includes(order.status) && (
                      <Pressable
                        style={[styles.invoiceBtn, { opacity: downloadingId === order.id ? 0.6 : 1 }]}
                        onPress={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                      >
                        {downloadingId === order.id
                          ? <ActivityIndicator size="small" color="#6B7280" />
                          : <Feather name="file-text" size={15} color="#6B7280" />
                        }
                        <Text style={styles.invoiceBtnText}>
                          {downloadingId === order.id ? "Generating PDF…" : "Download Invoice"}
                        </Text>
                      </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerLogo: { width: 32, height: 32 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#10B981", letterSpacing: 0.5 },
  pollBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 6 },
  pollText: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  updateBannerText: { flex: 1, color: "#fff", fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)" },
  filterTabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold", textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 16, gap: 12 },
  orderCard: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  orderIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  orderId: { fontSize: 14, fontFamily: "DMSans_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  updatedPill: { backgroundColor: "#2563EB", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  updatedPillText: { color: "#fff", fontSize: 10, fontFamily: "DMSans_700Bold" },
  productName: { fontSize: 12, fontFamily: "DMSans_500Medium", marginTop: 2 },
  orderDate: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  lastUpdated: { fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 1 },
  orderTotal: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  paymentTag: { fontSize: 10, fontFamily: "DMSans_600SemiBold" },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 12 },
  cancelBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  cancelText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  verticalTracker: { paddingVertical: 8, paddingHorizontal: 4, gap: 0 },
  vtStep: { flexDirection: "row", gap: 14, alignItems: "flex-start", minHeight: 52 },
  vtLeft: { alignItems: "center", width: 32 },
  vtDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  vtDotEmpty: { backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB" },
  vtLine: { width: 2, flex: 1, marginTop: 4, marginBottom: 0, minHeight: 20 },
  vtContent: { flex: 1, paddingTop: 5, paddingBottom: 8, gap: 4 },
  vtLabel: { fontSize: 14 },
  vtActiveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  vtActiveDot: { width: 6, height: 6, borderRadius: 3 },
  vtActiveText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  vtDoneText: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#9CA3AF" },
  priceBreakdown: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 7 },
  breakdownTitle: { fontSize: 10, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.8, marginBottom: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  totalRow: { paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 14, fontFamily: "DMSans_700Bold" },
  totalValue: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  addressBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 },
  shippingCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  shippingCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  shippingCardTitle: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  estDeliveryRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  trackingLinkBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#16A34A", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, alignSelf: "flex-start", marginTop: 4 },
  trackingLinkText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  metaRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  metaItem: { flex: 1, alignItems: "center", padding: 10, gap: 3 },
  metaKey: { fontSize: 10, fontFamily: "DMSans_400Regular" },
  metaVal: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  metaDivider: { width: 1 },
  invoiceBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB",
    borderStyle: "dashed", justifyContent: "center", marginTop: 4,
  },
  invoiceBtnText: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#6B7280" },
  contactSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    marginTop: 4,
  },
  contactSupportText: { fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#2563EB" },
});
