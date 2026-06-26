import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, referralsTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  deviceUuid: z.string().min(1),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceUuid: z.string().optional(),
});

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post("/auth/register", async (req, res) => {
  const registrationEnabled = await getConfig("registration_enabled");
  if (registrationEnabled === "false") {
    res.status(403).json({ error: "Registration is currently disabled." });
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const { email, password, name, deviceUuid, referralCode } = parsed.data;

  const existing = await db.select({ id: usersTable.id, deviceUuid: usersTable.deviceUuid })
    .from(usersTable)
    .where(or(eq(usersTable.email, email), eq(usersTable.deviceUuid, deviceUuid)));

  for (const u of existing) {
    if (u.deviceUuid === deviceUuid) {
      res.status(400).json({ error: "Security Exception: This device is already registered to an account." });
      return;
    }
    if (!u.deviceUuid) {
      res.status(400).json({ error: "Email already registered." });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  let userReferralCode = generateReferralCode();
  while ((await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, userReferralCode))).length > 0) {
    userReferralCode = generateReferralCode();
  }

  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode.toUpperCase()));
    if (referrer.length > 0) referredById = referrer[0].id;
  }

  const approvalMode = await getConfig("approval_mode");
  const userStatus = approvalMode === "manual" ? "pending" : "active";

  await db.insert(usersTable).values({
    id: userId,
    email,
    passwordHash,
    name,
    deviceUuid,
    referralCode: userReferralCode,
    referredById,
    walletBalance: 0,
    role: "user",
    status: userStatus as any,
  });

  if (referredById) {
    const referralEnabled = await getConfig("referral_enabled");
    const referralCoins = parseInt(await getConfig("referral_coins")) || 100;
    if (referralEnabled === "true") {
      await db.insert(referralsTable).values({
        id: uuidv4(),
        referrerId: referredById,
        refereeId: userId,
        coinsAwarded: referralCoins,
      }).onConflictDoNothing();

      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, referredById));
      await db.update(usersTable).set({ walletBalance: (referrer.walletBalance || 0) + referralCoins }).where(eq(usersTable.id, referredById));
      await db.insert(walletTransactionsTable).values({
        id: uuidv4(),
        userId: referredById,
        type: "credit",
        coins: referralCoins,
        description: `Referral reward — new user ${name} joined`,
        referenceId: userId,
      });
    }
  }

  if (userStatus === "pending") {
    res.status(202).json({ error: "pending_approval", message: "Your registration is pending admin review. You will be able to sign in once approved." });
    return;
  }

  const token = signToken(userId);
  const [user] = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, walletBalance: usersTable.walletBalance, referralCode: usersTable.referralCode }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ token, user });
});

router.post("/auth/login", async (req, res) => {
  const loginEnabled = await getConfig("login_enabled");
  if (loginEnabled === "false") {
    res.status(403).json({ error: "Login is currently disabled." });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, password } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!users.length) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  const user = users[0];

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (user.status === "pending") {
    res.status(403).json({ error: "pending_approval", message: "Your registration is pending review. Please wait for an administrator to approve your access." });
    return;
  }

  if (user.status === "banned") {
    res.status(403).json({ error: `Account banned: ${user.banReason ?? "Policy violation"}` });
    return;
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, walletBalance: user.walletBalance, referralCode: user.referralCode } });
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  const users = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, walletBalance: usersTable.walletBalance, referralCode: usersTable.referralCode, status: usersTable.status, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: users[0] });
});

export default router;
