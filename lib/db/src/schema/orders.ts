import { pgTable, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "razorpay", "phonepe"]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: text("product_id").notNull(),
  couponId: text("coupon_id"),
  quantity: integer("quantity").notNull().default(1),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  subtotal: real("subtotal").notNull(),
  deliveryCharge: real("delivery_charge").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  serviceCharge: real("service_charge").notNull().default(0),
  maintenanceCharge: real("maintenance_charge").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  total: real("total").notNull(),
  shippingAddress: text("shipping_address"),
  utrNumber: text("utr_number"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
