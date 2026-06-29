import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price"),
  discount: integer("discount"),
  rating: real("rating").notNull().default(0),
  description: text("description"),
  imageUrl: text("image_url"),
  stock: integer("stock").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  tags: text("tags").array().notNull().default([]),
  imageUrls: text("image_urls").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
