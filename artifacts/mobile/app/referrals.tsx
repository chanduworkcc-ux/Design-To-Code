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

interface RefereeOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

interface ReferralEntry {
  id: string;
  refereeId: string;
  coinsAwarded: number;
  createdAt: string;
  referee: { id: string; name: string; email: string; createdAt: string; status: string } | null;
  orders: RefereeOrder[];
  orderCount: number;
  orderRevenue: number;
}

interface NetworkData {
  referrals: ReferralEntry[];
  totalRevenue: number;
  totalCoinsEarned: number;
}

const ORDER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#FFFBEB", text: "#D97706" },
  confirmed: { bg: "#EFF6FF", text: "#2563EB" },
  shipped:   { bg: "#F0FDF4", text: "#16A34A" },
  delivered: { bg: "#ECFDF5", text: "#059669" },
  cancelled: { bg: "#FEF2F2", text: "#DC2626" },
};

export default function ReferralsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest, user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await apiRequest("/referrals/network");
      if (res.ok) { const d = await res.json(); setData(d); }
    } catch {}
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => { fetchNetwork(); }, [fetchNetwork]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchNetwork();
    setRefreshing(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Referral Network</Text>
        <View style={[styles.livePill, { backgroundColor: "#ECFDF5" }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your network...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* My Referral Code */}
          {user?.referralCode && (
            <View style={[styles.codeCard, { backgroundColor: colors.primary }]}>
              <View>
                <Text style={styles.codeLabel}>Your Referral Code</Text>
                <Text style={styles.codeValue}>{user.referralCode}</Text>
                <Text style={styles.codeHint}>Share this code to earn 100 coins per referral</Text>
              </View>
              <View style={styles.codeIconBox}>
                <Feather name="share-2" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{data?.referrals.length ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Members</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: "#16A34A" }]}>+{data?.totalCoinsEarned ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Coins Earned</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.text }]}>₹{(data?.totalRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Network Revenue</Text>
            </View>
          </View>

          {/* Referral List */}
          {(!data || data.referrals.length === 0) ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.card }]}>
                <Feather name="users" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No referrals yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Share your referral code and start earning coins when friends join and order.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DOWNLINE MEMBERS</Text>
              {data.referrals.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const latestOrder = entry.orders[0];
                const statusCfg = latestOrder ? (ORDER_STATUS_COLOR[latestOrder.status] ?? ORDER_STATUS_COLOR.pending) : null;

                return (
                  <Pressable
                    key={entry.id}
                    style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {/* Card Header */}
                    <View style={styles.memberHeader}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.memberAvatarText}>
                          {(entry.referee?.name ?? "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {entry.referee?.name ?? "Unknown User"}
                        </Text>
                        <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {entry.referee?.email ?? "—"}
                        </Text>
                        <Text style={[styles.memberJoined, { color: colors.mutedForeground }]}>
                          Joined {timeAgo(entry.createdAt)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={[styles.coinsBadge, { backgroundColor: "#ECFDF5" }]}>
                          <Text style={styles.coinsText}>+{entry.coinsAwarded}🪙</Text>
                        </View>
                        {entry.orderCount > 0 && (
                          <Text style={[styles.orderCountText, { color: colors.mutedForeground }]}>
                            {entry.orderCount} order{entry.orderCount !== 1 ? "s" : ""}
                          </Text>
                        )}
                        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                      </View>
                    </View>

                    {/* Latest Order Status Preview */}
                    {latestOrder && !isExpanded && (
                      <View style={[styles.latestOrderRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.latestOrderLabel, { color: colors.mutedForeground }]}>Latest order:</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusCfg!.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusCfg!.text }]}>
                            {latestOrder.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.latestOrderAmt, { color: colors.text }]}>
                          ₹{latestOrder.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </Text>
                      </View>
                    )}

                    {/* Expanded Order List */}
                    {isExpanded && (
                      <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                        <View style={[styles.memberRevRow, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.memberRevLabel, { color: colors.mutedForeground }]}>Total network revenue from this member</Text>
                          <Text style={[styles.memberRevAmount, { color: colors.text }]}>
                            ₹{entry.orderRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </Text>
                        </View>

                        {entry.orders.length === 0 ? (
                          <Text style={[styles.noOrdersText, { color: colors.mutedForeground }]}>No orders placed yet</Text>
                        ) : (
                          entry.orders.map((order) => {
                            const cfg = ORDER_STATUS_COLOR[order.status] ?? ORDER_STATUS_COLOR.pending;
                            return (
                              <View key={order.id} style={[styles.orderRow, { borderBottomColor: colors.border }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.orderId, { color: colors.text }]}>
                                    #{order.id.slice(0, 8).toUpperCase()}
                                  </Text>
                                  <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                                    {new Date(order.createdAt).toLocaleDateString("en-IN")} · {timeAgo(order.createdAt)}
                                  </Text>
                                </View>
                                <View style={{ alignItems: "flex-end", gap: 4 }}>
                                  <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                                    <Text style={[styles.statusPillText, { color: cfg.text }]}>
                                      {order.status.toUpperCase()}
                                    </Text>
                                  </View>
                                  <Text style={[styles.orderAmt, { color: colors.text }]}>
                                    ₹{order.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                  </Text>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}

          {/* Disclaimer */}
          <View style={[styles.disclaimer, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <View style={styles.disclaimerHeader}>
              <Feather name="shield" size={14} color="#92400E" />
              <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              Share your unique referral code safely. System point distribution schemes are governed by the platform terms of service. Rewards are strictly non-transferable and have no cash value outside the platform redemption process.{"\n\n"}
              Network revenue figures represent order values generated by referred members and are shown for transparency only. These figures do not represent any direct income or earnings for you.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669" },
  liveText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#059669" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  scroll: { padding: 16, gap: 0 },

  codeCard: { borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  codeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "DMSans_500Medium" },
  codeValue: { color: "#fff", fontSize: 28, fontFamily: "DMSans_700Bold", letterSpacing: 2, marginTop: 4 },
  codeHint: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 },
  codeIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statNum: { fontSize: 20, fontFamily: "DMSans_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "DMSans_400Regular", textAlign: "center" },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "DMSans_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 24 },

  sectionTitle: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 10, marginLeft: 2 },
  memberCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  memberHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: "#fff", fontSize: 18, fontFamily: "DMSans_700Bold" },
  memberName: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  memberEmail: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 },
  memberJoined: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 },
  coinsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  coinsText: { fontSize: 12, fontFamily: "DMSans_700Bold", color: "#059669" },
  orderCountText: { fontSize: 11, fontFamily: "DMSans_400Regular" },

  latestOrderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  latestOrderLabel: { fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 },
  latestOrderAmt: { fontSize: 13, fontFamily: "DMSans_700Bold" },

  expandedSection: { borderTopWidth: 1, padding: 12, gap: 0 },
  memberRevRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 10, marginBottom: 12 },
  memberRevLabel: { fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 16 },
  memberRevAmount: { fontSize: 16, fontFamily: "DMSans_700Bold", marginLeft: 8 },
  noOrdersText: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 12 },
  orderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  orderId: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  orderDate: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 },
  orderAmt: { fontSize: 14, fontFamily: "DMSans_700Bold" },

  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontFamily: "DMSans_700Bold" },

  disclaimer: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 20 },
  disclaimerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  disclaimerTitle: { fontSize: 13, fontFamily: "DMSans_700Bold", color: "#92400E" },
  disclaimerText: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#92400E", lineHeight: 18 },
});
