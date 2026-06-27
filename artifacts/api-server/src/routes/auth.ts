import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, referralsTable, passwordResetTokensTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";

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
  const status = approvalMode === "manual" ? "pending" : "active";

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
    status: status as any,
    verifiedAt: status === "active" ? new Date() : undefined,
  });

  if (status === "pending") {
    res.status(202).json({ pendingApproval: true });
    return;
  }

  const token = signToken(userId);
  res.status(201).json({
    token,
    user: { id: userId, email, name, role: "user", walletBalance: 0, referralCode: userReferralCode },
  });
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

  if (user.status === "unverified" || user.status === "pending") {
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

router.post("/auth/forgot-password", async (_req, res) => {
  res.json({ contactAdmin: true, adminEmail: "admin@integratedgmail.com" });
});

export default router;
