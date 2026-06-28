import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

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

export const userPageLogsTable = pgTable("user_page_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  pageName: text("page_name").notNull(),
  pageLabel: text("page_label"),
  action: text("action"),
  timeSpentSec: integer("time_spent_sec"),
  enteredAt: timestamp("entered_at"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export type SystemConfig = typeof systemConfigTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type UserPageLog = typeof userPageLogsTable.$inferSelect;
