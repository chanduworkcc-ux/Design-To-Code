import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

interface Notification {
  id: string;
  title: string;
  body: string;
  iconName?: string | null;
  sentAt: string;
  targetType: string;
  targetUserId?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const STATUS_ICON_MAP: Record<string, { icon: string; bg: string; fg: string; border: string; label: string }> = {
  "check-circle": { icon: "check-circle", bg: "#ECFDF5", fg: "#10B981", border: "#6EE7B7", label: "Account Approved" },
  "x-circle":     { icon: "x-circle",     bg: "#FEF2F2", fg: "#EF4444", border: "#FCA5A5", label: "Account Rejected" },
  "alert-triangle": { icon: "alert-triangle", bg: "#FFFBEB", fg: "#F59E0B", border: "#FCD34D", label: "Account Suspended" },
  "shield-off":   { icon: "shield-off",   bg: "#FEF2F2", fg: "#DC2626", border: "#FCA5A5", label: "Account Banned" },
  "shield":       { icon: "shield",       bg: "#ECFDF5", fg: "#059669", border: "#6EE7B7", label: "Account Reinstated" },
};

const DEFAULT_ICON_MAP: Record<string, string> = {
  order: "package",
  wallet: "dollar-sign",
  promo: "tag",
  system: "bell",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();
  const { markAllRead } = useNotifications();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiRequest("/notifications");
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications ?? []);
      }
    } catch {}
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    fetchNotifications();
    markAllRead();
  }, [fetchNotifications, markAllRead]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <Pressable onPress={handleRefresh} disabled={refreshing}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.center}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                You'll see order updates, wallet credits, and announcements here.
              </Text>
            </View>
          ) : (
            notifications.map((n) => {
              const isPersonal = n.targetType === "user" && n.targetUserId === user?.id;
              const statusMeta = n.iconName ? STATUS_ICON_MAP[n.iconName] : null;
              const isStatusCard = isPersonal && !!statusMeta;

              const iconName = n.iconName && isPersonal
                ? (STATUS_ICON_MAP[n.iconName]?.icon ?? DEFAULT_ICON_MAP["system"])
                : DEFAULT_ICON_MAP["system"];

              const iconBg = isStatusCard ? statusMeta!.bg : colors.accent;
              const iconFg = isStatusCard ? statusMeta!.fg : colors.primary;
              const borderColor = isStatusCard ? statusMeta!.border : colors.border;

              return (
                <View
                  key={n.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isStatusCard ? statusMeta!.bg : colors.card,
                      borderColor,
                      borderLeftWidth: isStatusCard ? 4 : 1,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                    <Feather name={iconName as any} size={18} color={iconFg} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.notifTitle, { color: isStatusCard ? iconFg : colors.text, flex: 1 }]}>{n.title}</Text>
                      {isStatusCard && (
                        <View style={[styles.forYouBadge, { backgroundColor: iconFg }]}>
                          <Text style={styles.forYouText}>For You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>{n.body}</Text>
                    <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeAgo(n.sentAt)}</Text>
                  </View>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  center: { alignItems: "center", gap: 12, paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  content: { padding: 16, gap: 10 },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  forYouBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, flexShrink: 0 },
  forYouText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
});
