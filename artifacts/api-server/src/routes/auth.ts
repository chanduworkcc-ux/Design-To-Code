import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, referralsTable, passwordResetTokensTable } from "@workspace/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
import { z } from "zod";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { sendPasswordResetEmail } from "../lib/mailer";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(3),
  mobileNumber: z.string().regex(/^\d{10}$/, "Must be a 10-digit mobile number"),
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
  const { email, password, name, mobileNumber, deviceUuid, referralCode } = parsed.data;

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
    mobileNumber,
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
      // Record the referral but do NOT award coins yet.
      // Coins are credited to the referrer only after the referee's
      // first order is marked as "delivered" (see orders route).
      await db.insert(referralsTable).values({
        id: uuidv4(),
        referrerId: referredById,
        refereeId: userId,
        coinsAwarded: referralCoins,
        rewardedAt: null,
      }).onConflictDoNothing();
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

  if (user.status === "suspended") {
    if (user.suspendedUntil && user.suspendedUntil <= new Date()) {
      await db.update(usersTable).set({ status: "active", suspendedUntil: null, banReason: null }).where(eq(usersTable.id, user.id));
    } else {
      res.status(403).json({
        error: "suspended",
        suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
        banReason: user.banReason ?? "Suspended by administrator",
      });
      return;
    }
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, walletBalance: user.walletBalance, referralCode: user.referralCode, status: user.status } });
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    walletBalance: usersTable.walletBalance,
    referralCode: usersTable.referralCode,
    status: usersTable.status,
    suspendedUntil: usersTable.suspendedUntil,
    banReason: usersTable.banReason,
    mobileNumber: usersTable.mobileNumber,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
  const u = users[0];
  if (u.status === "suspended" && u.suspendedUntil && u.suspendedUntil <= new Date()) {
    await db.update(usersTable).set({ status: "active", suspendedUntil: null, banReason: null }).where(eq(usersTable.id, u.id));
    u.status = "active";
    u.suspendedUntil = null;
    u.banReason = null;
  }
  res.json({ user: u });
});

const patchMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

router.patch("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { name } = parsed.data;
  if (!name) { res.status(400).json({ error: "Nothing to update." }); return; }
  const [updated] = await db.update(usersTable)
    .set({ name })
    .where(eq(usersTable.id, req.userId!))
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, walletBalance: usersTable.walletBalance, referralCode: usersTable.referralCode });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: updated });
});

function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/auth/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }
  const { email } = parsed.data;

  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.email, email));

  if (users.length > 0) {
    const user = users[0];
    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, user.id));

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(passwordResetTokensTable).values({
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, user.name, token).catch(() => {});
  }

  res.json({ message: "If an account exists for that email, a reset code has been sent." });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request. Please check your code and password." });
    return;
  }
  const { token, password } = parsed.data;

  const rows = await db.select().from(passwordResetTokensTable)
    .where(and(
      eq(passwordResetTokensTable.token, token.toUpperCase()),
      eq(passwordResetTokensTable.used, false),
      gt(passwordResetTokensTable.expiresAt, new Date()),
    ));

  if (!rows.length) {
    res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." });
    return;
  }

  const record = rows[0];
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, record.userId));
  await db.update(passwordResetTokensTable).set({ used: true }).where(eq(passwordResetTokensTable.id, record.id));

  res.json({ message: "Password reset successfully." });
});

export default router;
