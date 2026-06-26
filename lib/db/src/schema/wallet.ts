import { pgTable, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const txTypeEnum = pgEnum("tx_type", ["credit", "debit"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected"]);

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: txTypeEnum("type").notNull(),
  coins: integer("coins").notNull(),
  description: text("description").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  coins: integer("coins").notNull(),
  inrAmount: real("inr_amount").notNull(),
  upiId: text("upi_id").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertWalletTxSchema = createInsertSchema(walletTransactionsTable).omit({ id: true, createdAt: true });
export const insertWithdrawalSchema = createInsertSchema(withdrawalRequestsTable).omit({ id: true, createdAt: true, resolvedAt: true });
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
