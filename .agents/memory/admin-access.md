---
name: Admin access pattern
description: How admin authentication and route protection works in XyloCart
---

## Rule
Admin login calls the real `/auth/login` API endpoint. The returned `AuthUser.role` is checked client-side; if not `"admin"`, the session is logged out immediately. The admin `_layout.tsx` redirects non-admin users back to `/admin` (login screen) on every navigation event, while the API enforces `authMiddleware + adminMiddleware` on every admin endpoint.

**Why:** The original code had hardcoded credentials (`admin@gmail.com / 123456`) with no API call and no token, so all admin API requests silently 401'd.

**How to apply:** When adding new admin screens, register them in `app/admin/_layout.tsx` and protect their API routes with `authMiddleware, adminMiddleware`.
