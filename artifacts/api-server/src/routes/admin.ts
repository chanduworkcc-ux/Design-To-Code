import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  ordersTable,
  productsTable,
  supportTicketsTable,
  withdrawalRequestsTable,
  activityLogsTable,
  systemConfigTable,
  walletTransactionsTable,
  referralsTable,
  adminAuditLogsTable,
} from "@workspace/db/schema";
import { eq, desc, count, sql, and, gte, lte, inArray } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getAllConfig, setConfig, getConfig } from "../lib/config";
import { getIO } from "../lib/socket";
import { insertAutoNotification } from "./notifications";
import { sendEmail, orderStatusEmailHtml } from "../lib/email";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

router.get("/admin/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  const [totalUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "user"));
  const [bannedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "banned"));
  const [pendingUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "pending"));
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [pendingOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [shippedOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "shipped"));
  const [deliveredOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "delivered"));
  const [openTickets] = await db.select({ count: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open"));
  const [pendingWithdrawals] = await db.select({ count: count() }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "pending"));

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineResult = await db
    .selectDistinct({ userId: activityLogsTable.userId })
    .from(activityLogsTable)
    .where(and(gte(activityLogsTable.timestamp, fifteenMinsAgo), sql`${activityLogsTable.userId} IS NOT NULL`));
  const onlineNow = onlineResult.length;

  const recentOrders = await db
    .select({ id: ordersTable.id, status: ordersTable.status, total: ordersTable.total, createdAt: ordersTable.createdAt, userId: ordersTable.userId })
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  res.json({
    stats: {
      totalUsers: totalUsers.count,
      pendingApprovals: pendingUsers.count,
      bannedUsers: bannedUsers.count,
      onlineNow,
      totalOrders: totalOrders.count,
      pendingOrders: pendingOrders.count,
      openTickets: openTickets.count,
      shippedOrders: shippedOrders.count,
      deliveredOrders: deliveredOrders.count,
      pendingWithdrawals: pendingWithdrawals.count,
    },
    recentOrders,
  });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get("/admin/analytics", authMiddleware, adminMiddleware, async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const dailyOrders = await db
    .select({
      day: sql<string>`DATE(${ordersTable.createdAt})`.as("day"),
      count: count(),
      revenue: sql<number>`COALESCE(SUM(${ordersTable.total}), 0)`.as("revenue"),
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, sevenDaysAgo))
    .groupBy(sql`DATE(${ordersTable.createdAt})`)
    .orderBy(sql`DATE(${ordersTable.createdAt})`);

  const dailyUsers = await db
    .select({
      day: sql<string>`DATE(${usersTable.createdAt})`.as("day"),
      count: count(),
    })
    .from(usersTable)
    .where(and(gte(usersTable.createdAt, sevenDaysAgo), eq(usersTable.role, "user")))
    .groupBy(sql`DATE(${usersTable.createdAt})`)
    .orderBy(sql`DATE(${usersTable.createdAt})`);

  const ordersByStatus = await db
    .select({ status: ordersTable.status, count: count() })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const topProducts = await db
    .select({
      productId: ordersTable.productId,
      orders: count(),
      revenue: sql<number>`COALESCE(SUM(${ordersTable.total}), 0)`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.productId)
    .orderBy(desc(count()))
    .limit(5);

  const productIds = topProducts.map((p) => p.productId);
  const products = productIds.length
    ? await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(sql`${productsTable.id} = ANY(${sql.raw(`ARRAY['${productIds.join("','")}']`)})`)
    : [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const enrichedTopProducts = topProducts.map((p) => ({ ...p, name: productMap[p.productId] ?? "Unknown" }));

  const [totalRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ordersTable.total}), 0)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "delivered"));

  res.json({ dailyOrders, dailyUsers, ordersByStatus, topProducts: enrichedTopProducts, totalRevenue: totalRevenue?.total ?? 0 });
});

// ─── Users Management ────────────────────────────────────────────────────────

router.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      status: usersTable.status,
      walletBalance: usersTable.walletBalance,
      referralCode: usersTable.referralCode,
      deviceUuid: usersTable.deviceUuid,
      mobileNumber: usersTable.mobileNumber,
      registrationIp: usersTable.registrationIp,
      lastLoginIp: usersTable.lastLoginIp,
      createdAt: usersTable.createdAt,
      banReason: usersTable.banReason,
      suspendedUntil: usersTable.suspendedUntil,
      verifiedAt: usersTable.verifiedAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [onlineUsers, latestIps] = await Promise.all([
    db.selectDistinct({ userId: activityLogsTable.userId })
      .from(activityLogsTable)
      .where(and(gte(activityLogsTable.timestamp, fifteenMinsAgo), sql`${activityLogsTable.userId} IS NOT NULL`)),
    db.select({
      userId: activityLogsTable.userId,
      ip: activityLogsTable.ip,
      timestamp: activityLogsTable.timestamp,
    })
      .from(activityLogsTable)
      .where(sql`${activityLogsTable.userId} IS NOT NULL AND ${activityLogsTable.ip} IS NOT NULL`)
      .orderBy(desc(activityLogsTable.timestamp))
      .limit(500),
  ]);

  const onlineSet = new Set(onlineUsers.map((u) => u.userId));

  const ipMap: Record<string, { ip: string; seenAt: string }> = {};
  for (const log of latestIps) {
    if (log.userId && !ipMap[log.userId] && log.ip) {
      ipMap[log.userId] = { ip: log.ip, seenAt: log.timestamp.toISOString() };
    }
  }

  const usersWithStatus = users.map((u) => ({
    ...u,
    online: onlineSet.has(u.id),
    liveIp: ipMap[u.id] ?? null,
  }));
  res.json({ users: usersWithStatus });
});

router.get("/admin/users/:id/logs", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, id))
    .orderBy(desc(activityLogsTable.timestamp))
    .limit(50);
  res.json({ logs });
});

router.get("/admin/users/ip-banned", authMiddleware, adminMiddleware, async (req, res) => {
  const bannedUsers = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      status: usersTable.status,
      registrationIp: usersTable.registrationIp,
      banReason: usersTable.banReason,
      createdAt: usersTable.createdAt,
      mobileNumber: usersTable.mobileNumber,
    })
    .from(usersTable)
    .where(and(eq(usersTable.status, "banned"), sql`${usersTable.banReason} LIKE '%Multiple accounts%'`))
    .orderBy(desc(usersTable.createdAt));

  const groups: Record<string, typeof bannedUsers> = {};
  for (const u of bannedUsers) {
    const ip = u.registrationIp ?? "unknown";
    if (!groups[ip]) groups[ip] = [];
    groups[ip].push(u);
  }

  const result = Object.entries(groups).map(([ip, accounts]) => ({ ip, accounts, count: accounts.length }))
    .sort((a, b) => b.count - a.count);

  res.json({ groups: result, total: bannedUsers.length });
});

router.post("/admin/users/:id/ban", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const { reason } = req.body;
  const banReason = reason || "Policy violation";
  const [updated] = await db
    .update(usersTable)
    .set({ status: "banned", banReason })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status });
  try { await insertAutoNotification(id, "Account Banned", `Your account has been permanently banned. Reason: ${banReason}`, "alert-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/unban", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", banReason: null, suspendedUntil: null })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status });
  try { await insertAutoNotification(id, "Account Reinstated", "Your account has been reinstated. You can now log in and use XyloCart normally.", "check-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/approve", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const [before] = await db.select({ status: usersTable.status, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, id));
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", banReason: null })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status });
  if (before) {
    await db.insert(adminAuditLogsTable).values({ id: uuidv4(), adminId: req.userId!, action: "approve_user", entityType: "user", entityId: id, previousState: before.status, newState: "active" }).catch(() => {});
  }
  try { await insertAutoNotification(id, "Account Approved! 🎉", "Welcome to XyloCart! Your registration has been approved. You can now log in and start shopping.", "check-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/reject", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { reason } = req.body;
  const rejectReason = reason || "Registration rejected by admin";
  const [before] = await db.select({ status: usersTable.status }).from(usersTable).where(eq(usersTable.id, id));
  const [updated] = await db
    .update(usersTable)
    .set({ status: "rejected", banReason: rejectReason })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status });
  if (before) {
    await db.insert(adminAuditLogsTable).values({ id: uuidv4(), adminId: req.userId!, action: "reject_user", entityType: "user", entityId: id, previousState: before.status, newState: "rejected", notes: rejectReason }).catch(() => {});
  }
  try { await insertAutoNotification(id, "Registration Rejected", `Your registration has been reviewed and rejected. Reason: ${rejectReason}`, "alert-circle"); } catch {}
  res.json({ user: updated });
});

const suspendSchema = z.object({
  duration: z.number().int().positive(),
  unit: z.enum(["hours", "days", "weeks"]),
  reason: z.string().min(1),
});

router.post("/admin/users/:id/suspend", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const parsed = suspendSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "duration (number), unit (hours|days|weeks), and reason are required" }); return; }
  const { duration, unit, reason } = parsed.data;

  const unitMs = unit === "hours" ? 60 * 60 * 1000 : unit === "days" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const until = new Date(Date.now() + duration * unitMs);

  const [updated] = await db
    .update(usersTable)
    .set({ status: "suspended", suspendedUntil: until, banReason: reason })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status, suspendedUntil: usersTable.suspendedUntil });

  try {
    const label = `${duration} ${unit}`;
    await insertAutoNotification(id, "Account Suspended", `Your account has been suspended for ${label}. Reason: ${reason}`, "alert-circle");
  } catch {}

  res.json({ user: updated });
});

// ─── Orders Admin ────────────────────────────────────────────────────────────

router.get("/admin/orders", authMiddleware, adminMiddleware, async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = status
    ? await db.select().from(ordersTable).where(eq(ordersTable.status, status as any)).orderBy(desc(ordersTable.createdAt)).limit(100)
    : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
  res.json({ orders });
});

async function handleOrderStatusUpdate(orderId: string, newStatus: string, res: any) {
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(newStatus)) { res.status(400).json({ error: "Invalid status" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, walletBalance: usersTable.walletBalance })
    .from(usersTable)
    .where(eq(usersTable.id, updated.userId));

  const [product] = await db
    .select({ name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.id, updated.productId));

  if (newStatus === "delivered" && user) {
    const DELIVERY_REWARD_COINS = 100;
    await db.update(usersTable)
      .set({ walletBalance: user.walletBalance + DELIVERY_REWARD_COINS })
      .where(eq(usersTable.id, updated.userId));
    await db.insert(walletTransactionsTable).values({
      id: uuidv4(),
      userId: updated.userId,
      type: "credit",
      coins: DELIVERY_REWARD_COINS,
      description: `Delivery reward — Order #${updated.id.slice(0, 8).toUpperCase()} delivered`,
      referenceId: updated.id,
    });
  }

  // In-app notification
  const statusLabels: Record<string, string> = {
    confirmed: "Order Confirmed ✅",
    shipped:   "Order Shipped 🚚",
    delivered: "Order Delivered 🎉",
    cancelled: "Order Cancelled",
  };
  if (user && statusLabels[newStatus]) {
    try {
      await insertAutoNotification(
        user.id,
        statusLabels[newStatus],
        `Your order ${updated.orderNumber ?? orderId.slice(0, 8).toUpperCase()} has been ${newStatus}.`,
        newStatus === "cancelled" ? "alert-circle" : "package",
        { targetType: "order", orderId, orderNumber: updated.orderNumber },
      );
    } catch {}
  }

  // Email notification
  if (user) {
    try {
      const shippingInfo = (() => {
        try { return updated.shippingAddress ? JSON.parse(updated.shippingAddress as string) : null; } catch { return null; }
      })();
      const emailHtml = orderStatusEmailHtml({
        userName: user.name,
        orderNumber: updated.orderNumber ?? orderId.slice(0, 8).toUpperCase(),
        status: newStatus,
        productName: product?.name ?? "Your product",
        total: updated.total ?? 0,
        trackingNumber: (updated as any).trackingNumber ?? null,
        trackingLink: (updated as any).trackingLink ?? null,
        courierPartner: (updated as any).courierPartner ?? null,
        estimatedDelivery: (updated as any).estimatedDelivery ?? null,
      });
      await sendEmail({
        to: user.email,
        subject: `Order Update: ${statusLabels[newStatus] ?? newStatus} — ${updated.orderNumber ?? orderId.slice(0, 8).toUpperCase()}`,
        html: emailHtml,
      });
    } catch {}
  }

  res.json({ order: updated });
}

router.patch("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  await handleOrderStatusUpdate(req.params.id as string, req.body.status, res);
});

router.put("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  await handleOrderStatusUpdate(req.params.id as string, req.body.status, res);
});

// ─── Admin Cancel Order with UTR + Reason ─────────────────────────────────────

const cancelSchema = z.object({
  cancellationReason: z.string().min(1),
  utrNumber: z.string().optional(),
});

router.patch("/admin/orders/:id/cancel", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "cancellationReason is required" }); return; }
  const { cancellationReason, utrNumber } = parsed.data;

  const [before] = await db.select({ status: ordersTable.status }).from(ordersTable).where(eq(ordersTable.id, id));
  if (!before) { res.status(404).json({ error: "Order not found" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "cancelled", cancellationReason, utrNumber: utrNumber || null, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(adminAuditLogsTable).values({
    id: uuidv4(), adminId: req.userId!, action: "cancel_order",
    entityType: "order", entityId: id,
    previousState: JSON.stringify({ status: before.status }),
    newState: JSON.stringify({ status: "cancelled", cancellationReason, utrNumber }),
  }).catch(() => {});

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, updated.userId));

  if (user) {
    try {
      await insertAutoNotification(
        user.id,
        "Order Cancelled",
        `Your order ${updated.orderNumber ?? id.slice(0, 8).toUpperCase()} has been cancelled. Reason: ${cancellationReason}${utrNumber ? ` | UTR: ${utrNumber}` : ""}`,
        "alert-circle",
        { targetType: "refunds" },
      );
    } catch {}
    try {
      getIO().to(`user:${user.id}`).emit("order_cancelled", { orderId: id, cancellationReason, utrNumber });
    } catch {}
  }

  res.json({ order: updated });
});

// ─── Referral Network (User) ──────────────────────────────────────────────────

router.get("/referrals/network", authMiddleware, async (req: AuthRequest, res) => {
  // All users who registered using this user's referral code
  const allReferred = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, createdAt: usersTable.createdAt, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.referredById, req.userId!))
    .orderBy(desc(usersTable.createdAt));

  if (!allReferred.length) {
    res.json({ referrals: [], pendingReferrals: [], totalRevenue: 0, totalCoinsEarned: 0, orderedCount: 0, pendingCount: 0 });
    return;
  }

  const refereeIds = allReferred.map((u) => u.id);

  // Referral reward records (only created when first order is placed)
  const referralRecords = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.userId!));

  const referralByRefereeId: Record<string, typeof referralRecords[0]> =
    Object.fromEntries(referralRecords.map((r) => [r.refereeId, r]));

  // All orders by referred users
  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.userId, refereeIds))
    .orderBy(desc(ordersTable.createdAt));

  const ordersByUser: Record<string, typeof allOrders> = {};
  for (const o of allOrders) {
    if (!ordersByUser[o.userId]) ordersByUser[o.userId] = [];
    ordersByUser[o.userId].push(o);
  }

  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalCoinsEarned = referralRecords.reduce((sum, r) => sum + r.coinsAwarded, 0);

  // Split into ordered (placed ≥1 order) and pending (no orders yet)
  const ordered = allReferred
    .filter((u) => (ordersByUser[u.id] ?? []).length > 0)
    .map((u) => ({
      id: referralByRefereeId[u.id]?.id ?? u.id,
      refereeId: u.id,
      coinsAwarded: referralByRefereeId[u.id]?.coinsAwarded ?? 0,
      createdAt: referralByRefereeId[u.id]?.createdAt ?? u.createdAt,
      joinedAt: u.createdAt,
      referee: u,
      orders: ordersByUser[u.id] ?? [],
      orderCount: (ordersByUser[u.id] ?? []).length,
      orderRevenue: (ordersByUser[u.id] ?? []).reduce((s, o) => s + (o.total ?? 0), 0),
    }));

  const pending = allReferred
    .filter((u) => (ordersByUser[u.id] ?? []).length === 0)
    .map((u) => ({
      id: u.id,
      refereeId: u.id,
      coinsAwarded: 0,
      createdAt: u.createdAt,
      joinedAt: u.createdAt,
      referee: u,
      orders: [],
      orderCount: 0,
      orderRevenue: 0,
    }));

  res.json({
    referrals: ordered,
    pendingReferrals: pending,
    totalRevenue,
    totalCoinsEarned,
    orderedCount: ordered.length,
    pendingCount: pending.length,
  });
});

// ─── Admin Referral Stats ──────────────────────────────────────────────────────

router.get("/admin/referrals/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  // All users referred (have referredById set)
  const totalReferredRows = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(sql`${usersTable.referredById} IS NOT NULL`);
  const totalReferred = Number(totalReferredRows[0]?.cnt ?? 0);

  // Referral reward records (one per converted referee)
  const referralRecords = await db.select().from(referralsTable);
  const convertedCount = referralRecords.length;
  const pendingCount = Math.max(0, totalReferred - convertedCount);
  const totalCoinsDistributed = referralRecords.reduce((s, r) => s + r.coinsAwarded, 0);

  // Unique referrers (users who have referred at least one person)
  const uniqueReferrersRows = await db
    .selectDistinct({ referrerId: usersTable.referredById })
    .from(usersTable)
    .where(sql`${usersTable.referredById} IS NOT NULL`);
  const uniqueReferrers = uniqueReferrersRows.length;

  // New referred users in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRows = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(and(sql`${usersTable.referredById} IS NOT NULL`, gte(usersTable.createdAt, thirtyDaysAgo)));
  const recentJoins = Number(recentRows[0]?.cnt ?? 0);

  // Top referrers: group referred users by referredById
  const topReferrerRaw = await db
    .select({ referrerId: usersTable.referredById, referralCount: count() })
    .from(usersTable)
    .where(sql`${usersTable.referredById} IS NOT NULL`)
    .groupBy(usersTable.referredById)
    .orderBy(desc(count()))
    .limit(10);

  const referrerIds = topReferrerRaw.map((r) => r.referrerId).filter(Boolean) as string[];
  const referrerUsers = referrerIds.length
    ? await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, referralCode: usersTable.referralCode, walletBalance: usersTable.walletBalance })
        .from(usersTable)
        .where(inArray(usersTable.id, referrerIds))
    : [];
  const referrerMap = Object.fromEntries(referrerUsers.map((u) => [u.id, u]));

  // Coins earned per referrer
  const coinsByReferrer: Record<string, number> = {};
  for (const r of referralRecords) {
    coinsByReferrer[r.referrerId] = (coinsByReferrer[r.referrerId] ?? 0) + r.coinsAwarded;
  }

  const topReferrers = topReferrerRaw.map((r) => ({
    referrerId: r.referrerId,
    referralCount: Number(r.referralCount),
    coinsEarned: coinsByReferrer[r.referrerId as string] ?? 0,
    user: referrerMap[r.referrerId as string] ?? null,
  }));

  // Recent referral joins (last 10)
  const recentReferrals = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, createdAt: usersTable.createdAt, referredById: usersTable.referredById })
    .from(usersTable)
    .where(sql`${usersTable.referredById} IS NOT NULL`)
    .orderBy(desc(usersTable.createdAt))
    .limit(10);

  // Get referrer names for recent
  const recentReferrerIds = [...new Set(recentReferrals.map((u) => u.referredById).filter(Boolean))] as string[];
  const recentReferrers = recentReferrerIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, recentReferrerIds))
    : [];
  const recentReferrerMap = Object.fromEntries(recentReferrers.map((u) => [u.id, u.name]));

  res.json({
    totalReferred,
    convertedCount,
    pendingCount,
    conversionRate: totalReferred > 0 ? Math.round((convertedCount / totalReferred) * 100) : 0,
    totalCoinsDistributed,
    uniqueReferrers,
    recentJoins,
    topReferrers,
    recentReferrals: recentReferrals.map((u) => ({
      ...u,
      referrerName: recentReferrerMap[u.referredById as string] ?? "Unknown",
    })),
  });
});

// ─── Activity Logs ────────────────────────────────────────────────────────────

router.get("/admin/activity-logs", authMiddleware, adminMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const userId = req.query.userId as string | undefined;
  const logs = userId
    ? await db.select().from(activityLogsTable).where(eq(activityLogsTable.userId, userId)).orderBy(desc(activityLogsTable.timestamp)).limit(limit)
    : await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.timestamp)).limit(limit);
  res.json({ logs });
});

// ─── Config ───────────────────────────────────────────────────────────────────

router.get("/admin/config", authMiddleware, adminMiddleware, async (_req, res) => {
  const config = await getAllConfig();
  res.json({ config });
});

const configUpdateSchema = z.record(z.string(), z.string());

router.put("/admin/config", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = configUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid config payload" }); return; }

  for (const [key, value] of Object.entries(parsed.data)) {
    if (key === "approval_mode") {
      const prev = await getConfig("approval_mode");
      if (prev !== value) {
        await db.insert(adminAuditLogsTable).values({
          id: uuidv4(), adminId: req.userId!, action: "change_approval_mode",
          entityType: "system_config", entityId: "approval_mode",
          previousState: prev, newState: value,
        }).catch(() => {});

        if (value === "auto") {
          const pendingUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.status, "pending"));
          if (pendingUsers.length > 0) {
            await db.update(usersTable).set({ status: "active", banReason: null }).where(eq(usersTable.status, "pending"));
            for (const u of pendingUsers) {
              await insertAutoNotification(u.id, "Account Approved! 🎉", "XyloCart has switched to automatic approvals — your account is now active!", "check-circle").catch(() => {});
            }
          }
        }
      }
    }
    await setConfig(key, value);
  }

  const config = await getAllConfig();
  res.json({ config });
});

// ─── Shipping Management ──────────────────────────────────────────────────────

const shippingUpdateSchema = z.object({
  courierPartner: z.string().min(1),
  trackingLink: z.string().url("Must be a valid URL"),
  estimatedDelivery: z.string().min(1),
});

router.put("/admin/orders/:id/shipping", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const parsed = shippingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "courierPartner, trackingLink (valid URL), and estimatedDelivery are required" });
    return;
  }
  const { courierPartner, trackingLink, estimatedDelivery } = parsed.data;
  const [updated] = await db
    .update(ordersTable)
    .set({ courierPartner, trackingLink, estimatedDelivery, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ order: updated });
});

// ─── Announcements (public read) ──────────────────────────────────────────────

router.get("/announcement", async (_req, res) => {
  const enabled = await getConfig("announcement_enabled");
  const text = await getConfig("announcement_text");
  const color = await getConfig("announcement_color");
  res.json({ enabled: enabled === "true", text: text || "", color: color || "#2563EB" });
});

// ─── Public config (safe keys only) ──────────────────────────────────────────

router.get("/config/public", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const [
    maintenance_mode, maintenance_message,
    login_enabled, registration_enabled,
    login_closed_message, registration_closed_message,
    logo_url, logo_url_without_bg,
    cod_enabled, razorpay_enabled, phonepe_enabled,
    active_payment_gateway,
    no_returns, no_refunds, no_exchanges,
    delivery_info, product_disclaimer,
    delivery_charge, tax_percent, service_charge, maintenance_charge,
    store_status, force_update, update_url, update_version, update_notes,
    app_version, rate_app_url,
  ] = await Promise.all([
    getConfig("maintenance_mode"),
    getConfig("maintenance_message"),
    getConfig("login_enabled"),
    getConfig("registration_enabled"),
    getConfig("login_closed_message"),
    getConfig("registration_closed_message"),
    getConfig("logo_url"),
    getConfig("logo_url_without_bg"),
    getConfig("cod_enabled"),
    getConfig("razorpay_enabled"),
    getConfig("phonepe_enabled"),
    getConfig("active_payment_gateway"),
    getConfig("no_returns"),
    getConfig("no_refunds"),
    getConfig("no_exchanges"),
    getConfig("delivery_info"),
    getConfig("product_disclaimer"),
    getConfig("delivery_charge"),
    getConfig("tax_percent"),
    getConfig("service_charge"),
    getConfig("maintenance_charge"),
    getConfig("store_status"),
    getConfig("force_update"),
    getConfig("update_url"),
    getConfig("update_version"),
    getConfig("update_notes"),
    getConfig("app_version"),
    getConfig("rate_app_url"),
    getConfig("referral_base_url"),
  ]);
  const referral_base_url = await getConfig("referral_base_url");
  res.json({
    maintenance_mode,
    maintenance_message,
    login_enabled,
    registration_enabled,
    login_closed_message,
    registration_closed_message,
    logo_url: logo_url || null,
    logo_url_without_bg: logo_url_without_bg || null,
    cod_enabled,
    razorpay_enabled,
    phonepe_enabled,
    active_payment_gateway: active_payment_gateway || "cod",
    no_returns,
    no_refunds,
    no_exchanges,
    delivery_info,
    product_disclaimer,
    delivery_charge,
    tax_percent,
    service_charge,
    maintenance_charge,
    store_status: store_status || "on",
    force_update: force_update || "false",
    update_url: update_url || "",
    update_version: update_version || "1.0.0",
    update_notes: update_notes || "",
    app_version: app_version || "1.0",
    rate_app_url: rate_app_url || "",
    referral_base_url: referral_base_url || "",
  });
});

// ─── Export Users (CSV) ───────────────────────────────────────────────────────

router.get("/admin/export/users", authMiddleware, adminMiddleware, async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      walletBalance: usersTable.walletBalance,
      status: usersTable.status,
      role: usersTable.role,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const orders = await db
    .select({
      userId: ordersTable.userId,
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      total: ordersTable.total,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt));

  const ordersByUser: Record<string, typeof orders> = {};
  for (const o of orders) {
    if (!ordersByUser[o.userId]) ordersByUser[o.userId] = [];
    ordersByUser[o.userId].push(o);
  }

  const rows: string[] = [
    "Name,Email,Wallet Balance (coins),Status,Role,Referral Code,Joined,Total Orders,Order IDs"
  ];

  for (const u of users) {
    const userOrders = ordersByUser[u.id] ?? [];
    const orderIds = userOrders.map((o) => o.orderNumber ?? o.id.slice(0, 8).toUpperCase()).join("|");
    const joinedDate = new Date(u.createdAt).toLocaleDateString("en-IN");
    const row = [
      `"${(u.name ?? "").replace(/"/g, '""')}"`,
      `"${(u.email ?? "").replace(/"/g, '""')}"`,
      u.walletBalance,
      u.status,
      u.role,
      u.referralCode,
      joinedDate,
      userOrders.length,
      `"${orderIds}"`,
    ].join(",");
    rows.push(row);
  }

  const csv = rows.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=xyloscart-users.csv");
  res.send(csv);
});

export default router;
