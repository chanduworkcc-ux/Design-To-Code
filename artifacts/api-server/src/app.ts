import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { rateLimit } from "express-rate-limit";
import http from "http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { activityLogger } from "./middleware/auth";
import { seedDefaultConfig, seedAdminUser, seedDemoData, seedDefaultFaqs } from "./lib/config";

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
  res.redirect("/mobile/");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// In production the Expo web app is pre-built to artifacts/mobile/dist/.
// In development we proxy to the Metro dev server on MOBILE_PORT (18115).
const IS_PROD = process.env.NODE_ENV === "production";
const MOBILE_DIST = path.join(__dirname, "../../mobile/dist");
const MOBILE_PROXY_PORT = parseInt(process.env.MOBILE_PORT || "18115", 10);

if (IS_PROD) {
  // --- PRODUCTION: serve the pre-built Expo web static output ---
  // Assets and _expo chunks come from the build output with long-lived caches.
  app.use("/assets", express.static(path.join(MOBILE_DIST, "assets"), {
    maxAge: "365d", immutable: true,
    setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
  }));
  app.use("/_expo", express.static(path.join(MOBILE_DIST, "_expo"), {
    maxAge: "365d", immutable: true,
    setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
  }));
  // /mobile/* → serve from dist/, falling back to index.html for SPA routing.
  app.use("/mobile", express.static(MOBILE_DIST, { index: "index.html" }));
  app.use("/mobile", (_req: Request, res: Response) => {
    res.sendFile(path.join(MOBILE_DIST, "index.html"));
  });
} else {
  // --- DEVELOPMENT: proxy to the Metro dev server ---
  app.use("/mobile", (req: Request, res: Response) => {
    const targetPath = "/mobile" + (req.url || "/");
    const fwdHeaders: Record<string, any> = { ...req.headers, host: `localhost:${MOBILE_PROXY_PORT}` };
    delete fwdHeaders["origin"];
    delete fwdHeaders["referer"];
    const options = {
      hostname: "127.0.0.1",
      port: MOBILE_PROXY_PORT,
      path: targetPath,
      method: req.method,
      headers: fwdHeaders,
    };
    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      res.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", (err) => {
      logger.warn({ err }, "Mobile proxy error");
      if (!res.headersSent) res.status(502).send("Mobile service unavailable");
    });
    req.pipe(proxyReq, { end: true });
  });

  function proxyToMobile(req: Request, res: Response) {
    const targetPath = req.originalUrl;
    const fwdHeaders: Record<string, any> = { ...req.headers, host: `localhost:${MOBILE_PROXY_PORT}` };
    delete fwdHeaders["origin"];
    delete fwdHeaders["referer"];
    const options = {
      hostname: "127.0.0.1",
      port: MOBILE_PROXY_PORT,
      path: targetPath,
      method: req.method,
      headers: fwdHeaders,
    };
    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      res.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", (err) => {
      logger.warn({ err }, "Asset proxy error");
      if (!res.headersSent) res.status(502).send("Asset unavailable");
    });
    req.pipe(proxyReq, { end: true });
  }

  app.use("/assets", proxyToMobile);
  app.use("/_expo", proxyToMobile);
}

// Serve icon font TTF files at stable URLs that survive Metro restarts.
// On web, useFonts() uses these instead of Metro's dynamic hashed asset URLs.
app.use("/fonts", express.static(path.join(__dirname, "../../mobile/assets/fonts"), {
  maxAge: "365d",
  immutable: true,
  setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
}));

app.get(/^\/(?!api\/|mobile|assets\/|_expo\/)(.+)$/, (req: Request, res: Response) => {
  const path = (req.params as any)[0] ?? "";
  res.redirect(302, `/mobile/${path}`);
});

app.use("/api/uploads", express.static(path.join(__dirname, "../public/uploads"), {
  maxAge: "7d",
  setHeaders: (res) => { res.setHeader("Access-Control-Allow-Origin", "*"); },
}));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api", router);

seedDefaultConfig().catch((err) => logger.error({ err }, "Failed to seed config"));
seedAdminUser().catch((err) => logger.error({ err }, "Failed to seed admin user"));
seedDefaultFaqs().catch((err) => logger.error({ err }, "Failed to seed default FAQs"));

// Keep-alive: ping the EXTERNAL public URL every 4 minutes so Replit's
// activity tracker registers real traffic and never hibernates the project.
// Falls back to an internal localhost ping when running offline/locally.
import https from "https";

const KEEP_ALIVE_MS = 4 * 60 * 1000; // 4 minutes

function keepAlivePing() {
  const externalDomain = process.env.REPLIT_DEV_DOMAIN;
  if (externalDomain) {
    // Ping via public HTTPS — counts as real activity to Replit's scheduler
    const req = https.get(`https://${externalDomain}/health`, (res) => {
      res.resume();
      logger.debug({ status: res.statusCode }, "keep-alive ping (external)");
    });
    req.on("error", (err) => {
      logger.warn({ msg: err.message }, "keep-alive external ping failed, trying local");
      // Fallback to localhost on network error
      const port = process.env.PORT || 5000;
      const r = http.get(`http://127.0.0.1:${port}/health`, (res2) => { res2.resume(); });
      r.on("error", () => {});
      r.end();
    });
    req.end();
  } else {
    // Local dev without REPLIT_DEV_DOMAIN — ping localhost
    const port = process.env.PORT || 5000;
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      res.resume();
      logger.debug({ status: res.statusCode }, "keep-alive ping (local)");
    });
    req.on("error", (err) => logger.warn({ msg: err.message }, "keep-alive local ping failed"));
    req.end();
  }
}

setInterval(keepAlivePing, KEEP_ALIVE_MS);
// Fire once at startup (after a short delay so the port is bound)
setTimeout(keepAlivePing, 10_000);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
