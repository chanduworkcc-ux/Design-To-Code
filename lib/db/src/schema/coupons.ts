import { pgTable, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponTypeEnum = pgEnum("coupon_type", ["public", "private"]);
export const discountTypeEnum = pgEnum("discount_type", ["percent", "flat"]);
export const couponCohortEnum = pgEnum("coupon_cohort", ["all_users", "new_users", "old_users"]);

export const couponsTable = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: couponTypeEnum("type").notNull().default("public"),
  discountType: discountTypeEnum("discount_type").notNull().default("percent"),
  discountValue: real("discount_value").notNull(),
  targetCohort: couponCohortEnum("target_cohort").notNull().default("all_users"),
  targetUserId: text("target_user_id"),
  minOrderValue: real("min_order_value").notNull().default(0),
  maxDiscount: real("max_discount"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true, usedCount: true, createdAt: true });
export type Coupon = typeof couponsTable.$inferSelect;
