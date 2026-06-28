import { Router } from "express";
import { db } from "@workspace/db";
import { faqsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const router = Router();

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().min(1).default("General"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

router.get("/faqs", async (_req, res) => {
  const faqs = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isActive, true))
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.createdAt));
  res.json({ faqs });
});

router.get("/admin/faqs", authMiddleware, adminMiddleware, async (_req, res) => {
  const faqs = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.createdAt));
  res.json({ faqs });
});

router.post("/admin/faqs", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = faqSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const [faq] = await db.insert(faqsTable).values({ id: uuidv4(), ...parsed.data }).returning();
  res.status(201).json({ faq });
});

router.put("/admin/faqs/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = faqSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed" }); return; }
  const [faq] = await db.update(faqsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(faqsTable.id, req.params.id as string)).returning();
  if (!faq) { res.status(404).json({ error: "FAQ not found" }); return; }
  res.json({ faq });
});

router.delete("/admin/faqs/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  await db.delete(faqsTable).where(eq(faqsTable.id, req.params.id as string));
  res.json({ success: true });
});

export default router;
