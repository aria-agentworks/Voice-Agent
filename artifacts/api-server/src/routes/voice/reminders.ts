import { Router } from "express";
import { db } from "@workspace/db";
import { voiceAppointments, voiceConfigs } from "@workspace/db";
import { isNull, ne, eq } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { sendSmsToNumber } from "./sms.js";

const router = Router();

/**
 * Parse a requestedDate string into a JS Date, returning null if unparseable.
 * Handles ISO dates (2026-05-10) — the only format suitable for automated reminders.
 * Natural-language dates like "tomorrow" or "Monday" are skipped (we can't reliably
 * resolve them without a reference point from the call).
 */
function parseIsoDate(str: string): Date | null {
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(`${str}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

function buildReminderMessage(appt: {
  patientName: string;
  requestedDate: string;
  requestedTime: string;
  reason: string;
}, businessName: string): string {
  const time = appt.requestedTime ? ` at ${appt.requestedTime}` : "";
  const reason = appt.reason ? ` for ${appt.reason}` : "";
  return (
    `Hi ${appt.patientName}! This is a friendly reminder that you have an appointment tomorrow${time}${reason} at ${businessName}. ` +
    `Reply STOP to unsubscribe.`
  );
}

export async function runReminderJob(): Promise<{ sent: number; skipped: number; errors: number }> {
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Load business name from config
    const configs = await db.query.voiceConfigs.findMany({ limit: 1 });
    const businessName = configs[0]?.businessName ?? "our office";

    // Find appointments due for reminder: not cancelled, no reminder sent yet, has a phone
    const candidates = await db.query.voiceAppointments.findMany({
      where: (t, { and, isNull, ne }) =>
        and(ne(t.status, "cancelled"), isNull(t.reminderSentAt)),
    });

    for (const appt of candidates) {
      if (!appt.patientPhone) { skipped++; continue; }

      const parsed = parseIsoDate(appt.requestedDate);
      if (!parsed || !isTomorrow(parsed)) { skipped++; continue; }

      const message = buildReminderMessage(appt, businessName);

      try {
        const result = await sendSmsToNumber(appt.patientPhone, message, logger);
        if (result.success) {
          await db
            .update(voiceAppointments)
            .set({ reminderSentAt: new Date(), updatedAt: new Date() })
            .where(eq(voiceAppointments.id, appt.id));
          logger.info({ apptId: appt.id, phone: appt.patientPhone }, "Reminder SMS sent");
          sent++;
        } else {
          logger.warn({ apptId: appt.id, error: result.error }, "Reminder SMS failed");
          errors++;
        }
      } catch (err) {
        logger.error({ err, apptId: appt.id }, "Error sending reminder SMS");
        errors++;
      }
    }
  } catch (err) {
    logger.error({ err }, "Reminder job failed");
    errors++;
  }

  logger.info({ sent, skipped, errors }, "Reminder job complete");
  return { sent, skipped, errors };
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler() {
  if (reminderInterval) return;

  // Run immediately on startup, then every hour
  void runReminderJob();
  reminderInterval = setInterval(() => {
    void runReminderJob();
  }, 60 * 60 * 1000); // every 1 hour

  logger.info("Appointment reminder scheduler started (runs every hour)");
}

export function stopReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

// Manual trigger endpoint
router.post("/voice/reminders/run", async (req, res) => {
  try {
    const result = await runReminderJob();
    res.json({ success: true, ...result });
  } catch (err) {
    req.log.error({ err }, "Failed to run reminder job");
    res.status(500).json({ success: false, error: "Reminder job failed" });
  }
});

// Status endpoint — show upcoming remindable appointments
router.get("/voice/reminders/preview", async (req, res) => {
  try {
    const candidates = await db.query.voiceAppointments.findMany({
      where: (t, { and, isNull, ne }) =>
        and(ne(t.status, "cancelled"), isNull(t.reminderSentAt)),
    });

    const tomorrow: typeof candidates = [];
    const other: typeof candidates = [];

    for (const appt of candidates) {
      if (!appt.patientPhone) { other.push(appt); continue; }
      const parsed = parseIsoDate(appt.requestedDate);
      if (parsed && isTomorrow(parsed)) {
        tomorrow.push(appt);
      } else {
        other.push(appt);
      }
    }

    res.json({
      pendingReminders: tomorrow.length,
      scheduledFor: tomorrow.map((a) => ({
        id: a.id,
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        requestedDate: a.requestedDate,
        requestedTime: a.requestedTime,
      })),
      notEligible: other.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get reminder preview");
    res.status(500).json({ error: "Failed to get reminder preview" });
  }
});

export default router;
