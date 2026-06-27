import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect;
