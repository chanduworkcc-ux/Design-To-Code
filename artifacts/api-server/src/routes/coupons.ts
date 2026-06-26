import { Router } from "express";
import { db } from "@workspace/db";
import { couponsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/coupons", authMiddleware, async (_req, res) => {
  const now = new Date();
  const coupons = await db.select().from(couponsTable).where(and(eq(couponsTable.type, "public"), eq(couponsTable.isActive, true)));
  const valid = coupons.filter(c => !c.expiresAt || c.expiresAt > now);
  res.json({ coupons: valid });
});

router.post("/coupons/validate", authMiddleware, async (req: AuthRequest, res) => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "Coupon code required" }); return; }
  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
  if (!coupon || !coupon.isActive) { res.status(404).json({ error: "Invalid or expired coupon" }); return; }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) { res.status(400).json({ error: "Coupon has expired" }); return; }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) { res.status(400).json({ error: "Coupon usage limit reached" }); return; }
  res.json({ coupon: { id: coupon.id, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, minOrderValue: coupon.minOrderValue, maxDiscount: coupon.maxDiscount } });
});

const couponSchema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(["public", "private"]),
  discountType: z.enum(["percent", "flat"]),
  discountValue: z.number().positive(),
  targetCohort: z.enum(["all_users", "new_users", "old_users"]).optional(),
  targetUserId: z.string().optional(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional(),
});

router.get("/admin/coupons", authMiddleware, adminMiddleware, async (_req, res) => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json({ coupons });
});

router.post("/admin/coupons", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { expiresAt, ...rest } = parsed.data;
  const [coupon] = await db.insert(couponsTable).values({ id: uuidv4(), code: parsed.data.code.toUpperCase(), ...rest, expiresAt: expiresAt ? new Date(expiresAt) : undefined }).returning();
  res.status(201).json({ coupon });
});

router.put("/admin/coupons/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = couponSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed" }); return; }
  const { expiresAt, ...rest } = parsed.data;
  const [updated] = await db.update(couponsTable).set({ ...rest, expiresAt: expiresAt ? new Date(expiresAt) : undefined }).where(eq(couponsTable.id, req.params.id)).returning();
  res.json({ coupon: updated });
});

router.delete("/admin/coupons/:id", authMiddleware, adminMiddleware, async (req, res) => {
  await db.update(couponsTable).set({ isActive: false }).where(eq(couponsTable.id, req.params.id));
  res.json({ success: true });
});

export default router;
