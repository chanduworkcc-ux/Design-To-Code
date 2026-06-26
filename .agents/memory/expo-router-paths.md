---
name: Expo Router path literals
description: Correct path string format for expo-router typed routes
---

## Rule
Use `"/(tabs)"` not `"/(tabs)/"` when calling `router.push` or `router.replace`. The trailing slash makes TypeScript reject it as an invalid route literal.

**Why:** Expo Router generates a strict typed union of valid paths; the trailing-slash form is not in the union.

**How to apply:** Whenever navigating to a tab group root, omit the trailing slash.
