import { Router } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, ticketNotesTable, orderSequencesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth";
import { getIO } from "../lib/socket";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const key = `ticket-${year}`;

  const [row] = await db
    .insert(orderSequencesTable)
    .values({ month: key, lastVal: 1 })
    .onConflictDoUpdate({
      target: orderSequencesTable.month,
      set: { lastVal: sql`${orderSequencesTable.lastVal} + 1` },
    })
    .returning();

  return `#T${year}-${String(row.lastVal).padStart(3, "0")}`;
}

const ticketSchema = z.object({
  category: z.enum(["order_issue", "payment", "product", "account", "other", "qa"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10),
  imageUrl: z.string().url().optional(),
});

router.get("/tickets", authMiddleware, async (req: AuthRequest, res) => {
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, req.userId!))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json({ tickets });
});

router.post("/tickets", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  const ticketNumber = await generateTicketNumber();
  const [ticket] = await db.insert(supportTicketsTable).values({
    id: uuidv4(),
    ticketNumber,
    userId: req.userId!,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl ?? null,
    status: "open",
  }).returning();

  try {
    getIO().to("admins").emit("new_ticket", {
      ticket,
      message: `New ticket ${ticketNumber}: ${parsed.data.title}`,
    });
  } catch {}

  res.status(201).json({ ticket });
});

router.get("/tickets/:id/notes", authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket || (ticket.userId !== req.userId && req.userRole !== "admin")) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  const notes = await db
    .select()
    .from(ticketNotesTable)
    .where(eq(ticketNotesTable.ticketId, id))
    .orderBy(ticketNotesTable.createdAt);
  res.json({ notes });
});

router.post("/tickets/:id/notes", authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { note, imageUrl } = req.body;
  if (!note?.trim() && !imageUrl) {
    res.status(400).json({ error: "Note or image required" });
    return;
  }
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket || (ticket.userId !== req.userId && req.userRole !== "admin")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [newNote] = await db.insert(ticketNotesTable).values({
    id: uuidv4(),
    ticketId: id,
    authorId: req.userId!,
    note: note?.trim() ?? "",
    imageUrl: imageUrl ?? null,
    isAdmin: req.userRole === "admin",
  }).returning();

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
  const rows = await db
    .select({
      id: supportTicketsTable.id,
      ticketNumber: supportTicketsTable.ticketNumber,
      userId: supportTicketsTable.userId,
      category: supportTicketsTable.category,
      title: supportTicketsTable.title,
      description: supportTicketsTable.description,
      imageUrl: supportTicketsTable.imageUrl,
      status: supportTicketsTable.status,
      createdAt: supportTicketsTable.createdAt,
      resolvedAt: supportTicketsTable.resolvedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
      userMobile: usersTable.mobileNumber,
    })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json({ tickets: rows });
});

router.patch("/admin/tickets/:id/status", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { status, note } = req.body;
  const validStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const [updated] = await db
    .update(supportTicketsTable)
    .set({ status, resolvedAt: ["resolved", "closed"].includes(status) ? new Date() : undefined })
    .where(eq(supportTicketsTable.id, id))
    .returning();

  let noteRecord: Record<string, unknown> | null = null;
  if (note?.trim()) {
    [noteRecord] = await db.insert(ticketNotesTable).values({
      id: uuidv4(),
      ticketId: id,
      authorId: req.userId!,
      note: note.trim(),
      isAdmin: true,
    }).returning();
  }

  try {
    const io = getIO();
    io.to(`user:${ticket.userId}`).emit("ticket_update", {
      ticketId: ticket.id,
      status,
      note: noteRecord,
      message: `Your ticket status changed to: ${status.replace("_", " ")}`,
    });
  } catch {}

  res.json({ ticket: updated, note: noteRecord });
});

export default router;
