import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, pushTokensTable, usersTable } from "@workspace/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ─── Register push token ──────────────────────────────────────────────────────

const registerTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.string().optional(),
});

router.post("/notifications/register-token", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = registerTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }
  const { token, platform = "unknown" } = parsed.data;
  const userId = req.userId!;

  const existing = await db.select().from(pushTokensTable).where(eq(pushTokensTable.token, token));
  if (existing.length) {
    await db.update(pushTokensTable)
      .set({ userId, platform, updatedAt: new Date() })
      .where(eq(pushTokensTable.token, token));
  } else {
    await db.insert(pushTokensTable).values({ id: uuidv4(), userId, token, platform });
  }
  res.json({ ok: true });
});

// ─── Get user notifications ───────────────────────────────────────────────────

router.get("/notifications", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(
      or(
        eq(notificationsTable.targetType, "all"),
        eq(notificationsTable.targetUserId, userId)
      )
    )
    .orderBy(desc(notificationsTable.sentAt))
    .limit(50);
  res.json({ notifications });
});

// ─── Admin: list all notifications ───────────────────────────────────────────

router.get("/admin/notifications", authMiddleware, adminMiddleware, async (_req, res) => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(100);
  res.json({ notifications });
});

// ─── Admin: send notification ─────────────────────────────────────────────────

const sendNotifSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  targetType: z.enum(["all", "user"]),
  targetUserId: z.string().optional(),
  iconName: z.string().optional(),
});

router.post("/admin/notifications/send", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = sendNotifSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { title, body, targetType, targetUserId, iconName = "bell" } = parsed.data;

  if (targetType === "user" && !targetUserId) {
    res.status(400).json({ error: "targetUserId required when targetType is user" });
    return;
  }

  const [notification] = await db.insert(notificationsTable).values({
    id: uuidv4(),
    title,
    body,
    targetType,
    targetUserId: targetUserId ?? null,
    iconName,
  }).returning();

  // Fetch relevant push tokens
  let tokens: { token: string }[] = [];
  if (targetType === "all") {
    tokens = await db.select({ token: pushTokensTable.token }).from(pushTokensTable);
  } else if (targetUserId) {
    tokens = await db.select({ token: pushTokensTable.token }).from(pushTokensTable).where(eq(pushTokensTable.userId, targetUserId));
  }

  // Send via Expo Push API
  if (tokens.length > 0) {
    const expoPushTokens = tokens.map((t) => t.token).filter((t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));
    if (expoPushTokens.length > 0) {
      const messages = expoPushTokens.map((to) => ({ to, title, body, sound: "default", data: { iconName, targetType, targetUserId } }));
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
          body: JSON.stringify(messages),
        });
      } catch {
        // best-effort: don't fail the request if push delivery fails
      }
    }
  }

  res.json({ notification, tokenCount: tokens.length });
});

export default router;
