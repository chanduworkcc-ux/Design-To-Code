#!/usr/bin/env bash
# Deployment build script — runs during Replit publish.
# 1. Install API server dependencies (tar is not needed for this workspace).
# 2. Install mobile dependencies (bypasses Replit tar firewall via registry override).
# 3. Build the API server (TypeScript → ESM bundle).
# 4. Export the Expo web app as a static site into artifacts/mobile/dist/.
set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE_ROOT"

echo "[deploy] Installing API server dependencies..."
pnpm --filter "@workspace/api-server..." install --frozen-lockfile

echo "[deploy] Installing mobile dependencies (bypassing tar firewall)..."
npm_config_registry=https://registry.npmjs.org/ \
  pnpm --filter "@workspace/mobile..." install --frozen-lockfile

echo "[deploy] Building API server..."
pnpm --filter @workspace/api-server run build

echo "[deploy] Exporting Expo web app..."
cd artifacts/mobile
npx expo export --platform web --output-dir dist --clear
cd "$WORKSPACE_ROOT"

echo "[deploy] Build complete."
echo "  API server → artifacts/api-server/dist/index.mjs"
echo "  Expo web   → artifacts/mobile/dist/"
