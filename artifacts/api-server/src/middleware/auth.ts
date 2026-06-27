import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.SESSION_SECRET ?? "xyloscrt-dev-secret";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub));
    if (!users.length) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const user = users[0];
    if (user.status === "unverified") {
      res.status(403).json({ error: "unverified", message: "Please verify your email address." });
      return;
    }
    if (user.status === "rejected") {
      res.status(403).json({ error: "rejected", message: "Your account registration was not approved." });
      return;
    }
    if (user.status === "banned") {
      res.status(403).json({ error: `Account banned: ${user.banReason ?? "Policy violation"}` });
      return;
    }
    if (user.status === "suspended" && user.suspendedUntil && user.suspendedUntil > new Date()) {
      res.status(403).json({ error: `Account suspended until ${user.suspendedUntil.toLocaleDateString()}` });
      return;
    }
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function activityLogger(req: AuthRequest, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  const userAgent = req.headers["user-agent"] ?? null;
  const path = req.path;
  const method = req.method;

  res.on("finish", () => {
    const userId = req.userId ?? null;
    db.insert(activityLogsTable)
      .values({ id: uuidv4(), userId: userId ?? undefined, path, method, ip: ip ?? undefined, userAgent: userAgent ?? undefined })
      .catch(() => {});
  });
  next();
}
