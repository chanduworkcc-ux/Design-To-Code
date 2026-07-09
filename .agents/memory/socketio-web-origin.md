---
name: Socket.io web origin
description: SOCKET_URL on web must use window.location.origin not empty string
---
SOCKET_URL in artifacts/mobile/lib/api.ts is platform-conditional. On native uses EXPO_PUBLIC_DOMAIN. On web must be window.location.origin (with typeof window !== "undefined" SSR guard).
**Why:** Empty string "" resolves to the mobile proxy port (18115) which does not handle /api/socket.io. window.location.origin uses the Replit domain which routes /api/socket.io to the API server on port 5000.
