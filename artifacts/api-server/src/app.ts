import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import http from "http";
import router from "./routes";
import { logger } from "./lib/logger";
import { activityLogger } from "./middleware/auth";
import { seedDefaultConfig, seedAdminUser } from "./lib/config";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(activityLogger as any);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "development",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again in 1 hour." },
  skip: () => process.env.NODE_ENV === "development",
});

app.get("/", (_req, res) => {
  res.redirect(301, "/mobile/");
});

// Forward /mobile/* to the mobile dev proxy (port 18115).
// Replit routes all root paths through the API server (paths=["/api","/"]),
// so we must explicitly proxy mobile traffic here.
const MOBILE_PROXY_PORT = parseInt(process.env.MOBILE_PORT || "18115", 10);
app.use("/mobile", (req: Request, res: Response) => {
  const targetPath = "/mobile" + (req.url || "/");
  const options = {
    hostname: "127.0.0.1",
    port: MOBILE_PROXY_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${MOBILE_PROXY_PORT}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    res.writeHead(proxyRes.statusCode || 200, headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    logger.warn({ err }, "Mobile proxy error");
    if (!res.headersSent) {
      res.status(502).send("Mobile service unavailable");
    }
  });
  req.pipe(proxyReq, { end: true });
});

app.get(/^\/(?!api\/|mobile|assets\/)(.+)$/, (req: Request, res: Response) => {
  const path = (req.params as any)[0] ?? "";
  res.redirect(302, `/mobile/${path}`);
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api", router);

seedDefaultConfig().catch((err) => logger.error({ err }, "Failed to seed config"));
seedAdminUser().catch((err) => logger.error({ err }, "Failed to seed admin user"));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
