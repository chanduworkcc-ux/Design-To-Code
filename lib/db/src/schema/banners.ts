import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const bannersTable = pgTable("banners", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  bgColor: text("bg_color").notNull().default("#2563EB"),
  textColor: text("text_color").notNull().default("#ffffff"),
  ctaText: text("cta_text").notNull().default("Shop Now"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Banner = typeof bannersTable.$inferSelect;
export type InsertBanner = typeof bannersTable.$inferInsert;
