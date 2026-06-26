import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetType: text("target_type").notNull().default("all"), // "all" | "user"
  targetUserId: text("target_user_id"),
  iconName: text("icon_name").notNull().default("bell"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
