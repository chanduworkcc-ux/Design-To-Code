import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id").notNull(),
  refereeId: text("referee_id").notNull().unique(),
  coinsAwarded: integer("coins_awarded").notNull(),
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Referral = typeof referralsTable.$inferSelect;
