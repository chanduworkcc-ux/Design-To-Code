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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Address {
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

const LABELS = ["Home", "Work", "Other"];

const emptyForm = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export default function AddressesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAddresses(); }, []);

  async function fetchAddresses() {
    try {
      const res = await apiRequest("/addresses");
      if (res.ok) {
        const d = await res.json();
        setAddresses(d.addresses ?? []);
      }
    } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(a: Address) {
    setEditId(a.id);
    setForm({
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.phone.trim() || !form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        label: form.label,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        isDefault: form.isDefault,
      };
      const res = editId
        ? await apiRequest(`/addresses/${editId}`, { method: "PUT", body: JSON.stringify(body) })
        : await apiRequest("/addresses", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        await fetchAddresses();
        setShowModal(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save address.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSaving(false);
  }

  async function handleDelete(a: Address) {
    const doDelete = async () => {
      const res = await apiRequest(`/addresses/${a.id}`, { method: "DELETE" });
      if (res.ok) setAddresses((prev) => prev.filter((x) => x.id !== a.id));
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete address "${a.label}"?`)) doDelete();
    } else {
      Alert.alert("Delete Address", `Delete "${a.label}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  async function handleSetDefault(a: Address) {
    const res = await apiRequest(`/addresses/${a.id}`, { method: "PUT", body: JSON.stringify({ isDefault: true }) });
    if (res.ok) await fetchAddresses();
  }

  const formatAddress = (a: Address) =>
    [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {addresses.length === 0 ? (
            <View style={styles.center}>
              <Feather name="map-pin" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved addresses</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add an address for faster checkout</Text>
              <Pressable style={[styles.addFirstBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
                <Text style={styles.addFirstText}>Add Address</Text>
              </Pressable>
            </View>
          ) : (
            addresses.map((a) => (
              <View key={a.id} style={[styles.card, { backgroundColor: colors.card, borderColor: a.isDefault ? colors.primary : colors.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.labelBadge, { backgroundColor: a.isDefault ? colors.primary : colors.accent }]}>
                    <Feather name="map-pin" size={12} color={a.isDefault ? "#fff" : colors.primary} />
                    <Text style={[styles.labelText, { color: a.isDefault ? "#fff" : colors.primary }]}>{a.label}</Text>
                    {a.isDefault && <Text style={styles.defaultText}>Default</Text>}
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable style={styles.iconBtn} onPress={() => openEdit(a)}>
                      <Feather name="edit-2" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(a)}>
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
                <Text style={[styles.name, { color: colors.text }]}>{a.fullName}</Text>
                <Text style={[styles.phone, { color: colors.mutedForeground }]}>{a.phone}</Text>
                <Text style={[styles.addressLine, { color: colors.text }]}>{formatAddress(a)}</Text>
                {!a.isDefault && (
                  <Pressable style={[styles.setDefaultBtn, { borderColor: colors.border }]} onPress={() => handleSetDefault(a)}>
                    <Text style={[styles.setDefaultText, { color: colors.primary }]}>Set as Default</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editId ? "Edit Address" : "New Address"}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>LABEL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {LABELS.map((l) => (
                <Pressable key={l} style={[styles.chip, { borderColor: form.label === l ? colors.primary : colors.border, backgroundColor: form.label === l ? colors.primary : colors.card }]} onPress={() => setForm({ ...form, label: l })}>
                  <Text style={[styles.chipText, { color: form.label === l ? "#fff" : colors.text }]}>{l}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Field label="Full Name *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="e.g. Rajesh Kumar" colors={colors} />
            <Field label="Phone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="e.g. 9876543210" keyboard="phone-pad" colors={colors} />
            <Field label="Address Line 1 *" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} placeholder="House/Flat No., Street" colors={colors} />
            <Field label="Address Line 2" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} placeholder="Landmark, Area (optional)" colors={colors} />
            <Field label="City *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="e.g. Mumbai" colors={colors} />
            <Field label="State *" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="e.g. Maharashtra" colors={colors} />
            <Field label="Pincode *" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} placeholder="e.g. 400001" keyboard="numeric" colors={colors} />

            <Pressable style={styles.defaultRow} onPress={() => setForm({ ...form, isDefault: !form.isDefault })}>
              <View style={[styles.checkbox, { borderColor: form.isDefault ? colors.primary : colors.border, backgroundColor: form.isDefault ? colors.primary : "transparent" }]}>
                {form.isDefault && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={[styles.defaultLabel, { color: colors.text }]}>Set as default address</Text>
            </Pressable>

            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editId ? "Save Changes" : "Add Address"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, colors }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; colors: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboard ?? "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addFirstText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  labelBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  labelText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  defaultText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", marginLeft: 2 },
  cardActions: { flexDirection: "row", gap: 4 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  phone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addressLine: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  setDefaultBtn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
  setDefaultText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 6 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  defaultRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  defaultLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
