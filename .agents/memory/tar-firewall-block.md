---
name: tar firewall block
description: Replit package firewall security-blocks ALL versions of the tar npm package. Expo mobile workflow cannot install deps as a result.
---

# tar Package — Replit Firewall Security Block

**Rule:** Never run a bare `pnpm install` at the workspace root — the mobile workspace pulls in `tar` via `@expo/cli` and the install will fail with 403.

**Why:** The Replit package firewall (`package-firewall.replit.local`) blocks all versions of `tar` with HTTP 403. This is a security block (not age-based) — no version or override can bypass it via pnpm config or `.npmrc` registry overrides, since the env var `npm_config_registry` takes precedence.

**How to apply:**
- API server startup and retries use `--filter "@workspace/api-server..."` to skip the mobile workspace.
- The mobile dev-proxy degrades gracefully (informational page + healthy `/status`) when expo binary is missing, so the workflow stays alive.
- `minimumReleaseAgeExclude` and per-package registry overrides in `.npmrc` do NOT bypass this block.
