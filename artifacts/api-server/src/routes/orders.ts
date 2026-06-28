import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, usersTable, couponsTable, referralsTable, walletTransactionsTable, orderSequencesTable } from "@workspace/db/schema";
import { adminAuditLogsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getConfig } from "../lib/config";
import { getIO } from "../lib/socket";
import { insertAutoNotification } from "./notifications";
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

  const activeGateway = await getConfig("active_payment_gateway");
  const effectiveGateway = activeGateway || "cod";

  if (paymentMethod !== effectiveGateway) {
    const labels: Record<string, string> = { cod: "Cash on Delivery", razorpay: "Razorpay", phonepe: "PhonePe" };
    res.status(400).json({ error: `Only ${labels[effectiveGateway] ?? effectiveGateway} is currently accepted. Please select the correct payment method.` });
    return;
  }

  if (paymentMethod === "cod") {
    const codEnabled = await getConfig("cod_enabled");
    if (codEnabled === "false") { res.status(400).json({ error: "Cash on Delivery is currently unavailable." }); return; }
  }

  if (paymentMethod === "razorpay") {
    const razorpayEnabled = await getConfig("razorpay_enabled");
    if (razorpayEnabled !== "true") { res.status(400).json({ error: "Razorpay payments are not currently available." }); return; }
  }

  if (paymentMethod === "phonepe") {
    const phonepeEnabled = await getConfig("phonepe_enabled");
    if (phonepeEnabled !== "true") { res.status(400).json({ error: "PhonePe payments are not currently available." }); return; }
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

  // Sync mobile number from shipping form to user profile so SMS notifications work
  try {
    const addrObj = JSON.parse(shippingAddress);
    const mobile = (addrObj.mobile ?? "").replace(/\D/g, "");
    if (mobile.length >= 10) {
      await db.update(usersTable)
        .set({ mobileNumber: mobile })
        .where(eq(usersTable.id, req.userId!));
    }
  } catch {}

  try {
    getIO().to("admins").emit("new_order", {
      order,
      message: `New order ${orderNumber} placed`,
    });
  } catch {}

  res.status(201).json({ order, breakdown: { subtotal, deliveryCharge, taxAmount, serviceCharge, maintenanceCharge, discountAmount, total } });
});

router.get("/orders", authMiddleware, async (req: AuthRequest, res) => {
  const rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      productId: ordersTable.productId,
      productName: productsTable.name,
      productImage: productsTable.imageUrl,
      userId: ordersTable.userId,
      couponId: ordersTable.couponId,
      quantity: ordersTable.quantity,
      status: ordersTable.status,
      isLocked: ordersTable.isLocked,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge,
      taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge,
      maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount,
      total: ordersTable.total,
      shippingAddress: ordersTable.shippingAddress,
      courierPartner: ordersTable.courierPartner,
      trackingNumber: ordersTable.trackingNumber,
      utrNumber: ordersTable.utrNumber,
      cancellationReason: ordersTable.cancellationReason,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));
  res.json({ orders: rows });
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
  const rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      productId: ordersTable.productId,
      productName: productsTable.name,
      productImage: productsTable.imageUrl,
      userId: ordersTable.userId,
      customerName: usersTable.name,
      customerEmail: usersTable.email,
      customerMobile: usersTable.mobileNumber,
      couponId: ordersTable.couponId,
      quantity: ordersTable.quantity,
      status: ordersTable.status,
      isLocked: ordersTable.isLocked,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge,
      taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge,
      maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount,
      total: ordersTable.total,
      shippingAddress: ordersTable.shippingAddress,
      courierPartner: ordersTable.courierPartner,
      trackingNumber: ordersTable.trackingNumber,
      utrNumber: ordersTable.utrNumber,
      cancellationReason: ordersTable.cancellationReason,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json({ orders: rows });
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
const STATUS_PIPELINE = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    confirmed: "check-circle",
    shipped: "package",
    delivered: "check-square",
    cancelled: "x-circle",
  };
  return icons[status] ?? "bell";
}

const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "🎉 Order Confirmed!",
    body: "Great news, {Customer_Name}! Your order #{Order_ID} has been approved and accepted by our team. We're now preparing your package for dispatch. Track real-time updates inside the app!",
  },
  packed: {
    title: "📦 Order Packed!",
    body: "Hey {Customer_Name}! Your order #{Order_ID} has been packed and is ready for dispatch. It will be handed over to our courier partner shortly. Stay tuned!",
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
      message: `Cannot move order from '${order.status}' to '${status}'. Follow the pipeline: pending → confirmed → packed → shipped → delivered.`,
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

  // ── Push notification + in-app notification ───────────────────────────────
  const template = NOTIFICATION_TEMPLATES[status] ?? null;
  if (template) {
    try {
      const [customer] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, order.userId));

      const customerName = customer?.name ?? "Customer";
      const filledTitle = template.title;
      const filledBody = template.body
        .replace(/{Customer_Name}/g, customerName)
        .replace(/{Order_ID}/g, order.orderNumber ?? order.id.slice(0, 8).toUpperCase())
        .replace(/{Courier_Name}/g, courierPartner ?? "our courier")
        .replace(/{Tracking_Number}/g, trackingNumber ?? "N/A")
        .replace(/{Tracking_Update}/g, "Your package is on its way");

      await insertAutoNotification(order.userId, filledTitle, filledBody, getStatusIcon(status));
    } catch {}
  }

  // ── Real-time socket push to customer ────────────────────────────────────
  try {
    getIO().to(`user:${order.userId}`).emit("order_update", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      isLocked: willLock,
      notification: template,
    });
  } catch {}

  res.json({ order: updated, notification: template });
});

function fmt(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildInvoiceHtml(o: {
  orderNumber: string | null; id: string; createdAt: Date | string;
  status: string; paymentMethod: string; paymentStatus: string;
  productName: string | null; quantity: number;
  subtotal: number; deliveryCharge: number; taxAmount: number;
  serviceCharge: number; maintenanceCharge: number; discountAmount: number; total: number;
  shippingAddress: string | null; courierPartner: string | null; trackingNumber: string | null;
  utrNumber?: string | null;
  customerName: string | null; customerEmail: string | null; customerMobile: string | null;
  storeName: string; taxPercent: string;
}): string {
  const invNum = o.orderNumber ? `INV-${o.orderNumber}` : `INV-${o.id.slice(0, 8).toUpperCase()}`;
  const date = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  let addrHtml = "";
  if (o.shippingAddress) {
    try {
      const a = JSON.parse(o.shippingAddress) as Record<string, string>;
      addrHtml = [a.line1, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", ");
    } catch { addrHtml = o.shippingAddress; }
  }

  const rows = [
    ["Item Price", fmt(o.subtotal)],
    o.deliveryCharge > 0 ? ["Delivery Charge", fmt(o.deliveryCharge)] : null,
    o.taxAmount > 0 ? [`GST (${o.taxPercent}%)`, fmt(o.taxAmount)] : null,
    o.serviceCharge > 0 ? ["Service Charge", fmt(o.serviceCharge)] : null,
    o.maintenanceCharge > 0 ? ["Maintenance Charge", fmt(o.maintenanceCharge)] : null,
    o.discountAmount > 0 ? ["Discount", `<span style="color:#10B981">-${fmt(o.discountAmount)}</span>`] : null,
  ].filter(Boolean) as [string, string][];

  const statusColors: Record<string, string> = {
    pending: "#F59E0B", confirmed: "#3B82F6", packed: "#F97316",
    shipped: "#8B5CF6", delivered: "#10B981", cancelled: "#EF4444",
  };
  const statusColor = statusColors[o.status] ?? "#6B7280";
  const statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${invNum}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1F2937;background:#fff;padding:32px}
  .invoice{max-width:680px;margin:0 auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{color:#fff}
  .brand-name{font-size:26px;font-weight:800;letter-spacing:-0.5px}
  .brand-sub{font-size:12px;opacity:0.75;margin-top:4px}
  .inv-meta{text-align:right;color:#fff}
  .inv-meta h1{font-size:16px;font-weight:700;letter-spacing:2px;opacity:0.85;text-transform:uppercase}
  .inv-meta .inv-num{font-size:22px;font-weight:800;margin-top:4px}
  .inv-meta .inv-date{font-size:12px;opacity:0.75;margin-top:4px}
  .status-bar{background:#F9FAFB;padding:12px 32px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #E5E7EB}
  .status-pill{padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:${statusColor}}
  .status-label{font-size:12px;color:#6B7280}
  .body{padding:28px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#9CA3AF;text-transform:uppercase;margin-bottom:8px}
  .info-val{font-size:14px;color:#1F2937;line-height:1.6}
  .info-val strong{font-weight:700}
  table{width:100%;border-collapse:collapse;margin:0 32px 0 32px;width:calc(100% - 64px)}
  thead tr{background:#F3F4F6}
  th{padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.5px;color:#6B7280;text-align:left;text-transform:uppercase}
  th:last-child{text-align:right}
  td{padding:12px;font-size:13px;color:#1F2937;border-bottom:1px solid #F3F4F6}
  td:last-child{text-align:right;font-weight:600}
  .totals{margin:0 32px 28px 32px;background:#F9FAFB;border-radius:8px;padding:16px}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#6B7280}
  .total-row.grand{border-top:2px solid #E5E7EB;margin-top:8px;padding-top:12px;font-size:16px;font-weight:800;color:#1F2937}
  .footer{background:#F3F4F6;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #E5E7EB}
  .footer-note{font-size:11px;color:#9CA3AF}
  .footer-brand{font-size:13px;font-weight:700;color:#2563EB}
  @media print{body{padding:0}.invoice{border:none;border-radius:0}}
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="brand">
      <div class="brand-name">${o.storeName || "XyloCart"}</div>
      <div class="brand-sub">Official Store Receipt</div>
    </div>
    <div class="inv-meta">
      <h1>Tax Invoice</h1>
      <div class="inv-num">${invNum}</div>
      <div class="inv-date">${date}</div>
    </div>
  </div>

  <div class="status-bar">
    <span class="status-pill">${statusLabel}</span>
    <span class="status-label">Order Status · Payment: ${o.paymentMethod.toUpperCase()} · ${o.paymentStatus.toUpperCase()}</span>
  </div>

  <div class="body">
    <div>
      <div class="section-title">Billed To</div>
      <div class="info-val">
        <strong>${o.customerName || "Customer"}</strong><br/>
        ${o.customerEmail ? o.customerEmail + "<br/>" : ""}
        ${o.customerMobile ? o.customerMobile + "<br/>" : ""}
        ${addrHtml ? addrHtml : ""}
      </div>
    </div>
    <div>
      <div class="section-title">Order Details</div>
      <div class="info-val">
        <strong>Order #:</strong> ${o.orderNumber ?? o.id.slice(0, 8).toUpperCase()}<br/>
        <strong>Quantity:</strong> ${o.quantity}<br/>
        ${o.courierPartner ? `<strong>Courier:</strong> ${o.courierPartner}<br/>` : ""}
        ${o.trackingNumber ? `<strong>Tracking:</strong> ${o.trackingNumber}<br/>` : ""}
        ${o.utrNumber ? `<strong>UTR No.:</strong> ${o.utrNumber}<br/>` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${o.productName || "Product"}</td>
        <td>${o.quantity}</td>
        <td>${fmt(o.subtotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals" style="margin-top:16px">
    ${rows.map(([l, v]) => `<div class="total-row"><span>${l}</span><span>${v}</span></div>`).join("")}
    <div class="total-row grand"><span>Total Paid</span><span>${fmt(o.total)}</span></div>
  </div>

  <div class="footer">
    <div class="footer-note">Thank you for your order! Keep this invoice for your records.</div>
    <div class="footer-brand">${o.storeName || "XyloCart"}</div>
  </div>
</div>
</body>
</html>`;
}

router.get("/orders/:id/invoice", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: ordersTable.id, orderNumber: ordersTable.orderNumber,
      createdAt: ordersTable.createdAt, status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod, paymentStatus: ordersTable.paymentStatus,
      productName: productsTable.name,
      quantity: ordersTable.quantity, subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge, taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge, maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount, total: ordersTable.total,
      shippingAddress: ordersTable.shippingAddress,
      courierPartner: ordersTable.courierPartner, trackingNumber: ordersTable.trackingNumber,
      utrNumber: ordersTable.utrNumber,
      customerName: usersTable.name, customerEmail: usersTable.email, customerMobile: usersTable.mobileNumber,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.id, req.params.id));

    if (!rows.length || rows[0].id !== req.params.id) { res.status(404).json({ error: "Order not found" }); return; }
    const o = rows[0] as any;
    if (o.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [taxPercent] = await Promise.all([getConfig("tax_percent")]);
    const html = buildInvoiceHtml({ ...o, storeName: "XyloCart", taxPercent });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch { res.status(500).json({ error: "Failed to generate invoice" }); }
});

router.get("/admin/orders/:id/invoice", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: ordersTable.id, orderNumber: ordersTable.orderNumber,
      createdAt: ordersTable.createdAt, status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod, paymentStatus: ordersTable.paymentStatus,
      productName: productsTable.name,
      quantity: ordersTable.quantity, subtotal: ordersTable.subtotal,
      deliveryCharge: ordersTable.deliveryCharge, taxAmount: ordersTable.taxAmount,
      serviceCharge: ordersTable.serviceCharge, maintenanceCharge: ordersTable.maintenanceCharge,
      discountAmount: ordersTable.discountAmount, total: ordersTable.total,
      shippingAddress: ordersTable.shippingAddress,
      courierPartner: ordersTable.courierPartner, trackingNumber: ordersTable.trackingNumber,
      utrNumber: ordersTable.utrNumber,
      customerName: usersTable.name, customerEmail: usersTable.email, customerMobile: usersTable.mobileNumber,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.id, req.params.id));

    if (!rows.length) { res.status(404).json({ error: "Order not found" }); return; }
    const o = rows[0] as any;
    const taxPercent = await getConfig("tax_percent");
    const html = buildInvoiceHtml({ ...o, storeName: "XyloCart", taxPercent });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch { res.status(500).json({ error: "Failed to generate invoice" }); }
});

router.get("/orders/track/:orderRef", async (req, res) => {
  const raw = (req.params.orderRef ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (raw.length < 6) {
    res.status(400).json({ error: "Please enter at least 6 characters of the Order ID." });
    return;
  }
  try {
    const found = await db.select({
      id: ordersTable.id,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      total: ordersTable.total,
    }).from(ordersTable)
      .where(sql`UPPER(LEFT(${ordersTable.id}::text, 8)) = ${raw}`)
      .limit(1);

    if (!found.length) {
      res.status(404).json({ error: "No order found with that ID. Please check the ID and try again." });
      return;
    }
    const o = found[0];
    res.json({
      id: o.id,
      displayId: o.id.slice(0, 8).toUpperCase(),
      status: o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      total: o.total,
    });
  } catch {
    res.status(500).json({ error: "Failed to look up order." });
  }
});

export default router;
