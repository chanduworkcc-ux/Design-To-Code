import nodemailer from "nodemailer";
import { getConfig } from "./config";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function getTransporter() {
  const host = await getConfig("smtp_host");
  const port = parseInt(await getConfig("smtp_port")) || 587;
  const user = await getConfig("smtp_user");
  const pass = await getConfig("smtp_pass");
  const secure = (await getConfig("smtp_secure")) === "true";

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const emailEnabled = await getConfig("email_enabled");
  if (emailEnabled !== "true") return;

  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const from = (await getConfig("smtp_from")) || (await getConfig("smtp_user"));
    await transporter.sendMail({
      from: `XyloCart <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  } catch {}
}

export function orderStatusEmailHtml(opts: {
  userName: string;
  orderNumber: string;
  status: string;
  productName: string;
  total: number;
  trackingNumber?: string | null;
  trackingLink?: string | null;
  courierPartner?: string | null;
  estimatedDelivery?: string | null;
}): string {
  const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
    pending:   { label: "Pending",    color: "#F59E0B", emoji: "⏳" },
    confirmed: { label: "Confirmed",  color: "#3B82F6", emoji: "✅" },
    shipped:   { label: "Shipped",    color: "#8B5CF6", emoji: "🚚" },
    delivered: { label: "Delivered",  color: "#10B981", emoji: "🎉" },
    cancelled: { label: "Cancelled",  color: "#EF4444", emoji: "❌" },
    refunded:  { label: "Refunded",   color: "#6B7280", emoji: "💸" },
  };
  const s = statusLabels[opts.status] ?? { label: opts.status, color: "#6B7280", emoji: "📦" };

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1D4ED8;padding:28px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px">XyloCart</h1>
      <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">Order Update</p>
    </div>

    <div style="padding:32px">
      <p style="margin:0 0 16px;color:#374151">Hi <strong>${opts.userName}</strong>,</p>
      <p style="margin:0 0 24px;color:#374151">Your order status has been updated.</p>

      <div style="background:#F9FAFB;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center">
        <div style="font-size:36px;margin-bottom:8px">${s.emoji}</div>
        <div style="display:inline-block;padding:6px 18px;border-radius:20px;background:${s.color};color:#fff;font-size:14px;font-weight:700;letter-spacing:0.5px">
          ${s.label}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Order Number</td><td style="padding:8px 0;color:#111;font-weight:700;text-align:right">${opts.orderNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Product</td><td style="padding:8px 0;color:#111;text-align:right;font-size:13px">${opts.productName}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Total</td><td style="padding:8px 0;color:#1D4ED8;font-weight:700;text-align:right">₹${Number(opts.total).toLocaleString("en-IN")}</td></tr>
        ${opts.courierPartner ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Courier</td><td style="padding:8px 0;color:#111;text-align:right;font-size:13px">${opts.courierPartner}</td></tr>` : ""}
        ${opts.trackingNumber ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Tracking #</td><td style="padding:8px 0;color:#111;text-align:right;font-size:13px">${opts.trackingNumber}</td></tr>` : ""}
        ${opts.estimatedDelivery ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Est. Delivery</td><td style="padding:8px 0;color:#111;text-align:right;font-size:13px">${opts.estimatedDelivery}</td></tr>` : ""}
      </table>

      ${opts.trackingLink ? `<a href="${opts.trackingLink}" style="display:block;text-align:center;background:#1D4ED8;color:#fff;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;margin-bottom:20px">Track Your Order</a>` : ""}
    </div>

    <div style="background:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB">
      <p style="margin:0;color:#9CA3AF;font-size:12px">© ${new Date().getFullYear()} XyloCart. All rights reserved.</p>
      <p style="margin:4px 0 0;color:#9CA3AF;font-size:11px">You received this email because you placed an order with us.</p>
    </div>
  </div>
</body>
</html>`;
}

export function fraudAlertEmailHtml(opts: {
  suspiciousEmail: string;
  suspiciousName: string;
  matchType: "ip" | "device";
  matchValue: string;
  existingEmail: string;
  registrationTime: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#DC2626;padding:20px 28px">
      <h2 style="color:#fff;margin:0">🚨 Fraud Alert — XyloCart Admin</h2>
    </div>
    <div style="padding:28px">
      <p style="color:#374151">Multiple accounts detected from the same <strong>${opts.matchType === "ip" ? "IP address" : "device"}</strong>.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#FEF2F2"><td style="padding:10px;color:#991B1B;font-weight:700">New Account</td><td style="padding:10px">${opts.suspiciousName} (${opts.suspiciousEmail})</td></tr>
        <tr><td style="padding:10px;color:#6B7280">Match Type</td><td style="padding:10px;font-weight:600">${opts.matchType === "ip" ? "IP Address" : "Device ID"}: <code>${opts.matchValue}</code></td></tr>
        <tr style="background:#FEF2F2"><td style="padding:10px;color:#991B1B">Existing Account</td><td style="padding:10px">${opts.existingEmail}</td></tr>
        <tr><td style="padding:10px;color:#6B7280">Detected At</td><td style="padding:10px">${opts.registrationTime}</td></tr>
      </table>
      <p style="color:#6B7280;font-size:13px;margin-top:20px">Please review this account in the admin panel and take appropriate action (suspend or ban if fraudulent).</p>
    </div>
  </div>
</body>
</html>`;
}
