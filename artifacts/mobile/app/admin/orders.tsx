import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAuth } from "@/context/AuthContext";

interface Order {
  id: string;
  orderNumber?: string | null;
  userId: string;
  productId: string;
  productName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerMobile?: string | null;
  status: string;
  isLocked?: boolean;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryCharge?: number;
  taxAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  total: number;
  quantity: number;
  createdAt: string;
  updatedAt?: string;
  shippingAddress?: string;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  trackingLink?: string | null;
  estimatedDelivery?: string | null;
  utrNumber?: string | null;
  cancellationReason?: string | null;
}

interface ShippingInfo {
  fullName?: string;
  mobile?: string;
  email?: string;
  line1?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
}

function parseShipping(raw?: string): ShippingInfo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as ShippingInfo;
  } catch {}
  return null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:   { color: "#F59E0B", bg: "#FFFBEB", label: "Order Created",   icon: "clock" },
  confirmed: { color: "#3B82F6", bg: "#EFF6FF", label: "Confirmed",       icon: "check-circle" },
  packed:    { color: "#F97316", bg: "#FFF7ED", label: "Packed",          icon: "box" },
  shipped:   { color: "#8B5CF6", bg: "#F5F3FF", label: "Shipped",        icon: "truck" },
  delivered: { color: "#10B981", bg: "#ECFDF5", label: "Delivered",      icon: "package" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2", label: "Cancelled",       icon: "x-circle" },
};

const STATUS_ORDER = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

function getNextStatus(current: string): string | null {
  const pipeline = ["pending", "confirmed", "packed", "shipped", "delivered"];
  const idx = pipeline.indexOf(current);
  if (idx === -1 || idx === pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; body: string; orderId: string } | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  // UTR/cancellation state per order
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  // Shipping form state
  const [shippingFormId, setShippingFormId] = useState<string | null>(null);
  const [shippingInput, setShippingInput] = useState({ courierPartner: "", trackingLink: "", estimatedDelivery: "" });
  const [savingShipping, setSavingShipping] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    try {
      const res = await apiRequest("/admin/orders");
      if (res.ok) { const d = await res.json(); setOrders(d.orders); }
    } catch {}
    setLoading(false);
  }

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Invoice Error", data.error ?? "Failed to fetch invoice. Please try again.");
        setDownloadingId(null);
        return;
      }
      const html = await res.text();

      if (Platform.OS === "web") {
        // Web: Print.printAsync opens the browser's native print dialog → Save as PDF
        await Print.printAsync({ html });
      } else {
        // Native: render to PDF file then share/save
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save Invoice" });
      }
    } catch (err) {
      Alert.alert("Invoice Error", "Could not generate the invoice. Please try again.");
    }
    setDownloadingId(null);
  }

  async function updateStatus(orderId: string, status: string, extras?: { utrNumber?: string; cancellationReason?: string }) {
    setUpdatingId(orderId);
    try {
      const body: Record<string, any> = { status };
      if (extras?.utrNumber) body.utrNumber = extras.utrNumber;
      if (extras?.cancellationReason) body.cancellationReason = extras.cancellationReason;

      const res = await apiRequest(`/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o)));
        setExpandedId(null);
        setCancellingId(null);
        setUtrInput("");
        setCancelReason("");
        if (data.notification) {
          setNotification({ ...data.notification, orderId });
          setTimeout(() => setNotification(null), 8000);
        }
      }
    } catch {}
    setUpdatingId(null);
  }

  function handleCancelPress(orderId: string) {
    if (cancellingId === orderId) {
      setCancellingId(null);
      setUtrInput("");
      setCancelReason("");
    } else {
      setCancellingId(orderId);
      setUtrInput("");
      setCancelReason("");
    }
  }

  async function handleConfirmCancel(orderId: string) {
    await updateStatus(orderId, "cancelled", {
      utrNumber: utrInput.trim() || undefined,
      cancellationReason: cancelReason.trim() || undefined,
    });
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Orders</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {/* Notification preview */}
      {!!notification && (
        <View style={styles.notifBanner}>
          <View style={styles.notifIcon}>
            <Feather name="bell" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.notifLabel}>Auto-Notification Dispatched to Customer</Text>
            <Text style={styles.notifTitle}>{notification.title}</Text>
            <Text style={styles.notifBody} numberOfLines={3}>{notification.body}</Text>
          </View>
          <Pressable onPress={() => setNotification(null)}>
            <Feather name="x" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {["all", ...STATUS_ORDER].map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s];
          const n = s === "all" ? orders.length : (counts[s] ?? 0);
          const shortLabel: Record<string, string> = {
            pending: "Created", confirmed: "Confirmed", packed: "Packed",
            shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
          };
          return (
            <Pressable
              key={s}
              style={[styles.filterTab, filter === s && { backgroundColor: cfg?.color ?? "#2563EB" }]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterTabText, filter === s && { color: "#fff" }]}>
                {s === "all" ? `All (${n})` : `${shortLabel[s] ?? cfg?.label} (${n})`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.center}>
              <Feather name="shopping-bag" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          )}
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const isExpanded = expandedId === order.id;
            const isCancelling = cancellingId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <Pressable style={styles.orderHeader} onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                  <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>
                      {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                    </Text>
                    {order.productName && (
                      <Text style={styles.productName} numberOfLines={1}>{order.productName}</Text>
                    )}
                    {order.customerName && (
                      <Text style={styles.customerName} numberOfLines={1}>{order.customerName}</Text>
                    )}
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.orderTotal}>₹{order.total.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.orderExpanded}>
                    <View style={styles.orderMeta}>
                      <Text style={styles.metaLabel}>Qty: <Text style={styles.metaValue}>{order.quantity}</Text></Text>
                      <Text style={styles.metaLabel}>Payment: <Text style={styles.metaValue}>{order.paymentMethod.toUpperCase()}</Text></Text>
                      <Text style={styles.metaLabel}>Pay Status: <Text style={styles.metaValue}>{order.paymentStatus}</Text></Text>
                      {order.subtotal !== undefined && <Text style={styles.metaLabel}>Subtotal: <Text style={styles.metaValue}>₹{Number(order.subtotal).toLocaleString("en-IN")}</Text></Text>}
                      {order.discountAmount && order.discountAmount > 0 ? <Text style={styles.metaLabel}>Discount: <Text style={[styles.metaValue, { color: "#10B981" }]}>-₹{Number(order.discountAmount).toLocaleString("en-IN")}</Text></Text> : null}
                    </View>

                    {/* Courier / Tracking info */}
                    {(order.courierPartner || order.trackingNumber || order.trackingLink || order.estimatedDelivery) && (
                      <View style={[styles.shipCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                        <View style={styles.shipCardHeader}>
                          <Feather name="truck" size={13} color="#16A34A" />
                          <Text style={[styles.shipCardTitle, { color: "#16A34A" }]}>Courier Details</Text>
                        </View>
                        {order.courierPartner && <Text style={styles.shipVal}>{order.courierPartner}</Text>}
                        {order.trackingNumber && <Text style={[styles.shipKey, { color: "#6B7280" }]}>Tracking No.: {order.trackingNumber}</Text>}
                        {order.estimatedDelivery && <Text style={[styles.shipKey, { color: "#6B7280" }]}>Est. Delivery: {order.estimatedDelivery}</Text>}
                        {order.trackingLink && (
                          <Pressable onPress={() => Linking.openURL(order.trackingLink!)}>
                            <Text style={[styles.shipKey, { color: "#2563EB", textDecorationLine: "underline" }]}>
                              Track Shipment ↗
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {/* Shipping Management Form */}
                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <View>
                        {shippingFormId !== order.id ? (
                          <Pressable
                            style={[styles.statusBtn, { backgroundColor: "#F0FDF4", borderColor: "#16A34A", opacity: updatingId === order.id ? 0.5 : 1 }]}
                            onPress={() => {
                              setShippingFormId(order.id);
                              setShippingInput({
                                courierPartner: order.courierPartner || "",
                                trackingLink: order.trackingLink || "",
                                estimatedDelivery: order.estimatedDelivery || "",
                              });
                            }}
                          >
                            <Feather name="truck" size={14} color="#16A34A" />
                            <Text style={[styles.statusBtnText, { color: "#16A34A" }]}>
                              {order.courierPartner ? "Update Shipping Info" : "Add Shipping Info"}
                            </Text>
                          </Pressable>
                        ) : (
                          <View style={styles.shippingForm}>
                            <Text style={styles.shippingFormTitle}>Shipping Management</Text>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Courier Partner *</Text>
                              <TextInput
                                style={styles.input}
                                value={shippingInput.courierPartner}
                                onChangeText={(t) => setShippingInput((s) => ({ ...s, courierPartner: t }))}
                                placeholder="e.g. Delhivery, BlueDart, DTDC"
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Tracking Link *</Text>
                              <TextInput
                                style={styles.input}
                                value={shippingInput.trackingLink}
                                onChangeText={(t) => setShippingInput((s) => ({ ...s, trackingLink: t }))}
                                placeholder="https://..."
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Estimated Delivery Date *</Text>
                              <TextInput
                                style={styles.input}
                                value={shippingInput.estimatedDelivery}
                                onChangeText={(t) => setShippingInput((s) => ({ ...s, estimatedDelivery: t }))}
                                placeholder="e.g. 3 Jul 2026 or 3–5 business days"
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                              />
                            </View>
                            <View style={styles.cancelFormButtons}>
                              <Pressable
                                style={styles.cancelFormBack}
                                onPress={() => setShippingFormId(null)}
                              >
                                <Text style={styles.cancelFormBackText}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                style={[styles.cancelFormConfirm, { backgroundColor: "#16A34A", opacity: savingShipping ? 0.6 : 1 }]}
                                disabled={savingShipping}
                                onPress={async () => {
                                  if (!shippingInput.courierPartner.trim() || !shippingInput.trackingLink.trim() || !shippingInput.estimatedDelivery.trim()) return;
                                  setSavingShipping(true);
                                  try {
                                    const res = await apiRequest(`/admin/orders/${order.id}/shipping`, {
                                      method: "PUT",
                                      body: JSON.stringify({
                                        courierPartner: shippingInput.courierPartner.trim(),
                                        trackingLink: shippingInput.trackingLink.trim(),
                                        estimatedDelivery: shippingInput.estimatedDelivery.trim(),
                                      }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...data.order } : o));
                                      setShippingFormId(null);
                                    }
                                  } catch {}
                                  setSavingShipping(false);
                                }}
                              >
                                {savingShipping
                                  ? <ActivityIndicator size="small" color="#fff" />
                                  : <Text style={styles.cancelFormConfirmText}>Save Shipping</Text>
                                }
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Shipping Info Card */}
                    {(() => {
                      const ship = parseShipping(order.shippingAddress);
                      if (ship) {
                        return (
                          <View style={styles.shipCard}>
                            <View style={styles.shipCardHeader}>
                              <Feather name="map-pin" size={13} color="#2563EB" />
                              <Text style={styles.shipCardTitle}>Shipping Details</Text>
                            </View>
                            <View style={styles.shipGrid}>
                              {ship?.fullName ? <View style={styles.shipField}><Text style={styles.shipKey}>Name</Text><Text style={styles.shipVal}>{ship.fullName}</Text></View> : null}
                              {ship?.mobile ? <View style={styles.shipField}><Text style={styles.shipKey}>Mobile</Text><Text style={styles.shipVal}>{ship.mobile}</Text></View> : null}
                              {ship?.email ? <View style={[styles.shipField, styles.shipFieldFull]}><Text style={styles.shipKey}>Email</Text><Text style={styles.shipVal}>{ship.email}</Text></View> : null}
                              {ship?.line1 ? <View style={[styles.shipField, styles.shipFieldFull]}><Text style={styles.shipKey}>Address</Text><Text style={styles.shipVal}>{ship.line1}</Text></View> : null}
                              {ship?.landmark ? <View style={[styles.shipField, styles.shipFieldFull]}><Text style={styles.shipKey}>Landmark</Text><Text style={styles.shipVal}>{ship.landmark}</Text></View> : null}
                              {ship?.pincode ? <View style={styles.shipField}><Text style={styles.shipKey}>Pincode</Text><Text style={styles.shipVal}>{ship.pincode}</Text></View> : null}
                              {ship?.city ? <View style={styles.shipField}><Text style={styles.shipKey}>City</Text><Text style={styles.shipVal}>{ship.city}</Text></View> : null}
                              {ship?.state ? <View style={styles.shipField}><Text style={styles.shipKey}>State</Text><Text style={styles.shipVal}>{ship.state}</Text></View> : null}
                            </View>
                          </View>
                        );
                      }
                      if (order.shippingAddress) {
                        return (
                          <View style={styles.shipCard}>
                            <View style={styles.shipCardHeader}>
                              <Feather name="map-pin" size={13} color="#2563EB" />
                              <Text style={styles.shipCardTitle}>Shipping Address</Text>
                            </View>
                            <Text style={styles.shipVal}>{order.shippingAddress}</Text>
                          </View>
                        );
                      }
                      return null;
                    })()}

                    {/* UTR / Cancellation info for cancelled orders */}
                    {order.status === "cancelled" && (order.utrNumber || order.cancellationReason) && (
                      <View style={styles.utrBox}>
                        <Feather name="info" size={14} color="#6B7280" />
                        <View style={{ flex: 1, gap: 4 }}>
                          {order.cancellationReason && (
                            <Text style={styles.utrLabel}>Reason: <Text style={styles.utrValue}>{order.cancellationReason}</Text></Text>
                          )}
                          {order.utrNumber && (
                            <Text style={styles.utrLabel}>UTR No.: <Text style={styles.utrValue}>{order.utrNumber}</Text></Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Admin actions */}
                    {order.status !== "delivered" && order.status !== "cancelled" && (() => {
                      const next = getNextStatus(order.status);
                      const nextCfg = next ? STATUS_CONFIG[next] : null;
                      return (
                        <View style={{ gap: 8 }}>
                          <Text style={styles.updateLabel}>Admin Actions:</Text>
                          <View style={styles.statusButtons}>
                            {next && nextCfg && (
                              <Pressable
                                style={[styles.statusBtn, { backgroundColor: nextCfg.bg, borderColor: nextCfg.color, flex: 1, opacity: updatingId === order.id ? 0.5 : 1 }]}
                                onPress={() => updateStatus(order.id, next)}
                                disabled={updatingId === order.id}
                              >
                                <Feather name={nextCfg.icon as any} size={14} color={nextCfg.color} />
                                <Text style={[styles.statusBtnText, { color: nextCfg.color }]}>
                                  Mark as {nextCfg.label}
                                </Text>
                              </Pressable>
                            )}
                          </View>

                          {/* Cancel order — shows UTR/reason form inline */}
                          {!isCancelling ? (
                            <Pressable
                              style={[styles.statusBtn, { backgroundColor: "#FEF2F2", borderColor: "#EF4444", opacity: updatingId === order.id ? 0.5 : 1 }]}
                              onPress={() => handleCancelPress(order.id)}
                              disabled={updatingId === order.id}
                            >
                              <Feather name="x-circle" size={14} color="#EF4444" />
                              <Text style={[styles.statusBtnText, { color: "#EF4444" }]}>Cancel Order (Admin Override)</Text>
                            </Pressable>
                          ) : (
                            <View style={styles.cancelForm}>
                              <Text style={styles.cancelFormTitle}>Cancel Order — Admin Override</Text>
                              <Text style={styles.cancelFormHint}>If a refund is applicable, enter the UTR number from your bank/UPI portal.</Text>

                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>UTR / Transaction Ref. No. (optional)</Text>
                                <TextInput
                                  style={styles.input}
                                  value={utrInput}
                                  onChangeText={setUtrInput}
                                  placeholder="e.g. 425612345678"
                                  placeholderTextColor="#9CA3AF"
                                  autoCapitalize="characters"
                                  autoCorrect={false}
                                />
                              </View>

                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Cancellation Reason (optional)</Text>
                                <TextInput
                                  style={[styles.input, styles.textarea]}
                                  value={cancelReason}
                                  onChangeText={setCancelReason}
                                  placeholder="e.g. Item out of stock, Customer requested cancellation..."
                                  placeholderTextColor="#9CA3AF"
                                  multiline
                                  numberOfLines={3}
                                  textAlignVertical="top"
                                />
                              </View>

                              <View style={styles.cancelFormButtons}>
                                <Pressable
                                  style={styles.cancelFormBack}
                                  onPress={() => handleCancelPress(order.id)}
                                >
                                  <Text style={styles.cancelFormBackText}>Go Back</Text>
                                </Pressable>
                                <Pressable
                                  style={[styles.cancelFormConfirm, { opacity: updatingId === order.id ? 0.5 : 1 }]}
                                  onPress={() => handleConfirmCancel(order.id)}
                                  disabled={updatingId === order.id}
                                >
                                  {updatingId === order.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.cancelFormConfirmText}>Confirm Cancel</Text>
                                  )}
                                </Pressable>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    {(order.status === "delivered" || order.status === "cancelled") && (
                      <View style={styles.lockNotice}>
                        <Feather name="check-circle" size={12} color="#6B7280" />
                        <Text style={styles.lockText}>
                          {order.status === "delivered" ? "Order lifecycle complete." : "Order cancelled — no further actions."}
                        </Text>
                      </View>
                    )}

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
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "DMSans_400Regular" },
  content: { padding: 16, gap: 12 },
  orderCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  statusIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  orderId: { fontSize: 13, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  productName: { fontSize: 11, fontFamily: "DMSans_500Medium", color: "#374151", marginTop: 1 },
  customerName: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#6B7280", marginTop: 1 },
  orderDate: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#9CA3AF", marginTop: 2 },
  orderTotal: { fontSize: 15, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  orderExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 12 },
  orderMeta: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaLabel: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#6B7280" },
  metaValue: { fontFamily: "DMSans_600SemiBold", color: "#0F1740" },
  utrBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", padding: 10 },
  utrLabel: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#6B7280" },
  utrValue: { fontFamily: "DMSans_600SemiBold", color: "#0F1740" },
  updateLabel: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  statusButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  cancelForm: { backgroundColor: "#FEF2F2", borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", padding: 14, gap: 10 },
  cancelFormTitle: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#991B1B" },
  cancelFormHint: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#B91C1C", lineHeight: 18 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#6B7280" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5EAF8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "DMSans_500Medium", color: "#0F1740" },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  cancelFormButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelFormBack: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5EAF8" },
  cancelFormBackText: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  cancelFormConfirm: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10, backgroundColor: "#EF4444" },
  cancelFormConfirmText: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#fff" },
  invoiceBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8",
    borderStyle: "dashed", justifyContent: "center",
  },
  invoiceBtnText: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#6B7280" },
  lockNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10 },
  lockText: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#6B7280", flex: 1 },
  notifBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#1E3A5F", padding: 14, borderBottomWidth: 1, borderBottomColor: "#2563EB" },
  notifIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  notifLabel: { fontSize: 9, fontFamily: "DMSans_600SemiBold", color: "#93C5FD", letterSpacing: 0.6, textTransform: "uppercase" },
  notifTitle: { fontSize: 13, fontFamily: "DMSans_700Bold", color: "#fff", marginTop: 1 },
  notifBody: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#CBD5E1", lineHeight: 16, marginTop: 2 },
  shipCard: { backgroundColor: "#EFF6FF", borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", padding: 12, gap: 8 },
  shipCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  shipCardTitle: { fontSize: 12, fontFamily: "DMSans_700Bold", color: "#1D4ED8" },
  shipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shipField: { minWidth: "45%", flex: 1 },
  shipFieldFull: { minWidth: "100%", flex: undefined, width: "100%" },
  shipKey: { fontSize: 10, fontFamily: "DMSans_600SemiBold", color: "#3B82F6", letterSpacing: 0.3, marginBottom: 2 },
  shipVal: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#0F1740" },
  shippingForm: { backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", padding: 14, gap: 10 },
  shippingFormTitle: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#15803D" },
});
