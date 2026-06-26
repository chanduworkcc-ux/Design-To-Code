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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface Coupon {
  id: string;
  code: string;
  type: "public" | "private";
  discountType: "percent" | "flat";
  discountValue: number;
  targetCohort: string | null;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface CouponForm {
  code: string;
  type: "public" | "private";
  discountType: "percent" | "flat";
  discountValue: string;
  targetCohort: string;
  minOrderValue: string;
  maxDiscount: string;
  usageLimit: string;
  isActive: boolean;
  expiresAt: string;
}

const emptyForm: CouponForm = {
  code: "", type: "public", discountType: "percent",
  discountValue: "", targetCohort: "all_users",
  minOrderValue: "0", maxDiscount: "", usageLimit: "", isActive: true,
  expiresAt: "",
};

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await apiRequest("/admin/coupons");
      if (res.ok) { const d = await res.json(); setCoupons(d.coupons ?? []); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() { setRefreshing(true); await fetchCoupons(); setRefreshing(false); }

  function openCreate() { setEditCoupon(null); setForm({ ...emptyForm }); setShowModal(true); }

  function openEdit(c: Coupon) {
    setEditCoupon(c);
    setForm({
      code: c.code, type: c.type as "public" | "private", discountType: c.discountType as "percent" | "flat",
      discountValue: String(c.discountValue), targetCohort: c.targetCohort ?? "all_users",
      minOrderValue: String(c.minOrderValue), maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
      usageLimit: c.usageLimit ? String(c.usageLimit) : "", isActive: c.isActive,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.discountValue) {
      Alert.alert("Error", "Code and discount value are required.");
      return;
    }
    setSaving(true);
    const body: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      targetCohort: form.targetCohort,
      minOrderValue: parseFloat(form.minOrderValue) || 0,
      isActive: form.isActive,
    };
    if (form.maxDiscount) body.maxDiscount = parseFloat(form.maxDiscount);
    if (form.usageLimit) body.usageLimit = parseInt(form.usageLimit);
    if (form.expiresAt) body.expiresAt = form.expiresAt;
    try {
      let res: Response;
      if (editCoupon) {
        res = await apiRequest(`/admin/coupons/${editCoupon.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        res = await apiRequest("/admin/coupons", { method: "POST", body: JSON.stringify(body) });
      }
      if (res.ok) {
        const d = await res.json();
        if (editCoupon) {
          setCoupons((prev) => prev.map((c) => (c.id === editCoupon.id ? d.coupon : c)));
        } else {
          setCoupons((prev) => [d.coupon, ...prev]);
        }
        setShowModal(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save coupon.");
      }
    } catch { Alert.alert("Error", "Network error."); }
    setSaving(false);
  }

  async function handleToggle(c: Coupon) {
    const res = await apiRequest(`/admin/coupons/${c.id}`, { method: "PUT", body: JSON.stringify({ isActive: !c.isActive }) });
    if (res.ok) { const d = await res.json(); setCoupons((prev) => prev.map((x) => (x.id === c.id ? d.coupon : x))); }
  }

  async function handleDelete(c: Coupon) {
    const doDelete = async () => {
      const res = await apiRequest(`/admin/coupons/${c.id}`, { method: "DELETE" });
      if (res.ok) setCoupons((prev) => prev.filter((x) => x.id !== c.id));
    };
    if (Platform.OS === "web") { if (window.confirm(`Delete coupon "${c.code}"?`)) doDelete(); }
    else Alert.alert("Delete Coupon", `Delete "${c.code}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete }]);
  }

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Coupons</Text>
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Loading...</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {coupons.length === 0 ? (
            <View style={styles.center}>
              <Feather name="tag" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No coupons yet</Text>
              <Pressable style={styles.addFirstBtn} onPress={openCreate}><Text style={styles.addFirstText}>Create Coupon</Text></Pressable>
            </View>
          ) : (
            coupons.map((c) => {
              const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
              return (
                <View key={c.id} style={[styles.couponCard, !c.isActive && { opacity: 0.7 }]}>
                  <View style={styles.couponTop}>
                    <View style={[styles.codeBox, { backgroundColor: c.isActive && !isExpired ? "#EFF6FF" : "#F3F4F6" }]}>
                      <Text style={[styles.codeText, { color: c.isActive && !isExpired ? "#2563EB" : "#9CA3AF" }]}>{c.code}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.rowWrap}>
                        <View style={[styles.badge, { backgroundColor: c.discountType === "percent" ? "#F5F3FF" : "#ECFDF5" }]}>
                          <Text style={[styles.badgeText, { color: c.discountType === "percent" ? "#8B5CF6" : "#10B981" }]}>
                            {c.discountType === "percent" ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: c.type === "public" ? "#EFF6FF" : "#FFFBEB" }]}>
                          <Text style={[styles.badgeText, { color: c.type === "public" ? "#2563EB" : "#F59E0B" }]}>{c.type}</Text>
                        </View>
                        {isExpired && <View style={styles.badge}><Text style={[styles.badgeText, { color: "#EF4444" }]}>Expired</Text></View>}
                      </View>
                      <Text style={styles.couponMeta}>Min order: ₹{c.minOrderValue} · Used: {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</Text>
                      {c.expiresAt && <Text style={styles.couponMeta}>Expires: {new Date(c.expiresAt).toLocaleDateString("en-IN")}</Text>}
                    </View>
                  </View>
                  <View style={styles.couponActions}>
                    <Pressable style={styles.actionBtn} onPress={() => openEdit(c)}>
                      <Feather name="edit-2" size={14} color="#2563EB" />
                      <Text style={[styles.actionText, { color: "#2563EB" }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: c.isActive ? "#FFFBEB" : "#ECFDF5" }]} onPress={() => handleToggle(c)}>
                      <Feather name={c.isActive ? "toggle-right" : "toggle-left"} size={14} color={c.isActive ? "#F59E0B" : "#10B981"} />
                      <Text style={[styles.actionText, { color: c.isActive ? "#F59E0B" : "#10B981" }]}>{c.isActive ? "Disable" : "Enable"}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => handleDelete(c)}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                      <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editCoupon ? "Edit Coupon" : "Create Coupon"}</Text>
            <Pressable onPress={() => setShowModal(false)}><Feather name="x" size={22} color="#6B7280" /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Coupon Code *</Text>
              <TextInput style={styles.fieldInput} value={form.code} onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="SAVE20" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.segmented}>
                {(["public", "private"] as const).map((t) => (
                  <Pressable key={t} style={[styles.segBtn, form.type === t && styles.segBtnActive]} onPress={() => setForm({ ...form, type: t })}>
                    <Text style={[styles.segText, form.type === t && styles.segTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Discount Type</Text>
              <View style={styles.segmented}>
                {(["percent", "flat"] as const).map((t) => (
                  <Pressable key={t} style={[styles.segBtn, form.discountType === t && styles.segBtnActive]} onPress={() => setForm({ ...form, discountType: t })}>
                    <Text style={[styles.segText, form.discountType === t && styles.segTextActive]}>{t === "percent" ? "Percent (%)" : "Flat (₹)"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Discount Value *</Text>
              <TextInput style={styles.fieldInput} value={form.discountValue} onChangeText={(v) => setForm({ ...form, discountValue: v })} placeholder={form.discountType === "percent" ? "20" : "50"} placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Target Cohort</Text>
              <View style={styles.segmented}>
                {[{ key: "all_users", label: "All" }, { key: "new_users", label: "New Users" }, { key: "old_users", label: "Old Users" }].map((t) => (
                  <Pressable key={t.key} style={[styles.segBtn, form.targetCohort === t.key && styles.segBtnActive]} onPress={() => setForm({ ...form, targetCohort: t.key })}>
                    <Text style={[styles.segText, form.targetCohort === t.key && styles.segTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Min Order Value (₹)</Text>
              <TextInput style={styles.fieldInput} value={form.minOrderValue} onChangeText={(v) => setForm({ ...form, minOrderValue: v })} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Max Discount (₹) — optional</Text>
              <TextInput style={styles.fieldInput} value={form.maxDiscount} onChangeText={(v) => setForm({ ...form, maxDiscount: v })} placeholder="Leave blank for no cap" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Usage Limit — optional</Text>
              <TextInput style={styles.fieldInput} value={form.usageLimit} onChangeText={(v) => setForm({ ...form, usageLimit: v })} placeholder="Leave blank for unlimited" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Expiry Date — optional (YYYY-MM-DD)</Text>
              <TextInput style={styles.fieldInput} value={form.expiresAt} onChangeText={(v) => setForm({ ...form, expiresAt: v })} placeholder="2026-12-31" placeholderTextColor="#9CA3AF" />
            </View>
            <Pressable style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editCoupon ? "Save Changes" : "Create Coupon"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "Inter_400Regular" },
  addFirstBtn: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addFirstText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  couponCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  couponTop: { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  codeBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 80, alignItems: "center" },
  codeText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "#F3F4F6" },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  couponMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  couponActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, backgroundColor: "#EFF6FF" },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5EAF8", backgroundColor: "#fff" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  modalContent: { padding: 20, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  fieldInput: { borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F1740" },
  segmented: { flexDirection: "row", gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  segBtnActive: { backgroundColor: "#2563EB" },
  segText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  segTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
