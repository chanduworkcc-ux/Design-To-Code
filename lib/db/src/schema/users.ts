import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "banned", "pending", "unverified", "rejected"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number"),
  deviceUuid: text("device_uuid").unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredById: text("referred_by_id"),
  walletBalance: integer("wallet_balance").notNull().default(0),
  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  banReason: text("ban_reason"),
  suspendedUntil: timestamp("suspended_until"),
  verificationToken: text("verification_token"),
  verificationExpiresAt: timestamp("verification_expires_at"),
  verifiedAt: timestamp("verified_at"),
  registrationIp: text("registration_ip"),
  lastLoginIp: text("last_login_ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
