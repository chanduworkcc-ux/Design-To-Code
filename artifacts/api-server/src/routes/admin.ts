import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable, supportTicketsTable, withdrawalRequestsTable, activityLogsTable } from "@workspace/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getAllConfig, setConfig } from "../lib/config";
import { z } from "zod";

const router = Router();

router.get("/admin/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  const [totalUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "user"));
  const [pendingApprovals] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "suspended"));
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [pendingOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [shippedOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "shipped"));
  const [deliveredOrders] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "delivered"));
  const [openTickets] = await db.select({ count: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open"));
  const [pendingWithdrawals] = await db.select({ count: count() }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "pending"));
  const recentOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5);

  res.json({
    stats: {
      totalUsers: totalUsers.count,
      pendingApprovals: pendingApprovals.count,
      onlineNow: 0,
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

router.get("/admin/users", authMiddleware, adminMiddleware, async (_req, res) => {
  const users = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, status: usersTable.status, walletBalance: usersTable.walletBalance, referralCode: usersTable.referralCode, createdAt: usersTable.createdAt, banReason: usersTable.banReason, suspendedUntil: usersTable.suspendedUntil }).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({ users });
});

router.post("/admin/users/:id/ban", authMiddleware, adminMiddleware, async (req, res) => {
  const { reason } = req.body;
  const [updated] = await db.update(usersTable).set({ status: "banned", banReason: reason || "Policy violation" }).where(eq(usersTable.id, req.params.id)).returning({ id: usersTable.id, status: usersTable.status });
  res.json({ user: updated });
});

router.post("/admin/users/:id/unban", authMiddleware, adminMiddleware, async (req, res) => {
  const [updated] = await db.update(usersTable).set({ status: "active", banReason: undefined }).where(eq(usersTable.id, req.params.id)).returning({ id: usersTable.id, status: usersTable.status });
  res.json({ user: updated });
});

router.post("/admin/users/:id/suspend", authMiddleware, adminMiddleware, async (req, res) => {
  const { until } = req.body;
  if (!until) { res.status(400).json({ error: "Suspension expiry date required" }); return; }
  const [updated] = await db.update(usersTable).set({ status: "suspended", suspendedUntil: new Date(until) }).where(eq(usersTable.id, req.params.id)).returning({ id: usersTable.id, status: usersTable.status });
  res.json({ user: updated });
});

router.get("/admin/activity-logs", authMiddleware, adminMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const userId = req.query.userId as string | undefined;
  const logs = userId
    ? await db.select().from(activityLogsTable).where(eq(activityLogsTable.userId, userId)).orderBy(desc(activityLogsTable.timestamp)).limit(limit)
    : await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.timestamp)).limit(limit);
  res.json({ logs });
});

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
