import { Router } from "express";
import { db } from "@workspace/db";
import { voiceCampaigns, voiceCampaignContacts, voiceConfigs } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

async function recalcCounts(campaignId: string) {
  const rows = await db.query.voiceCampaignContacts.findMany({
    where: eq(voiceCampaignContacts.campaignId, campaignId),
  });
  const total = rows.length;
  const called = rows.filter((r) => r.status !== "pending").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter((r) => r.status === "failed" || r.status === "no-answer").length;
  await db
    .update(voiceCampaigns)
    .set({ totalContacts: total, calledCount: called, completedCount: completed, failedCount: failed, updatedAt: new Date() })
    .where(eq(voiceCampaigns.id, campaignId));
}

async function makeOutboundCall(
  toNumber: string,
  purpose: string,
  campaignId: string,
  contactId: string,
  log: typeof console
): Promise<{ callSid: string } | { error: string }> {
  try {
    const config = await db.query.voiceConfigs.findFirst();
    if (!config?.twilioAccountSid || !config?.twilioAuthToken || !config?.twilioPhoneNumber) {
      return { error: "Twilio credentials not configured" };
    }

    const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const baseUrl = domains ? `https://${domains}` : "";
    const statusCallback = `${baseUrl}/api/voice/campaigns/${campaignId}/contacts/${contactId}/status`;

    const twilio = (await import("twilio")).default;
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Hello, this is ${config.businessName}. ${purpose || "We are reaching out to confirm your upcoming appointment. Please call us back at your earliest convenience. Thank you and have a great day!"}</Say>
</Response>`;

    const call = await client.calls.create({
      to: toNumber,
      from: config.twilioPhoneNumber,
      twiml,
      statusCallback,
      statusCallbackEvent: ["completed", "failed", "no-answer", "busy"],
      statusCallbackMethod: "POST",
    });

    return { callSid: call.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error?.(`makeOutboundCall error: ${error}`);
    return { error };
  }
}

// ── Campaigns CRUD ───────────────────────────────────────────────────────────

router.get("/voice/campaigns", async (req, res) => {
  try {
    const campaigns = await db.query.voiceCampaigns.findMany({
      orderBy: [desc(voiceCampaigns.createdAt)],
    });
    res.json({ campaigns });
  } catch (err) {
    req.log.error({ err }, "Error fetching campaigns");
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.post("/voice/campaigns", async (req, res) => {
  try {
    const { name, description, purpose, contacts } = req.body as {
      name: string;
      description?: string;
      purpose?: string;
      contacts?: Array<{ name: string; phone: string; notes?: string }>;
    };
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const [campaign] = await db
      .insert(voiceCampaigns)
      .values({ name: name.trim(), description: description ?? "", purpose: purpose ?? "" })
      .returning();

    if (contacts && contacts.length > 0) {
      const rows = contacts.map((c) => ({
        campaignId: campaign.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes ?? "",
      }));
      await db.insert(voiceCampaignContacts).values(rows);
      await db
        .update(voiceCampaigns)
        .set({ totalContacts: rows.length, updatedAt: new Date() })
        .where(eq(voiceCampaigns.id, campaign.id));
    }

    const updated = await db.query.voiceCampaigns.findFirst({ where: eq(voiceCampaigns.id, campaign.id) });
    res.status(201).json(updated);
  } catch (err) {
    req.log.error({ err }, "Error creating campaign");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/voice/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, purpose, status } = req.body as Record<string, string>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (purpose !== undefined) updates.purpose = purpose;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(voiceCampaigns)
      .set(updates)
      .where(eq(voiceCampaigns.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Campaign not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating campaign");
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/voice/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(voiceCampaigns).where(eq(voiceCampaigns.id, id));
    res.json({ deleted: true, id });
  } catch (err) {
    req.log.error({ err }, "Error deleting campaign");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ── Contacts ────────────────────────────────────────────────────────────────

router.get("/voice/campaigns/:id/contacts", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const contacts = await db.query.voiceCampaignContacts.findMany({
      where: eq(voiceCampaignContacts.campaignId, id),
      orderBy: [desc(voiceCampaignContacts.createdAt)],
    });
    res.json({ contacts });
  } catch (err) {
    req.log.error({ err }, "Error fetching contacts");
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.post("/voice/campaigns/:id/contacts", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { contacts } = req.body as {
      contacts: Array<{ name: string; phone: string; notes?: string }>;
    };
    if (!contacts?.length) return res.status(400).json({ error: "contacts array is required" });

    const rows = contacts.map((c) => ({
      campaignId: id,
      name: c.name,
      phone: c.phone,
      notes: c.notes ?? "",
    }));
    const inserted = await db.insert(voiceCampaignContacts).values(rows).returning();
    await recalcCounts(id);
    res.status(201).json({ inserted: inserted.length, contacts: inserted });
  } catch (err) {
    req.log.error({ err }, "Error adding contacts");
    res.status(500).json({ error: "Failed to add contacts" });
  }
});

router.delete("/voice/campaigns/:id/contacts/:contactId", async (req, res) => {
  try {
    const { id, contactId } = req.params as { id: string; contactId: string };
    await db.delete(voiceCampaignContacts).where(
      and(eq(voiceCampaignContacts.id, contactId), eq(voiceCampaignContacts.campaignId, id))
    );
    await recalcCounts(id);
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting contact");
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// ── Call individual contact ──────────────────────────────────────────────────

router.post("/voice/campaigns/:id/contacts/:contactId/call", async (req, res) => {
  try {
    const { id, contactId } = req.params as { id: string; contactId: string };

    const [campaign, contact] = await Promise.all([
      db.query.voiceCampaigns.findFirst({ where: eq(voiceCampaigns.id, id) }),
      db.query.voiceCampaignContacts.findFirst({ where: eq(voiceCampaignContacts.id, contactId) }),
    ]);

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    await db
      .update(voiceCampaignContacts)
      .set({ status: "calling", calledAt: new Date() })
      .where(eq(voiceCampaignContacts.id, contactId));

    const result = await makeOutboundCall(contact.phone, campaign.purpose, id, contactId, req.log as typeof console);

    if ("callSid" in result) {
      await db
        .update(voiceCampaignContacts)
        .set({ callSid: result.callSid })
        .where(eq(voiceCampaignContacts.id, contactId));
      await recalcCounts(id);
      res.json({ success: true, callSid: result.callSid });
    } else {
      await db
        .update(voiceCampaignContacts)
        .set({ status: "failed" })
        .where(eq(voiceCampaignContacts.id, contactId));
      await recalcCounts(id);
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    req.log.error({ err }, "Error calling contact");
    res.status(500).json({ success: false, error: "Failed to initiate call" });
  }
});

// Twilio status callback for campaign contacts
router.post("/voice/campaigns/:id/contacts/:contactId/status", async (req, res) => {
  try {
    const { id, contactId } = req.params as { id: string; contactId: string };
    const { CallStatus } = req.body as { CallStatus?: string };

    const statusMap: Record<string, string> = {
      completed: "completed",
      failed: "failed",
      busy: "failed",
      "no-answer": "no-answer",
      canceled: "failed",
    };
    const newStatus = statusMap[CallStatus ?? ""] ?? "failed";

    await db
      .update(voiceCampaignContacts)
      .set({ status: newStatus, updatedAt: new Date() } as Record<string, unknown>)
      .where(and(eq(voiceCampaignContacts.id, contactId), eq(voiceCampaignContacts.campaignId, id)));

    await recalcCounts(id);

    // Auto-complete campaign if all contacts are done
    const pending = await db.query.voiceCampaignContacts.findMany({
      where: and(eq(voiceCampaignContacts.campaignId, id), eq(voiceCampaignContacts.status, "pending")),
    });
    if (pending.length === 0) {
      await db
        .update(voiceCampaigns)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(voiceCampaigns.id, id));
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error handling campaign contact status");
    res.sendStatus(204);
  }
});

// ── Run / Pause campaign ────────────────────────────────────────────────────

const activeCampaignJobs = new Map<string, boolean>();

async function runCampaignJob(campaignId: string, log: typeof console) {
  activeCampaignJobs.set(campaignId, true);

  try {
    const campaign = await db.query.voiceCampaigns.findFirst({
      where: eq(voiceCampaigns.id, campaignId),
    });
    if (!campaign || campaign.status !== "running") {
      activeCampaignJobs.delete(campaignId);
      return;
    }

    const pending = await db.query.voiceCampaignContacts.findMany({
      where: and(
        eq(voiceCampaignContacts.campaignId, campaignId),
        eq(voiceCampaignContacts.status, "pending")
      ),
      orderBy: [voiceCampaignContacts.createdAt],
    });

    for (const contact of pending) {
      // Check if campaign was paused
      const current = await db.query.voiceCampaigns.findFirst({ where: eq(voiceCampaigns.id, campaignId) });
      if (!current || current.status !== "running" || !activeCampaignJobs.get(campaignId)) break;

      await db
        .update(voiceCampaignContacts)
        .set({ status: "calling", calledAt: new Date() })
        .where(eq(voiceCampaignContacts.id, contact.id));

      const result = await makeOutboundCall(contact.phone, campaign.purpose, campaignId, contact.id, log);

      if ("callSid" in result) {
        await db
          .update(voiceCampaignContacts)
          .set({ callSid: result.callSid })
          .where(eq(voiceCampaignContacts.id, contact.id));
      } else {
        await db
          .update(voiceCampaignContacts)
          .set({ status: "failed" })
          .where(eq(voiceCampaignContacts.id, contact.id));
      }

      await recalcCounts(campaignId);

      // 3-second delay between calls to avoid rate limits
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Mark completed if no pending left
    const remaining = await db.query.voiceCampaignContacts.findMany({
      where: and(eq(voiceCampaignContacts.campaignId, campaignId), eq(voiceCampaignContacts.status, "pending")),
    });
    if (remaining.length === 0) {
      await db
        .update(voiceCampaigns)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(voiceCampaigns.id, campaignId));
    }
  } finally {
    activeCampaignJobs.delete(campaignId);
  }
}

router.post("/voice/campaigns/:id/start", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const campaign = await db.query.voiceCampaigns.findFirst({ where: eq(voiceCampaigns.id, id) });
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.status === "completed") return res.status(400).json({ error: "Campaign already completed" });

    await db
      .update(voiceCampaigns)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(voiceCampaigns.id, id));

    // Run async — don't await
    void runCampaignJob(id, req.log as typeof console);

    res.json({ success: true, status: "running" });
  } catch (err) {
    req.log.error({ err }, "Error starting campaign");
    res.status(500).json({ error: "Failed to start campaign" });
  }
});

router.post("/voice/campaigns/:id/pause", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    activeCampaignJobs.delete(id);
    await db
      .update(voiceCampaigns)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(voiceCampaigns.id, id));
    res.json({ success: true, status: "paused" });
  } catch (err) {
    req.log.error({ err }, "Error pausing campaign");
    res.status(500).json({ error: "Failed to pause campaign" });
  }
});

router.post("/voice/campaigns/:id/reset", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db
      .update(voiceCampaignContacts)
      .set({ status: "pending", callSid: null, calledAt: null } as Record<string, unknown>)
      .where(eq(voiceCampaignContacts.campaignId, id));
    await db
      .update(voiceCampaigns)
      .set({ status: "draft", calledCount: 0, completedCount: 0, failedCount: 0, updatedAt: new Date() })
      .where(eq(voiceCampaigns.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error resetting campaign");
    res.status(500).json({ error: "Failed to reset campaign" });
  }
});

export default router;
