import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { addressesTable } from "@workspace/db/schema";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router: IRouter = Router();

router.get("/addresses", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId!;
  const rows = await db.select().from(addressesTable).where(eq(addressesTable.userId, userId));
  res.json({ addresses: rows });
});

router.post("/addresses", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId!;
  const { label, fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  if (!fullName || !phone || !line1 || !city || !state || !pincode) {
    res.status(400).json({ error: "fullName, phone, line1, city, state, and pincode are required." });
    return;
  }
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }
  const [address] = await db.insert(addressesTable).values({
    id: uuidv4(),
    userId,
    label: label ?? "Home",
    fullName,
    phone,
    line1,
    line2: line2 ?? null,
    city,
    state,
    pincode,
    isDefault: isDefault ?? false,
  }).returning();
  res.status(201).json({ address });
});

router.put("/addresses/:id", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId!;
  const id = req.params.id as string;
  const { label, fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  const existing = await db.select().from(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
  if (!existing.length) { res.status(404).json({ error: "Address not found." }); return; }
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }
  const [address] = await db.update(addressesTable).set({
    label: label ?? existing[0].label,
    fullName: fullName ?? existing[0].fullName,
    phone: phone ?? existing[0].phone,
    line1: line1 ?? existing[0].line1,
    line2: line2 !== undefined ? line2 : existing[0].line2,
    city: city ?? existing[0].city,
    state: state ?? existing[0].state,
    pincode: pincode ?? existing[0].pincode,
    isDefault: isDefault !== undefined ? isDefault : existing[0].isDefault,
    updatedAt: new Date(),
  }).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId))).returning();
  res.json({ address });
});

router.delete("/addresses/:id", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId!;
  const id = req.params.id as string;
  const existing = await db.select().from(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
  if (!existing.length) { res.status(404).json({ error: "Address not found." }); return; }
  await db.delete(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
  res.json({ success: true });
});

export default router;
