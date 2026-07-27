/**
 * Vercel Serverless Function — Full XyloCart API
 *
 * Imports the Express app from the pre-built esbuild output.
 * The build step (pnpm run build:vercel in @workspace/api-server) runs
 * before this function is deployed, so dist/index.mjs is always present.
 *
 * Socket.io real-time features are unavailable in serverless (stateless),
 * but all REST endpoints work normally.
 */

// @ts-ignore — importing a pre-built ESM bundle; no .d.ts needed
import app from "../artifacts/api-server/dist/index.mjs";

export default app;
