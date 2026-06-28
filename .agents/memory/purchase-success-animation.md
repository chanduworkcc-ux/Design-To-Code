---
name: 3D Purchase Success Animation
description: Full-screen 3D animation shown after successful order placement in the mobile app
---

## Component
`artifacts/mobile/components/PurchaseSuccessAnimation.tsx`

## ThreeD.tsx exports used
- `FloatingOrb` — animated blobs in background (props: color, size, style, delay, amplitude, duration)
- `PulsingRing` — sonar rings emanating from center (props: color, size, delay, duration, thickness)
- `SpinBox3D` — rotating 3D box in center (props: size, color, topColor, sideColor)
- `FloatIn` — fade+slide-in wrapper for text (props: children, delay, distance, style)
- `FloatingParticle` — rising particles (props: x, startY, color, delay, size, duration)

## Behavior
- Shown in a full-screen Modal with `animationType="fade"` and `statusBarTranslucent`
- `useEffect` with `setTimeout(onComplete, 3600)` auto-dismisses after 3.6 seconds
- Background color: `#1D4ED8` (primary blue)
- Shows: emoji (🎉), "Order Placed!" title, order number, formatted total badge, redirect hint

## Integration in checkout.tsx
```
<PurchaseSuccessAnimation
  visible={showSuccessAnim}
  orderNumber={successOrder?.orderNumber}
  total={successOrder?.total}
  onComplete={() => {
    setShowSuccessAnim(false);
    router.replace("/orders" as any);
  }}
/>
```
Placed OUTSIDE the KeyboardAvoidingView (rendered in Fragment) so it truly covers the full screen.

**Why:** Modal must be outside KeyboardAvoidingView to render above everything including the keyboard.
