---
name: Purchase Limit & Fraud Detection
description: How one-time purchase limit and IP-based fraud detection work in the XyloCart API
---

## One-Time Purchase Limit

**Rule:** Each user can only purchase each product once (excluding cancelled/refunded orders).

**Server enforcement:** In `orders.ts` POST /orders, before insertion, check:
```
SELECT * FROM orders WHERE userId=? AND productId=? AND status NOT IN ('cancelled','refunded')
```
Returns 409 with `{ error: "purchase_limit_exceeded", message: "..." }` if found.

**Client handling:** checkout.tsx checks /orders on mount to pre-detect and show a disclaimer modal before the user even tries to place an order. The "Place Order" button changes to "Already Purchased" (amber) when `alreadyPurchased` is true.

**Why:** Business requirement — fair access for all customers; also prevents inventory gaming.

## IP-Based Fraud Detection

**Where:** `auth.ts` POST /auth/register

**How:**
- `getClientIp(req)` reads `x-forwarded-for` header first, then `req.socket.remoteAddress`
- Client IP stored in `users.registrationIp` on insert, `users.lastLoginIp` updated on each login
- During registration: if another user has the same `registrationIp`, emit `fraud_alert` to `getIO().to("admins")` socket room + call `insertAutoNotification` for each admin user + `sendEmail` to each admin

**DB columns added:** `registrationIp text`, `lastLoginIp text` on `usersTable` — pushed via `pnpm --filter @workspace/db run push`

**Why:** Device UUID already prevents same-device re-registration; IP covers VPN/proxy multi-account fraud at the network layer.

## How to apply
- Any admin socket listener on `"fraud_alert"` event gets real-time payloads with `{ type, message, suspiciousEmail, existingEmail, ip, deviceUuid, timestamp }`
- Admin in-app notifications appear in their notification bell; email goes to admin.email in users table
