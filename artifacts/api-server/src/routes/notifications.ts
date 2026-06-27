import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, pushTokensTable, usersTable } from "@workspace/db/schema";
import { eq, desc, or, lt, gte } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

async function sendSmsNotification(to: string, body: string): Promise<void> {
  const accountSid = await getConfig("twilio_account_sid");
  const authToken = await getConfig("twilio_auth_token");
  const fromNumber = await getConfig("twilio_phone_number");

  if (!accountSid || !authToken || !fromNumber) return;

  const cleanPhone = to.replace(/\D/g, "");
  const e164 = cleanPhone.startsWith("91") ? `+${cleanPhone}` : `+91${cleanPhone}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: e164, From: fromNumber, Body: body }).toString(),
  });
}

export async function insertAutoNotification(
  userId: string,
  title: string,
  body: string,
  iconName = "bell",
): Promise<void> {
  await db.insert(notificationsTable).values({
    id: uuidv4(),
    title,
    body,
    targetType: "user",
    targetUserId: userId,
    iconName,
  });

  const smsEnabled = await getConfig("sms_enabled");

  if (smsEnabled === "true") {
    try {
      const [userRow] = await db
        .select({ mobileNumber: usersTable.mobileNumber })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (userRow?.mobileNumber) {
        const smsBody = `${title}\n${body}`;
        await sendSmsNotification(userRow.mobileNumber, smsBody);
      }
    } catch {}
  }
}

router.post("/notifications/register-token", authMiddleware, async (req: AuthRequest, res) => {
  const registerTokenSchema = z.object({
    token: z.string().min(10),
    platform: z.string().optional(),
  });
  const parsed = registerTokenSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid token" }); return; }
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

router.get("/notifications", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const [userRow] = await db
    .select({ createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const isNewUser = userRow && userRow.createdAt >= thirtyDaysAgo;
  const segmentType = isNewUser ? "new_users" : "old_users";

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(
      or(
        eq(notificationsTable.targetType, "all"),
        eq(notificationsTable.targetType, segmentType),
        eq(notificationsTable.targetUserId, userId),
      ),
    )
    .orderBy(desc(notificationsTable.sentAt))
    .limit(50);

  res.json({ notifications });
});

router.get("/admin/notifications", authMiddleware, adminMiddleware, async (_req, res) => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(100);
  res.json({ notifications });
});

const sendNotifSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  targetType: z.enum(["all", "user", "new_users", "old_users"]),
  targetUserId: z.string().optional(),
  iconName: z.string().optional(),
});

router.post("/admin/notifications/send", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = sendNotifSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
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

  const smsEnabled = await getConfig("sms_enabled");

  if (smsEnabled === "true") {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let userRows: { mobileNumber: string | null }[] = [];

      if (targetType === "all") {
        userRows = await db.select({ mobileNumber: usersTable.mobileNumber }).from(usersTable);
      } else if (targetType === "user" && targetUserId) {
        userRows = await db.select({ mobileNumber: usersTable.mobileNumber }).from(usersTable).where(eq(usersTable.id, targetUserId));
      } else if (targetType === "new_users") {
        userRows = await db.select({ mobileNumber: usersTable.mobileNumber }).from(usersTable).where(gte(usersTable.createdAt, thirtyDaysAgo));
      } else if (targetType === "old_users") {
        userRows = await db.select({ mobileNumber: usersTable.mobileNumber }).from(usersTable).where(lt(usersTable.createdAt, thirtyDaysAgo));
      }

      const smsBody = `${title}\n${body}`;
      await Promise.allSettled(
        userRows
          .filter((u) => u.mobileNumber)
          .map((u) => sendSmsNotification(u.mobileNumber!, smsBody))
      );
    } catch {}
  }

  res.json({ notification, smsEnabled });
});

export default router;
