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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = ["General", "Orders", "Payments", "Shipping", "Returns", "Account", "Products", "Other"];

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm = {
  question: "",
  answer: "",
  category: "General",
  sortOrder: "0",
  isActive: true,
};

export default function AdminFaqScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editFaq, setEditFaq] = useState<Faq | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => { fetchFaqs(); }, []);

  async function fetchFaqs() {
    try {
      const res = await apiRequest("/admin/faqs");
      if (res.ok) {
        const d = await res.json();
        setFaqs(d.faqs ?? []);
      }
    } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditFaq(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(f: Faq) {
    setEditFaq(f);
    setForm({
      question: f.question,
      answer: f.answer,
      category: f.category,
      sortOrder: String(f.sortOrder),
      isActive: f.isActive,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      Alert.alert("Required", "Question and answer are required.");
      return;
    }
    setSaving(true);
    const body = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category,
      sortOrder: parseInt(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      const res = editFaq
        ? await apiRequest(`/admin/faqs/${editFaq.id}`, { method: "PUT", body: JSON.stringify(body) })
        : await apiRequest("/admin/faqs", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        await fetchFaqs();
        setShowModal(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save.");
      }
    } catch {
      Alert.alert("Error", "Network error.");
    }
    setSaving(false);
  }

  async function handleDelete(f: Faq) {
    const doDelete = async () => {
      const res = await apiRequest(`/admin/faqs/${f.id}`, { method: "DELETE" });
      if (res.ok) setFaqs((prev) => prev.filter((x) => x.id !== f.id));
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${f.question}"?`)) doDelete();
    } else {
      Alert.alert("Delete FAQ", `Delete this question?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  async function handleToggleActive(f: Faq) {
    const res = await apiRequest(`/admin/faqs/${f.id}`, { method: "PUT", body: JSON.stringify({ isActive: !f.isActive }) });
    if (res.ok) {
      const d = await res.json();
      setFaqs((prev) => prev.map((x) => (x.id === f.id ? d.faq : x)));
    }
  }

  const filtered = faqs.filter((f) =>
    filter === "all" ? true : filter === "active" ? f.isActive : !f.isActive
  );

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Q&A Management</Text>
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {[
          { key: "all" as const, label: `All (${faqs.length})` },
          { key: "active" as const, label: `Active (${faqs.filter((f) => f.isActive).length})` },
          { key: "inactive" as const, label: `Inactive (${faqs.filter((f) => !f.isActive).length})` },
        ].map((tab) => (
          <Pressable key={tab.key} style={[styles.filterTab, filter === tab.key && { backgroundColor: "#2563EB" }]} onPress={() => setFilter(tab.key)}>
            <Text style={[styles.filterTabText, filter === tab.key && { color: "#fff" }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="help-circle" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No Q&A found</Text>
          <Pressable style={styles.addFirstBtn} onPress={openCreate}>
            <Text style={styles.addFirstText}>Add First Question</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {filtered.map((f) => (
            <View key={f.id} style={[styles.card, !f.isActive && { opacity: 0.65 }]}>
              <View style={styles.cardTop}>
                <View style={[styles.catBadge, { backgroundColor: f.isActive ? "#EFF6FF" : "#F3F4F6" }]}>
                  <Text style={[styles.catText, { color: f.isActive ? "#2563EB" : "#9CA3AF" }]}>{f.category}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: f.isActive ? "#ECFDF5" : "#FEF2F2" }]}>
                  <View style={[styles.statusDot, { backgroundColor: f.isActive ? "#10B981" : "#EF4444" }]} />
                  <Text style={[styles.statusText, { color: f.isActive ? "#10B981" : "#EF4444" }]}>
                    {f.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <View style={styles.qRow}>
                <View style={styles.qBadge}><Text style={styles.qBadgeText}>Q</Text></View>
                <Text style={styles.questionText} numberOfLines={2}>{f.question}</Text>
              </View>
              <View style={styles.aRow}>
                <View style={styles.aBadge}><Text style={styles.aBadgeText}>A</Text></View>
                <Text style={styles.answerText} numberOfLines={3}>{f.answer}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.actionBtn} onPress={() => openEdit(f)}>
                  <Feather name="edit-2" size={14} color="#2563EB" />
                  <Text style={[styles.actionText, { color: "#2563EB" }]}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: f.isActive ? "#FFFBEB" : "#ECFDF5" }]} onPress={() => handleToggleActive(f)}>
                  <Feather name={f.isActive ? "eye-off" : "eye"} size={14} color={f.isActive ? "#F59E0B" : "#10B981"} />
                  <Text style={[styles.actionText, { color: f.isActive ? "#F59E0B" : "#10B981" }]}>
                    {f.isActive ? "Hide" : "Show"}
                  </Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => handleDelete(f)}>
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F8FAFF" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editFaq ? "Edit Question" : "New Question"}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Question *</Text>
              <TextInput
                style={[styles.fieldInput, { height: 80, textAlignVertical: "top" }]}
                value={form.question}
                onChangeText={(v) => setForm({ ...form, question: v })}
                placeholder="e.g. How long does delivery take?"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Answer *</Text>
              <TextInput
                style={[styles.fieldInput, { height: 120, textAlignVertical: "top" }]}
                value={form.answer}
                onChangeText={(v) => setForm({ ...form, answer: v })}
                placeholder="Write the answer here..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {CATEGORIES.map((c) => (
                  <Pressable key={c} style={[styles.catChip, form.category === c && { backgroundColor: "#2563EB" }]} onPress={() => setForm({ ...form, category: c })}>
                    <Text style={[styles.catChipText, form.category === c && { color: "#fff" }]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sort Order (lower = first)</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.sortOrder}
                onChangeText={(v) => setForm({ ...form, sortOrder: v })}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Active (visible to customers)</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm({ ...form, isActive: v })}
                trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                thumbColor="#fff"
              />
            </View>
            <Pressable style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editFaq ? "Save Changes" : "Add Question"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#6B7280" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "DMSans_500Medium", color: "#9CA3AF" },
  addFirstBtn: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addFirstText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  qRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  qBadge: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginTop: 1 },
  qBadgeText: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#2563EB" },
  questionText: { flex: 1, fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#0F1740", lineHeight: 20 },
  aRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  aBadge: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginTop: 1 },
  aBadgeText: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#10B981" },
  answerText: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular", color: "#6B7280", lineHeight: 19 },
  cardActions: { flexDirection: "row", gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EFF6FF", paddingVertical: 8, borderRadius: 8 },
  actionText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  modalContent: { padding: 20, gap: 4 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#6B7280", marginBottom: 6, letterSpacing: 0.3 },
  fieldInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "DMSans_400Regular", color: "#0F1740", backgroundColor: "#fff" },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6" },
  catChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#6B7280" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingVertical: 4 },
  saveBtn: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
});
