import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(activityLogger as any);
app.use("/api", router);

// Seed config defaults and admin account on startup.
// Seed functions are idempotent (on-conflict-do-nothing / existence check),
// so they never overwrite existing production data.
seedDefaultConfig().catch((err) => logger.error({ err }, "Failed to seed config"));
seedAdminUser().catch((err) => logger.error({ err }, "Failed to seed admin user"));

export default app;
