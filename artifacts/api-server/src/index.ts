import { createServer } from "http";
import app from "./app";
import { initSocket } from "./lib/socket";
import { logger } from "./lib/logger";

const httpServer = createServer(app);
initSocket(httpServer);

// Export app as default so Vercel can use it as a serverless handler
export default app;

// Only start listening when PORT is provided (Replit / local dev).
// Vercel serverless functions do not set PORT — they call the exported handler directly.
const rawPort = process.env["PORT"];
if (rawPort) {
  const port = Number(rawPort);
  if (!Number.isNaN(port) && port > 0) {
    httpServer.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  } else {
    logger.error({ rawPort }, "Invalid PORT value — server not started");
  }
}
