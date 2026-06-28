import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, withdrawalRequestsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/wallet", authMiddleware, async (req: AuthRequest, res) => {
  const [user] = await db.select({ walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, req.userId!));
  const transactions = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.userId, req.userId!)).orderBy(desc(walletTransactionsTable.createdAt)).limit(50);
  const coinsPerInr = parseFloat(await getConfig("coins_per_inr")) || 100;
  res.json({
    balance: { coins: user.walletBalance, inr: parseFloat((user.walletBalance / coinsPerInr).toFixed(2)) },
    transactions,
    exchangeRate: { coinsPerInr, label: `₹1 = ${coinsPerInr} coins` },
  });
});

const withdrawSchema = z.object({
  coins: z.number().int().positive(),
  upiId: z.string().min(5),
});

router.post("/wallet/withdraw", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed" }); return; }
  const { coins, upiId } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (user.walletBalance < coins) { res.status(400).json({ error: "Insufficient wallet balance." }); return; }

  const coinsPerInr = parseFloat(await getConfig("coins_per_inr")) || 100;
  const inrAmount = parseFloat((coins / coinsPerInr).toFixed(2));

  await db.update(usersTable).set({ walletBalance: user.walletBalance - coins }).where(eq(usersTable.id, req.userId!));
  await db.insert(walletTransactionsTable).values({ id: uuidv4(), userId: req.userId!, type: "debit", coins, description: `Withdrawal request — ₹${inrAmount} to ${upiId}` });

  const [request] = await db.insert(withdrawalRequestsTable).values({ id: uuidv4(), userId: req.userId!, coins, inrAmount, upiId, status: "pending" }).returning();
  res.status(201).json({ request, message: "Please wait until the admin will accept that soon. Okay?" });
});

router.get("/wallet/withdrawals", authMiddleware, async (req: AuthRequest, res) => {
  const withdrawals = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.userId, req.userId!)).orderBy(desc(withdrawalRequestsTable.createdAt));
  res.json({ withdrawals });
});

router.get("/admin/withdrawals", authMiddleware, adminMiddleware, async (_req, res) => {
  const withdrawals = await db.select().from(withdrawalRequestsTable).orderBy(desc(withdrawalRequestsTable.createdAt));
  res.json({ withdrawals });
});

router.post("/admin/withdrawals/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const { adminNote } = req.body;
  const [updated] = await db.update(withdrawalRequestsTable)
    .set({ status: "approved", adminNote, resolvedAt: new Date() })
    .where(eq(withdrawalRequestsTable.id, id)).returning();
  res.json({ withdrawal: updated });
});

router.post("/admin/withdrawals/:id/reject", authMiddleware, adminMiddleware, async (req, res) => {
  const id = req.params.id as string;
  const { adminNote } = req.body;
  const [wr] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id));
  if (!wr) { res.status(404).json({ error: "Request not found" }); return; }

  await db.update(withdrawalRequestsTable).set({ status: "rejected", adminNote, resolvedAt: new Date() }).where(eq(withdrawalRequestsTable.id, id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, wr.userId));
  await db.update(usersTable).set({ walletBalance: user.walletBalance + wr.coins }).where(eq(usersTable.id, wr.userId));
  await db.insert(walletTransactionsTable).values({ id: uuidv4(), userId: wr.userId, type: "credit", coins: wr.coins, description: `Withdrawal rejected — coins refunded`, referenceId: wr.id });

  res.json({ success: true, refundedCoins: wr.coins });
});

// ─── Admin: Manually adjust user wallet ──────────────────────────────────────

const walletAdjustSchema = z.object({
  coins: z.number().int().refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(1),
});

router.post("/admin/users/:id/wallet-adjust", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const parsed = walletAdjustSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { coins, reason } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const newBalance = user.walletBalance + coins;
  if (newBalance < 0) { res.status(400).json({ error: `Insufficient balance. User has ${user.walletBalance} coins.` }); return; }

  await db.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, id));
  await db.insert(walletTransactionsTable).values({
    id: uuidv4(),
    userId: id,
    type: coins > 0 ? "credit" : "debit",
    coins: Math.abs(coins),
    description: `Admin adjustment: ${reason}`,
    referenceId: req.userId,
  });

  res.json({ newBalance, coins, user: { id: user.id, name: user.name, email: user.email } });
});

// ─── Admin: Wallet financial summary ─────────────────────────────────────────

router.get("/admin/wallet/summary", authMiddleware, adminMiddleware, async (_req, res) => {
  const { sql, sum } = await import("drizzle-orm");

  const [totalGiven] = await db
    .select({ total: sql<number>`COALESCE(SUM(${walletTransactionsTable.coins}), 0)` })
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "credit"));

  const [totalDeducted] = await db
    .select({ total: sql<number>`COALESCE(SUM(${walletTransactionsTable.coins}), 0)` })
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "debit"));

  const [adminAdjustments] = await db
    .select({ total: sql<number>`COALESCE(SUM(${walletTransactionsTable.coins}), 0)` })
    .from(walletTransactionsTable)
    .where(sql`${walletTransactionsTable.type} = 'credit' AND ${walletTransactionsTable.description} LIKE 'Admin adjustment:%'`);

  const [currentSunday] = [new Date()];
  currentSunday.setHours(0, 0, 0, 0);
  currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());

  const [thisWeekGiven] = await db
    .select({ total: sql<number>`COALESCE(SUM(${walletTransactionsTable.coins}), 0)` })
    .from(walletTransactionsTable)
    .where(sql`${walletTransactionsTable.type} = 'credit' AND ${walletTransactionsTable.createdAt} >= ${currentSunday}`);

  const [userCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));

  const [totalUserBalance] = await db
    .select({ total: sql<number>`COALESCE(SUM(${usersTable.walletBalance}), 0)` })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));

  res.json({
    lifetimeCoinsGiven: Number(totalGiven.total),
    lifetimeCoinsDeducted: Number(totalDeducted.total),
    adminAdjustmentsTotal: Number(adminAdjustments.total),
    thisWeekCoinsGiven: Number(thisWeekGiven.total),
    totalUsersWithWallet: Number(userCount.count),
    totalCurrentBalance: Number(totalUserBalance.total),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
