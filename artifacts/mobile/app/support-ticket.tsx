import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useColors } from "@/hooks/useColors";

type TicketCategory = "order_issue" | "payment" | "product" | "account" | "other";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order Issue",
  payment: "Payment",
  product: "Product",
  account: "Account",
  other: "Other",
};

const STATUS_CONFIG: Record<TicketStatus, { color: string; bg: string; label: string }> = {
  open:        { color: "#F59E0B", bg: "#FFFBEB", label: "Open" },
  in_progress: { color: "#3B82F6", bg: "#EFF6FF", label: "In Progress" },
  resolved:    { color: "#10B981", bg: "#ECFDF5", label: "Resolved" },
  closed:      { color: "#6B7280", bg: "#F9FAFB", label: "Closed" },
};

const CATEGORIES: TicketCategory[] = ["order_issue", "payment", "product", "account", "other"];

export default function SupportTicketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<TicketCategory>("order_issue");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await apiRequest("/tickets");
      if (res.ok) { const d = await res.json(); setTickets(d.tickets ?? []); }
    } catch {}
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }

  async function handleSubmit() {
    if (description.trim().length < 10) {
      Alert.alert("Too short", "Please describe your issue in at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({ category, description: description.trim() }),
      });
      if (res.ok) {
        setDescription("");
        setShowForm(false);
        await fetchTickets();
      } else {
        Alert.alert("Error", "Failed to submit ticket. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error.");
    }
    setSubmitting(false);
  }

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to raise a ticket</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login" as any)}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
        <Pressable
          style={[styles.newBtn, { backgroundColor: showForm ? colors.secondary : colors.primary }]}
          onPress={() => setShowForm((v) => !v)}
        >
          <Feather name={showForm ? "x" : "plus"} size={16} color={showForm ? colors.text : "#fff"} />
          <Text style={[styles.newBtnText, { color: showForm ? colors.text : "#fff" }]}>
            {showForm ? "Cancel" : "New Ticket"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Raise a Support Ticket</Text>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.categoryChip, { borderColor: category === c ? colors.primary : colors.border, backgroundColor: category === c ? colors.primary : colors.secondary }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.categoryChipText, { color: category === c ? "#fff" : colors.mutedForeground }]}>
                    {CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Describe your issue</Text>
            <TextInput
              style={[styles.textarea, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Please describe your issue in detail (minimum 10 characters)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Ticket</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Tickets List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.center}>
            <Feather name="life-buoy" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tickets yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Tap "New Ticket" to raise a support request.</Text>
          </View>
        ) : (
          tickets.map((ticket) => {
            const sc = STATUS_CONFIG[ticket.status];
            return (
              <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.ticketTop}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{CATEGORY_LABELS[ticket.category]}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>
                <Text style={[styles.ticketDesc, { color: colors.text }]} numberOfLines={3}>{ticket.description}</Text>
                <View style={styles.ticketMeta}>
                  <Feather name="hash" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.ticketId, { color: colors.mutedForeground }]}>{ticket.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={[styles.ticketDate, { color: colors.mutedForeground }]}>
                    {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  center: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  formCard: { borderRadius: 16, borderWidth: 2, padding: 16, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  formLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 4 },
  categoryRow: { gap: 8, paddingBottom: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100, lineHeight: 20 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ticketCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  ticketTop: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ticketDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  ticketMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  ticketId: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  ticketDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
