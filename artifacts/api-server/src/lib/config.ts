import { db } from "@workspace/db";
import { systemConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULTS: Record<string, string> = {
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
  login_enabled: "true",
  registration_enabled: "true",
  maintenance_mode: "false",
  maintenance_message: "We are performing scheduled maintenance. Please check back soon.",
  min_app_version: "1.0.0",
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
