import { db } from "@workspace/db";
import { voiceConfigs, voiceAppointments } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendAppointmentConfirmation(
  appointmentId: string,
  logger?: { error: (obj: object, msg: string) => void; info: (obj: object, msg: string) => void }
): Promise<SmsResult> {
  try {
    const [config, appointment] = await Promise.all([
      db.query.voiceConfigs.findFirst(),
      db.query.voiceAppointments.findFirst({ where: eq(voiceAppointments.id, appointmentId) }),
    ]);

    if (!appointment) return { success: false, error: "Appointment not found" };
    if (!appointment.patientPhone) return { success: false, error: "No phone number on appointment" };

    if (!config?.twilioAccountSid || !config?.twilioAuthToken || !config?.twilioPhoneNumber) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    const phone = appointment.patientPhone.trim();
    if (!phone || phone === "unknown") return { success: false, error: "Invalid phone number" };

    const businessName = config.businessName || "Our office";
    const datePart = appointment.requestedDate
      ? ` on ${appointment.requestedDate}`
      : "";
    const timePart = appointment.requestedTime
      ? ` at ${appointment.requestedTime}`
      : "";
    const reasonPart = appointment.reason
      ? ` (${appointment.reason})`
      : "";

    const body =
      `Hi ${appointment.patientName}! Your appointment request at ${businessName}${datePart}${timePart}${reasonPart} has been received. ` +
      `We'll confirm shortly. Reply STOP to unsubscribe.`;

    const twilio = (await import("twilio")).default;
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

    const message = await client.messages.create({
      body,
      from: config.twilioPhoneNumber,
      to: phone,
    });

    logger?.info({ appointmentId, sid: message.sid }, "SMS confirmation sent");
    return { success: true, sid: message.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger?.error({ err, appointmentId }, "Failed to send SMS confirmation");
    return { success: false, error };
  }
}

export async function sendSmsToNumber(
  toNumber: string,
  body: string,
  logger?: { error: (obj: object, msg: string) => void }
): Promise<SmsResult> {
  try {
    const config = await db.query.voiceConfigs.findFirst();
    if (!config?.twilioAccountSid || !config?.twilioAuthToken || !config?.twilioPhoneNumber) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    const twilio = (await import("twilio")).default;
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

    const message = await client.messages.create({
      body,
      from: config.twilioPhoneNumber,
      to: toNumber,
    });

    return { success: true, sid: message.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger?.error({ err }, "Failed to send SMS");
    return { success: false, error };
  }
}
