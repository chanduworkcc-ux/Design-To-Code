import { BASE_URL } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { FloatIn, FloatingOrb, PulsingRing } from "@/components/ThreeD";

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
  joinedAt: string;
  referee: { id: string; name: string; email: string; createdAt: string; status: string } | null;
  orders: RefereeOrder[];
  orderCount: number;
  orderRevenue: number;
}

interface NetworkData {
  referrals: ReferralEntry[];
  pendingReferrals: ReferralEntry[];
  totalRevenue: number;
  totalCoinsEarned: number;
  orderedCount: number;
  pendingCount: number;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#FFFBEB", text: "#D97706" },
  confirmed: { bg: "#EFF6FF", text: "#2563EB" },
  shipped:   { bg: "#F0FDF4", text: "#16A34A" },
  delivered: { bg: "#ECFDF5", text: "#059669" },
  cancelled: { bg: "#FEF2F2", text: "#DC2626" },
};

function timeAgo(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr as string).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function Avatar({ name, size = 44, color }: { name: string; size?: number; color: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontFamily: "DMSans_700Bold" }}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function OrderedMemberCard({ entry, colors, expanded, onToggle }: {
  entry: ReferralEntry; colors: any; expanded: boolean; onToggle: () => void;
}) {
  const latestOrder = entry.orders[0];
  const cfg = latestOrder ? (STATUS_COLOR[latestOrder.status] ?? STATUS_COLOR.pending) : null;

  return (
    <Pressable
      style={[styles.memberCard, { backgroundColor: colors.card, borderColor: "#22C55E22" }]}
      onPress={onToggle}
    >
      {/* Green ordered badge */}
      <View style={styles.orderedBadgeRow}>
        <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
          <Feather name="check-circle" size={11} color="#16A34A" />
          <Text style={[styles.badgeText, { color: "#16A34A" }]}>ORDERED</Text>
        </View>
        <Text style={[styles.joinedMeta, { color: colors.mutedForeground }]}>Joined {timeAgo(entry.joinedAt)}</Text>
      </View>

      <View style={styles.memberRow}>
        <Avatar name={entry.referee?.name ?? "?"} color="#16A34A" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: colors.text }]}>{entry.referee?.name ?? "Unknown"}</Text>
          <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{entry.referee?.email ?? "—"}</Text>
          <Text style={[styles.memberStat, { color: colors.mutedForeground }]}>
            {entry.orderCount} order{entry.orderCount !== 1 ? "s" : ""} · ₹{entry.orderRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {entry.coinsAwarded > 0 && (
            <View style={[styles.coinsBadge, { backgroundColor: "#ECFDF5" }]}>
              <Text style={styles.coinsText}>+{entry.coinsAwarded} 🪙</Text>
            </View>
          )}
          {latestOrder && cfg && (
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusPillText, { color: cfg.text }]}>{latestOrder.status.toUpperCase()}</Text>
            </View>
          )}
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </View>
      </View>

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          <View style={[styles.revenueRow, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.revLabel, { color: colors.mutedForeground }]}>Total revenue from this friend</Text>
            <Text style={[styles.revAmount, { color: colors.text }]}>₹{entry.orderRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          </View>
          {entry.orders.map((o) => {
            const oCfg = STATUS_COLOR[o.status] ?? STATUS_COLOR.pending;
            return (
              <View key={o.id} style={[styles.orderRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderId, { color: colors.text }]}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                    {new Date(o.createdAt).toLocaleDateString("en-IN")} · {timeAgo(o.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[styles.statusPill, { backgroundColor: oCfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: oCfg.text }]}>{o.status.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.orderAmt, { color: colors.text }]}>₹{o.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

function PendingMemberCard({ entry, colors }: { entry: ReferralEntry; colors: any }) {
  return (
    <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: "#F59E0B22" }]}>
      <View style={styles.orderedBadgeRow}>
        <View style={[styles.badge, { backgroundColor: "#FFFBEB" }]}>
          <Feather name="clock" size={11} color="#D97706" />
          <Text style={[styles.badgeText, { color: "#D97706" }]}>NOT ORDERED YET</Text>
        </View>
        <Text style={[styles.joinedMeta, { color: colors.mutedForeground }]}>Joined {timeAgo(entry.joinedAt)}</Text>
      </View>
      <View style={styles.memberRow}>
        <Avatar name={entry.referee?.name ?? "?"} color="#D97706" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: colors.text }]}>{entry.referee?.name ?? "Unknown"}</Text>
          <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{entry.referee?.email ?? "—"}</Text>
          <Text style={[styles.memberStat, { color: "#D97706" }]}>Waiting for first order • 100🪙 pending</Text>
        </View>
        <View style={[styles.pendingPill, { backgroundColor: "#FFFBEB" }]}>
          <Text style={{ fontSize: 10, fontFamily: "DMSans_600SemiBold", color: "#D97706" }}>PENDING</Text>
        </View>
      </View>
    </View>
  );
}

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
  const [referralBaseUrl, setReferralBaseUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"ordered" | "pending">("ordered");

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await apiRequest("/referrals/network");
      if (res.ok) { const d = await res.json(); setData(d); }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [apiRequest]);

  useEffect(() => { fetchNetwork(); }, [fetchNetwork]);

  useEffect(() => {
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => { if (d?.referral_base_url) setReferralBaseUrl(d.referral_base_url); })
      .catch(() => {});
  }, []);

  async function handleShare() {
    if (!user?.referralCode) return;
    const code = user.referralCode;
    const link = referralBaseUrl ? `${referralBaseUrl}?ref=${code}` : null;
    const message = link
      ? `Join XyloCart using my link and get exclusive rewards! Code ${code} auto-applied: ${link}`
      : `Join XyloCart with my referral code ${code} and earn bonus coins on your first order!`;
    try { await Share.share({ message, title: "Join XyloCart — Earn Exclusive Rewards!" }); } catch {}
  }

  const totalReferred = (data?.orderedCount ?? 0) + (data?.pendingCount ?? 0);
  const conversionRate = totalReferred > 0 ? Math.round(((data?.orderedCount ?? 0) / totalReferred) * 100) : 0;

  const displayList = activeTab === "ordered" ? (data?.referrals ?? []) : (data?.pendingReferrals ?? []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Ambient 3D orbs */}
      <FloatingOrb color={colors.primary} size={220} style={{ top: -60, right: -80 } as any} delay={0} amplitude={14} />
      <FloatingOrb color="#818CF8" size={140} style={{ top: 260, left: -60 } as any} delay={600} amplitude={10} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Referral Network</Text>
        <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
        <View style={[styles.livePill, { backgroundColor: "#ECFDF5" }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your network…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 48 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNetwork(); }} tintColor={colors.primary} />}
        >
          {/* Referral Code Card */}
          {user?.referralCode && (
            <FloatIn delay={0} distance={24}>
              <View style={[styles.codeCard, { backgroundColor: colors.primary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
                  <Text style={styles.codeValue}>{user.referralCode}</Text>
                  <Text style={styles.codeHint}>Earn 100 coins when a friend places their first order</Text>
                </View>
                <Pressable style={styles.shareBtn} onPress={handleShare}>
                  <Feather name="share-2" size={22} color="#fff" />
                  <Text style={styles.shareBtnText}>Share</Text>
                </Pressable>
              </View>
            </FloatIn>
          )}

          {/* 4-stat summary row */}
          <FloatIn delay={80} distance={20}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: colors.primary }]}>{totalReferred}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Referred</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#DCFCE7", borderColor: "#22C55E44" }]}>
                <Text style={[styles.statNum, { color: "#16A34A" }]}>{data?.orderedCount ?? 0}</Text>
                <Text style={[styles.statLabel, { color: "#15803D" }]}>Ordered</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D44" }]}>
                <Text style={[styles.statNum, { color: "#D97706" }]}>{data?.pendingCount ?? 0}</Text>
                <Text style={[styles.statLabel, { color: "#B45309" }]}>Not Ordered</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: "#16A34A" }]}>+{data?.totalCoinsEarned ?? 0}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Coins Earned</Text>
              </View>
            </View>
          </FloatIn>

          {/* Conversion rate bar */}
          {totalReferred > 0 && (
            <FloatIn delay={140} distance={16}>
              <View style={[styles.convCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.convTopRow}>
                  <Text style={[styles.convTitle, { color: colors.text }]}>Conversion Rate</Text>
                  <Text style={[styles.convRate, { color: colors.primary }]}>{conversionRate}%</Text>
                </View>
                <View style={[styles.convTrack, { backgroundColor: colors.secondary }]}>
                  <View style={[styles.convFill, { width: `${conversionRate}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.convSub, { color: colors.mutedForeground }]}>
                  {data?.orderedCount ?? 0} of {totalReferred} friends placed an order
                </Text>
              </View>
            </FloatIn>
          )}

          {/* Empty state */}
          {totalReferred === 0 && (
            <FloatIn delay={160} distance={30}>
              <View style={styles.emptyState}>
                <View style={{ width: 120, height: 130, alignItems: "center", justifyContent: "center" }}>
                  <PulsingRing color={colors.primary} size={110} duration={2000} thickness={1} />
                  <PulsingRing color="#818CF8" size={78} duration={1700} delay={400} thickness={1.2} />
                  <View style={[styles.emptyOrb, { backgroundColor: colors.primary }]}>
                    <Feather name="users" size={28} color="#fff" />
                  </View>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No referrals yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Share your code and earn 100 coins every time a friend places their first order.
                </Text>
                <Pressable style={[styles.emptyShareBtn, { backgroundColor: colors.primary }]} onPress={handleShare}>
                  <Feather name="share-2" size={16} color="#fff" />
                  <Text style={styles.emptyShareText}>Share My Code</Text>
                </Pressable>
              </View>
            </FloatIn>
          )}

          {/* Tab selector */}
          {totalReferred > 0 && (
            <FloatIn delay={180} distance={16}>
              <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                  style={[styles.tabBtn, activeTab === "ordered" && { backgroundColor: "#DCFCE7" }]}
                  onPress={() => setActiveTab("ordered")}
                >
                  <Feather name="check-circle" size={14} color={activeTab === "ordered" ? "#16A34A" : colors.mutedForeground} />
                  <Text style={[styles.tabText, { color: activeTab === "ordered" ? "#16A34A" : colors.mutedForeground }]}>
                    Ordered ({data?.orderedCount ?? 0})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabBtn, activeTab === "pending" && { backgroundColor: "#FFFBEB" }]}
                  onPress={() => setActiveTab("pending")}
                >
                  <Feather name="clock" size={14} color={activeTab === "pending" ? "#D97706" : colors.mutedForeground} />
                  <Text style={[styles.tabText, { color: activeTab === "pending" ? "#D97706" : colors.mutedForeground }]}>
                    Not Ordered ({data?.pendingCount ?? 0})
                  </Text>
                </Pressable>
              </View>
            </FloatIn>
          )}

          {/* List */}
          {totalReferred > 0 && displayList.length === 0 && (
            <View style={[styles.tabEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={activeTab === "ordered" ? "check-circle" : "clock"} size={28} color={colors.border} />
              <Text style={[styles.tabEmptyText, { color: colors.mutedForeground }]}>
                {activeTab === "ordered"
                  ? "None of your friends have ordered yet"
                  : "All your friends have placed an order! 🎉"}
              </Text>
            </View>
          )}

          {displayList.map((entry) =>
            activeTab === "ordered" ? (
              <OrderedMemberCard
                key={entry.id}
                entry={entry}
                colors={colors}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ) : (
              <PendingMemberCard key={entry.id} entry={entry} colors={colors} />
            )
          )}

          {/* Revenue summary (only when there are ordered referrals) */}
          {(data?.orderedCount ?? 0) > 0 && (
            <View style={[styles.revSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.revSummaryLabel, { color: colors.mutedForeground }]}>Total Network Revenue</Text>
                <Text style={[styles.revSummaryAmount, { color: colors.text }]}>
                  ₹{(data?.totalRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <Feather name="trending-up" size={22} color="#16A34A" />
            </View>
          )}

          {/* Disclaimer */}
          <View style={[styles.disclaimer, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Feather name="shield" size={13} color="#92400E" />
              <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              Share your unique referral code responsibly. Rewards are non-transferable and have no cash value. Network revenue figures are shown for transparency only and do not represent direct income.
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
  headerLogo: { width: 32, height: 32 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669" },
  liveText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#059669" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  scroll: { padding: 16, gap: 14 },

  codeCard: { borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  codeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "DMSans_600SemiBold", letterSpacing: 1 },
  codeValue: { color: "#fff", fontSize: 30, fontFamily: "DMSans_700Bold", letterSpacing: 3, marginTop: 4 },
  codeHint: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 },
  shareBtn: { alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  shareBtnText: { color: "#fff", fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", textAlign: "center" },

  convCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  convTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convTitle: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  convRate: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  convTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  convFill: { height: 8, borderRadius: 4 },
  convSub: { fontSize: 12, fontFamily: "DMSans_400Regular" },

  emptyState: { alignItems: "center", paddingTop: 20, gap: 14 },
  emptyOrb: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "DMSans_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 24 },
  emptyShareBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyShareText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },

  tabBar: { flexDirection: "row", gap: 8, borderRadius: 14, borderWidth: 1, padding: 6 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  tabEmpty: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  tabEmptyText: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center" },

  memberCard: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden" },
  orderedBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 9, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 },
  joinedMeta: { fontSize: 10, fontFamily: "DMSans_400Regular" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingTop: 6 },
  memberName: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  memberEmail: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
  memberStat: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 },
  coinsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  coinsText: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#059669" },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 9, fontFamily: "DMSans_700Bold" },
  pendingPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  expandedSection: { borderTopWidth: 1, padding: 12, gap: 0 },
  revenueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 10, marginBottom: 10 },
  revLabel: { fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 16 },
  revAmount: { fontSize: 16, fontFamily: "DMSans_700Bold", marginLeft: 8 },
  orderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  orderId: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  orderDate: { fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 2 },
  orderAmt: { fontSize: 14, fontFamily: "DMSans_700Bold" },

  revSummary: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 16 },
  revSummaryLabel: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  revSummaryAmount: { fontSize: 22, fontFamily: "DMSans_700Bold", marginTop: 2 },

  disclaimer: { borderRadius: 14, borderWidth: 1, padding: 14 },
  disclaimerTitle: { fontSize: 12, fontFamily: "DMSans_700Bold", color: "#92400E" },
  disclaimerText: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#92400E", lineHeight: 17 },
});
