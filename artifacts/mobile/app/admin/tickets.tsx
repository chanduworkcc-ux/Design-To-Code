import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

interface Ticket {
  id: string;
  ticketNumber: string | null;
  userId: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open:        { color: "#EF4444", bg: "#FEF2F2", label: "Open" },
  in_progress: { color: "#F59E0B", bg: "#FFFBEB", label: "In Progress" },
  resolved:    { color: "#10B981", bg: "#ECFDF5", label: "Resolved" },
  closed:      { color: "#6B7280", bg: "#F3F4F6", label: "Closed" },
};

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: "Order Issue",
  payment: "Payment",
  product: "Product",
  account: "Account",
  other: "Other",
};

function ChatThread({
  ticket,
  onStatusChange,
  apiRequest,
}: {
  ticket: Ticket;
  onStatusChange: (id: string, status: string, note?: TicketNote) => void;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchNotes();
  }, [ticket.id]);

  async function fetchNotes() {
    setLoadingNotes(true);
    try {
      const res = await apiRequest(`/tickets/${ticket.id}/notes`);
      if (res.ok) {
        const d = await res.json();
        setNotes(d.notes ?? []);
      }
    } catch {}
    setLoadingNotes(false);
  }

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await apiRequest(`/tickets/${ticket.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: reply.trim() }),
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

  async function handleUpdateStatus(status: string) {
    setUpdatingStatus(true);
    try {
      const res = await apiRequest(`/admin/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const d = await res.json();
        onStatusChange(ticket.id, status, d.note);
        if (d.note) setNotes((prev) => [...prev, d.note]);
      }
    } catch {}
    setUpdatingStatus(false);
  }

  const STATUSES = ["open", "in_progress", "resolved", "closed"];
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <View style={thread.wrap}>
      {/* Status controls */}
      <View style={thread.statusRow}>
        <Text style={thread.statusLabel}>Status:</Text>
        {STATUSES.filter((s) => s !== ticket.status).map((s) => {
          const c = STATUS_CONFIG[s];
          return (
            <Pressable
              key={s}
              style={[thread.statusBtn, { backgroundColor: c.bg, borderColor: c.color, opacity: updatingStatus ? 0.5 : 1 }]}
              onPress={() => handleUpdateStatus(s)}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color={c.color} />
              ) : (
                <Text style={[thread.statusBtnText, { color: c.color }]}>{c.label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Chat thread */}
      <ScrollView
        ref={scrollRef}
        style={thread.chat}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Original description */}
        <View style={[thread.bubble, thread.userBubble]}>
          <Text style={thread.bubbleLabel}>User · {new Date(ticket.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
          <Text style={thread.bubbleText}>{ticket.description}</Text>
        </View>

        {loadingNotes ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
        ) : (
          notes.map((n) => (
            <View
              key={n.id}
              style={[
                thread.bubble,
                n.isAdmin ? thread.adminBubble : thread.userBubble,
              ]}
            >
              <Text style={thread.bubbleLabel}>
                {n.isAdmin ? "Admin" : "User"} · {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Text>
              {!!n.note && <Text style={thread.bubbleText}>{n.note}</Text>}
              {!!n.imageUrl && (
                <Text style={[thread.bubbleText, { color: "#2563EB" }]}>[Image attached]</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply input */}
      {!isClosed && (
        <View style={thread.replyRow}>
          <TextInput
            style={thread.replyInput}
            placeholder="Type a reply..."
            placeholderTextColor="#9CA3AF"
            value={reply}
            onChangeText={setReply}
            multiline
          />
          <Pressable
            style={[thread.sendBtn, { opacity: reply.trim() && !sending ? 1 : 0.4 }]}
            onPress={handleSendReply}
            disabled={!reply.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      )}
      {isClosed && (
        <View style={thread.closedBanner}>
          <Feather name="lock" size={13} color="#6B7280" />
          <Text style={thread.closedText}>This ticket is {ticket.status}</Text>
        </View>
      )}
    </View>
  );
}

const thread = StyleSheet.create({
  wrap: { flex: 1, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12, alignItems: "center", backgroundColor: "#FAFAFA" },
  statusLabel: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  statusBtnText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  chat: { flex: 1, maxHeight: 220 },
  bubble: { borderRadius: 12, padding: 10, gap: 4, maxWidth: "90%" },
  adminBubble: { backgroundColor: "#EFF6FF", alignSelf: "flex-start" },
  userBubble: { backgroundColor: "#F9FAFB", alignSelf: "flex-end", borderWidth: 1, borderColor: "#E5E7EB" },
  bubbleLabel: { fontSize: 10, fontFamily: "DMSans_500Medium", color: "#9CA3AF" },
  bubbleText: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#1F2937", lineHeight: 18 },
  replyRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  replyInput: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "DMSans_400Regular", color: "#0F1740", maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  closedBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, backgroundColor: "#F9FAFB", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  closedText: { fontSize: 12, fontFamily: "DMSans_500Medium", color: "#6B7280" },
});

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchTickets(); }, []);

  async function fetchTickets() {
    try {
      const res = await apiRequest("/admin/tickets");
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }

  function handleStatusChange(id: string, status: string, note?: TicketNote) {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status, resolvedAt: ["resolved", "closed"].includes(status) ? new Date().toISOString() : t.resolvedAt }
          : t
      )
    );
  }

  const STATUSES = ["open", "in_progress", "resolved", "closed"];
  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#0F1740" />
          </Pressable>
          <Text style={styles.headerTitle}>Support Tickets</Text>
          <Pressable onPress={handleRefresh}>
            <Feather name="refresh-cw" size={20} color="#2563EB" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 52, backgroundColor: "#fff" }}
          contentContainerStyle={styles.filterRow}
        >
          {["all", ...STATUSES].map((s) => {
            const cfg = s === "all" ? null : STATUS_CONFIG[s];
            const n = s === "all" ? tickets.length : (counts[s] ?? 0);
            return (
              <Pressable
                key={s}
                style={[styles.filterTab, filter === s && { backgroundColor: cfg?.color ?? "#2563EB" }]}
                onPress={() => setFilter(s)}
              >
                <Text style={[styles.filterTabText, filter === s && { color: "#fff" }]}>
                  {s === "all" ? `All (${n})` : `${cfg?.label} (${n})`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 && (
              <View style={styles.center}>
                <Feather name="life-buoy" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No tickets found</Text>
              </View>
            )}
            {filtered.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
              const isExpanded = expandedId === ticket.id;
              return (
                <View key={ticket.id} style={styles.ticketCard}>
                  <Pressable
                    style={styles.ticketHeader}
                    onPress={() => setExpandedId(isExpanded ? null : ticket.id)}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cfg.bg }]}>
                      <Feather name="life-buoy" size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.ticketCategory}>
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </Text>
                        {ticket.ticketNumber && (
                          <Text style={styles.ticketNum}>{ticket.ticketNumber}</Text>
                        )}
                      </View>
                      <Text style={styles.ticketDate}>
                        {new Date(ticket.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: 6 }} />
                  </Pressable>

                  {isExpanded && (
                    <ChatThread
                      ticket={ticket}
                      onStatusChange={handleStatusChange}
                      apiRequest={apiRequest}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
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
  ticketCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  categoryDot: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ticketCategory: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  ticketNum: { fontSize: 12, fontFamily: "DMSans_500Medium", color: "#2563EB" },
  ticketDate: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#9CA3AF", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "DMSans_600SemiBold" },
});
