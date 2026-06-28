---
name: Checkout Billing Breakdown
description: How live billing breakdown is computed and displayed in checkout.tsx
---

## Data source
`GET /config/public` (no auth required) already returns:
`delivery_charge`, `tax_percent`, `service_charge`, `maintenance_charge`, `active_payment_gateway`, `store_status`

## Computation (client-side, in checkout.tsx)
```
subtotal = product.price
taxAmount = round(subtotal * taxPercent / 100)
computedTotal = subtotal + deliveryCharge + taxAmount + serviceCharge + maintenanceCharge - couponDiscount
```

## Coupon flow
1. User types code in coupon input
2. Presses "Verify" → `POST /coupons/validate { code }` → returns coupon details
3. `couponDiscount` computed from `discountType`/`discountValue`/`maxDiscount`
4. Verified coupon code (not raw input) sent to server on order placement

## Purchase limit pre-check
On mount: `GET /orders` → check if any non-cancelled order has `productId === product.id`
→ sets `alreadyPurchased` state → shows disclaimer modal + disables Place Order button

**Why:** Better UX to catch the limit before filling the form. Server still enforces it (409) as the authoritative check.
