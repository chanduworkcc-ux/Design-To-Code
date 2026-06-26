import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, usersTable, couponsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const placeOrderSchema = z.object({
  productId: z.string(),
  paymentMethod: z.enum(["cod", "razorpay", "phonepe"]),
  couponCode: z.string().optional(),
  shippingAddress: z.string().min(5),
  items: z.array(z.any()),
});

router.post("/orders", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { productId, paymentMethod, couponCode, shippingAddress, items } = parsed.data;

  if (items.length !== 1) {
    res.status(400).json({ error: "Only one item per order is allowed." });
    return;
  }

  if (paymentMethod === "cod") {
    const codEnabled = await getConfig("cod_enabled");
    if (codEnabled === "false") { res.status(400).json({ error: "Cash on Delivery is currently unavailable." }); return; }
  }

  const products = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!products.length || !products[0].isActive) {
    res.status(404).json({ error: "Product not found or unavailable." });
    return;
  }
  const product = products[0];

  if (product.stock <= 0) {
    res.status(400).json({ error: "This product is out of stock." });
    return;
  }

  const existingOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!));

  const alreadyPurchased = existingOrders.some(
    (o) => o.productId === productId && o.status !== "cancelled"
  );
  if (alreadyPurchased) {
    res.status(400).json({ error: "You have already purchased this item. Each item can only be bought once." });
    return;
  }

  const deliveryCharge = parseFloat(await getConfig("delivery_charge")) || 0;
  const taxPercent = parseFloat(await getConfig("tax_percent")) || 0;
  const serviceCharge = parseFloat(await getConfig("service_charge")) || 0;
  const maintenanceCharge = parseFloat(await getConfig("maintenance_charge")) || 0;

  const subtotal = product.price;
  const taxAmount = parseFloat(((subtotal * taxPercent) / 100).toFixed(2));
  let discountAmount = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const coupons = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode.toUpperCase()));
    if (coupons.length > 0) {
      const coupon = coupons[0];
      const now = new Date();
      const userOrderCount = existingOrders.length;
      const isNewUser = userOrderCount === 0;

      const cohortMatch = coupon.targetCohort === "all_users" ||
        (coupon.targetCohort === "new_users" && isNewUser) ||
        (coupon.targetCohort === "old_users" && !isNewUser);

      if (coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > now) && cohortMatch &&
        subtotal >= coupon.minOrderValue && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        discountAmount = coupon.discountType === "percent"
          ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount ?? Infinity)
          : Math.min(coupon.discountValue, subtotal);
        couponId = coupon.id;
        await db.update(couponsTable).set({ usedCount: coupon.usedCount + 1 }).where(eq(couponsTable.id, coupon.id));
      }
    }
  }

  const total = parseFloat((subtotal + deliveryCharge + taxAmount + serviceCharge + maintenanceCharge - discountAmount).toFixed(2));

  const [order] = await db.insert(ordersTable).values({
    id: uuidv4(),
    userId: req.userId!,
    productId,
    couponId,
    quantity: 1,
    status: "pending",
    paymentMethod: paymentMethod as any,
    paymentStatus: "pending",
    subtotal,
    deliveryCharge,
    taxAmount,
    serviceCharge,
    maintenanceCharge,
    discountAmount,
    total,
    shippingAddress,
  }).returning();

  await db
    .update(productsTable)
    .set({ stock: sql`${productsTable.stock} - 1` })
    .where(eq(productsTable.id, productId));

  res.status(201).json({ order, breakdown: { subtotal, deliveryCharge, taxAmount, serviceCharge, maintenanceCharge, discountAmount, total } });
});

router.get("/orders", authMiddleware, async (req: AuthRequest, res) => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.userId!)).orderBy(desc(ordersTable.createdAt));
  res.json({ orders });
});

router.get("/orders/:id", authMiddleware, async (req: AuthRequest, res) => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!orders.length || orders[0].userId !== req.userId) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ order: orders[0] });
});

router.get("/admin/orders", authMiddleware, adminMiddleware, async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json({ orders });
});

router.put("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const [updated] = await db.update(ordersTable).set({ status, updatedAt: new Date() }).where(eq(ordersTable.id, req.params.id)).returning();
  res.json({ order: updated });
});

export default router;
