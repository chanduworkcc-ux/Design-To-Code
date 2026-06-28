import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { PRODUCT_TAGS } from "@/data/products";
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

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number | null;
  discount: number | null;
  rating: number;
  description: string | null;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = ["Clothing", "Electronics", "Books", "Home", "Beauty", "Sports", "Food", "Other"];

const emptyForm = {
  name: "", category: "Electronics", price: "", originalPrice: "",
  discount: "", rating: "4.5", description: "", imageUrl: "", stock: "100",
  isActive: true, tags: [] as string[],
};

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const res = await apiRequest("/admin/products");
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }

  function openCreate() {
    setEditProduct(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      discount: p.discount ? String(p.discount) : "",
      rating: String(p.rating),
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      stock: String(p.stock),
      isActive: p.isActive,
      tags: p.tags ?? [],
    });
    setShowModal(true);
  }

  function toggleTag(key: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key],
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) {
      Alert.alert("Error", "Name and price are required.");
      return;
    }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price),
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      discount: form.discount ? parseInt(form.discount) : undefined,
      rating: parseFloat(form.rating) || 4.5,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      stock: parseInt(form.stock) || 100,
      isActive: form.isActive,
      tags: form.tags,
    };
    try {
      let res: Response;
      if (editProduct) {
        res = await apiRequest(`/products/${editProduct.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        res = await apiRequest("/products", { method: "POST", body: JSON.stringify(body) });
      }
      if (res.ok) {
        const d = await res.json();
        if (editProduct) {
          setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? d.product : p)));
        } else {
          setProducts((prev) => [d.product, ...prev]);
        }
        setShowModal(false);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save product.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSaving(false);
  }

  async function handleToggleActive(p: Product) {
    const res = await apiRequest(`/products/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) {
      const d = await res.json();
      setProducts((prev) => prev.map((x) => (x.id === p.id ? d.product : x)));
    }
  }

  async function pickImageFromGallery() {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        formData.append("image", blob, "product.jpg");
      } else {
        formData.append("image", { uri: asset.uri, name: "product.jpg", type: asset.mimeType ?? "image/jpeg" } as any);
      }
      const res = await apiRequest("/storage/uploads/image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setForm((f) => ({ ...f, imageUrl: d.imageUrl }));
      } else {
        const err = await res.json();
        Alert.alert("Upload Failed", err.error ?? "Could not upload image. You can still paste an image URL manually.");
      }
    } catch {
      Alert.alert("Upload Failed", "Could not upload image. You can still paste an image URL manually.");
    }
    setUploadingImage(false);
  }

  async function handleAddStock(p: Product) {
    const doAdd = async (qty: number) => {
      const res = await apiRequest(`/admin/products/${p.id}/add-stock`, {
        method: "POST",
        body: JSON.stringify({ quantity: qty }),
      });
      if (res.ok) {
        const d = await res.json();
        setProducts((prev) => prev.map((x) => (x.id === p.id ? d.product : x)));
        Alert.alert("Stock Updated", `Added ${qty} units. New stock: ${d.product.stock}`);
      } else {
        Alert.alert("Error", "Failed to update stock.");
      }
    };
    if (Platform.OS === "web") {
      const input = window.prompt(`Add stock for "${p.name}" (current: ${p.stock})\n\nEnter quantity to add:`, "10");
      if (input) {
        const qty = parseInt(input);
        if (!isNaN(qty) && qty > 0) doAdd(qty);
      }
    } else {
      Alert.prompt(
        "Add Stock",
        `Current stock for "${p.name}": ${p.stock}\n\nEnter quantity to add:`,
        (input) => {
          const qty = parseInt(input ?? "");
          if (!isNaN(qty) && qty > 0) doAdd(qty);
          else Alert.alert("Invalid", "Please enter a positive number.");
        },
        "plain-text",
        "10",
        "numeric"
      );
    }
  }

  async function handleMarkOutOfStock(p: Product) {
    if (p.stock === 0) {
      Alert.alert("Already Out of Stock", `"${p.name}" is already out of stock.`);
      return;
    }
    const doMark = async () => {
      const res = await apiRequest(`/admin/products/${p.id}/out-of-stock`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setProducts((prev) => prev.map((x) => (x.id === p.id ? d.product : x)));
      } else {
        Alert.alert("Error", "Failed to mark out of stock.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Mark "${p.name}" as Out of Stock? This will set stock to 0.`)) doMark();
    } else {
      Alert.alert("Mark Out of Stock", `Set stock to 0 for "${p.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: doMark },
      ]);
    }
  }

  async function handleDelete(p: Product) {
    const doDelete = async () => {
      const res = await apiRequest(`/products/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((x) => x.id !== p.id));
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${p.name}"?`)) doDelete();
    } else {
      Alert.alert("Delete Product", `Delete "${p.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "active" ? p.isActive : !p.isActive;
    return matchSearch && matchFilter;
  });

  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.filter((p) => !p.isActive).length;

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Products</Text>
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color="#9CA3AF" /></Pressable>}
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {[
          { key: "all" as const, label: `All (${products.length})` },
          { key: "active" as const, label: `Active (${activeCount})` },
          { key: "inactive" as const, label: `Inactive (${inactiveCount})` },
        ].map((tab) => (
          <Pressable key={tab.key} style={[styles.filterTab, filter === tab.key && { backgroundColor: "#2563EB" }]} onPress={() => setFilter(tab.key)}>
            <Text style={[styles.filterTabText, filter === tab.key && { color: "#fff" }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.center}>
              <Feather name="package" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products found</Text>
              <Pressable style={styles.addFirstBtn} onPress={openCreate}>
                <Text style={styles.addFirstText}>Add First Product</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((p) => (
              <View key={p.id} style={[styles.productCard, !p.isActive && { opacity: 0.7 }]}>
                <View style={styles.productTop}>
                  <View style={[styles.productIcon, { backgroundColor: p.isActive ? "#EFF6FF" : "#F3F4F6" }]}>
                    <Feather name="package" size={22} color={p.isActive ? "#2563EB" : "#9CA3AF"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <View style={[styles.activeBadge, { backgroundColor: p.isActive ? "#ECFDF5" : "#F3F4F6" }]}>
                        <Text style={[styles.activeText, { color: p.isActive ? "#10B981" : "#9CA3AF" }]}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.productCategory}>{p.category} · Stock: {p.stock}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>₹{Number(p.price).toFixed(2)}</Text>
                      {p.originalPrice && <Text style={styles.originalPrice}>₹{Number(p.originalPrice).toFixed(2)}</Text>}
                      {p.discount && <View style={styles.discBadge}><Text style={styles.discText}>-{p.discount}%</Text></View>}
                    </View>
                    <View style={styles.ratingRow}>
                      <Feather name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{p.rating}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <Pressable style={styles.actionBtn} onPress={() => openEdit(p)}>
                    <Feather name="edit-2" size={15} color="#2563EB" />
                    <Text style={[styles.actionText, { color: "#2563EB" }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#ECFDF5" }]} onPress={() => handleAddStock(p)}>
                    <Feather name="plus-circle" size={15} color="#10B981" />
                    <Text style={[styles.actionText, { color: "#10B981" }]}>Add Stock</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#FFFBEB" }]} onPress={() => handleMarkOutOfStock(p)}>
                    <Feather name="alert-circle" size={15} color="#F59E0B" />
                    <Text style={[styles.actionText, { color: "#F59E0B" }]}>Out of Stock</Text>
                  </Pressable>
                </View>
                <View style={[styles.productActions, { borderTopWidth: 1, borderTopColor: "#F3F4F6" }]}>
                  <Pressable style={[styles.actionBtn, { backgroundColor: p.isActive ? "#FFFBEB" : "#ECFDF5" }]} onPress={() => handleToggleActive(p)}>
                    <Feather name={p.isActive ? "eye-off" : "eye"} size={15} color={p.isActive ? "#F59E0B" : "#10B981"} />
                    <Text style={[styles.actionText, { color: p.isActive ? "#F59E0B" : "#10B981" }]}>{p.isActive ? "Deactivate" : "Activate"}</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => handleDelete(p)}>
                    <Feather name="trash-2" size={15} color="#EF4444" />
                    <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editProduct ? "Edit Product" : "Add Product"}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <FormField label="Product Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Wireless Earbuds" />
            <FormField label="Category *" value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} placeholder="Electronics" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} style={[styles.catChip, form.category === c && { backgroundColor: "#2563EB" }]} onPress={() => setForm({ ...form, category: c })}>
                  <Text style={[styles.catChipText, form.category === c && { color: "#fff" }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <FormField label="Price (₹) *" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} placeholder="999.00" keyboardType="numeric" />
            <FormField label="Original Price (₹)" value={form.originalPrice} onChangeText={(v) => setForm({ ...form, originalPrice: v })} placeholder="1299.00 (optional)" keyboardType="numeric" />
            <FormField label="Discount (%)" value={form.discount} onChangeText={(v) => setForm({ ...form, discount: v })} placeholder="20 (optional)" keyboardType="numeric" />
            <FormField label="Rating (0–5)" value={form.rating} onChangeText={(v) => setForm({ ...form, rating: v })} placeholder="4.5" keyboardType="numeric" />
            <FormField label="Stock" value={form.stock} onChangeText={(v) => setForm({ ...form, stock: v })} placeholder="100" keyboardType="numeric" />
            {/* Image Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Product Image</Text>
              <Pressable
                style={styles.imagePicker}
                onPress={pickImageFromGallery}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="#2563EB" />
                ) : form.imageUrl ? (
                  <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Feather name="image" size={28} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>Tap to pick from Gallery</Text>
                  </View>
                )}
              </Pressable>
              {form.imageUrl ? (
                <Pressable style={styles.changeImageBtn} onPress={pickImageFromGallery} disabled={uploadingImage}>
                  <Feather name="camera" size={14} color="#2563EB" />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </Pressable>
              ) : null}
              <Text style={styles.imageUrlHint}>Or paste URL:</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.imageUrl}
                onChangeText={(v) => setForm({ ...form, imageUrl: v })}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
              />
            </View>
            <FormField label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Product description..." multiline />
            {/* Tags */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Product Tags</Text>
              <View style={styles.tagsGrid}>
                {PRODUCT_TAGS.map((tag) => {
                  const active = form.tags.includes(tag.key);
                  return (
                    <Pressable
                      key={tag.key}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: active ? tag.bg : "#F3F4F6",
                          borderColor: active ? tag.color : "#E5E7EB",
                        },
                      ]}
                      onPress={() => toggleTag(tag.key)}
                    >
                      <Text style={[styles.tagChipText, { color: active ? tag.color : "#6B7280" }]}>
                        {tag.label}
                      </Text>
                      {active && (
                        <Feather name="check" size={11} color={tag.color} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Active</Text>
              <Pressable
                style={[styles.toggleBtn, { backgroundColor: form.isActive ? "#2563EB" : "#E5E7EB" }]}
                onPress={() => setForm({ ...form, isActive: !form.isActive })}
              >
                <View style={[styles.toggleThumb, { marginLeft: form.isActive ? "auto" : 0 }]} />
              </Pressable>
            </View>
            <Pressable style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editProduct ? "Save Changes" : "Create Product"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
  multiline?: boolean;
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, multiline }: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", color: "#0F1740", padding: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "DMSans_400Regular" },
  addFirstBtn: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addFirstText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 16, gap: 12 },
  productCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  productTop: { flexDirection: "row", gap: 12, padding: 14 },
  productIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  productName: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#0F1740", flex: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  productCategory: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#6B7280", marginTop: 3 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  priceText: { fontSize: 15, fontFamily: "DMSans_700Bold", color: "#2563EB" },
  originalPrice: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#9CA3AF", textDecorationLine: "line-through" },
  discBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discText: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#EF4444" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  ratingText: { fontSize: 12, fontFamily: "DMSans_500Medium", color: "#6B7280" },
  productActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 1 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, backgroundColor: "#EFF6FF" },
  actionText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5EAF8", backgroundColor: "#fff" },
  modalTitle: { fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  modalContent: { padding: 20, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  fieldInput: { borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "DMSans_400Regular", color: "#0F1740" },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  catChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, padding: 3 },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  imagePicker: { borderRadius: 12, borderWidth: 1.5, borderColor: "#E5EAF8", borderStyle: "dashed", backgroundColor: "#F9FAFB", height: 140, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#9CA3AF" },
  changeImageBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  changeImageText: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#2563EB" },
  imageUrlHint: { fontSize: 11, fontFamily: "DMSans_500Medium", color: "#9CA3AF", marginTop: 10, marginBottom: 4 },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  tagChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
});
