import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, usersTable, couponsTable, referralsTable, walletTransactionsTable, orderSequencesTable } from "@workspace/db/schema";
import { adminAuditLogsTable } from "@workspace/db/schema";
import { eq, desc, sql, and, not } from "drizzle-orm";
import { sendEmail, orderStatusEmailHtml } from "../lib/email";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { getIO } from "../lib/socket";
import { insertAutoNotification } from "./notifications";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const key = `order-${year}`;

  const [row] = await db
    .insert(orderSequencesTable)
    .values({ month: key, lastVal: 1 })
    .onConflictDoUpdate({
      target: orderSequencesTable.month,
      set: { lastVal: sql`${orderSequencesTable.lastVal} + 1` },
    })
    .returning();

  return `#E${year}-${String(row.lastVal).padStart(3, "0")}`;
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

// ─── Public order tracking (no auth required) ────────────────────────────────

router.get("/orders/track/:query", async (req, res) => {
  const query = req.params.query.trim().toUpperCase();
  if (!query || query.length < 6) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  // Match by orderNumber suffix (e.g. "E2026001") or raw UUID prefix
  const [order] = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      total: ordersTable.total,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .where(
      sql`upper(replace(replace(${ordersTable.orderNumber}, '#', ''), '-', '')) = ${query}
        OR upper(left(${ordersTable.id}::text, 8)) = ${query.slice(0, 8)}`
    )
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found. Please check the Order ID and try again." });
    return;
  }

  res.json({
    id: order.id,
    displayId: order.orderNumber
      ? order.orderNumber.replace("#", "")
      : order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});

// ─── Track page view ─────────────────────────────────────────────────────────
import { activityLogsTable } from "@workspace/db/schema";

router.post("/track/pageview", authMiddleware, async (req: AuthRequest, res) => {
  const { screen } = req.body;
  if (!screen) { res.status(400).json({ error: "screen required" }); return; }
  try {
    await db.insert(activityLogsTable).values({
      id: uuidv4(),
      userId: req.userId ?? null,
      path: `screen:${screen}`,
      method: "PAGEVIEW",
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
  } catch {}
  res.json({ ok: true });
});

// ─── User Orders ──────────────────────────────────────────────────────────────

router.get("/orders", authMiddleware, async (req: AuthRequest, res) => {
  const orders = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      productId: ordersTable.productId,
      productName: productsTable.name,
      productImage: productsTable.imageUrl,
      status: ordersTable.status,
      isLocked: ordersTable.isLocked,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      total: ordersTable.total,
      subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge,
      taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge,
      maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount,
      quantity: ordersTable.quantity,
      shippingAddress: ordersTable.shippingAddress,
      couponId: ordersTable.couponId,
      courierPartner: ordersTable.courierPartner,
      trackingNumber: ordersTable.trackingNumber,
      trackingLink: ordersTable.trackingLink,
      estimatedDelivery: ordersTable.estimatedDelivery,
      cancellationReason: ordersTable.cancellationReason,
      utrNumber: ordersTable.utrNumber,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));

  res.json({ orders });
});

router.post("/orders", authMiddleware, async (req: AuthRequest, res) => {
  const storeStatus = await getConfig("store_status");
  if (storeStatus === "off") {
    res.status(503).json({ error: "The store is currently closed and not accepting new orders. Please check back later." });
    return;
  }

  const orderSchema = z.object({
    productId: z.string().uuid(),
    paymentMethod: z.enum(["cod", "razorpay", "phonepe"]),
    couponCode: z.string().optional(),
    shippingAddress: z.record(z.string(), z.unknown()).optional(),
    items: z.array(z.object({ id: z.string(), quantity: z.number() })).optional(),
  });

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order data", details: parsed.error.issues });
    return;
  }

  const { productId, paymentMethod, couponCode, shippingAddress } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  if (!product.isActive || product.stock <= 0) {
    res.status(400).json({ error: "This product is currently out of stock or unavailable." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // ─── One-time purchase limit per user per product ─────────────────────────
  const existingOrder = await db
    .select({ id: ordersTable.id, status: ordersTable.status })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, req.userId!),
        eq(ordersTable.productId, productId),
        not(eq(ordersTable.status, "cancelled"))
      )
    )
    .limit(1);

  if (existingOrder.length > 0) {
    res.status(409).json({
      error: "purchase_limit_exceeded",
      message: "You have already purchased this product. Each product can only be purchased once per account. This policy exists to ensure fair access for all customers.",
    });
    return;
  }

  const deliveryChargeStr = await getConfig("delivery_charge");
  const taxPercentStr = await getConfig("tax_percent");
  const serviceChargeStr = await getConfig("service_charge");
  const maintenanceChargeStr = await getConfig("maintenance_charge");

  const deliveryCharge = parseFloat(deliveryChargeStr) || 0;
  const taxPercent = parseFloat(taxPercentStr) || 0;
  const serviceCharge = parseFloat(serviceChargeStr) || 0;
  const maintenanceCharge = parseFloat(maintenanceChargeStr) || 0;

  const subtotal = product.price;
  const taxAmount = (subtotal * taxPercent) / 100;

  let discountAmount = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode.toUpperCase()));
    if (coupon && coupon.isActive) {
      const now = new Date();
      const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
      const isValid = !expiresAt || now <= expiresAt;
      if (isValid && (!coupon.usageLimit || (coupon.usedCount ?? 0) < coupon.usageLimit)) {
        if (coupon.discountType === "percent") {
          discountAmount = (subtotal * coupon.discountValue) / 100;
        } else {
          discountAmount = Math.min(coupon.discountValue, subtotal);
        }
        couponId = coupon.id;
        await db.update(couponsTable).set({ usedCount: sql`${couponsTable.usedCount} + 1` }).where(eq(couponsTable.id, coupon.id));
      }
    }
  }

  const total = subtotal + deliveryCharge + taxAmount + serviceCharge + maintenanceCharge - discountAmount;
  const shippingAddressStr = shippingAddress ? JSON.stringify(shippingAddress) : null;
  const orderNumber = await generateOrderNumber();

  const [order] = await db.insert(ordersTable).values({
    id: uuidv4(),
    orderNumber,
    userId: req.userId!,
    productId,
    couponId,
    quantity: 1,
    status: "pending",
    paymentMethod,
    paymentStatus: "pending",
    subtotal,
    deliveryCharge,
    taxAmount,
    serviceCharge,
    maintenanceCharge,
    discountAmount,
    total,
    shippingAddress: shippingAddressStr,
  }).returning();

  await db.update(productsTable)
    .set({ stock: sql`${productsTable.stock} - 1` })
    .where(eq(productsTable.id, productId));

  try {
    const [referral] = await db.select().from(referralsTable).where(eq(referralsTable.refereeId, req.userId!));
    if (referral) {
      const referralCoinsStr = await getConfig("referral_coins");
      const referralCoins = parseInt(referralCoinsStr) || 100;
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, referral.referrerId));
      if (referrer) {
        await db.update(usersTable).set({ walletBalance: referrer.walletBalance + referralCoins }).where(eq(usersTable.id, referral.referrerId));
        await db.insert(walletTransactionsTable).values({
          id: uuidv4(), userId: referral.referrerId, type: "credit", coins: referralCoins,
          description: `Referral reward — ${user.name} placed their first order`, referenceId: order.id,
        });
        await db.update(referralsTable).set({ coinsAwarded: referral.coinsAwarded + referralCoins }).where(eq(referralsTable.id, referral.id));
      }
    }
  } catch {}

  try {
    await insertAutoNotification(req.userId!, "Order Placed! 🎉", `Your order ${orderNumber} has been placed successfully. We'll update you as it progresses.`, "shopping-bag", { targetType: "order", orderNumber });
  } catch {}

  try {
    getIO().to("admins").emit("new_order", { order, message: `New order ${orderNumber} — ₹${total.toFixed(0)}` });
  } catch {}

  // Send order confirmation email to user
  try {
    const emailHtml = orderStatusEmailHtml({
      userName: user.name,
      orderNumber,
      status: "pending",
      productName: product.name,
      total,
    });
    await sendEmail({ to: user.email, subject: `Order Confirmed: ${orderNumber} — XyloCart`, html: emailHtml });
  } catch {}

  res.status(201).json({
    order,
    breakdown: { subtotal, deliveryCharge, taxAmount, serviceCharge, maintenanceCharge, discountAmount, total },
  });
});

router.get("/orders/:id/invoice", authMiddleware, async (req: AuthRequest, res) => {
  const [order] = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      total: ordersTable.total,
      subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge,
      taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge,
      maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount,
      quantity: ordersTable.quantity,
      shippingAddress: ordersTable.shippingAddress,
      createdAt: ordersTable.createdAt,
      productName: productsTable.name,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.id, req.params.id as string));

  if (!order || (order as any).userId !== req.userId && req.userRole !== "admin") {
    res.status(404).json({ error: "Order not found" }); return;
  }

  const address = (() => { try { return JSON.parse(order.shippingAddress ?? "{}"); } catch { return {}; } })();
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a}
  .header{text-align:center;border-bottom:2px solid #2563EB;padding-bottom:20px;margin-bottom:20px}
  .title{font-size:24px;color:#2563EB;font-weight:bold}
  .label{color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
  .value{font-size:14px;font-weight:600}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
  .total-row{display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:bold;color:#2563EB}
  .section{margin:16px 0;padding:16px;background:#f8f9fa;border-radius:8px}
  </style></head><body>
  <div class="header">
    <div class="title">XyloCart</div>
    <div style="font-size:12px;color:#6B7280;margin-top:4px">Invoice</div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div><div class="label">Order ID</div><div class="value">${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}</div></div>
    <div><div class="label">Date</div><div class="value">${orderDate}</div></div>
  </div>
  <div class="section">
    <div class="label">Bill To</div>
    <div style="margin-top:8px">
      <div class="value">${order.userName ?? "Customer"}</div>
      <div style="font-size:13px;color:#6B7280">${order.userEmail ?? ""}</div>
      ${address.line1 ? `<div style="font-size:13px;color:#6B7280;margin-top:4px">${address.line1}${address.city ? ", " + address.city : ""}${address.state ? ", " + address.state : ""}${address.pincode ? " - " + address.pincode : ""}</div>` : ""}
    </div>
  </div>
  <div class="section">
    <div class="label">Items</div>
    <div class="row" style="margin-top:8px">
      <div>${order.productName ?? "Product"} × ${order.quantity}</div>
      <div>₹${Number(order.subtotal).toLocaleString("en-IN")}</div>
    </div>
  </div>
  <div class="section">
    ${order.deliveryCharge > 0 ? `<div class="row"><div>Delivery Charge</div><div>₹${Number(order.deliveryCharge).toLocaleString("en-IN")}</div></div>` : ""}
    ${order.taxAmount > 0 ? `<div class="row"><div>Tax (GST)</div><div>₹${Number(order.taxAmount).toLocaleString("en-IN")}</div></div>` : ""}
    ${order.serviceCharge > 0 ? `<div class="row"><div>Service Charge</div><div>₹${Number(order.serviceCharge).toLocaleString("en-IN")}</div></div>` : ""}
    ${order.maintenanceCharge > 0 ? `<div class="row"><div>Maintenance Charge</div><div>₹${Number(order.maintenanceCharge).toLocaleString("en-IN")}</div></div>` : ""}
    ${order.discountAmount > 0 ? `<div class="row"><div style="color:#10B981">Discount</div><div style="color:#10B981">-₹${Number(order.discountAmount).toLocaleString("en-IN")}</div></div>` : ""}
    <div class="total-row"><div>Total</div><div>₹${Number(order.total).toLocaleString("en-IN")}</div></div>
  </div>
  <div style="text-align:center;margin-top:30px;color:#9CA3AF;font-size:12px">
    Payment Method: ${order.paymentMethod.toUpperCase()} · Status: ${order.status.toUpperCase()}<br>
    Thank you for shopping with XyloCart!
  </div>
  </body></html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
