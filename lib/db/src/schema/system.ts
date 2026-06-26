import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const systemConfigTable = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  path: text("path").notNull(),
  method: text("method").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export type SystemConfig = typeof systemConfigTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
