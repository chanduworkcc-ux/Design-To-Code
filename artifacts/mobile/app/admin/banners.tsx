import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  bgColor: string;
  textColor: string;
  ctaText: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const PRESET_COLORS = ["#2563EB", "#8B5CF6", "#10B981", "#EF4444", "#F97316", "#0EA5E9", "#EC4899", "#14B8A6"];

const emptyForm = {
  title: "", subtitle: "", bgColor: "#2563EB", textColor: "#ffffff",
  ctaText: "Shop Now", imageUrl: "", sortOrder: "0", isActive: true,
};

export default function BannersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  async function pickBannerImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 7],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingBannerImage(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        name: asset.fileName ?? `banner-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      } as any);
      const res = await apiRequest("/storage/uploads/image", {
        method: "POST",
        body: formData,
        headers: {},
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.imageUrl ?? "" }));
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message ?? "Could not upload image.");
    }
    setUploadingBannerImage(false);
  }

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    try {
      const res = await apiRequest("/admin/banners");
      if (res.ok) { const d = await res.json(); setBanners(d.banners ?? []); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() { setRefreshing(true); await fetchBanners(); setRefreshing(false); }

  function openCreate() { setEditBanner(null); setForm({ ...emptyForm }); setShowModal(true); }

  function openEdit(b: Banner) {
    setEditBanner(b);
    setForm({
      title: b.title, subtitle: b.subtitle ?? "", bgColor: b.bgColor,
      textColor: b.textColor, ctaText: b.ctaText, imageUrl: b.imageUrl ?? "",
      sortOrder: String(b.sortOrder), isActive: b.isActive,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { Alert.alert("Error", "Title is required."); return; }
    setSaving(true);
    const body = {
      title: form.title.trim(),
      subtitle: form.subtitle || undefined,
      bgColor: form.bgColor,
      textColor: form.textColor,
      ctaText: form.ctaText,
      imageUrl: form.imageUrl || undefined,
      sortOrder: parseInt(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      let res: Response;
      if (editBanner) {
        res = await apiRequest(`/admin/banners/${editBanner.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        res = await apiRequest("/admin/banners", { method: "POST", body: JSON.stringify(body) });
      }
      if (res.ok) {
        const d = await res.json();
        if (editBanner) {
          setBanners((prev) => prev.map((b) => (b.id === editBanner.id ? d.banner : b)));
        } else {
          setBanners((prev) => [...prev, d.banner].sort((a, b) => a.sortOrder - b.sortOrder));
        }
        setShowModal(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save banner.");
      }
    } catch { Alert.alert("Error", "Network error."); }
    setSaving(false);
  }

  async function handleToggle(b: Banner) {
    const res = await apiRequest(`/admin/banners/${b.id}`, { method: "PUT", body: JSON.stringify({ isActive: !b.isActive }) });
    if (res.ok) { const d = await res.json(); setBanners((prev) => prev.map((x) => (x.id === b.id ? d.banner : x))); }
  }

  async function handleDelete(b: Banner) {
    const doDelete = async () => {
      const res = await apiRequest(`/admin/banners/${b.id}`, { method: "DELETE" });
      if (res.ok) setBanners((prev) => prev.filter((x) => x.id !== b.id));
    };
    if (Platform.OS === "web") { if (window.confirm(`Delete banner "${b.title}"?`)) doDelete(); }
    else Alert.alert("Delete Banner", `Delete "${b.title}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete }]);
  }

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Sliding Banners</Text>
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
          {banners.length === 0 ? (
            <View style={styles.center}>
              <Feather name="image" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No banners yet</Text>
              <Text style={styles.emptySubText}>Add banners that appear on the home screen carousel</Text>
              <Pressable style={styles.addFirstBtn} onPress={openCreate}><Text style={styles.addFirstText}>Create First Banner</Text></Pressable>
            </View>
          ) : (
            banners.map((b) => (
              <View key={b.id} style={[styles.bannerCard, !b.isActive && { opacity: 0.65 }]}>
                {/* Preview */}
                <View style={[styles.bannerPreview, { backgroundColor: b.bgColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prevTitle, { color: b.textColor }]} numberOfLines={1}>{b.title}</Text>
                    {b.subtitle && <Text style={[styles.prevSub, { color: b.textColor + "CC" }]} numberOfLines={1}>{b.subtitle}</Text>}
                    <View style={[styles.prevCta, { borderColor: b.textColor + "80" }]}>
                      <Text style={[styles.prevCtaText, { color: b.textColor }]}>{b.ctaText}</Text>
                    </View>
                  </View>
                  <View style={[styles.prevIcon, { backgroundColor: b.textColor + "20" }]}>
                    <Feather name="image" size={28} color={b.textColor} />
                  </View>
                  <View style={[styles.sortBadge, { backgroundColor: b.textColor + "20" }]}>
                    <Text style={[styles.sortText, { color: b.textColor }]}>#{b.sortOrder}</Text>
                  </View>
                  {!b.isActive && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Hidden</Text>
                    </View>
                  )}
                </View>
                {/* Actions */}
                <View style={styles.cardActions}>
                  <Pressable style={styles.actionBtn} onPress={() => openEdit(b)}>
                    <Feather name="edit-2" size={14} color="#2563EB" />
                    <Text style={[styles.actionText, { color: "#2563EB" }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: b.isActive ? "#FFFBEB" : "#ECFDF5" }]} onPress={() => handleToggle(b)}>
                    <Feather name={b.isActive ? "eye-off" : "eye"} size={14} color={b.isActive ? "#F59E0B" : "#10B981"} />
                    <Text style={[styles.actionText, { color: b.isActive ? "#F59E0B" : "#10B981" }]}>{b.isActive ? "Hide" : "Show"}</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => handleDelete(b)}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editBanner ? "Edit Banner" : "Create Banner"}</Text>
            <Pressable onPress={() => setShowModal(false)}><Feather name="x" size={22} color="#6B7280" /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            {/* Live Preview */}
            <View style={[styles.modalPreview, { backgroundColor: form.bgColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prevTitle, { color: form.textColor }]}>{form.title || "Banner Title"}</Text>
                {!!form.subtitle && <Text style={[styles.prevSub, { color: form.textColor + "CC" }]}>{form.subtitle}</Text>}
                <View style={[styles.prevCta, { borderColor: form.textColor + "60" }]}>
                  <Text style={[styles.prevCtaText, { color: form.textColor }]}>{form.ctaText || "Shop Now"}</Text>
                </View>
              </View>
              <View style={[styles.prevIcon, { backgroundColor: form.textColor + "20" }]}>
                <Feather name="image" size={28} color={form.textColor} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.fieldInput} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Summer Sale" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput style={styles.fieldInput} value={form.subtitle} onChangeText={(v) => setForm({ ...form, subtitle: v })} placeholder="Up to 50% off on all items" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CTA Button Text</Text>
              <TextInput style={styles.fieldInput} value={form.ctaText} onChangeText={(v) => setForm({ ...form, ctaText: v })} placeholder="Shop Now" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Banner Image (optional)</Text>
              {!!form.imageUrl && (
                <View style={{ position: "relative", marginBottom: 8 }}>
                  <Image source={{ uri: form.imageUrl }} style={styles.bannerImagePreview} resizeMode="cover" />
                  <Pressable
                    style={styles.removeImageBtn}
                    onPress={() => setForm({ ...form, imageUrl: "" })}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={[styles.galleryBtn, { opacity: uploadingBannerImage ? 0.6 : 1 }]}
                  onPress={pickBannerImage}
                  disabled={uploadingBannerImage}
                >
                  {uploadingBannerImage
                    ? <ActivityIndicator size="small" color="#2563EB" />
                    : <><Feather name="image" size={15} color="#2563EB" /><Text style={styles.galleryBtnText}>Pick from Gallery</Text></>
                  }
                </Pressable>
              </View>
              <Text style={styles.orText}>— or paste a URL —</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.imageUrl}
                onChangeText={(v) => setForm({ ...form, imageUrl: v })}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Background Color</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <Pressable key={c} style={[styles.colorDot, { backgroundColor: c }, form.bgColor === c && styles.colorDotActive]} onPress={() => setForm({ ...form, bgColor: c })} />
                ))}
              </View>
              <TextInput style={styles.fieldInput} value={form.bgColor} onChangeText={(v) => setForm({ ...form, bgColor: v })} placeholder="#2563EB" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Text Color</Text>
              <View style={styles.colorRow}>
                {["#ffffff", "#0F1740", "#F59E0B", "#10B981", "#EF4444"].map((c) => (
                  <Pressable key={c} style={[styles.colorDot, { backgroundColor: c, borderWidth: 1, borderColor: "#E5EAF8" }, form.textColor === c && styles.colorDotActive]} onPress={() => setForm({ ...form, textColor: c })} />
                ))}
              </View>
              <TextInput style={styles.fieldInput} value={form.textColor} onChangeText={(v) => setForm({ ...form, textColor: v })} placeholder="#ffffff" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sort Order (0 = first)</Text>
              <TextInput style={styles.fieldInput} value={form.sortOrder} onChangeText={(v) => setForm({ ...form, sortOrder: v })} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Active (visible on home screen)</Text>
              <Pressable style={[styles.toggleBtn, { backgroundColor: form.isActive ? "#2563EB" : "#E5E7EB" }]} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
                <View style={[styles.toggleThumb, { marginLeft: form.isActive ? "auto" : 0 }]} />
              </Pressable>
            </View>

            <Pressable style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editBanner ? "Save Changes" : "Create Banner"}</Text>}
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 32 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  emptyText: { color: "#374151", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  emptySubText: { color: "#9CA3AF", fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" },
  addFirstBtn: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addFirstText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 16, gap: 14 },
  bannerCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  bannerPreview: { height: 110, flexDirection: "row", alignItems: "center", padding: 16, gap: 12, position: "relative" },
  prevTitle: { fontSize: 16, fontFamily: "DMSans_700Bold", marginBottom: 4 },
  prevSub: { fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 8 },
  prevCta: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 20 },
  prevCtaText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  prevIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sortBadge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  sortText: { fontSize: 11, fontFamily: "DMSans_700Bold" },
  inactiveBadge: { position: "absolute", bottom: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.35)" },
  inactiveText: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#fff" },
  cardActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, backgroundColor: "#EFF6FF" },
  actionText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5EAF8", backgroundColor: "#fff" },
  modalTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  modalContent: { padding: 20, gap: 14 },
  modalPreview: { height: 100, borderRadius: 14, flexDirection: "row", alignItems: "center", padding: 14, gap: 12, marginBottom: 4 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  fieldInput: { borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "DMSans_400Regular", color: "#0F1740" },
  colorRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: "#0F1740" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, padding: 3 },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  bannerImagePreview: { width: "100%", height: 110, borderRadius: 10 },
  removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 16, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  galleryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: "#2563EB", borderStyle: "dashed" },
  galleryBtnText: { color: "#2563EB", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  orText: { textAlign: "center", fontSize: 12, fontFamily: "DMSans_400Regular", color: "#9CA3AF", marginVertical: 6 },
});
