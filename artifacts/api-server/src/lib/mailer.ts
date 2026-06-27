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

const APP_NAME = "XyloCart";
const FROM = `"${APP_NAME}" <${process.env.SMTP_USER ?? "noreply@xyloscart.com"}>`;

function baseTemplate(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
      <h2 style="color:#1e293b;margin-bottom:4px;">${APP_NAME}</h2>
      <p style="color:#64748b;margin-top:0;">${title}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      ${body}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME}</p>
    </div>
  `;
}

async function sendMail(to: string, subject: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    logger.warn({ to, subject }, `[SMTP not configured] Email suppressed`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html });
  logger.info(`Email sent to ${to}: ${subject}`);
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const html = baseTemplate("Verify your email address", `
    <p style="color:#334155;">Hi ${name},</p>
    <p style="color:#334155;">Welcome to ${APP_NAME}! Use the code below to verify your email address:</p>
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;background:#1e293b;color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:12px;">${code}</span>
    </div>
    <p style="color:#64748b;font-size:13px;">This code expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
  `);
  await sendMail(to, `Verify your ${APP_NAME} account`, html);
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const html = baseTemplate("Password Reset Request", `
    <p style="color:#334155;">Hi ${name},</p>
    <p style="color:#334155;">We received a request to reset your password. Enter the code below in the app:</p>
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;background:#1e293b;color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:12px;">${token}</span>
    </div>
    <p style="color:#64748b;font-size:13px;">This code expires in <strong>15 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
  `);
  await sendMail(to, `Your ${APP_NAME} password reset code`, html);
}

export async function sendApprovalEmail(to: string, name: string) {
  const html = baseTemplate("Account Approved! 🎉", `
    <p style="color:#334155;">Hi ${name},</p>
    <p style="color:#334155;">Great news — your ${APP_NAME} account has been approved by our team. You can now sign in and start shopping!</p>
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;background:#10B981;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;">Welcome to ${APP_NAME}</span>
    </div>
  `);
  await sendMail(to, `Your ${APP_NAME} account is approved!`, html);
}

export async function sendRejectionEmail(to: string, name: string, reason: string) {
  const html = baseTemplate("Account Registration Update", `
    <p style="color:#334155;">Hi ${name},</p>
    <p style="color:#334155;">Thank you for registering with ${APP_NAME}. After reviewing your application, we're unable to approve your account at this time.</p>
    <div style="background:#FEF2F2;border-radius:10px;padding:16px;border:1px solid #FECACA;margin:20px 0;">
      <p style="color:#7F1D1D;margin:0;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
    </div>
    <p style="color:#64748b;font-size:13px;">If you believe this is a mistake, please contact our support team.</p>
  `);
  await sendMail(to, `Update on your ${APP_NAME} account application`, html);
}
