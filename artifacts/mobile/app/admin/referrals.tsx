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
import { useColors } from "@/hooks/useColors";

interface TopReferrer {
  referrerId: string;
  referralCount: number;
  coinsEarned: number;
  user: { id: string; name: string; email: string; referralCode: string; walletBalance: number } | null;
}

interface RecentReferral {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  referredById: string | null;
  referrerName: string;
}

interface ReferralStats {
  totalReferred: number;
  convertedCount: number;
  pendingCount: number;
  conversionRate: number;
  totalCoinsDistributed: number;
  uniqueReferrers: number;
  recentJoins: number;
  topReferrers: TopReferrer[];
  recentReferrals: RecentReferral[];
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function StatCard({ value, label, color, icon, bg }: { value: string | number; label: string; color: string; icon: string; bg?: string }) {
  return (
    <View style={[sc.wrap, { backgroundColor: bg ?? "#fff", borderColor: color + "33" }]}>
      <View style={[sc.iconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  wrap: { flex: 1, minWidth: "47%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  label: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#6B7280", textAlign: "center" },
});

export default function AdminReferralsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/referrals/stats");
      if (res.ok) { const d = await res.json(); setStats(d); }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [apiRequest]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Referral Analytics</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Full network overview</Text>
        </View>
        <View style={[styles.livePill, { backgroundColor: "#ECFDF5" }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 48 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.primary} />}
        >
          {/* Section: Overview Stats */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <StatCard value={stats?.totalReferred ?? 0} label="Total Referred" color={colors.primary} icon="users" />
            <StatCard value={stats?.convertedCount ?? 0} label="Placed Order" color="#16A34A" icon="check-circle" bg="#F0FDF4" />
            <StatCard value={stats?.pendingCount ?? 0} label="Not Ordered" color="#D97706" icon="clock" bg="#FFFBEB" />
            <StatCard value={`${stats?.conversionRate ?? 0}%`} label="Conversion Rate" color="#7C3AED" icon="trending-up" bg="#F5F3FF" />
            <StatCard value={stats?.uniqueReferrers ?? 0} label="Active Referrers" color="#0891B2" icon="award" bg="#ECFEFF" />
            <StatCard value={`+${stats?.totalCoinsDistributed ?? 0}`} label="Coins Distributed" color="#059669" icon="zap" bg="#ECFDF5" />
          </View>

          {/* Conversion bar */}
          {(stats?.totalReferred ?? 0) > 0 && (
            <View style={[styles.convCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.convTopRow}>
                <View>
                  <Text style={[styles.convLabel, { color: colors.text }]}>Overall Conversion</Text>
                  <Text style={[styles.convSub, { color: colors.mutedForeground }]}>
                    {stats?.convertedCount} of {stats?.totalReferred} referred users placed an order
                  </Text>
                </View>
                <Text style={[styles.convPct, { color: colors.primary }]}>{stats?.conversionRate}%</Text>
              </View>
              <View style={[styles.convTrack, { backgroundColor: colors.secondary }]}>
                <View style={{ flexDirection: "row", height: 10 }}>
                  <View style={{ flex: stats?.convertedCount ?? 0, backgroundColor: "#16A34A", borderRadius: 5 }} />
                  <View style={{ flex: stats?.pendingCount ?? 0, backgroundColor: "#FCD34D", borderRadius: 5 }} />
                </View>
              </View>
              <View style={styles.convLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Converted ({stats?.convertedCount})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#FCD34D" }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Pending ({stats?.pendingCount})</Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent (30d) spotlight */}
          <View style={[styles.recentSpotlight, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.recentSpotlightText, { color: colors.primary }]}>
              <Text style={{ fontFamily: "DMSans_700Bold" }}>{stats?.recentJoins ?? 0}</Text> new referred users joined in the last 30 days
            </Text>
          </View>

          {/* Top Referrers Leaderboard */}
          {(stats?.topReferrers ?? []).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TOP REFERRERS</Text>
              {(stats?.topReferrers ?? []).map((r, i) => (
                <View key={r.referrerId} style={[styles.referrerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.rank, {
                    backgroundColor: i === 0 ? "#FEF3C7" : i === 1 ? "#F3F4F6" : i === 2 ? "#FEF2F2" : colors.secondary,
                  }]}>
                    <Text style={[styles.rankText, {
                      color: i === 0 ? "#D97706" : i === 1 ? "#6B7280" : i === 2 ? "#DC2626" : colors.mutedForeground,
                    }]}>#{i + 1}</Text>
                  </View>
                  <View style={[styles.referrerAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.referrerAvatarText}>
                      {(r.user?.name ?? "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.referrerName, { color: colors.text }]}>{r.user?.name ?? "Unknown"}</Text>
                    <Text style={[styles.referrerEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{r.user?.email ?? "—"}</Text>
                    {r.user?.referralCode && (
                      <View style={[styles.codePill, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.codePillText, { color: colors.primary }]}>{r.user.referralCode}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[styles.refCountBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name="users" size={11} color={colors.primary} />
                      <Text style={[styles.refCountText, { color: colors.primary }]}>{r.referralCount}</Text>
                    </View>
                    <Text style={[styles.coinsEarned, { color: "#059669" }]}>+{r.coinsEarned}🪙</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Recent Referral Joins */}
          {(stats?.recentReferrals ?? []).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENTLY JOINED VIA REFERRAL</Text>
              {(stats?.recentReferrals ?? []).map((u) => (
                <View key={u.id} style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.recentAvatar, { backgroundColor: "#818CF8" }]}>
                    <Text style={styles.referrerAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.referrerName, { color: colors.text }]}>{u.name}</Text>
                    <Text style={[styles.referrerEmail, { color: colors.mutedForeground }]}>{u.email}</Text>
                    <Text style={[styles.recentMeta, { color: colors.mutedForeground }]}>
                      Referred by <Text style={{ fontFamily: "DMSans_600SemiBold", color: colors.primary }}>{u.referrerName}</Text>
                    </Text>
                  </View>
                  <Text style={[styles.recentTime, { color: colors.mutedForeground }]}>{timeAgo(u.createdAt)}</Text>
                </View>
              ))}
            </>
          )}

          {/* No data */}
          {(stats?.totalReferred ?? 0) === 0 && (
            <View style={[styles.noData, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={32} color={colors.border} />
              <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>No referrals recorded yet</Text>
              <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>
                Users will appear here once they register using a referral code.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "DMSans_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669" },
  liveText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#059669" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 12 },

  sectionTitle: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: -2, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  convCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  convTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  convLabel: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  convSub: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 },
  convPct: { fontSize: 28, fontFamily: "DMSans_700Bold" },
  convTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  convLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "DMSans_400Regular" },

  recentSpotlight: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  recentSpotlightText: { fontSize: 13, fontFamily: "DMSans_500Medium", flex: 1, lineHeight: 18 },

  referrerCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  rank: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontFamily: "DMSans_700Bold" },
  referrerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  referrerAvatarText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" },
  referrerName: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  referrerEmail: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 },
  codePill: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  codePillText: { fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1 },
  refCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  refCountText: { fontSize: 12, fontFamily: "DMSans_700Bold" },
  coinsEarned: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  recentCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  recentAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  recentMeta: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 },
  recentTime: { fontSize: 11, fontFamily: "DMSans_400Regular" },

  noData: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  noDataText: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  noDataSub: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 20 },
});
