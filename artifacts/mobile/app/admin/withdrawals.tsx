import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface Withdrawal {
  id: string;
  userId: string;
  coins: number;
  inrAmount: number;
  upiId: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending: { color: "#F59E0B", bg: "#FFFBEB", label: "Pending", icon: "clock" },
  approved: { color: "#10B981", bg: "#ECFDF5", label: "Approved", icon: "check-circle" },
  rejected: { color: "#EF4444", bg: "#FEF2F2", label: "Rejected", icon: "x-circle" },
};

export default function WithdrawalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchWithdrawals(); }, []);

  async function fetchWithdrawals() {
    try {
      const res = await apiRequest("/admin/withdrawals");
      if (res.ok) { const d = await res.json(); setWithdrawals(d.withdrawals ?? []); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() { setRefreshing(true); await fetchWithdrawals(); setRefreshing(false); }

  async function handleApprove(w: Withdrawal) {
    const doApprove = async (note: string) => {
      setProcessingId(w.id);
      const res = await apiRequest(`/admin/withdrawals/${w.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ adminNote: note }),
      });
      if (res.ok) {
        const d = await res.json();
        setWithdrawals((prev) => prev.map((x) => (x.id === w.id ? d.withdrawal : x)));
        setExpandedId(null);
      } else {
        Alert.alert("Error", "Failed to approve withdrawal.");
      }
      setProcessingId(null);
    };

    if (Platform.OS === "web") {
      const note = prompt("Admin note (optional):") ?? "";
      doApprove(note);
    } else {
      Alert.prompt(
        "Approve Withdrawal",
        `Approve ₹${w.inrAmount.toFixed(2)} (${w.coins} coins) to ${w.upiId}?\nAdd a note:`,
        async (note) => doApprove(note ?? ""),
        "plain-text", "", "default",
      );
    }
  }

  async function handleReject(w: Withdrawal) {
    const doReject = async (note: string) => {
      setProcessingId(w.id);
      const res = await apiRequest(`/admin/withdrawals/${w.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ adminNote: note }),
      });
      if (res.ok) {
        setWithdrawals((prev) => prev.map((x) =>
          x.id === w.id ? { ...x, status: "rejected", adminNote: note, resolvedAt: new Date().toISOString() } : x
        ));
        setExpandedId(null);
        Alert.alert("Rejected", `Coins refunded to user's wallet.`);
      } else {
        Alert.alert("Error", "Failed to reject withdrawal.");
      }
      setProcessingId(null);
    };

    if (Platform.OS === "web") {
      const note = prompt("Rejection reason:") ?? "";
      doReject(note);
    } else {
      Alert.prompt(
        "Reject Withdrawal",
        `Reject ₹${w.inrAmount.toFixed(2)} (${w.coins} coins)? Coins will be refunded.\nReason:`,
        async (note) => doReject(note ?? ""),
        "plain-text", "", "destructive",
      );
    }
  }

  const filtered = filter === "all" ? withdrawals : withdrawals.filter((w) => w.status === filter);
  const counts = { pending: withdrawals.filter((w) => w.status === "pending").length, approved: withdrawals.filter((w) => w.status === "approved").length, rejected: withdrawals.filter((w) => w.status === "rejected").length };

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Withdrawals</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>{counts.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#10B981" }]}>{counts.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#EF4444" }]}>{counts.rejected}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>
            ₹{withdrawals.filter((w) => w.status === "pending").reduce((s, w) => s + w.inrAmount, 0).toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Pending ₹</Text>
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {(["all", "pending", "approved", "rejected"] as const).map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s];
          const n = s === "all" ? withdrawals.length : counts[s];
          return (
            <Pressable key={s} style={[styles.filterTab, filter === s && { backgroundColor: cfg?.color ?? "#2563EB" }]} onPress={() => setFilter(s)}>
              <Text style={[styles.filterTabText, filter === s && { color: "#fff" }]}>
                {s === "all" ? `All (${n})` : `${cfg?.label} (${n})`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Loading...</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.center}>
              <Feather name="download" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No withdrawals found</Text>
            </View>
          ) : (
            filtered.map((w) => {
              const cfg = STATUS_CONFIG[w.status];
              const isExpanded = expandedId === w.id;
              const isProcessing = processingId === w.id;
              return (
                <View key={w.id} style={styles.card}>
                  <Pressable style={styles.cardHeader} onPress={() => setExpandedId(isExpanded ? null : w.id)}>
                    <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                      <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upiText}>{w.upiId}</Text>
                      <Text style={styles.dateText}>{new Date(w.createdAt).toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={styles.amountText}>₹{Number(w.inrAmount).toFixed(2)}</Text>
                      <Text style={[styles.coinsText, { color: cfg.color }]}>{w.coins} coins</Text>
                    </View>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.cardExpanded}>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, alignSelf: "flex-start" }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      {w.adminNote && (
                        <View style={styles.noteBox}>
                          <Text style={styles.noteLabel}>Admin Note:</Text>
                          <Text style={styles.noteText}>{w.adminNote}</Text>
                        </View>
                      )}
                      {w.resolvedAt && (
                        <Text style={styles.resolvedText}>Resolved: {new Date(w.resolvedAt).toLocaleDateString("en-IN")}</Text>
                      )}
                      {w.status === "pending" && (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={[styles.approveBtn, { opacity: isProcessing ? 0.5 : 1 }]}
                            onPress={() => handleApprove(w)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : (
                              <>
                                <Feather name="check" size={16} color="#fff" />
                                <Text style={styles.approveBtnText}>Approve</Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            style={[styles.rejectBtn, { opacity: isProcessing ? 0.5 : 1 }]}
                            onPress={() => handleReject(w)}
                            disabled={isProcessing}
                          >
                            <Feather name="x" size={16} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
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
  summaryRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", paddingHorizontal: 16, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#9CA3AF", marginTop: 2 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  upiText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  amountText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F1740" },
  coinsText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noteBox: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10, gap: 4 },
  noteLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  noteText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#374151" },
  resolvedText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#6B7280" },
  actionRow: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#10B981", borderRadius: 10, paddingVertical: 12 },
  approveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FEF2F2", borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: "#FECACA" },
  rejectBtnText: { color: "#EF4444", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
