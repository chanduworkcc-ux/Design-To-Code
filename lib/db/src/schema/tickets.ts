import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const ticketNotesTable = pgTable("ticket_notes", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  authorId: text("author_id").notNull(),
  note: text("note").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, resolvedAt: true });
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type TicketNote = typeof ticketNotesTable.$inferSelect;
