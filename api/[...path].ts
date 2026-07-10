/**
 * Vercel serverless catch-all for the XyloCart API.
 *
 * Vercel's file-based routing sends every /api/* request to this function,
 * preserving the original URL so Express can match its own routes normally.
 *
 * Socket.io is initialized once per cold start against a transient HTTP
 * server so getIO() never throws inside request handlers. WebSocket upgrades
 * are not supported on Vercel serverless; socket.io falls back to long-polling
 * automatically. For full persistent WebSocket support use the Replit VM
 * deployment instead.
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "http";
import app from "../artifacts/api-server/src/app";
import { initSocket } from "../artifacts/api-server/src/lib/socket";

// Runs once per cold start. The httpServer is never .listen()-ed;
// it only exists so initSocket can attach the socket.io instance.
const _httpServer = createServer(app);
initSocket(_httpServer);

export default async (req: VercelRequest, res: VercelResponse) => {
  // Call the Express app as a middleware
  return new Promise((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
  });
};
