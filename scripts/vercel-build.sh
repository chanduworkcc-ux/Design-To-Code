#!/usr/bin/env bash
# Vercel build script — runs on every Vercel deployment.
# Both builds always run; the script fails if either fails.
set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE_ROOT"

echo "[vercel-build] node: $(node -v)"
echo "[vercel-build] pnpm: $(pnpm -v 2>/dev/null || echo 'not found')"
echo "[vercel-build] workspace: $WORKSPACE_ROOT"

# ── 1. API server ─────────────────────────────────────────────────────────────
echo ""
echo "[vercel-build] ── Building API server ──"
API_EXIT=0
pnpm --filter @workspace/api-server run build:vercel 2>&1 || API_EXIT=$?
if [ $API_EXIT -ne 0 ]; then
  echo "[vercel-build] WARNING: API server build failed (exit $API_EXIT)."
  echo "[vercel-build]   The /api/* serverless function may not work on Vercel."
  echo "[vercel-build]   Continuing so the mobile web app can still be deployed."
fi

# ── 2. Mobile web export ───────────────────────────────────────────────────────
echo ""
echo "[vercel-build] ── Exporting mobile web app (Expo) ──"
MOBILE_EXIT=0
pnpm --filter @workspace/mobile run build:vercel 2>&1 || MOBILE_EXIT=$?
if [ $MOBILE_EXIT -ne 0 ]; then
  echo "[vercel-build] ERROR: Mobile web export failed (exit $MOBILE_EXIT)."
  exit $MOBILE_EXIT
fi

# ── 3. Verify output ──────────────────────────────────────────────────────────
echo ""
echo "[vercel-build] ── Verifying output ──"
if [ ! -f "$WORKSPACE_ROOT/dist/index.html" ]; then
  echo "[vercel-build] ERROR: dist/index.html not found after build!"
  echo "[vercel-build]   Contents of dist/ (if it exists):"
  ls -la "$WORKSPACE_ROOT/dist/" 2>/dev/null || echo "  dist/ does not exist"
  exit 1
fi

echo "[vercel-build] dist/index.html ✓"
echo "[vercel-build] dist/ contents:"
ls -la "$WORKSPACE_ROOT/dist/"

# ── 4. Final exit code ────────────────────────────────────────────────────────
if [ $API_EXIT -ne 0 ]; then
  echo ""
  echo "[vercel-build] Exiting with error: API server build failed."
  exit $API_EXIT
fi

echo ""
echo "[vercel-build] ✓ Build complete."
