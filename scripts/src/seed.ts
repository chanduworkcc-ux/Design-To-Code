import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(usersTable).values({
    id: uuidv4(),
    email: "admin@xylocart.com",
    passwordHash,
    name: "XyloCart Admin",
    deviceUuid: "admin-device-" + Date.now(),
    referralCode: "ADMIN0",
    walletBalance: 0,
    role: "admin",
    status: "active",
  }).onConflictDoNothing();

  console.log("Seed complete. No demo products seeded — add real products via the admin panel.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
