import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, notificationsTable, ordersTable } from "@workspace/db/schema";
import { eq, sql, ne, count, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

function broadcastProductsUpdated() {
  try { getIO().emit("products:updated"); } catch {}
}

const router = Router();

router.get("/products", async (_req, res) => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true));
  res.json({ products });
});

// Trending: products ranked by number of non-cancelled orders in the last 30 days
router.get("/products/trending", async (_req, res) => {
  const limit = 10;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Count orders per product (excluding cancelled), last 30 days
  const orderCounts = await db
    .select({
      productId: ordersTable.productId,
      orderCount: count(ordersTable.id).as("order_count"),
      totalQty: sql<number>`coalesce(sum(${ordersTable.quantity}), 0)`.as("total_qty"),
    })
    .from(ordersTable)
    .where(
      sql`${ordersTable.status} != 'cancelled' AND ${ordersTable.createdAt} >= ${thirtyDaysAgo}`
    )
    .groupBy(ordersTable.productId)
    .orderBy(desc(sql`order_count`))
    .limit(limit);

  if (orderCounts.length === 0) {
    res.json({ products: [] });
    return;
  }

  const productIds = orderCounts.map((r) => r.productId);
  const allProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const activeMap = new Map(allProducts.map((p) => [p.id, p]));

  const trending = orderCounts
    .filter((r) => activeMap.has(r.productId))
    .map((r) => ({
      ...activeMap.get(r.productId)!,
      orderCount: Number(r.orderCount),
      totalQty: Number(r.totalQty),
    }));

  res.json({ products: trending });
});

router.get("/admin/products", authMiddleware, adminMiddleware, async (_req, res) => {
  const products = await db.select().from(productsTable);
  res.json({ products });
});

router.get("/products/:id", async (req, res) => {
  const products = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id));
  if (!products.length) { res.status(404).json({ error: "Product not found" }); return; }
  res.json({ product: products[0] });
});

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  originalPrice: z.number().optional(),
  discount: z.number().int().optional(),
  rating: z.number().min(0).max(5).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

router.post("/products", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const [product] = await db.insert(productsTable).values({ id: uuidv4(), ...parsed.data }).returning();
  broadcastProductsUpdated();
  res.status(201).json({ product });
});

router.put("/products/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed" }); return; }
  const [updated] = await db.update(productsTable).set(parsed.data).where(eq(productsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Product not found" }); return; }
  broadcastProductsUpdated();
  res.json({ product: updated });
});

router.delete("/products/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, req.params.id));
  broadcastProductsUpdated();
  res.json({ success: true });
});

router.post("/admin/products/:id/add-stock", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) { res.status(400).json({ error: "quantity must be a positive integer" }); return; }
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id));
  if (!existing.length) { res.status(404).json({ error: "Product not found" }); return; }
  const [updated] = await db
    .update(productsTable)
    .set({ stock: sql`${productsTable.stock} + ${qty}` })
    .where(eq(productsTable.id, req.params.id))
    .returning();
  res.json({ product: updated });
});

router.post("/admin/products/:id/out-of-stock", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id));
  if (!existing.length) { res.status(404).json({ error: "Product not found" }); return; }
  const product = existing[0];
  const [updated] = await db
    .update(productsTable)
    .set({ stock: 0, isActive: false })
    .where(eq(productsTable.id, req.params.id))
    .returning();

  // Insert a broadcast notification so carts can detect the removal
  try {
    await db.insert(notificationsTable).values({
      id: uuidv4(),
      title: "Cart Item Removed",
      body: `CART_REMOVED::${product.id}::${product.name}`,
      targetType: "all",
      iconName: "shopping-cart",
    });
  } catch {}

  res.json({ product: updated });
});

export default router;
