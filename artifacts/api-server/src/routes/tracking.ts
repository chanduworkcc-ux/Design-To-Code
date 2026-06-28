import { Router } from "express";
import { db } from "@workspace/db";
import { userPageLogsTable, usersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getOnlineUserIds } from "../lib/socket";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const router = Router();

// ─── Log a page-visit event from the mobile app ───────────────────────────────

const pageEventSchema = z.object({
  pageName:     z.string().min(1).max(64),
  pageLabel:    z.string().max(64).optional(),
  action:       z.string().max(128).optional(),
  timeSpentSec: z.number().int().min(0).max(86400).optional(),
});

router.post("/user/page-event", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = pageEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const { pageName, pageLabel, action, timeSpentSec } = parsed.data;

  // Fetch user name/email for admin display (fire-and-forget — don't block response)
  res.status(204).end();

  try {
    const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    await db.insert(userPageLogsTable).values({
      id: uuidv4(),
      userId:       req.userId!,
      userName:     user?.name  ?? null,
      userEmail:    user?.email ?? null,
      pageName,
      pageLabel:    pageLabel    ?? null,
      action:       action       ?? "visit",
      timeSpentSec: timeSpentSec ?? null,
      enteredAt:    new Date(),
      timestamp:    new Date(),
    });
  } catch {}
});

// ─── Admin — get page activity logs ───────────────────────────────────────────

router.get("/admin/page-logs", authMiddleware, adminMiddleware, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit as string)  || 200, 500);
  const userId = req.query.userId as string | undefined;

  const rows = userId
    ? await db.select().from(userPageLogsTable)
        .where(eq(userPageLogsTable.userId, userId))
        .orderBy(desc(userPageLogsTable.timestamp))
        .limit(limit)
    : await db.select().from(userPageLogsTable)
        .orderBy(desc(userPageLogsTable.timestamp))
        .limit(limit);

  res.json({ logs: rows });
});

// ─── Admin — get currently online user IDs (real-time socket) ─────────────────

router.get("/admin/online-users", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const userIds = getOnlineUserIds();
    res.json({ userIds });
  } catch {
    // Socket not yet initialised (server startup race) — return empty
    res.json({ userIds: [] });
  }
});

export default router;
