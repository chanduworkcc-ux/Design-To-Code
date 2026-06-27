import { Router } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, ticketNotesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const ticketSchema = z.object({
  category: z.enum(["order_issue", "payment", "product", "account", "other"]),
  description: z.string().min(10),
});

router.get("/tickets", authMiddleware, async (req: AuthRequest, res) => {
  const tickets = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.userId, req.userId!)).orderBy(desc(supportTicketsTable.createdAt));
  res.json({ tickets });
});

router.post("/tickets", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const [ticket] = await db.insert(supportTicketsTable).values({ id: uuidv4(), userId: req.userId!, ...parsed.data, status: "open" }).returning();

  try {
    getIO().to("admins").emit("new_ticket", {
      ticket,
      message: `New support ticket: ${parsed.data.category.replace("_", " ")}`,
    });
  } catch {}

  res.status(201).json({ ticket });
});

router.get("/tickets/:id/notes", authMiddleware, async (req: AuthRequest, res) => {
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, req.params.id));
  if (!ticket || (ticket.userId !== req.userId && req.userRole !== "admin")) { res.status(404).json({ error: "Ticket not found" }); return; }
  const notes = await db.select().from(ticketNotesTable).where(eq(ticketNotesTable.ticketId, req.params.id)).orderBy(ticketNotesTable.createdAt);
  res.json({ notes });
});

router.post("/tickets/:id/notes", authMiddleware, async (req: AuthRequest, res) => {
  const { note } = req.body;
  if (!note?.trim()) { res.status(400).json({ error: "Note cannot be empty" }); return; }
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, req.params.id));
  if (!ticket || (ticket.userId !== req.userId && req.userRole !== "admin")) { res.status(403).json({ error: "Forbidden" }); return; }
  const [newNote] = await db.insert(ticketNotesTable).values({ id: uuidv4(), ticketId: req.params.id, authorId: req.userId!, note: note.trim(), isAdmin: req.userRole === "admin" }).returning();

  try {
    const io = getIO();
    io.to(`user:${ticket.userId}`).emit("ticket_note", {
      ticketId: ticket.id,
      note: newNote,
      isAdmin: req.userRole === "admin",
    });
    if (req.userRole !== "admin") {
      io.to("admins").emit("ticket_note", { ticketId: ticket.id, note: newNote, isAdmin: false });
    }
  } catch {}

  res.status(201).json({ note: newNote });
});

router.get("/admin/tickets", authMiddleware, adminMiddleware, async (_req, res) => {
  const tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));
  res.json({ tickets });
});

router.post("/admin/tickets/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, req.params.id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const [updated] = await db.update(supportTicketsTable)
    .set({ status, resolvedAt: ["resolved", "closed"].includes(status) ? new Date() : undefined })
    .where(eq(supportTicketsTable.id, req.params.id)).returning();

  let noteRecord = null;
  if (note) {
    [noteRecord] = await db.insert(ticketNotesTable).values({ id: uuidv4(), ticketId: req.params.id, authorId: req.userId!, note, isAdmin: true }).returning();
  }

  try {
    getIO().to(`user:${ticket.userId}`).emit("ticket_update", {
      ticketId: ticket.id,
      status,
      note: noteRecord,
      message: `Your ticket status changed to: ${status.replace("_", " ")}`,
    });
  } catch {}

  res.json({ ticket: updated });
});

export default router;
