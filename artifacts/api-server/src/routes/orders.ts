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

// ─── Customer Cancellation: PERMANENTLY FORBIDDEN ────────────────────────────
// Customers are strictly prohibited from cancelling orders at ANY stage.
// All cancellation authority is exclusively reserved for administrators.
// The customer UI replaces all cancel actions with "Contact Support".
router.post("/orders/:id/cancel", authMiddleware, async (_req: AuthRequest, res) => {
  res.status(403).json({
    error: "CUSTOMER_CANCELLATION_FORBIDDEN",
    message: "Order cancellation is not permitted from the customer interface. Please contact support if you need assistance with your order.",
  });
});

router.get("/admin/orders", authMiddleware, adminMiddleware, async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json({ orders });
});

// ─── Admin Order Status — Absolute Override ───────────────────────────────────
// Admin has FULL CRUD authority over all orders at every stage.
// Forward pipeline: pending → confirmed → shipped → delivered
// Admin can also cancel ANY active order at any stage (full override).
// Notification payload is returned for each transition so the mobile app can
// display the appropriate in-app alert to the customer.
const STATUS_PIPELINE = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "🎉 Order Confirmed!",
    body: "Great news, {Customer_Name}! Your order #{Order_ID} has been approved and accepted by our team. We're now preparing your package for dispatch. Track real-time updates inside the app!",
  },
  shipped: {
    title: "📦 Your Order Is On Its Way!",
    body: "Exciting update, {Customer_Name}! Order #{Order_ID} has been shipped via {Courier_Name}. Tracking ID: {Tracking_Number}. Tap here to track your delivery live!",
  },
  tracking_updated: {
    title: "🚚 Delivery Update",
    body: "Hey {Customer_Name}, there's a new update on order #{Order_ID}: {Tracking_Update}. Stay tuned — your package is moving!",
  },
  delivered: {
    title: "✅ Order Delivered!",
    body: "Your order #{Order_ID} has been successfully delivered, {Customer_Name}. Thank you for shopping with us! We'd love your feedback.",
  },
  cancelled: {
    title: "Order Cancelled",
    body: "Hello {Customer_Name}, your order #{Order_ID} has been cancelled by our administration team. If a payment was made, your refund will be processed back to your wallet within the standard timeline. Contact support for any queries.",
  },
};

router.put("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status, courierPartner, trackingNumber, utrNumber, cancellationReason } = req.body;

  if (!STATUS_PIPELINE.includes(status)) {
    res.status(400).json({ error: "Invalid status value." });
    return;
  }

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!orders.length) { res.status(404).json({ error: "Order not found" }); return; }
  const order = orders[0];

  if (order.status === "delivered" || order.status === "cancelled") {
    res.status(400).json({ error: `Order is already ${order.status}. No further updates are possible.` });
    return;
  }

  const currentIdx = STATUS_PIPELINE.indexOf(order.status);
  const newIdx = STATUS_PIPELINE.indexOf(status);

  // Admin can cancel from any active stage (absolute override).
  // For forward progression, enforce linear pipeline (no stage-skipping).
  if (status !== "cancelled" && newIdx !== currentIdx + 1) {
    res.status(400).json({
      error: "INVALID_TRANSITION",
      message: `Cannot move order from '${order.status}' to '${status}'. Follow the pipeline: pending → confirmed → shipped → delivered.`,
    });
    return;
  }

  const updateData: Record<string, any> = { status, updatedAt: new Date() };
  if (status === "shipped" && courierPartner) updateData.courierPartner = courierPartner;
  if (status === "shipped" && trackingNumber) updateData.trackingNumber = trackingNumber;
  if (status === "cancelled" && utrNumber) updateData.utrNumber = utrNumber;
  if (status === "cancelled" && cancellationReason) updateData.cancellationReason = cancellationReason;

  const [updated] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  // Return the notification template so the client can display the in-app alert
  const notification = NOTIFICATION_TEMPLATES[status] ?? null;

  res.json({ order: updated, notification });
});

export default router;
