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

  const storeStatus = await getConfig("store_status");
  if (storeStatus === "off") {
    res.status(503).json({ error: "The store is currently closed. Please check back later." });
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

const LOGO_B64 = "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";

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
  const d = new Date(o.createdAt);
  const dateStr = `${String(d.getDate()).padStart(2,"0")} / ${String(d.getMonth()+1).padStart(2,"0")} / ${d.getFullYear()}`;

  let addrLines: string[] = [];
  if (o.shippingAddress) {
    try {
      const a = JSON.parse(o.shippingAddress) as Record<string, string>;
      addrLines = [a.line1, a.landmark, a.city, a.state, a.pincode].filter(Boolean) as string[];
    } catch { addrLines = [o.shippingAddress]; }
  }

  const unitPrice = o.subtotal / Math.max(o.quantity, 1);
  const taxPct = parseFloat(o.taxPercent) || 0;

  const storeName = o.storeName || "XyloCart";

  let sl = 0;
  const itemRows: string[] = [];
  itemRows.push(`<tr style="background:#fff">
    <td style="padding:12px 14px;border-bottom:1px solid #e8eaf0;font-size:13px;color:#2d3142">${++sl}</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e8eaf0;font-size:13px;color:#2d3142">${o.productName || "Product"}</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e8eaf0;font-size:13px;color:#2d3142;text-align:right">${fmt(unitPrice)}</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e8eaf0;font-size:13px;color:#2d3142;text-align:center">${o.quantity}</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e8eaf0;font-size:13px;color:#2d3142;text-align:right;font-weight:600">${fmt(o.subtotal)}</td>
  </tr>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${invNum}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#2d3142;padding:30px 24px}
  .page{max-width:680px;margin:0 auto;background:#fff}
  .hr{border:none;border-top:1.5px solid #dde1ec;margin:0}
  @media print{body{padding:0}}
</style>
</head>
<body>
<div class="page">

  <!-- TOP HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
    <tr>
      <td style="vertical-align:middle;width:50%">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px">
              <img src="data:image/png;base64,${LOGO_B64}" width="72" height="72" style="display:block;border-radius:50%;border:2px solid #dde1ec" alt="logo"/>
            </td>
            <td style="vertical-align:middle">
              <div style="font-size:20px;font-weight:800;color:#1e2a4a;letter-spacing:-0.3px">${storeName}</div>
              <div style="font-size:11px;color:#7b8299;margin-top:3px">Your Trusted Online Store</div>
            </td>
          </tr>
        </table>
      </td>
      <td style="text-align:right;vertical-align:middle">
        <div style="font-size:44px;font-weight:900;color:#1e2a4a;letter-spacing:-1px;line-height:1">INVOICE</div>
      </td>
    </tr>
  </table>

  <hr class="hr"/>

  <!-- INVOICE TO / INVOICE DETAILS -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr>
      <td style="vertical-align:top;width:55%">
        <div style="font-size:12px;color:#7b8299;font-weight:600;margin-bottom:6px;letter-spacing:0.5px">INVOICE TO</div>
        <div style="font-size:16px;font-weight:700;color:#1e2a4a;margin-bottom:4px">${o.customerName || "Customer"}</div>
        ${addrLines.length ? `<div style="font-size:12px;color:#555b7a;line-height:1.6">${addrLines.join(",<br/>")}</div>` : ""}
        ${o.customerEmail ? `<div style="font-size:12px;color:#555b7a;margin-top:4px">${o.customerEmail}</div>` : ""}
        ${o.customerMobile ? `<div style="font-size:12px;color:#555b7a">${o.customerMobile}</div>` : ""}
      </td>
      <td style="vertical-align:top;text-align:right">
        <table cellpadding="0" cellspacing="0" style="margin-left:auto">
          <tr>
            <td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">Invoice #</td>
            <td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right">${invNum}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">Date</td>
            <td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right">${dateStr}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">Status</td>
            <td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right;text-transform:capitalize">${o.status}</td>
          </tr>
          ${o.courierPartner ? `<tr><td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">Courier</td><td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right">${o.courierPartner}</td></tr>` : ""}
          ${o.trackingNumber ? `<tr><td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">Tracking #</td><td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right">${o.trackingNumber}</td></tr>` : ""}
          ${o.utrNumber ? `<tr><td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 16px 3px 0;white-space:nowrap">UTR No.</td><td style="font-size:12px;color:#1e2a4a;font-weight:700;padding:3px 0;text-align:right">${o.utrNumber}</td></tr>` : ""}
        </table>
      </td>
    </tr>
  </table>

  <hr class="hr"/>

  <!-- ITEMS TABLE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0;border-collapse:collapse">
    <thead>
      <tr style="background:#1e2a4a">
        <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#fff;text-align:left;width:40px">SL.</th>
        <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#fff;text-align:left">Item Description</th>
        <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#fff;text-align:right">Price</th>
        <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#fff;text-align:center">Qty.</th>
        <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#fff;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows.join("")}
    </tbody>
  </table>

  <!-- BOTTOM SECTION: Payment Info + Totals -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
    <tr>
      <!-- PAYMENT INFO -->
      <td style="vertical-align:top;width:55%;padding-right:24px">
        <div style="font-size:14px;font-weight:800;color:#1e2a4a;margin-bottom:10px">Payment Info:</div>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 12px 3px 0;white-space:nowrap">Method:</td>
            <td style="font-size:12px;color:#2d3142;text-transform:capitalize">${o.paymentMethod}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 12px 3px 0;white-space:nowrap">Status:</td>
            <td style="font-size:12px;color:#2d3142;text-transform:capitalize">${o.paymentStatus}</td>
          </tr>
          ${o.utrNumber ? `<tr><td style="font-size:12px;color:#7b8299;font-weight:600;padding:3px 12px 3px 0;white-space:nowrap">UTR Ref:</td><td style="font-size:12px;color:#2d3142">${o.utrNumber}</td></tr>` : ""}
        </table>
      </td>
      <!-- TOTALS -->
      <td style="vertical-align:top">
        <table width="100%" cellpadding="0" cellspacing="4">
          <tr>
            <td style="font-size:13px;color:#7b8299;padding:4px 0">Sub Total:</td>
            <td style="font-size:13px;color:#2d3142;text-align:right;padding:4px 0">${fmt(o.subtotal)}</td>
          </tr>
          ${o.deliveryCharge > 0 ? `<tr><td style="font-size:13px;color:#7b8299;padding:4px 0">Delivery:</td><td style="font-size:13px;color:#2d3142;text-align:right;padding:4px 0">${fmt(o.deliveryCharge)}</td></tr>` : ""}
          <tr>
            <td style="font-size:13px;color:#7b8299;padding:4px 0">Tax (${taxPct}%):</td>
            <td style="font-size:13px;color:#2d3142;text-align:right;padding:4px 0">${fmt(o.taxAmount)}</td>
          </tr>
          ${o.serviceCharge > 0 ? `<tr><td style="font-size:13px;color:#7b8299;padding:4px 0">Service Charge:</td><td style="font-size:13px;color:#2d3142;text-align:right;padding:4px 0">${fmt(o.serviceCharge)}</td></tr>` : ""}
          ${o.maintenanceCharge > 0 ? `<tr><td style="font-size:13px;color:#7b8299;padding:4px 0">Maintenance:</td><td style="font-size:13px;color:#2d3142;text-align:right;padding:4px 0">${fmt(o.maintenanceCharge)}</td></tr>` : ""}
          ${o.discountAmount > 0 ? `<tr><td style="font-size:13px;color:#10b981;padding:4px 0">Discount:</td><td style="font-size:13px;color:#10b981;text-align:right;padding:4px 0">-${fmt(o.discountAmount)}</td></tr>` : ""}
          <tr>
            <td colspan="2" style="padding:4px 0"><hr style="border:none;border-top:1.5px solid #dde1ec"/></td>
          </tr>
          <tr>
            <td style="padding:0">
              <div style="background:#1e2a4a;padding:10px 14px;border-radius:4px 0 0 4px">
                <span style="font-size:14px;font-weight:700;color:#fff">Total:</span>
              </div>
            </td>
            <td style="padding:0;text-align:right">
              <div style="background:#1e2a4a;padding:10px 14px;border-radius:0 4px 4px 0">
                <span style="font-size:14px;font-weight:700;color:#fff">${fmt(o.total)}</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- TERMS -->
  <div style="margin-top:28px;padding-top:16px;border-top:1.5px solid #dde1ec">
    <div style="font-size:13px;font-weight:700;color:#1e2a4a;margin-bottom:6px">Terms &amp; Conditions</div>
    <div style="font-size:11px;color:#7b8299;line-height:1.7">
      All sales are final. Returns and refunds are subject to our return policy. Goods remain the property of ${storeName} until full payment is received. For queries, contact our support team. This is a computer-generated invoice and does not require a physical signature unless stated otherwise.
    </div>
  </div>

  <!-- AUTHORISED SIGN -->
  <div style="margin-top:24px;text-align:right">
    <div style="display:inline-block;border-top:1.5px solid #1e2a4a;padding-top:6px;min-width:160px;text-align:center">
      <div style="font-size:11px;color:#7b8299;font-weight:600">Authorised Sign</div>
      <div style="font-size:12px;font-weight:700;color:#1e2a4a;margin-top:2px">${storeName}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:28px;background:#1e2a4a;border-radius:4px;padding:14px 20px;text-align:center">
    <span style="font-size:13px;font-weight:600;color:#fff;letter-spacing:0.5px">Thank you for your business</span>
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
