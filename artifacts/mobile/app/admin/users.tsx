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
import { useColors } from "@/hooks/useColors";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "active" | "banned" | "suspended" | "pending";
  walletBalance: number;
  referralCode: string;
  createdAt: string;
  banReason: string | null;
  suspendedUntil: string | null;
  online: boolean;
}

interface ActivityLog {
  id: string;
  path: string;
  method: string;
  ip: string | null;
  timestamp: string;
}

const STATUS_CONFIG = {
  active: { color: "#10B981", bg: "#ECFDF5", label: "Active" },
  banned: { color: "#EF4444", bg: "#FEF2F2", label: "Banned" },
  suspended: { color: "#F59E0B", bg: "#FFFBEB", label: "Suspended" },
  pending: { color: "#8B5CF6", bg: "#F5F3FF", label: "Pending" },
};

function UserCard({
  user,
  onBan,
  onUnban,
  onViewLogs,
  onApprove,
  onReject,
}: {
  user: AdminUser;
  onBan: (u: AdminUser) => void;
  onUnban: (u: AdminUser) => void;
  onViewLogs: (u: AdminUser) => void;
  onApprove: (u: AdminUser) => void;
  onReject: (u: AdminUser) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.active;

  return (
    <View style={[styles.userCard, { backgroundColor: "#fff", borderColor: "#E5EAF8" }]}>
      <Pressable style={styles.userCardHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={[styles.avatar, { backgroundColor: user.online ? "#10B981" : "#E5E7EB" }]}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
            <View style={[styles.onlineDot, { backgroundColor: user.online ? "#10B981" : "#D1D5DB" }]} />
            <Text style={[styles.onlineLabel, { color: user.online ? "#10B981" : "#9CA3AF" }]}>
              {user.online ? "Online" : "Offline"}
            </Text>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {user.role === "admin" && (
              <View style={[styles.statusBadge, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.statusText, { color: "#2563EB" }]}>Admin</Text>
              </View>
            )}
          </View>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
      </Pressable>

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: "#F3F4F6" }]}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Wallet</Text>
              <Text style={styles.infoValue}>{user.walletBalance} coins</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Referral</Text>
              <Text style={styles.infoValue}>{user.referralCode}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{new Date(user.createdAt).toLocaleDateString("en-IN")}</Text>
            </View>
            {user.banReason && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ban Reason</Text>
                <Text style={[styles.infoValue, { color: "#EF4444" }]}>{user.banReason}</Text>
              </View>
            )}
          </View>

          {user.role !== "admin" && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
                onPress={() => onViewLogs(user)}
              >
                <Feather name="activity" size={14} color="#2563EB" />
                <Text style={[styles.actionText, { color: "#2563EB" }]}>View Logs</Text>
              </Pressable>

              {user.status === "pending" ? (
                <>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}
                    onPress={() => onApprove(user)}
                  >
                    <Feather name="check" size={14} color="#10B981" />
                    <Text style={[styles.actionText, { color: "#10B981" }]}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                    onPress={() => onReject(user)}
                  >
                    <Feather name="x" size={14} color="#EF4444" />
                    <Text style={[styles.actionText, { color: "#EF4444" }]}>Reject</Text>
                  </Pressable>
                </>
              ) : user.status === "banned" || user.status === "suspended" ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}
                  onPress={() => onUnban(user)}
                >
                  <Feather name="user-check" size={14} color="#10B981" />
                  <Text style={[styles.actionText, { color: "#10B981" }]}>Unban</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                  onPress={() => onBan(user)}
                >
                  <Feather name="user-x" size={14} color="#EF4444" />
                  <Text style={[styles.actionText, { color: "#EF4444" }]}>Ban User</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function LogsModal({
  user,
  logs,
  loading,
  onClose,
}: {
  user: AdminUser;
  logs: ActivityLog[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Activity Logs</Text>
          <Text style={styles.modalSub}>{user.name}</Text>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={20} color="#6B7280" />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {logs.length === 0 && (
              <Text style={[styles.emptyText, { textAlign: "center", paddingVertical: 40 }]}>No activity logs found</Text>
            )}
            {logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.methodBadge, { backgroundColor: log.method === "GET" ? "#EFF6FF" : log.method === "POST" ? "#ECFDF5" : "#FEF2F2" }]}>
                  <Text style={[styles.methodText, { color: log.method === "GET" ? "#2563EB" : log.method === "POST" ? "#10B981" : "#EF4444" }]}>
                    {log.method}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logPath} numberOfLines={1}>{log.path}</Text>
                  <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString("en-IN")}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "banned" | "suspended" | "pending" | "online">("all");
  const [logsUser, setLogsUser] = useState<AdminUser | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  async function handleApprove(user: AdminUser) {
    const res = await apiRequest(`/admin/users/${user.id}/approve`, { method: "POST" });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "active" } : u)));
    }
  }

  async function handleReject(user: AdminUser) {
    const reason = Platform.OS === "web"
      ? prompt(`Rejection reason for ${user.name}:`) ?? ""
      : "Registration rejected by admin";
    const res = await apiRequest(`/admin/users/${user.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "banned", banReason: reason } : u)));
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await apiRequest("/admin/users");
      if (res.ok) { const d = await res.json(); setUsers(d.users); }
    } catch {}
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }

  async function handleViewLogs(user: AdminUser) {
    setLogsUser(user);
    setLogsLoading(true);
    setLogs([]);
    try {
      const res = await apiRequest(`/admin/users/${user.id}/logs`);
      if (res.ok) { const d = await res.json(); setLogs(d.logs); }
    } catch {}
    setLogsLoading(false);
  }

  async function handleBan(user: AdminUser) {
    if (Platform.OS === "web") {
      const reason = prompt(`Ban reason for ${user.name}:`);
      if (reason === null) return;
      await doBan(user.id, reason);
    } else {
      Alert.prompt(
        "Ban User",
        `Enter reason for banning ${user.name}:`,
        async (reason) => { if (reason !== undefined) await doBan(user.id, reason); },
        "plain-text",
        "",
      );
    }
  }

  async function doBan(id: string, reason: string) {
    const res = await apiRequest(`/admin/users/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "banned", banReason: reason } : u)));
    }
  }

  async function handleUnban(user: AdminUser) {
    const res = await apiRequest(`/admin/users/${user.id}/unban`, { method: "POST" });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "active", banReason: null } : u)));
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "online" ? u.online :
      u.status === filter;
    return matchSearch && matchFilter;
  });

  const pendingCount = users.filter((u) => u.status === "pending").length;
  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: "all", label: `All (${users.length})` },
    { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "online", label: `Online (${users.filter((u) => u.online).length})` },
    { key: "active", label: `Active (${users.filter((u) => u.status === "active").length})` },
    { key: "banned", label: `Banned (${users.filter((u) => u.status === "banned").length})` },
    { key: "suspended", label: `Suspended (${users.filter((u) => u.status === "suspended").length})` },
  ];

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Users</Text>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={20} color="#2563EB" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {filterTabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && { backgroundColor: "#2563EB" }]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && { color: "#fff" }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.center}>
              <Feather name="users" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}
          {filtered.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onBan={handleBan}
              onUnban={handleUnban}
              onViewLogs={handleViewLogs}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </ScrollView>
      )}

      {logsUser && (
        <LogsModal
          user={logsUser}
          logs={logs}
          loading={logsLoading}
          onClose={() => setLogsUser(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F1740", padding: 0 },
  filterScroll: { maxHeight: 48, backgroundColor: "#fff" },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 12 },
  userCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  userCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F1740", flex: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  expandedSection: { borderTopWidth: 1, padding: 14 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  infoItem: { gap: 2 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#9CA3AF" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "70%", padding: 0 },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 2 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  modalClose: { position: "absolute", right: 20, top: 20, width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  logRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  methodBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  methodText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  logPath: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#374151" },
  logTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
});
