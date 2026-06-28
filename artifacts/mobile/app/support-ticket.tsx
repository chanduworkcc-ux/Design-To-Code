import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const SOCKET_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type TicketCategory = "order_issue" | "payment" | "product" | "account" | "other";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  ticketNumber: string | null;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
}

interface TicketNote {
  id: string;
  ticketId: string;
  authorId: string;
  note: string;
  imageUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order Issue",
  payment:     "Payment",
  product:     "Product",
  account:     "Account",
  other:       "Other",
};

const STATUS_CONFIG: Record<TicketStatus, { color: string; bg: string; label: string }> = {
  open:        { color: "#F59E0B", bg: "#FFFBEB", label: "Open" },
  in_progress: { color: "#3B82F6", bg: "#EFF6FF", label: "In Progress" },
  resolved:    { color: "#10B981", bg: "#ECFDF5", label: "Resolved" },
  closed:      { color: "#6B7280", bg: "#F9FAFB", label: "Closed" },
};

const CATEGORIES: TicketCategory[] = ["order_issue", "payment", "product", "account", "other"];

function TicketChat({
  ticket,
  apiRequest,
  onNotesUpdate,
  colors,
}: {
  ticket: Ticket;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
  onNotesUpdate?: (ticketId: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadNotes();
  }, [ticket.id]);

  async function loadNotes() {
    setLoadingNotes(true);
    try {
      const res = await apiRequest(`/tickets/${ticket.id}/notes`);
      if (res.ok) {
        const d = await res.json();
        setNotes(d.notes ?? []);
      }
    } catch {}
    setLoadingNotes(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendReply(noteText?: string, imageUrl?: string) {
    const payload: Record<string, string> = {};
    if (noteText?.trim()) payload.note = noteText.trim();
    if (imageUrl) payload.imageUrl = imageUrl;
    if (!payload.note && !payload.imageUrl) return;

    setSending(true);
    try {
      const res = await apiRequest(`/tickets/${ticket.id}/notes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        setNotes((prev) => [...prev, d.note]);
        setReply("");
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
    setSending(false);
  }

  async function pickAndSendImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploadingImage(true);
    try {
      const urlRes = await apiRequest("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          name: asset.fileName ?? `ticket-img-${Date.now()}.jpg`,
          size: asset.fileSize ?? 500000,
          contentType: asset.mimeType ?? "image/jpeg",
        }),
      });
      if (!urlRes.ok) throw new Error("Upload URL failed");
      const { uploadURL, objectPath } = await urlRes.json();

      const blob = await (await fetch(asset.uri)).blob();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const getRes = await apiRequest(`/storage/objects/${encodeURIComponent(objectPath)}`);
      if (!getRes.ok) throw new Error("Could not get URL");
      const { url: imageUrl } = await getRes.json();
      await sendReply(undefined, imageUrl);
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message ?? "Could not upload image.");
    }
    setUploadingImage(false);
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <View style={[chat.wrap, { borderTopColor: colors.border }]}>
      <ScrollView
        ref={scrollRef}
        style={chat.scroll}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingNotes ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {notes.map((n) => (
              <View
                key={n.id}
                style={[
                  chat.bubble,
                  n.isAdmin
                    ? [chat.adminBubble, { backgroundColor: colors.accent }]
                    : [chat.userBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
              >
                <Text style={[chat.bubbleLabel, { color: colors.mutedForeground }]}>
                  {n.isAdmin ? "Support Team" : "You"} · {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
                {!!n.note && <Text style={[chat.bubbleText, { color: colors.text }]}>{n.note}</Text>}
                {!!n.imageUrl && (
                  <Image source={{ uri: n.imageUrl }} style={chat.bubbleImage} resizeMode="cover" />
                )}
              </View>
            ))}
            {notes.length === 0 && (
              <Text style={[chat.emptyNotes, { color: colors.mutedForeground }]}>
                No replies yet. Send a message below.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {!isClosed ? (
        <View style={[chat.replyBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            style={[chat.replyInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
            placeholder="Write a message..."
            placeholderTextColor={colors.mutedForeground}
            value={reply}
            onChangeText={setReply}
            multiline
          />
          <Pressable
            style={[chat.iconBtn, { backgroundColor: colors.accent }]}
            onPress={pickAndSendImage}
            disabled={uploadingImage || sending}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="image" size={16} color={colors.primary} />
            )}
          </Pressable>
          <Pressable
            style={[chat.sendBtn, { backgroundColor: colors.primary, opacity: reply.trim() && !sending ? 1 : 0.4 }]}
            onPress={() => sendReply(reply)}
            disabled={!reply.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      ) : (
        <View style={[chat.closedBanner, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
          <Text style={[chat.closedText, { color: colors.mutedForeground }]}>
            This ticket is {ticket.status}. Open a new ticket if you need further help.
          </Text>
        </View>
      )}
    </View>
  );
}

const chat = StyleSheet.create({
  wrap: { borderTopWidth: 1 },
  scroll: { maxHeight: 280 },
  bubble: { borderRadius: 12, padding: 10, gap: 4, maxWidth: "88%" },
  adminBubble: { alignSelf: "flex-start", borderWidth: 1, borderColor: "transparent" },
  userBubble: { alignSelf: "flex-end", borderWidth: 1 },
  bubbleLabel: { fontSize: 10, fontFamily: "DMSans_500Medium" },
  bubbleText: { fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 18 },
  bubbleImage: { width: 180, height: 120, borderRadius: 8, marginTop: 4 },
  emptyNotes: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 20 },
  replyBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1 },
  replyInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "DMSans_400Regular", maxHeight: 80 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  closedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 1 },
  closedText: { fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 },
});

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
  const [liveUpdate, setLiveUpdate] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await apiRequest("/tickets");
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets ?? []);
      }
    } catch {}
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      path: "/api/socket.io",
      query: { userId: user.id },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("ticket_update", (data: { ticketId: string; status: string; message: string }) => {
      setTickets((prev) =>
        prev.map((t) => t.id === data.ticketId ? { ...t, status: data.status as TicketStatus } : t)
      );
      setLiveUpdate(data.message);
      setTimeout(() => setLiveUpdate(null), 4000);
    });

    socket.on("ticket_note", (data: { ticketId: string; isAdmin: boolean }) => {
      if (data.isAdmin) {
        setLiveUpdate("Support team replied to your ticket");
        setTimeout(() => setLiveUpdate(null), 4000);
      }
    });

    return () => { socket.disconnect(); };
  }, [user]);

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
        const d = await res.json();
        setDescription("");
        setShowForm(false);
        setTickets((prev) => [d.ticket, ...prev]);
        setExpandedId(d.ticket.id);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
          <Pressable
            style={[styles.newBtn, { backgroundColor: showForm ? colors.secondary : colors.primary }]}
            onPress={() => { setShowForm((v) => !v); setExpandedId(null); }}
          >
            <Feather name={showForm ? "x" : "plus"} size={16} color={showForm ? colors.text : "#fff"} />
            <Text style={[styles.newBtnText, { color: showForm ? colors.text : "#fff" }]}>
              {showForm ? "Cancel" : "New Ticket"}
            </Text>
          </Pressable>
        </View>

        {liveUpdate && (
          <View style={[styles.liveToast, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={13} color="#fff" />
            <Text style={styles.liveToastText}>{liveUpdate}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {showForm && (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Raise a Support Ticket</Text>

              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.categoryChip, {
                      borderColor: category === c ? colors.primary : colors.border,
                      backgroundColor: category === c ? colors.primary : colors.secondary,
                    }]}
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
              const isExpanded = expandedId === ticket.id;
              return (
                <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary : colors.border }]}>
                  <Pressable
                    style={styles.ticketTop}
                    onPress={() => setExpandedId(isExpanded ? null : ticket.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{CATEGORY_LABELS[ticket.category]}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.ticketDesc, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                        {ticket.description}
                      </Text>
                      <View style={styles.ticketMeta}>
                        {ticket.ticketNumber && (
                          <>
                            <Feather name="hash" size={11} color={colors.primary} />
                            <Text style={[styles.ticketId, { color: colors.primary }]}>{ticket.ticketNumber}</Text>
                          </>
                        )}
                        <Text style={[styles.ticketDate, { color: colors.mutedForeground }]}>
                          {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </View>
                    </View>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                  </Pressable>

                  {isExpanded && (
                    <TicketChat
                      ticket={ticket}
                      apiRequest={apiRequest}
                      colors={colors}
                    />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  liveToast: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  liveToastText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_500Medium", flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold", textAlign: "center" },
  emptyBody: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", maxWidth: 260 },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  formCard: { borderRadius: 16, borderWidth: 2, padding: 16, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "DMSans_700Bold", marginBottom: 4 },
  formLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.6, marginBottom: 4 },
  categoryRow: { gap: 8, paddingBottom: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "DMSans_400Regular", minHeight: 100, lineHeight: 20 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  ticketCard: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden" },
  ticketTop: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 6 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryBadgeText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  ticketDesc: { fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20, marginBottom: 6 },
  ticketMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  ticketId: { fontSize: 11, fontFamily: "DMSans_600SemiBold", marginRight: 6 },
  ticketDate: { fontSize: 11, fontFamily: "DMSans_400Regular" },
});
