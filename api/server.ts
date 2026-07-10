/**
 * Vercel serverless function entry point for the XyloCart API.
 *
 * Vercel's @vercel/node builder bundles this file and all transitive
 * dependencies, then serves it at /api/* via the rewrite in vercel.json.
 *
 * We import directly from src/app.ts (not src/index.ts) so the HTTP
 * server listen() call is never triggered — Vercel manages the transport.
 *
 * Note: Socket.io falls back to long-polling on Vercel (no persistent
 * WebSocket connections). Real-time features work but with higher latency.
 * For full WebSocket support, use the Replit VM deployment instead.
 */
export { default } from "../artifacts/api-server/src/app";
