import { db } from "@workspace/db";
import { systemConfigTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const DEFAULTS: Record<string, string> = {
  logo_url: "",
  coins_per_inr: "100",
  referral_coins: "100",
  referral_enabled: "true",
  delivery_charge: "40",
  tax_percent: "18",
  service_charge: "10",
  maintenance_charge: "5",
  razorpay_enabled: "false",
  razorpay_key_id: "",
  razorpay_key_secret: "",
  phonepe_enabled: "false",
  phonepe_merchant_id: "",
  phonepe_api_key: "",
  cod_enabled: "true",
  active_payment_gateway: "cod",
  login_enabled: "true",
  registration_enabled: "true",
  maintenance_mode: "false",
  maintenance_message: "We are performing scheduled maintenance. Please check back soon.",
  login_closed_message: "Logins are temporarily paused. Please try again later or contact support.",
  registration_closed_message: "New registrations are currently closed. Please check back soon.",
  store_status: "on",
  app_version: "1.0",
  min_app_version: "1.0.0",
  force_update: "false",
  update_url: "",
  update_version: "1.0.0",
  update_notes: "",
  rate_app_url: "",
  sms_enabled: "false",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
};

export async function getConfig(key: string): Promise<string> {
  const rows = await db.select().from(systemConfigTable).where(eq(systemConfigTable.key, key));
  if (rows.length > 0) return rows[0].value;
  return DEFAULTS[key] ?? "";
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemConfigTable);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await db
    .insert(systemConfigTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemConfigTable.key, set: { value, updatedAt: new Date() } });
}

export async function seedDefaultConfig(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db
      .insert(systemConfigTable)
      .values({ key, value })
      .onConflictDoNothing();
  }
}

export async function seedAdminUser(): Promise<void> {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@xyloscart.com"));

  if (existing.length > 0) return;

  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(usersTable).values({
    id: uuidv4(),
    email: "admin@xyloscart.com",
    passwordHash,
    name: "Admin",
    deviceUuid: "admin-device-seed",
    referralCode: "ADMIN0",
    walletBalance: 0,
    role: "admin",
    status: "active",
  });
}
