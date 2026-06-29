import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface PageLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  pageName: string;
  pageLabel: string | null;
  action: string | null;
  timeSpentSec: number | null;
  enteredAt: string | null;
  timestamp: string;
}

const PAGE_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  home:      { icon: "home",        color: "#2563EB", bg: "#EFF6FF", label: "Home"        },
  search:    { icon: "search",      color: "#7C3AED", bg: "#F5F3FF", label: "Search"      },
  wishlist:  { icon: "heart",       color: "#EF4444", bg: "#FEF2F2", label: "Wishlist"    },
  cart:      { icon: "shopping-cart", color: "#F59E0B", bg: "#FFFBEB", label: "Cart"      },
  profile:   { icon: "user",        color: "#10B981", bg: "#ECFDF5", label: "Profile"     },
  checkout:  { icon: "credit-card", color: "#059669", bg: "#D1FAE5", label: "Checkout"    },
  orders:    { icon: "package",     color: "#6366F1", bg: "#EEF2FF", label: "Orders"      },
  product:   { icon: "tag",         color: "#D97706", bg: "#FEF3C7", label: "Product"     },
  settings:  { icon: "settings",    color: "#64748B", bg: "#F1F5F9", label: "Settings"    },
};

function getPageMeta(pageName: string) {
  const key = pageName.toLowerCase();
  return PAGE_META[key] ?? { icon: "activity", color: "#6B7280", bg: "#F3F4F6", label: pageName };
}

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}

function avatarLetter(log: PageLog): string {
  if (log.userName) return log.userName.charAt(0).toUpperCase();
  if (log.userEmail) return log.userEmail.charAt(0).toUpperCase();
  return "?";
}

function avatarColor(userId: string | null): string {
  const colors = ["#2563EB", "#7C3AED", "#EF4444", "#F59E0B", "#10B981", "#6366F1", "#0891B2"];
  if (!userId) return "#9CA3AF";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const PAGE_FILTERS = ["All", "Home", "Search", "Wishlist", "Cart", "Profile", "Checkout", "Orders", "Product"];

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [logs, setLogs] = useState<PageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await apiRequest("/admin/page-logs?limit=300");
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs ?? []);
        setLastUpdated(new Date());
      }
    } catch {}
    if (!quiet) setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    fetchLogs();
  }, []);

  // Auto-refresh every 8 seconds when live
  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(() => fetchLogs(true), 8000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, fetchLogs]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }

  const filtered = filter === "All"
    ? logs
    : logs.filter((l) => l.pageName.toLowerCase() === filter.toLowerCase());

  // Group: only show "visit" and notable actions, skip duplicate "enter" events
  const displayLogs = filtered.filter((l) => l.action !== "enter");

  // Unique visitors in last hour
  const oneHourAgo = Date.now() - 3600000;
  const recentUserIds = new Set(
    logs.filter((l) => new Date(l.timestamp).getTime() > oneHourAgo && l.userId).map((l) => l.userId)
  );

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Customer Activity</Text>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
              Updated {timeAgo(lastUpdated.toISOString())}
            </Text>
          )}
        </View>
        {/* Live toggle */}
        <Pressable
          style={[styles.liveBtn, { backgroundColor: isLive ? "#ECFDF5" : "#F3F4F6" }]}
          onPress={() => setIsLive((v) => !v)}
        >
          <View style={[styles.liveDot, { backgroundColor: isLive ? "#10B981" : "#9CA3AF" }]} />
          <Text style={[styles.liveBtnText, { color: isLive ? "#10B981" : "#9CA3AF" }]}>
            {isLive ? "LIVE" : "Paused"}
          </Text>
        </Pressable>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={18} color="#2563EB" />
        </Pressable>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{displayLogs.length}</Text>
          <Text style={styles.summaryLabel}>Events</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#10B981" }]}>{recentUserIds.size}</Text>
          <Text style={styles.summaryLabel}>Active (1h)</Text>
        </View>
        <View style={styles.summaryDivider} />
        {Object.entries(PAGE_META).slice(0, 3).map(([key, meta]) => {
          const n = logs.filter((l) => l.pageName.toLowerCase() === key).length;
          return (
            <React.Fragment key={key}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: meta.color }]}>{n}</Text>
                <Text style={styles.summaryLabel}>{meta.label}</Text>
              </View>
              <View style={styles.summaryDivider} />
            </React.Fragment>
          );
        })}
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: "#6366F1" }]}>
            {logs.filter((l) => {
              const ts = new Date(l.timestamp).getTime();
              return ts > Date.now() - 60000;
            }).length}
          </Text>
          <Text style={styles.summaryLabel}>Last 1min</Text>
        </View>
      </View>

      {/* Page filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8" }}
        contentContainerStyle={styles.filterRow}
      >
        {PAGE_FILTERS.map((f) => {
          const meta = f === "All" ? null : getPageMeta(f);
          const n = f === "All" ? displayLogs.length : logs.filter((l) => l.pageName.toLowerCase() === f.toLowerCase() && l.action !== "enter").length;
          const isActive = filter === f;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: meta?.color ?? "#2563EB" },
              ]}
              onPress={() => setFilter(f)}
            >
              {meta && <Feather name={meta.icon as any} size={11} color={isActive ? "#fff" : meta.color} style={{ marginRight: 4 }} />}
              <Text style={[styles.filterTabText, isActive && { color: "#fff" }]}>
                {f} ({n})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading activity…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {displayLogs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="activity" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>
                Customer page visits will appear here in real time as users browse the app.
              </Text>
            </View>
          ) : (
            displayLogs.map((log) => {
              const meta = getPageMeta(log.pageName);
              const letter = avatarLetter(log);
              const aColor = avatarColor(log.userId);
              const dur = fmtDuration(log.timeSpentSec);
              const isVisit = log.action === "visit";

              return (
                <View key={log.id} style={styles.logCard}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: aColor }]}>
                    <Text style={styles.avatarText}>{letter}</Text>
                  </View>

                  {/* Middle */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.logTopRow}>
                      {/* Page badge */}
                      <View style={[styles.pageBadge, { backgroundColor: meta.bg }]}>
                        <Feather name={meta.icon as any} size={10} color={meta.color} />
                        <Text style={[styles.pageText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {dur !== "" && isVisit && (
                        <View style={styles.durationBadge}>
                          <Feather name="clock" size={10} color="#6B7280" />
                          <Text style={styles.durationText}>{dur}</Text>
                        </View>
                      )}
                    </View>

                    {/* User name */}
                    <Text style={styles.logUser} numberOfLines={1}>
                      {log.userName ?? log.userEmail ?? `User ${log.userId?.slice(0, 8) ?? "?"}`}
                    </Text>

                    {/* Action label */}
                    {log.action && log.action !== "visit" && (() => {
                      const a = log.action;
                      if (a.startsWith("search:")) {
                        const q = a.slice(7);
                        return (
                          <Text style={[styles.logAction, { color: "#7C3AED" }]} numberOfLines={1}>
                            🔍 searched for: "{q}"
                          </Text>
                        );
                      }
                      return (
                        <Text style={styles.logAction} numberOfLines={1}>
                          ↳ {a}
                        </Text>
                      );
                    })()}
                  </View>

                  {/* Timestamp */}
                  <Text style={styles.logTime}>{timeAgo(log.timestamp)}</Text>
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
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5EAF8",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  lastUpdated: { fontSize: 10, fontFamily: "DMSans_400Regular", color: "#9CA3AF", marginTop: 1 },
  liveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveBtnText: { fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 },
  refreshBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  summaryRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8",
    paddingHorizontal: 8, paddingVertical: 10,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 16, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  summaryLabel: { fontSize: 9, fontFamily: "DMSans_500Medium", color: "#9CA3AF" },
  summaryDivider: { width: 1, height: 28, backgroundColor: "#E5EAF8" },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 7, alignItems: "center" },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#F3F4F6",
  },
  filterTabText: { fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold", color: "#374151" },
  emptyText: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#9CA3AF", textAlign: "center" },
  content: { padding: 12, gap: 8 },
  logCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#E5EAF8", padding: 12,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "DMSans_700Bold", color: "#fff" },
  logTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  pageBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  pageText: { fontSize: 10, fontFamily: "DMSans_700Bold" },
  durationBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    backgroundColor: "#F3F4F6", borderRadius: 6,
  },
  durationText: { fontSize: 10, fontFamily: "DMSans_500Medium", color: "#6B7280" },
  logUser: { fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#1F2937" },
  logAction: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#6B7280", marginTop: 1 },
  logTime: { fontSize: 10, fontFamily: "DMSans_500Medium", color: "#9CA3AF", minWidth: 48, textAlign: "right" },
});
