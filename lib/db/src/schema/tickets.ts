import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").unique(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull().default(""),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  status: ticketStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const ticketNotesTable = pgTable("ticket_notes", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  authorId: text("author_id").notNull(),
  note: text("note").notNull(),
  imageUrl: text("image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type TicketNote = typeof ticketNotesTable.$inferSelect;
