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
} from "@workspace/db/schema";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getAllConfig, setConfig } from "../lib/config";
import { z } from "zod";

const router = Router();

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

router.get("/admin/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  const [totalUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "user"));
  const [bannedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "banned"));
  const [suspendedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "suspended"));
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [pendingOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [shippedOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "shipped"));
  const [deliveredOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "delivered"));
  const [openTickets] = await db.select({ count: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open"));
  const [pendingWithdrawals] = await db.select({ count: count() }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "pending"));

  // Online users: any user with activity log in the last 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineResult = await db
    .selectDistinct({ userId: activityLogsTable.userId })
    .from(activityLogsTable)
    .where(
      and(
        gte(activityLogsTable.timestamp, fifteenMinsAgo),
        sql`${activityLogsTable.userId} IS NOT NULL`
      )
    );
  const onlineNow = onlineResult.length;

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      total: ordersTable.total,
      createdAt: ordersTable.createdAt,
      userId: ordersTable.userId,
    })
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  res.json({
    stats: {
      totalUsers: totalUsers.count,
      pendingApprovals: suspendedUsers.count,
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
  // Last 7 days revenue + orders per day
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

  // New users per day (last 7 days)
  const dailyUsers = await db
    .select({
      day: sql<string>`DATE(${usersTable.createdAt})`.as("day"),
      count: count(),
    })
    .from(usersTable)
    .where(and(gte(usersTable.createdAt, sevenDaysAgo), eq(usersTable.role, "user")))
    .groupBy(sql`DATE(${usersTable.createdAt})`)
    .orderBy(sql`DATE(${usersTable.createdAt})`);

  // Orders by status
  const ordersByStatus = await db
    .select({ status: ordersTable.status, count: count() })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  // Top 5 products by order count
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

  // Enrich top products with names
  const productIds = topProducts.map((p) => p.productId);
  const products = productIds.length
    ? await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(sql`${productsTable.id} = ANY(${sql.raw(`ARRAY['${productIds.join("','")}']`)})`)
    : [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const enrichedTopProducts = topProducts.map((p) => ({
    ...p,
    name: productMap[p.productId] ?? "Unknown",
  }));

  // Total revenue all time
  const [totalRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ordersTable.total}), 0)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "delivered"));

  res.json({
    dailyOrders,
    dailyUsers,
    ordersByStatus,
    topProducts: enrichedTopProducts,
    totalRevenue: totalRevenue?.total ?? 0,
  });
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
      createdAt: usersTable.createdAt,
      banReason: usersTable.banReason,
      suspendedUntil: usersTable.suspendedUntil,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  // Determine online status: last activity within 15 mins
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineUsers = await db
    .selectDistinct({ userId: activityLogsTable.userId })
    .from(activityLogsTable)
    .where(
      and(
        gte(activityLogsTable.timestamp, fifteenMinsAgo),
        sql`${activityLogsTable.userId} IS NOT NULL`
      )
    );
  const onlineSet = new Set(onlineUsers.map((u) => u.userId));

  const usersWithStatus = users.map((u) => ({
    ...u,
    online: onlineSet.has(u.id),
  }));

  res.json({ users: usersWithStatus });
});

router.get("/admin/users/:id/logs", authMiddleware, adminMiddleware, async (req, res) => {
  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, req.params.id))
    .orderBy(desc(activityLogsTable.timestamp))
    .limit(50);
  res.json({ logs });
});

router.post("/admin/users/:id/ban", authMiddleware, adminMiddleware, async (req, res) => {
  const { reason } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({ status: "banned", banReason: reason || "Policy violation" })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  res.json({ user: updated });
});

router.post("/admin/users/:id/unban", authMiddleware, adminMiddleware, async (req, res) => {
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", banReason: null })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  res.json({ user: updated });
});

router.post("/admin/users/:id/suspend", authMiddleware, adminMiddleware, async (req, res) => {
  const { until } = req.body;
  if (!until) { res.status(400).json({ error: "Suspension expiry date required" }); return; }
  const [updated] = await db
    .update(usersTable)
    .set({ status: "suspended", suspendedUntil: new Date(until) })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
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

router.patch("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  res.json({ order: updated });
});

// ─── Tickets Admin ────────────────────────────────────────────────────────────

router.get("/admin/tickets", authMiddleware, adminMiddleware, async (_req, res) => {
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .orderBy(desc(supportTicketsTable.createdAt))
    .limit(100);
  res.json({ tickets });
});

router.patch("/admin/tickets/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowed = ["open", "in_progress", "resolved", "closed"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db
    .update(supportTicketsTable)
    .set({ status, ...(status === "resolved" ? { resolvedAt: new Date() } : {}) })
    .where(eq(supportTicketsTable.id, req.params.id))
    .returning();
  res.json({ ticket: updated });
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

router.put("/admin/config", authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = configUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid config payload" }); return; }
  for (const [key, value] of Object.entries(parsed.data)) {
    await setConfig(key, value);
  }
  const config = await getAllConfig();
  res.json({ config });
});

export default router;
