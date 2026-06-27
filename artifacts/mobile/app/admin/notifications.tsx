import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

interface Notification {
  id: string;
  title: string;
  body: string;
  targetType: string;
  targetUserId: string | null;
  iconName: string;
  sentAt: string;
}

const ICONS = ["bell", "star", "tag", "gift", "zap", "alert-circle", "check-circle", "info"];

const emptyForm = { title: "", body: "", targetType: "all" as "all" | "user" | "new_users" | "old_users", targetUserId: "", iconName: "bell" };

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [sending, setSending] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      const res = await apiRequest("/admin/notifications");
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications ?? []); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() { setRefreshing(true); await fetchNotifications(); setRefreshing(false); }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert("Error", "Title and message are required.");
      return;
    }
    if (form.targetType === "user" && !form.targetUserId.trim()) {
      Alert.alert("Error", "User ID is required for targeted notifications.");
      return;
    }
    setSending(true);
    const body: any = {
      title: form.title.trim(),
      body: form.body.trim(),
      targetType: form.targetType,
      iconName: form.iconName,
    };
    if (form.targetType === "user") body.targetUserId = form.targetUserId.trim();
    try {
      const res = await apiRequest("/admin/notifications/send", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        const d = await res.json();
        setNotifications((prev) => [d.notification, ...prev]);
        setForm({ ...emptyForm });
        setShowForm(false);
        Alert.alert("Sent!", `Notification "${form.title}" has been sent successfully.`);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to send notification.");
      }
    } catch { Alert.alert("Error", "Network error."); }
    setSending(false);
  }

  const ICON_COLORS: Record<string, string> = {
    bell: "#2563EB", star: "#F59E0B", tag: "#8B5CF6", gift: "#EC4899",
    zap: "#F97316", "alert-circle": "#EF4444", "check-circle": "#10B981", info: "#06B6D4",
  };

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={() => setShowForm((v) => !v)} style={[styles.composeBtn, showForm && { backgroundColor: "#E5E7EB" }]}>
          <Feather name={showForm ? "x" : "send"} size={18} color={showForm ? "#6B7280" : "#fff"} />
          <Text style={[styles.composeBtnText, showForm && { color: "#6B7280" }]}>{showForm ? "Cancel" : "Send New"}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Compose Form */}
        {showForm && (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.composeCard}>
              <Text style={styles.composeTitle}>Compose Notification</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput style={styles.fieldInput} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="🔔 Flash Sale is LIVE!" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Message *</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: "top" }]}
                  value={form.body}
                  onChangeText={(v) => setForm({ ...form, body: v })}
                  placeholder="Up to 50% off on selected items. Limited time only!"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Target Audience</Text>
                <View style={[styles.segmented, { flexWrap: "wrap" }]}>
                  {([
                    { key: "all", label: "All Users" },
                    { key: "new_users", label: "New Users" },
                    { key: "old_users", label: "Old Users" },
                    { key: "user", label: "Specific User" },
                  ] as const).map(({ key, label }) => (
                    <Pressable
                      key={key}
                      style={[styles.segBtn, { minWidth: "45%", marginBottom: 4 }, form.targetType === key && styles.segBtnActive]}
                      onPress={() => setForm({ ...form, targetType: key })}
                    >
                      <Text style={[styles.segText, form.targetType === key && styles.segTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {(form.targetType === "new_users" || form.targetType === "old_users") && (
                  <View style={{ backgroundColor: "#FFFBEB", borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: "#FDE68A" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E" }}>
                      {form.targetType === "new_users"
                        ? "Sends to users registered within the last 30 days."
                        : "Sends to users registered more than 30 days ago."}
                    </Text>
                  </View>
                )}
              </View>
              {form.targetType === "user" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>User ID *</Text>
                  <TextInput style={styles.fieldInput} value={form.targetUserId} onChangeText={(v) => setForm({ ...form, targetUserId: v })} placeholder="Enter user UUID" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
                </View>
              )}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {ICONS.map((ic) => {
                    const color = ICON_COLORS[ic] ?? "#6B7280";
                    const active = form.iconName === ic;
                    return (
                      <Pressable key={ic} style={[styles.iconBtn, { backgroundColor: active ? color + "20" : "#F3F4F6", borderColor: active ? color : "transparent", borderWidth: 2 }]} onPress={() => setForm({ ...form, iconName: ic })}>
                        <Feather name={ic as any} size={20} color={active ? color : "#9CA3AF"} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Preview */}
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewCard}>
                  <View style={[styles.previewIcon, { backgroundColor: (ICON_COLORS[form.iconName] ?? "#2563EB") + "20" }]}>
                    <Feather name={form.iconName as any} size={20} color={ICON_COLORS[form.iconName] ?? "#2563EB"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewTitle}>{form.title || "Notification Title"}</Text>
                    <Text style={styles.previewBody} numberOfLines={2}>{form.body || "Notification message will appear here..."}</Text>
                  </View>
                </View>
              </View>

              <Pressable style={[styles.sendBtn, { opacity: sending ? 0.7 : 1 }]} onPress={handleSend} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>
                      {form.targetType === "all" ? "Send to All Users"
                        : form.targetType === "new_users" ? "Send to New Users"
                        : form.targetType === "old_users" ? "Send to Old Users"
                        : "Send to User"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* History */}
        <View style={styles.historyHeader}>
          <Feather name="clock" size={14} color="#6B7280" />
          <Text style={styles.historyTitle}>Sent History ({notifications.length})</Text>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#2563EB" /><Text style={styles.loadingText}>Loading...</Text></View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <Feather name="bell-off" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No notifications sent yet</Text>
            <Text style={styles.emptySubText}>Use the compose form above to send your first notification</Text>
          </View>
        ) : (
          notifications.map((n) => {
            const color = ICON_COLORS[n.iconName] ?? "#2563EB";
            return (
              <View key={n.id} style={styles.notifCard}>
                <View style={[styles.notifIcon, { backgroundColor: color + "20" }]}>
                  <Feather name={n.iconName as any} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                    <View style={[styles.targetBadge, {
                      backgroundColor: n.targetType === "all" ? "#EFF6FF"
                        : n.targetType === "new_users" ? "#ECFDF5"
                        : n.targetType === "old_users" ? "#F5F3FF"
                        : "#FEF2F2"
                    }]}>
                      <Text style={[styles.targetText, {
                        color: n.targetType === "all" ? "#2563EB"
                          : n.targetType === "new_users" ? "#10B981"
                          : n.targetType === "old_users" ? "#8B5CF6"
                          : "#EF4444"
                      }]}>
                        {n.targetType === "all" ? "All"
                          : n.targetType === "new_users" ? "New Users"
                          : n.targetType === "old_users" ? "Old Users"
                          : "User"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.notifDate}>{new Date(n.sentAt).toLocaleString("en-IN")}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#2563EB" },
  composeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  content: { padding: 16, gap: 16 },
  composeCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", padding: 18, gap: 14 },
  composeTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  fieldInput: { borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F1740" },
  segmented: { flexDirection: "row", gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  segBtnActive: { backgroundColor: "#2563EB" },
  segText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  segTextActive: { color: "#fff" },
  iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  previewBox: { backgroundColor: "#F8FAFF", borderRadius: 12, padding: 12, gap: 8 },
  previewLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },
  previewCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E5EAF8" },
  previewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  previewTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F1740" },
  previewBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 15 },
  sendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 32 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#374151", fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubText: { color: "#9CA3AF", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  notifCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", padding: 14, flexDirection: "row", gap: 12 },
  notifIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  notifTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F1740" },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  targetText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#374151" },
  notifDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 6 },
});
