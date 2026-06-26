import { db } from "@workspace/db";
import { usersTable, productsTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(usersTable).values({
    id: uuidv4(),
    email: "admin@xyloscart.com",
    passwordHash,
    name: "XyloCart Admin",
    deviceUuid: "admin-device-" + Date.now(),
    referralCode: "ADMIN0",
    walletBalance: 0,
    role: "admin",
    status: "active",
  }).onConflictDoNothing();

  console.log("Seeding products...");
  const sampleProducts = [
    { id: uuidv4(), name: "Classic Linen Shirt", category: "Clothing", price: 49.99, originalPrice: 80.99, discount: 38, rating: 4.7, description: "Premium classic linen shirt in light blue, perfect for casual and formal occasions.", stock: 50 },
    { id: uuidv4(), name: "Wireless Earbuds Pro", category: "Electronics", price: 89.99, rating: 4.5, description: "High-quality wireless earbuds with active noise cancellation and 30-hour battery life.", stock: 80 },
    { id: uuidv4(), name: "Atomic Habits", category: "Books", price: 16.99, rating: 4.9, description: "James Clear's #1 New York Times bestseller on building good habits and breaking bad ones.", stock: 200 },
    { id: uuidv4(), name: "Smart Watch Series X", category: "Electronics", price: 249.99, originalPrice: 299.99, discount: 17, rating: 4.6, description: "Advanced smartwatch with health monitoring, GPS, and 7-day battery.", stock: 30 },
    { id: uuidv4(), name: "Yoga Mat Premium", category: "Home", price: 34.99, rating: 4.3, description: "Non-slip premium yoga mat with alignment lines, perfect for all workout types.", stock: 60 },
    { id: uuidv4(), name: "Dark Chocolate Premium", category: "Beauty", price: 12.99, rating: 4.8, description: "Artisanal 85% dark chocolate from single-origin cocoa beans.", stock: 150 },
  ];
  for (const p of sampleProducts) {
    await db.insert(productsTable).values({ ...p, isActive: true }).onConflictDoNothing();
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
