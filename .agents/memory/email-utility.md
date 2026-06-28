---
name: Email Utility
description: Email sending setup in the XyloCart API server
---

## Location
`artifacts/api-server/src/lib/email.ts`

## Key exports
- `sendEmail({ to, subject, html, text? })` — main sender, silently skips if email_enabled≠"true" or SMTP not configured
- `orderStatusEmailHtml(opts)` — styled HTML for order status updates (pending/confirmed/shipped/delivered/cancelled/refunded)
- `fraudAlertEmailHtml(opts)` — styled HTML for admin fraud alerts

## Config keys (in system_configs table)
- `email_enabled` — "true"/"false" (default: not set, so disabled)
- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass` — standard SMTP
- `smtp_secure` — "true" for TLS on port 465
- `smtp_from` — sender address (falls back to smtp_user)

## Where used
- `orders.ts` — sends confirmation on order creation
- `admin.ts` — sends status update emails via `handleOrderStatusUpdate()` shared helper (used by both PATCH and PUT `/admin/orders/:id/status`)
- `auth.ts` — sends fraud alert to each admin on same-IP registration detection

**Why:** nodemailer was already in dependencies; all calls wrapped in try/catch so email failures never break the API response.
