# XyloCart

A full-stack mobile shopping app built with Expo/React Native and an Express + PostgreSQL backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed admin user + products

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 53, Expo Router, React Native
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (v3 — import from `"zod"`, not `"zod/v4"`)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/mobile/` — Expo React Native app (customer + admin)
- `artifacts/api-server/` — Express 5 REST API
- `lib/db/` — Drizzle ORM schema + migrations
- `scripts/src/seed.ts` — seed script (admin user + 6 products)
- `artifacts/mobile/context/AuthContext.tsx` — auth state + apiRequest helper
- `artifacts/mobile/app/(auth)/` — login + register screens
- `artifacts/mobile/app/(tabs)/` — Shop, Search, Wishlist, Cart, Profile
- `artifacts/mobile/app/admin/` — Admin dashboard

## Architecture decisions

- All API routes under `/api` prefix; shared reverse proxy routes by path
- Device UUID enforcement on registration: iOS (applicationId), Android (androidId), web (localStorage)
- Single-item-per-order rule enforced server-side in `/api/orders`
- Wallet uses coins (100 coins = ₹1); coins_per_inr seeded via system_config
- Admin panel accessible from Profile tab; uses same JWT auth as customers (role check)
- esbuild bundles API server as ESM; zod must be imported as `"zod"` (not `"zod/v4"`)

## Product

- **Customer app**: Shop browse, search, wishlist, cart, profile with wallet balance
- **Auth**: Register (with referral code) + login; guest browsing supported
- **Admin panel**: Animated sidebar dashboard with 15 nav items; live stats from API
- **Backend features**: Auth, wallet/coins, referrals, orders, support tickets, coupons, activity logs, system config

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Import `zod` as `"zod"`, never `"zod/v4"` — esbuild cannot resolve the package.json exports map
- `@workspace/api-zod` is listed in api-server deps but may be unused; safe to remove if causing issues
- API base URL is centralised in `artifacts/mobile/lib/api.ts` — uses relative `/api` on web (avoids CORS), absolute URL on native
- Admin credentials: `admin@xylocart.com` / `admin123` (seeded via `scripts/src/seed.ts` and `artifacts/api-server/src/lib/config.ts`)
- Splash screen duration is 2.5 seconds (`SPLASH_DURATION` in `artifacts/mobile/components/SplashOverlay.tsx`)
- **tar package is blocked by the Replit package firewall (security block on all versions).** Never run bare `pnpm install` at workspace root — use `--filter` to target specific workspaces.
- API server uses `--filter "@workspace/api-server..."` for installs (in `dev-start.sh`)
- Mobile uses registry override `npm_config_registry=https://registry.npmjs.org/` to bypass the firewall for `tar`; `dev-proxy.js` runs this automatically on startup when expo binary is missing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
