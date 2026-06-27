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
import { insertAutoNotification } from "./notifications";
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
      createdAt: usersTable.createdAt,
      banReason: usersTable.banReason,
      suspendedUntil: usersTable.suspendedUntil,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineUsers = await db
    .selectDistinct({ userId: activityLogsTable.userId })
    .from(activityLogsTable)
    .where(and(gte(activityLogsTable.timestamp, fifteenMinsAgo), sql`${activityLogsTable.userId} IS NOT NULL`));
  const onlineSet = new Set(onlineUsers.map((u) => u.userId));

  const usersWithStatus = users.map((u) => ({ ...u, online: onlineSet.has(u.id) }));
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
  const banReason = reason || "Policy violation";
  const [updated] = await db
    .update(usersTable)
    .set({ status: "banned", banReason })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  try { await insertAutoNotification(req.params.id, "Account Banned", `Your account has been permanently banned. Reason: ${banReason}`, "alert-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/unban", authMiddleware, adminMiddleware, async (req, res) => {
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", banReason: null, suspendedUntil: null })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  try { await insertAutoNotification(req.params.id, "Account Reinstated", "Your account has been reinstated. You can now log in and use XyloCart normally.", "check-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/approve", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const [before] = await db.select({ status: usersTable.status, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.params.id));
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", banReason: null })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  if (before) {
    await db.insert(adminAuditLogsTable).values({ id: uuidv4(), adminId: req.userId!, action: "approve_user", entityType: "user", entityId: req.params.id, previousState: before.status, newState: "active" }).catch(() => {});
  }
  try { await insertAutoNotification(req.params.id, "Account Approved! 🎉", "Welcome to XyloCart! Your registration has been approved. You can now log in and start shopping.", "check-circle"); } catch {}
  res.json({ user: updated });
});

router.post("/admin/users/:id/reject", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const { reason } = req.body;
  const rejectReason = reason || "Registration rejected by admin";
  const [before] = await db.select({ status: usersTable.status }).from(usersTable).where(eq(usersTable.id, req.params.id));
  const [updated] = await db
    .update(usersTable)
    .set({ status: "rejected", banReason: rejectReason })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status });
  if (before) {
    await db.insert(adminAuditLogsTable).values({ id: uuidv4(), adminId: req.userId!, action: "reject_user", entityType: "user", entityId: req.params.id, previousState: before.status, newState: "rejected", notes: rejectReason }).catch(() => {});
  }
  try { await insertAutoNotification(req.params.id, "Registration Rejected", `Your registration has been reviewed and rejected. Reason: ${rejectReason}`, "alert-circle"); } catch {}
  res.json({ user: updated });
});

const suspendSchema = z.object({
  duration: z.number().int().positive(),
  unit: z.enum(["hours", "days", "weeks"]),
  reason: z.string().min(1),
});

router.post("/admin/users/:id/suspend", authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = suspendSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "duration (number), unit (hours|days|weeks), and reason are required" }); return; }
  const { duration, unit, reason } = parsed.data;

  const unitMs = unit === "hours" ? 60 * 60 * 1000 : unit === "days" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const until = new Date(Date.now() + duration * unitMs);

  const [updated] = await db
    .update(usersTable)
    .set({ status: "suspended", suspendedUntil: until, banReason: reason })
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id, status: usersTable.status, suspendedUntil: usersTable.suspendedUntil });

  try {
    const label = `${duration} ${unit}`;
    await insertAutoNotification(req.params.id, "Account Suspended", `Your account has been suspended for ${label}. Reason: ${reason}`, "alert-circle");
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

router.patch("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  if (status === "delivered") {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (order) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
      if (user) {
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
    }
  }

  res.json({ order: updated });
});

router.put("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  if (status === "delivered") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
    if (user) {
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
  }

  res.json({ order: updated });
});

// ─── Referral Network (User) ──────────────────────────────────────────────────

router.get("/referrals/network", authMiddleware, async (req: AuthRequest, res) => {
  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.userId!))
    .orderBy(desc(referralsTable.createdAt));

  if (!referrals.length) { res.json({ referrals: [], totalRevenue: 0, totalCoinsEarned: 0 }); return; }

  const refereeIds = referrals.map((r) => r.refereeId);
  const referees = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, createdAt: usersTable.createdAt, status: usersTable.status })
    .from(usersTable)
    .where(inArray(usersTable.id, refereeIds));

  const refereeMap = Object.fromEntries(referees.map((u) => [u.id, u]));

  const allOrders = refereeIds.length
    ? await db.select().from(ordersTable).where(inArray(ordersTable.userId, refereeIds)).orderBy(desc(ordersTable.createdAt))
    : [];

  const ordersByUser: Record<string, typeof allOrders> = {};
  for (const o of allOrders) {
    if (!ordersByUser[o.userId]) ordersByUser[o.userId] = [];
    ordersByUser[o.userId].push(o);
  }

  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalCoinsEarned = referrals.reduce((sum, r) => sum + r.coinsAwarded, 0);

  const enriched = referrals.map((r) => ({
    ...r,
    referee: refereeMap[r.refereeId] ?? null,
    orders: ordersByUser[r.refereeId] ?? [],
    orderCount: (ordersByUser[r.refereeId] ?? []).length,
    orderRevenue: (ordersByUser[r.refereeId] ?? []).reduce((s, o) => s + (o.total ?? 0), 0),
  }));

  res.json({ referrals: enriched, totalRevenue, totalCoinsEarned });
});

// ─── Tickets Admin ────────────────────────────────────────────────────────────

router.get("/admin/tickets", authMiddleware, adminMiddleware, async (_req, res) => {
  const tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt)).limit(100);
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

// ─── Announcements (public read) ──────────────────────────────────────────────

router.get("/announcement", async (_req, res) => {
  const enabled = await getConfig("announcement_enabled");
  const text = await getConfig("announcement_text");
  const color = await getConfig("announcement_color");
  res.json({ enabled: enabled === "true", text: text || "", color: color || "#2563EB" });
});

// ─── Public config (safe keys only) ──────────────────────────────────────────

router.get("/config/public", async (_req, res) => {
  const [
    maintenance_mode, maintenance_message,
    login_enabled, registration_enabled,
    login_closed_message, registration_closed_message,
  ] = await Promise.all([
    getConfig("maintenance_mode"),
    getConfig("maintenance_message"),
    getConfig("login_enabled"),
    getConfig("registration_enabled"),
    getConfig("login_closed_message"),
    getConfig("registration_closed_message"),
  ]);
  res.json({
    maintenance_mode,
    maintenance_message,
    login_enabled,
    registration_enabled,
    login_closed_message,
    registration_closed_message,
  });
});

export default router;
