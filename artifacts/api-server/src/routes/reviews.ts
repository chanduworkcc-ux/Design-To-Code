import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, ordersTable, productsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, avg, count, and } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const submitSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post("/reviews", authMiddleware as any, async (req: AuthRequest, res) => {
  const parse = submitSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { orderId, rating, comment } = parse.data;
  const userId = req.userId!;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "delivered") { res.status(400).json({ error: "Can only review delivered orders" }); return; }

  const existing = await db.select().from(reviewsTable).where(eq(reviewsTable.orderId, orderId)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already reviewed this order" }); return; }

  const [review] = await db.insert(reviewsTable).values({
    id: uuidv4(),
    userId,
    productId: order.productId,
    orderId,
    rating,
    comment: comment ?? null,
  }).returning();

  const [agg] = await db
    .select({ avg: avg(reviewsTable.rating), count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, order.productId));

  await db.update(productsTable)
    .set({ rating: Number(Number(agg.avg).toFixed(1)) })
    .where(eq(productsTable.id, order.productId));

  res.json({ review });
});

router.get("/reviews/order/:orderId", authMiddleware as any, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const orderId = req.params.orderId as string;

  const [review] = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.orderId, orderId), eq(reviewsTable.userId, userId)))
    .limit(1);

  res.json({ review: review ?? null });
});

router.get("/reviews/product/:productId", async (req, res) => {
  const productId = req.params.productId as string;

  const reviews = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      userName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(desc(reviewsTable.createdAt));

  const [agg] = await db
    .select({ avg: avg(reviewsTable.rating), count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, productId));

  res.json({
    reviews,
    avgRating: agg?.avg ? Number(Number(agg.avg).toFixed(1)) : 0,
    totalCount: agg?.count ?? 0,
  });
});

router.get("/admin/reviews", authMiddleware as any, adminMiddleware as any, async (_req, res) => {
  const reviews = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      orderId: reviewsTable.orderId,
      productId: reviewsTable.productId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      productName: productsTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
    .orderBy(desc(reviewsTable.createdAt));

  res.json({ reviews });
});

router.delete("/admin/reviews/:id", authMiddleware as any, adminMiddleware as any, async (req, res) => {
  const id = req.params.id as string;

  const [deleted] = await db
    .delete(reviewsTable)
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Review not found" }); return; }

  const [agg] = await db
    .select({ avg: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, deleted.productId));

  await db.update(productsTable)
    .set({ rating: agg?.avg ? Number(Number(agg.avg).toFixed(1)) : 0 })
    .where(eq(productsTable.id, deleted.productId));

  res.json({ ok: true });
});

export default router;
