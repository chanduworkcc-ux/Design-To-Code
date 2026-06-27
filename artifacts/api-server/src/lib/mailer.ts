import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const appName = "XyloCart";
  const resetLink = `xylocart://reset-password?token=${token}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
      <h2 style="color:#1e293b;margin-bottom:4px;">${appName}</h2>
      <p style="color:#64748b;margin-top:0;">Password Reset Request</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#334155;">Hi ${name},</p>
      <p style="color:#334155;">We received a request to reset your password. Enter the code below in the app:</p>
      <div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;background:#1e293b;color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:12px;">${token}</span>
      </div>
      <p style="color:#64748b;font-size:13px;">This code expires in <strong>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} ${appName}</p>
    </div>
  `;

  const transport = createTransport();

  if (!transport) {
    logger.warn({ token }, `[SMTP not configured] Reset code for ${to}`);
    return;
  }

  await transport.sendMail({
    from: `"${appName}" <${process.env.SMTP_USER}>`,
    to,
    subject: `Your ${appName} password reset code`,
    html,
  });

  logger.info(`Password reset email sent to ${to}`);
}
