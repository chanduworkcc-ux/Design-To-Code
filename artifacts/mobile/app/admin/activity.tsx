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

interface Log {
  id: string;
  userId: string | null;
  path: string;
  method: string;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
}

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
  GET: { color: "#2563EB", bg: "#EFF6FF" },
  POST: { color: "#10B981", bg: "#ECFDF5" },
  PUT: { color: "#F59E0B", bg: "#FFFBEB" },
  PATCH: { color: "#8B5CF6", bg: "#F5F3FF" },
  DELETE: { color: "#EF4444", bg: "#FEF2F2" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    try {
      const res = await apiRequest("/admin/activity-logs?limit=200");
      if (res.ok) { const d = await res.json(); setLogs(d.logs); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }

  const methods = ["all", "GET", "POST", "PUT", "PATCH", "DELETE"];
  const filtered = filter === "all" ? logs : logs.filter((l) => l.method === filter);

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{logs.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        {["GET", "POST", "PUT", "DELETE"].map((m) => {
          const cfg = METHOD_COLORS[m] ?? { color: "#6B7280", bg: "#F3F4F6" };
          const n = logs.filter((l) => l.method === m).length;
          return (
            <View key={m} style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: cfg.color }]}>{n}</Text>
              <Text style={styles.summaryLabel}>{m}</Text>
            </View>
          );
        })}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, backgroundColor: "#fff" }} contentContainerStyle={styles.filterRow}>
        {methods.map((m) => {
          const cfg = m === "all" ? null : METHOD_COLORS[m];
          const n = m === "all" ? logs.length : logs.filter((l) => l.method === m).length;
          return (
            <Pressable
              key={m}
              style={[styles.filterTab, filter === m && { backgroundColor: cfg?.color ?? "#2563EB" }]}
              onPress={() => setFilter(m)}
            >
              <Text style={[styles.filterTabText, filter === m && { color: "#fff" }]}>
                {m === "all" ? `All (${n})` : `${m} (${n})`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.center}>
              <Feather name="activity" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No activity logs</Text>
            </View>
          )}
          {filtered.map((log) => {
            const mc = METHOD_COLORS[log.method] ?? { color: "#6B7280", bg: "#F3F4F6" };
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={[styles.methodBadge, { backgroundColor: mc.bg }]}>
                  <Text style={[styles.methodText, { color: mc.color }]}>{log.method}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logPath} numberOfLines={1}>{log.path}</Text>
                  <View style={styles.logMeta}>
                    {log.userId && <Text style={styles.logUser} numberOfLines={1}>User: {log.userId.slice(0, 8)}…</Text>}
                    {log.ip && <Text style={styles.logIp}>{log.ip}</Text>}
                  </View>
                </View>
                <Text style={styles.logTime}>{timeAgo(log.timestamp)}</Text>
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  summaryRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", paddingHorizontal: 16, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  summaryLabel: { fontSize: 10, fontFamily: "DMSans_500Medium", color: "#9CA3AF" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "DMSans_400Regular" },
  content: { padding: 12, gap: 8 },
  logCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5EAF8", padding: 12 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 52, alignItems: "center" },
  methodText: { fontSize: 11, fontFamily: "DMSans_700Bold" },
  logPath: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#374151" },
  logMeta: { flexDirection: "row", gap: 8, marginTop: 2 },
  logUser: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#9CA3AF", maxWidth: 120 },
  logIp: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#9CA3AF" },
  logTime: { fontSize: 11, fontFamily: "DMSans_500Medium", color: "#6B7280", minWidth: 50, textAlign: "right" },
});
