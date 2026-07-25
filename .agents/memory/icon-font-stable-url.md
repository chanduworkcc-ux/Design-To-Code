---
name: Icon font stable URL fix
description: Why and how icon fonts are served from /fonts/ on the API server instead of Metro's dynamic asset URLs on web.
---

# Icon Font Stable URL Fix

## The rule
On web, `useFonts()` must use `/fonts/<name>.ttf` (API server static path), not `require("../assets/fonts/<name>.ttf")`.

## Why
Expo Metro dev server serves font assets at hashed URLs (e.g. `/assets?platform=web&hash=abc123`). These hashes regenerate every time Metro restarts. After a few hours the dev server restarts, the hashes change, and the browser can no longer re-fetch the font faces — icons render as garbled unicode dots.

## How to apply
- `artifacts/api-server/src/app.ts` has a static route: `app.use("/fonts", express.static(path pointing to artifacts/mobile/assets/fonts))` with `maxAge: "365d"` and `immutable: true`.
- `artifacts/mobile/app/_layout.tsx` `RootLayout` uses `Platform.OS === "web"` to conditionally pass string paths (`"/fonts/Feather.ttf"` etc.) vs `require()` calls to `useFonts()`.
- The `/fonts/` route must be registered **before** the catch-all redirect in app.ts or it will get 302'd.
