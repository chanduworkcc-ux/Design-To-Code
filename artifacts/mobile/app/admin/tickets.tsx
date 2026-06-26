import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface Ticket {
  id: string;
  userId: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: "#EF4444", bg: "#FEF2F2", label: "Open" },
  in_progress: { color: "#F59E0B", bg: "#FFFBEB", label: "In Progress" },
  resolved: { color: "#10B981", bg: "#ECFDF5", label: "Resolved" },
  closed: { color: "#6B7280", bg: "#F3F4F6", label: "Closed" },
};

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchTickets(); }, []);

  async function fetchTickets() {
    try {
      const res = await apiRequest("/admin/tickets");
      if (res.ok) { const d = await res.json(); setTickets(d.tickets); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await apiRequest(`/admin/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const d = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === id ? d.ticket : t)));
        setExpandedId(null);
      }
    } catch {}
    setUpdatingId(null);
  }

  const STATUSES = ["open", "in_progress", "resolved", "closed"];
  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
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
                <Pressable style={styles.ticketHeader} onPress={() => setExpandedId(isExpanded ? null : ticket.id)}>
                  <View style={[styles.categoryDot, { backgroundColor: cfg.bg }]}>
                    <Feather name="life-buoy" size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketCategory}>{ticket.category}</Text>
                    <Text style={styles.ticketDate}>{new Date(ticket.createdAt).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: 6 }} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.ticketExpanded}>
                    <Text style={styles.descLabel}>Description:</Text>
                    <Text style={styles.descText}>{ticket.description}</Text>
                    {ticket.resolvedAt && (
                      <Text style={styles.resolvedText}>
                        Resolved: {new Date(ticket.resolvedAt).toLocaleDateString("en-IN")}
                      </Text>
                    )}
                    <Text style={styles.updateLabel}>Update Status:</Text>
                    <View style={styles.statusButtons}>
                      {STATUSES.filter((s) => s !== ticket.status).map((s) => {
                        const c = STATUS_CONFIG[s];
                        return (
                          <Pressable
                            key={s}
                            style={[styles.statusBtn, { backgroundColor: c.bg, borderColor: c.color, opacity: updatingId === ticket.id ? 0.5 : 1 }]}
                            onPress={() => updateStatus(ticket.id, s)}
                            disabled={updatingId === ticket.id}
                          >
                            <Text style={[styles.statusBtnText, { color: c.color }]}>{c.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 12 },
  ticketCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  categoryDot: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ticketCategory: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F1740" },
  ticketDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ticketExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 10 },
  descLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  descText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4B5563", lineHeight: 20 },
  resolvedText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#10B981" },
  updateLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  statusButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
