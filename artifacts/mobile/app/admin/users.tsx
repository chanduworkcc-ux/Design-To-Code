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
  onWalletAdjust,
  onSuspend,
}: {
  user: AdminUser;
  onBan: (u: AdminUser) => void;
  onUnban: (u: AdminUser) => void;
  onViewLogs: (u: AdminUser) => void;
  onApprove: (u: AdminUser) => void;
  onReject: (u: AdminUser) => void;
  onWalletAdjust: (u: AdminUser) => void;
  onSuspend: (u: AdminUser) => void;
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
            <View style={styles.actionCol}>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
                  onPress={() => onViewLogs(user)}
                >
                  <Feather name="activity" size={14} color="#2563EB" />
                  <Text style={[styles.actionText, { color: "#2563EB" }]}>View Logs</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}
                  onPress={() => onWalletAdjust(user)}
                >
                  <Feather name="dollar-sign" size={14} color="#F59E0B" />
                  <Text style={[styles.actionText, { color: "#F59E0B" }]}>Wallet</Text>
                </Pressable>
              </View>

              <View style={styles.actionRow}>
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
                  <>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}
                      onPress={() => onSuspend(user)}
                    >
                      <Feather name="slash" size={14} color="#F59E0B" />
                      <Text style={[styles.actionText, { color: "#F59E0B" }]}>Suspend</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                      onPress={() => onBan(user)}
                    >
                      <Feather name="user-x" size={14} color="#EF4444" />
                      <Text style={[styles.actionText, { color: "#EF4444" }]}>Ban</Text>
                    </Pressable>
                  </>
                )}
              </View>
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

function SuspendModal({
  user,
  onClose,
  onDone,
  apiRequest,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: (userId: string) => void;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}) {
  const [duration, setDuration] = useState("1");
  const [unit, setUnit] = useState<"hours" | "days" | "weeks">("days");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const d = parseInt(duration);
    if (!d || d <= 0) { setError("Enter a valid duration"); return; }
    if (!reason.trim()) { setError("Suspension reason is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/admin/users/${user.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ duration: d, unit, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
      onDone(user.id);
      Alert.alert("Suspended", `${user.name} has been suspended for ${d} ${unit}.`);
      onClose();
    } catch { setError("Network error"); }
    setLoading(false);
  }

  const UNIT_LABELS: { key: "hours" | "days" | "weeks"; label: string }[] = [
    { key: "hours", label: "Hours" },
    { key: "days", label: "Days" },
    { key: "weeks", label: "Weeks" },
  ];

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modal, { height: "auto", maxHeight: "72%" }]}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Suspend User</Text>
            <Text style={styles.modalSub}>{user.name} · {user.email}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={20} color="#6B7280" />
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 14 }}>
          <View style={styles.walletField}>
            <Text style={styles.walletLabel}>Duration</Text>
            <TextInput
              style={styles.walletInput}
              placeholder="e.g. 2"
              placeholderTextColor="#9CA3AF"
              value={duration}
              onChangeText={(t) => { setDuration(t.replace(/\D/g, "")); setError(""); }}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.walletField}>
            <Text style={styles.walletLabel}>Unit</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {UNIT_LABELS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  style={[styles.modeBtn, { flex: 1 }, unit === key && { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}
                  onPress={() => setUnit(key)}
                >
                  <Text style={[styles.modeBtnText, { color: unit === key ? "#B45309" : "#9CA3AF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.walletField}>
            <Text style={styles.walletLabel}>Reason *</Text>
            <TextInput
              style={[styles.walletInput, { height: 70, textAlignVertical: "top" }]}
              placeholder="e.g. Abusive behavior in reviews"
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={(t) => { setReason(t); setError(""); }}
              multiline
            />
          </View>

          {!!error && (
            <View style={[styles.walletError, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 }}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.walletSubmitBtn, { backgroundColor: "#F59E0B", opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="slash" size={16} color="#fff" />
                <Text style={styles.walletSubmitText}>Suspend for {duration || "?"} {unit}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function WalletModal({
  user,
  onClose,
  onDone,
  apiRequest,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: (userId: string, newBalance: number) => void;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const coins = parseInt(amount);
    if (!coins || coins <= 0) { setError("Enter a valid positive amount"); return; }
    if (!reason.trim()) { setError("Reason is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/admin/users/${user.id}/wallet-adjust`, {
        method: "POST",
        body: JSON.stringify({ coins: mode === "credit" ? coins : -coins, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
      onDone(user.id, data.newBalance);
      Alert.alert("Done", `${mode === "credit" ? "Added" : "Deducted"} ${coins} coins. New balance: ${data.newBalance} coins.`);
      onClose();
    } catch { setError("Network error"); }
    setLoading(false);
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modal, { height: "auto", maxHeight: "70%" }]}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Wallet Control</Text>
            <Text style={styles.modalSub}>{user.name} · {user.walletBalance} coins</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={20} color="#6B7280" />
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 14 }}>
          {/* Credit / Debit toggle */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[styles.modeBtn, mode === "credit" && { backgroundColor: "#ECFDF5", borderColor: "#10B981" }]}
              onPress={() => setMode("credit")}
            >
              <Feather name="plus-circle" size={16} color={mode === "credit" ? "#10B981" : "#9CA3AF"} />
              <Text style={[styles.modeBtnText, { color: mode === "credit" ? "#10B981" : "#9CA3AF" }]}>Add Coins</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === "debit" && { backgroundColor: "#FEF2F2", borderColor: "#EF4444" }]}
              onPress={() => setMode("debit")}
            >
              <Feather name="minus-circle" size={16} color={mode === "debit" ? "#EF4444" : "#9CA3AF"} />
              <Text style={[styles.modeBtnText, { color: mode === "debit" ? "#EF4444" : "#9CA3AF" }]}>Deduct Coins</Text>
            </Pressable>
          </View>

          <View style={styles.walletField}>
            <Text style={styles.walletLabel}>Amount (coins)</Text>
            <TextInput
              style={styles.walletInput}
              placeholder="e.g. 500"
              placeholderTextColor="#9CA3AF"
              value={amount}
              onChangeText={(t) => { setAmount(t.replace(/\D/g, "")); setError(""); }}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.walletField}>
            <Text style={styles.walletLabel}>Reason</Text>
            <TextInput
              style={[styles.walletInput, { height: 70, textAlignVertical: "top" }]}
              placeholder="e.g. Bonus for first purchase"
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={(t) => { setReason(t); setError(""); }}
              multiline
            />
          </View>

          {!!error && (
            <View style={[styles.walletError, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 }}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.walletSubmitBtn, { backgroundColor: mode === "credit" ? "#10B981" : "#EF4444", opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name={mode === "credit" ? "plus" : "minus"} size={16} color="#fff" />
                <Text style={styles.walletSubmitText}>{mode === "credit" ? "Credit Coins" : "Deduct Coins"}</Text>
              </>
            )}
          </Pressable>
        </View>
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
  const [walletUser, setWalletUser] = useState<AdminUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
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

  function handleWalletDone(userId: string, newBalance: number) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, walletBalance: newBalance } : u)));
  }

  function handleSuspendDone(userId: string) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "suspended" as const } : u)));
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
              onWalletAdjust={setWalletUser}
              onSuspend={setSuspendUser}
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

      {walletUser && (
        <WalletModal
          user={walletUser}
          onClose={() => setWalletUser(null)}
          onDone={handleWalletDone}
          apiRequest={apiRequest}
        />
      )}

      {suspendUser && (
        <SuspendModal
          user={suspendUser}
          onClose={() => setSuspendUser(null)}
          onDone={handleSuspendDone}
          apiRequest={apiRequest}
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
  actionCol: { gap: 8 },
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
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB", paddingVertical: 12 },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  walletField: { gap: 6 },
  walletLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  walletInput: { borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", backgroundColor: "#F9FAFB", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F1740" },
  walletError: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  walletSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  walletSubmitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
