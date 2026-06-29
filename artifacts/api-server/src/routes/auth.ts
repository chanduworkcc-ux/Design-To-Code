import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable, referralsTable, passwordResetTokensTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { getIO } from "../lib/socket";
import { insertAutoNotification } from "./notifications";
import { sendEmail, fraudAlertEmailHtml } from "../lib/email";

function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? "unknown";
}

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

  const clientIp = getClientIp(req);

  const existing = await db.select({ id: usersTable.id, deviceUuid: usersTable.deviceUuid, email: usersTable.email, registrationIp: usersTable.registrationIp })
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

  // ── IP-based multi-account detection → auto-ban ALL accounts on this IP ──
  if (clientIp && clientIp !== "unknown") {
    try {
      const sameIpUsers = await db
        .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, status: usersTable.status })
        .from(usersTable)
        .where(eq(usersTable.registrationIp, clientIp));

      if (sameIpUsers.length > 0) {
        const existingUser = sameIpUsers[0];
        const multiAccountReason = `Multiple accounts detected: IP address ${clientIp} was used to register multiple accounts. All associated accounts have been automatically suspended.`;

        // Ban ALL existing accounts on this IP
        for (const su of sameIpUsers) {
          if (su.status !== "banned") {
            try {
              await db.update(usersTable)
                .set({ status: "banned", banReason: multiAccountReason })
                .where(eq(usersTable.id, su.id));
              await insertAutoNotification(
                su.id,
                "🚫 Account Banned: Multiple Accounts",
                "Your account has been permanently banned because multiple accounts were registered from the same IP address. Contact support to appeal.",
                "alert-circle",
              );
            } catch {}
          }
        }

        // Alert all admins in real-time and via notification
        const alertPayload = {
          type: "fraud_alert",
          message: `🚨 Auto-ban: Multi-account from IP ${clientIp} — ${sameIpUsers.length + 1} accounts (${sameIpUsers.map((u) => u.email).join(", ")} + new: ${email})`,
          suspiciousEmail: email,
          suspiciousName: name,
          existingEmail: existingUser.email,
          ip: clientIp,
          deviceUuid,
          accountCount: sameIpUsers.length + 1,
          timestamp: new Date().toISOString(),
        };
        try { getIO().to("admins").emit("fraud_alert", alertPayload); } catch {}

        const admins = await db
          .select({ id: usersTable.id, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.role, "admin"));

        for (const admin of admins) {
          try {
            await insertAutoNotification(
              admin.id,
              "🚨 Auto-Ban: Multi-Account IP Detected",
              `IP ${clientIp} used to register ${sameIpUsers.length + 1} accounts. All existing accounts banned automatically. New attempt by "${name}" (${email}) blocked.`,
              "alert-triangle",
            );
          } catch {}
          try {
            await sendEmail({
              to: admin.email,
              subject: "🚨 XyloCart Auto-Ban: Multi-Account Registration Blocked",
              html: fraudAlertEmailHtml({
                suspiciousEmail: email,
                suspiciousName: name,
                matchType: "ip",
                matchValue: clientIp,
                existingEmail: existingUser.email,
                registrationTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
              }),
            });
          } catch {}
        }

        // Block the new registration attempt
        res.status(403).json({
          error: "multi_account",
          message: "Your account has been blocked because multiple accounts were detected from the same IP address. Please contact support.",
          supportEmail: "support@xylocart.com",
        });
        return;
      }
    } catch {}
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
    registrationIp: clientIp,
    lastLoginIp: clientIp,
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
  const loginIp = getClientIp(req);

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

  // Update last login IP
  try {
    await db.update(usersTable).set({ lastLoginIp: loginIp }).where(eq(usersTable.id, user.id));
  } catch {}

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post("/auth/change-password", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "New password must be at least 6 characters." }); return; }
  const { currentPassword, newPassword } = parsed.data;
  const [user] = await db.select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect." }); return; }
  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));
  res.json({ success: true });
});

router.get("/auth/me/security", authMiddleware, async (req: AuthRequest, res) => {
  const [user] = await db.select({
    createdAt: usersTable.createdAt,
    registrationIp: usersTable.registrationIp,
    lastLoginIp: usersTable.lastLoginIp,
    deviceUuid: usersTable.deviceUuid,
  }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ security: user });
});

export default router;
