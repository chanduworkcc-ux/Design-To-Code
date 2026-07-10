/**
 * Vercel serverless catch-all for the XyloCart API.
 *
 * Vercel's file-based routing sends every /api/* request to this function,
 * preserving the original URL so Express can match its own routes normally.
 */
import { createServer } from "http";
import app from "../artifacts/api-server/src/app";
import { initSocket } from "../artifacts/api-server/src/lib/socket";

// Runs once per cold start. The httpServer is never .listen()-ed;
// it only exists so initSocket can attach the socket.io instance.
const _httpServer = createServer(app);
initSocket(_httpServer);

export default app;
