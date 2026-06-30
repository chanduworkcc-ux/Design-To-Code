---
name: Asset proxy port default
description: The API server's asset proxy must default to port 18115 (mobile dev server), not 3000. Wrong default breaks vector icon font loading on web.
---

## Rule
`artifacts/api-server/src/app.ts` line: `const MOBILE_PROXY_PORT = parseInt(process.env.MOBILE_PORT || "18115", 10);`

Never let this fall back to 3000.

**Why:** The `artifacts/api-server: API Server` workflow does not set `MOBILE_PORT`. Without the env var, the proxy forwarding `/assets/` and `/_expo/` to port 3000 (nothing running there) → ECONNREFUSED → font TTF files never reach the browser → all `@expo/vector-icons` render as □ boxes on web.

**How to apply:** If icons look like boxes on the web preview, check this line first. Also applies to any new `/assets/`-proxied path added to `proxyToMobile`.
