import { Router } from "express";
import { db } from "@workspace/db";
import { voiceAppointments } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/voice/appointments", async (req, res) => {
  try {
    const { status, limit = "50", page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = status ? [eq(voiceAppointments.status, status)] : [];

    const [appointments, countResult] = await Promise.all([
      db.query.voiceAppointments.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        orderBy: [desc(voiceAppointments.createdAt)],
        limit: limitNum,
        offset,
      }),
      db.select({ count: voiceAppointments.id }).from(voiceAppointments)
        .where(conditions.length ? and(...conditions) : undefined),
    ]);

    const total = countResult.length;
    res.json({
      appointments,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching appointments");
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/voice/appointments", async (req, res) => {
  try {
    const { patientName, patientPhone, requestedDate, requestedTime, reason, notes, callId } =
      req.body as Record<string, string>;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const [appointment] = await db
      .insert(voiceAppointments)
      .values({
        patientName,
        patientPhone: patientPhone || "",
        requestedDate: requestedDate || "",
        requestedTime: requestedTime || "",
        reason: reason || "",
        notes: notes || "",
        callId: callId || null,
        status: "pending",
      })
      .returning();

    res.status(201).json(appointment);
  } catch (err) {
    req.log.error({ err }, "Error creating appointment");
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.put("/voice/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { patientName, patientPhone, requestedDate, requestedTime, reason, notes, status, externalId } =
      req.body as Record<string, string>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (patientName !== undefined) updates.patientName = patientName;
    if (patientPhone !== undefined) updates.patientPhone = patientPhone;
    if (requestedDate !== undefined) updates.requestedDate = requestedDate;
    if (requestedTime !== undefined) updates.requestedTime = requestedTime;
    if (reason !== undefined) updates.reason = reason;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    if (externalId !== undefined) updates.externalId = externalId;

    const [updated] = await db
      .update(voiceAppointments)
      .set(updates)
      .where(eq(voiceAppointments.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating appointment");
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.delete("/voice/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(voiceAppointments).where(eq(voiceAppointments.id, id));
    res.json({ deleted: true, id });
  } catch (err) {
    req.log.error({ err }, "Error deleting appointment");
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

export default router;
