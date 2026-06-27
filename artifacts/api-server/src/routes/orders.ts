import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, usersTable, couponsTable, referralsTable, walletTransactionsTable, orderSequencesTable } from "@workspace/db/schema";
import { adminAuditLogsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { getIO } from "../lib/socket";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [row] = await db
    .insert(orderSequencesTable)
    .values({ month, lastVal: 1 })
    .onConflictDoUpdate({
      target: orderSequencesTable.month,
      set: { lastVal: sql`${orderSequencesTable.lastVal} + 1` },
    })
    .returning();

  return `${month}-${String(row.lastVal).padStart(4, "0")}`;
}

async function writeAuditLog(opts: {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  notes?: string;
}): Promise<void> {
  try {
    await db.insert(adminAuditLogsTable).values({
      id: uuidv4(),
      adminId: opts.adminId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      previousState: opts.previousState ? JSON.stringify(opts.previousState) : null,
      newState: opts.newState ? JSON.stringify(opts.newState) : null,
      notes: opts.notes ?? null,
    });
  } catch {}
}

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

  const hasActiveOrder = existingOrders.some((o) => o.status !== "cancelled");
  if (hasActiveOrder) {
    res.status(400).json({ error: "You already have an order. Only one order per account is allowed." });
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
  const orderNumber = await generateOrderNumber();

  const [order] = await db.insert(ordersTable).values({
    id: uuidv4(),
    orderNumber,
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

  try {
    getIO().to("admins").emit("new_order", {
      order,
      message: `New order ${orderNumber} placed`,
    });
  } catch {}

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

router.get("/admin/audit-logs", authMiddleware, adminMiddleware, async (_req, res) => {
  const logs = await db.select().from(adminAuditLogsTable).orderBy(desc(adminAuditLogsTable.createdAt)).limit(200);
  res.json({ logs });
});

// ─── Admin Order Status — Absolute Override ───────────────────────────────────
// Admin has FULL authority over all orders at every stage.
// Forward pipeline: pending → confirmed → shipped → delivered
// Admin can cancel any active order.
// Once an order reaches "delivered" or "cancelled", isLocked = true — no further updates.
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

router.put("/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const { status, courierPartner, trackingNumber, utrNumber, cancellationReason } = req.body;

  if (!STATUS_PIPELINE.includes(status)) {
    res.status(400).json({ error: "Invalid status value." });
    return;
  }

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!orders.length) { res.status(404).json({ error: "Order not found" }); return; }
  const order = orders[0];

  // ── Immutable lock check ────────────────────────────────────────────────────
  if (order.isLocked) {
    res.status(409).json({
      error: "ORDER_LOCKED",
      message: `Order ${order.orderNumber ?? order.id} is locked (${order.status}). No further updates are permitted. All changes are permanently recorded in the audit log.`,
    });
    return;
  }

  const currentIdx = STATUS_PIPELINE.indexOf(order.status);
  const newIdx = STATUS_PIPELINE.indexOf(status);

  if (status !== "cancelled" && newIdx !== currentIdx + 1) {
    res.status(400).json({
      error: "INVALID_TRANSITION",
      message: `Cannot move order from '${order.status}' to '${status}'. Follow the pipeline: pending → confirmed → shipped → delivered.`,
    });
    return;
  }

  const terminalStatuses = ["delivered", "cancelled"];
  const willLock = terminalStatuses.includes(status);

  const updateData: Record<string, any> = {
    status,
    isLocked: willLock,
    updatedAt: new Date(),
  };
  if (status === "shipped" && courierPartner) updateData.courierPartner = courierPartner;
  if (status === "shipped" && trackingNumber) updateData.trackingNumber = trackingNumber;
  if (status === "cancelled" && utrNumber) updateData.utrNumber = utrNumber;
  if (status === "cancelled" && cancellationReason) updateData.cancellationReason = cancellationReason;

  const [updated] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  // Write audit log entry
  await writeAuditLog({
    adminId: req.userId!,
    action: "ORDER_STATUS_UPDATE",
    entityType: "order",
    entityId: order.id,
    previousState: { status: order.status, isLocked: order.isLocked },
    newState: { status, isLocked: willLock, courierPartner, trackingNumber },
    notes: cancellationReason ?? undefined,
  });

  // ── Referral reward: fire when order is delivered ─────────────────────────
  if (status === "delivered") {
    const [pendingReferral] = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.refereeId, order.userId))
      .limit(1);

    if (pendingReferral && !pendingReferral.rewardedAt) {
      const coins = pendingReferral.coinsAwarded;
      const referrerId = pendingReferral.referrerId;

      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, referrerId));
      if (referrer) {
        await db.update(usersTable)
          .set({ walletBalance: (referrer.walletBalance || 0) + coins })
          .where(eq(usersTable.id, referrerId));

        await db.insert(walletTransactionsTable).values({
          id: uuidv4(),
          userId: referrerId,
          type: "credit",
          coins,
          description: `Referral reward — your referral's order ${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()} was delivered`,
          referenceId: order.id,
        });

        await db.update(referralsTable)
          .set({ rewardedAt: new Date() })
          .where(eq(referralsTable.id, pendingReferral.id));
      }
    }
  }

  // ── Real-time push to customer ────────────────────────────────────────────
  try {
    const notification = NOTIFICATION_TEMPLATES[status] ?? null;
    getIO().to(`user:${order.userId}`).emit("order_update", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      isLocked: willLock,
      notification,
    });
  } catch {}

  const notification = NOTIFICATION_TEMPLATES[status] ?? null;
  res.json({ order: updated, notification });
});

export default router;
