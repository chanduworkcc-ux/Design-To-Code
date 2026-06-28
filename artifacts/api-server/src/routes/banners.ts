import { Router } from "express";
import { db } from "@workspace/db";
import { bannersTable, notificationsTable } from "@workspace/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ─── Public Banners ──────────────────────────────────────────────────────────
router.get("/banners", async (_req, res) => {
  const banners = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.isActive, true))
    .orderBy(asc(bannersTable.sortOrder));
  res.json({ banners });
});

// ─── Admin Banners ───────────────────────────────────────────────────────────
router.get("/admin/banners", authMiddleware, adminMiddleware, async (_req, res) => {
  const banners = await db.select().from(bannersTable).orderBy(asc(bannersTable.sortOrder));
  res.json({ banners });
});

const bannerSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().max(120).optional(),
  bgColor: z.string().default("#2563EB"),
  textColor: z.string().default("#ffffff"),
  ctaText: z.string().default("Shop Now"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post("/admin/banners", authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = bannerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const [banner] = await db.insert(bannersTable).values({ id: uuidv4(), ...parsed.data }).returning();
  res.status(201).json({ banner });
});

router.put("/admin/banners/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = bannerSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed" }); return; }
  const [updated] = await db
    .update(bannersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(bannersTable.id, req.params.id as string))
    .returning();
  if (!updated) { res.status(404).json({ error: "Banner not found" }); return; }
  res.json({ banner: updated });
});

router.delete("/admin/banners/:id", authMiddleware, adminMiddleware, async (req, res) => {
  await db.delete(bannersTable).where(eq(bannersTable.id, req.params.id as string));
  res.json({ success: true });
});

// ─── Notifications ───────────────────────────────────────────────────────────
router.get("/notifications", authMiddleware, async (req: any, res) => {
  const userId = req.user?.id as string | undefined;
  // Return global notifications + any targeted to this user
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(100);

  const filtered = notifications.filter(
    (n) => n.targetType === "all" || (n.targetType === "user" && n.targetUserId === userId)
  );
  res.json({ notifications: filtered.slice(0, 50) });
});

const notifSchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("all"),
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    iconName: z.string().default("bell"),
    targetUserId: z.undefined().optional(),
  }),
  z.object({
    targetType: z.literal("user"),
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    iconName: z.string().default("bell"),
    targetUserId: z.string().min(1, "targetUserId is required for user-targeted notifications"),
  }),
]);

router.post("/admin/notifications/send", authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = notifSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const [notification] = await db.insert(notificationsTable).values({ id: uuidv4(), ...parsed.data }).returning();
  res.status(201).json({ notification, sent: true });
});

router.get("/admin/notifications", authMiddleware, adminMiddleware, async (_req, res) => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(100);
  res.json({ notifications });
});

export default router;
