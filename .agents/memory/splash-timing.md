---
name: Splash screen timing
description: SplashOverlay.tsx timing constants and the constraint between them
---
Splash was originally 13 000 ms. Reduced to 2 500 ms.
**Rule:** SPLASH_DURATION must always be >= FADE_OUT_DURATION (800 ms). Fade timer fires at SPLASH_DURATION - FADE_OUT_DURATION; if inverted it fires immediately.
**File:** artifacts/mobile/components/SplashOverlay.tsx
