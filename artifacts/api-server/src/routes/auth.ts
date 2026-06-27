import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, referralsTable, passwordResetTokensTable } from "@workspace/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
import { z } from "zod";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer";

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

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  const verificationCode = generateVerificationCode();
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
    status: "unverified",
    verificationToken: verificationCode,
    verificationExpiresAt,
  });

  await sendVerificationEmail(email, name, verificationCode).catch(() => {});

  res.status(201).json({ requiresVerification: true, email });
});

router.post("/auth/verify-email", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email and verification code are required." });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!users.length) {
    res.status(400).json({ error: "Invalid verification code." });
    return;
  }
  const user = users[0];

  if (user.status !== "unverified") {
    if (user.status === "active" || user.status === "pending") {
      res.status(400).json({ error: "Email already verified." });
    } else {
      res.status(400).json({ error: "Invalid account state." });
    }
    return;
  }

  if (!user.verificationToken || user.verificationToken !== code) {
    res.status(400).json({ error: "Invalid verification code." });
    return;
  }

  if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
    res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    return;
  }

  const approvalMode = await getConfig("approval_mode");
  const newStatus = approvalMode === "manual" ? "pending" : "active";

  await db.update(usersTable)
    .set({ status: newStatus as any, verificationToken: null, verificationExpiresAt: null, verifiedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  if (referredById_for(user) && newStatus === "active") {
    await creditReferral(user.id, user.referredById);
  }

  if (newStatus === "pending") {
    res.status(202).json({ error: "pending_approval", message: "Your email is verified. Your account is pending admin review." });
    return;
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, walletBalance: user.walletBalance, referralCode: user.referralCode },
  });
});

function referredById_for(user: any): boolean {
  return !!user.referredById;
}

async function creditReferral(userId: string, referredById: string | null) {
  if (!referredById) return;
  const referralEnabled = await getConfig("referral_enabled");
  if (referralEnabled !== "true") return;
  // Referral coins awarded after first order delivery, not at registration
}

router.post("/auth/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required." }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (users.length && users[0].status === "unverified") {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(usersTable)
      .set({ verificationToken: code, verificationExpiresAt: expiresAt })
      .where(eq(usersTable.id, users[0].id));
    await sendVerificationEmail(email, users[0].name, code).catch(() => {});
  }

  res.json({ message: "If your email is pending verification, a new code has been sent." });
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

  if (user.status === "unverified") {
    res.status(403).json({ error: "unverified", email: user.email, message: "Please verify your email address before signing in." });
    return;
  }

  if (user.status === "pending") {
    res.status(403).json({ error: "pending_approval", message: "Your registration is pending review. Please wait for an administrator to approve your access." });
    return;
  }

  if (user.status === "rejected") {
    res.status(403).json({ error: "rejected", message: "Your account registration was not approved. Please contact support if you believe this is a mistake." });
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
