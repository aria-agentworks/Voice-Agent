import { Router } from "express";
import { db } from "@workspace/db";
import { voiceConfigs } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_HOURS = JSON.stringify({
  monday: "9:00 AM - 5:00 PM",
  tuesday: "9:00 AM - 5:00 PM",
  wednesday: "9:00 AM - 5:00 PM",
  thursday: "9:00 AM - 5:00 PM",
  friday: "9:00 AM - 5:00 PM",
  saturday: "Closed",
  sunday: "Closed",
});

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string);
  return `${proto}://${host}`;
}

function maskConfig(config: typeof voiceConfigs.$inferSelect, baseUrl: string) {
  return {
    ...config,
    twilioAuthToken: config.twilioAuthToken ? "••••••••" : null,
    webhookUrl: `${baseUrl}/api/voice/inbound`,
  };
}

router.get("/voice/config", async (req, res) => {
  try {
    let config = await db.query.voiceConfigs.findFirst();

    if (!config) {
      const [created] = await db
        .insert(voiceConfigs)
        .values({
          businessName: "My Business",
          businessType: "general",
          greeting: "Thank you for calling. How can I help you today?",
          instructions: "",
          hoursJson: DEFAULT_HOURS,
          servicesJson: JSON.stringify([]),
          voice: "nova",
          isActive: false,
        })
        .returning();
      config = created;
    }

    const baseUrl = getBaseUrl(req);
    return res.json(maskConfig(config, baseUrl));
  } catch (err) {
    req.log.error({ err }, "Error getting voice config");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/voice/config", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const {
      businessName,
      businessType,
      greeting,
      instructions,
      hoursJson,
      servicesJson,
      voice,
      transferNumber,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      isActive,
    } = body;

    type ConfigInsert = typeof voiceConfigs.$inferInsert;
    const updateData: Partial<ConfigInsert> = {};

    if (businessName !== undefined) updateData.businessName = businessName as string;
    if (businessType !== undefined) updateData.businessType = businessType as string;
    if (greeting !== undefined) updateData.greeting = greeting as string;
    if (instructions !== undefined) updateData.instructions = instructions as string;
    if (hoursJson !== undefined) updateData.hoursJson = hoursJson as string;
    if (servicesJson !== undefined) updateData.servicesJson = servicesJson as string;
    if (voice !== undefined) updateData.voice = voice as string;
    if (transferNumber !== undefined)
      updateData.transferNumber = (transferNumber as string) || null;
    if (twilioAccountSid !== undefined)
      updateData.twilioAccountSid = (twilioAccountSid as string) || null;
    if (twilioAuthToken !== undefined && twilioAuthToken !== "••••••••")
      updateData.twilioAuthToken = (twilioAuthToken as string) || null;
    if (twilioPhoneNumber !== undefined)
      updateData.twilioPhoneNumber = (twilioPhoneNumber as string) || null;
    if (isActive !== undefined) updateData.isActive = isActive as boolean;
    updateData.updatedAt = new Date();

    let config = await db.query.voiceConfigs.findFirst();

    if (config) {
      const [updated] = await db
        .update(voiceConfigs)
        .set(updateData)
        .where(eq(voiceConfigs.id, config.id))
        .returning();
      config = updated;
    } else {
      const [created] = await db
        .insert(voiceConfigs)
        .values({
          businessName: (businessName as string) || "My Business",
          businessType: (businessType as string) || "general",
          greeting:
            (greeting as string) || "Thank you for calling. How can I help you today?",
          instructions: (instructions as string) || "",
          hoursJson: (hoursJson as string) || DEFAULT_HOURS,
          servicesJson: (servicesJson as string) || JSON.stringify([]),
          voice: (voice as string) || "nova",
          isActive: (isActive as boolean) ?? false,
          ...updateData,
        })
        .returning();
      config = created;
    }

    const baseUrl = getBaseUrl(req);
    return res.json(maskConfig(config, baseUrl));
  } catch (err) {
    req.log.error({ err }, "Error updating voice config");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
