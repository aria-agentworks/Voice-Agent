import { Router } from "express";
import { db } from "@workspace/db";
import { voiceCalls, voiceMessages, voiceConfigs } from "@workspace/db";
import { eq, desc, count, sql, isNotNull } from "drizzle-orm";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();

router.get("/voice/calls/stats", async (req, res) => {
  try {
    const [{ total }] = await db.select({ total: count() }).from(voiceCalls);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ todayTotal }] = await db
      .select({ todayTotal: count() })
      .from(voiceCalls)
      .where(sql`${voiceCalls.startedAt} >= ${today}`);

    const [avgResult] = await db
      .select({ avg: sql<number>`AVG(${voiceCalls.durationSeconds})` })
      .from(voiceCalls)
      .where(isNotNull(voiceCalls.durationSeconds));

    const [{ inbound }] = await db
      .select({ inbound: count() })
      .from(voiceCalls)
      .where(eq(voiceCalls.direction, "inbound"));

    const [{ outbound }] = await db
      .select({ outbound: count() })
      .from(voiceCalls)
      .where(eq(voiceCalls.direction, "outbound"));

    const byStatus = await db
      .select({ status: voiceCalls.status, count: count() })
      .from(voiceCalls)
      .groupBy(voiceCalls.status);

    const byOutcome = await db
      .select({ outcome: voiceCalls.outcome, count: count() })
      .from(voiceCalls)
      .where(isNotNull(voiceCalls.outcome))
      .groupBy(voiceCalls.outcome);

    return res.json({
      totalCalls: Number(total),
      todayCalls: Number(todayTotal),
      avgDurationSeconds: avgResult?.avg != null ? Number(avgResult.avg) : null,
      inboundCount: Number(inbound),
      outboundCount: Number(outbound),
      byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
      byOutcome: byOutcome.map((o) => ({
        outcome: o.outcome ?? "unknown",
        count: Number(o.count),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting voice call stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/voice/calls", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const calls = await db.query.voiceCalls.findMany({
      orderBy: [desc(voiceCalls.createdAt)],
      limit,
      offset,
    });

    const callsWithCounts = await Promise.all(
      calls.map(async (call) => {
        const [{ msgCount }] = await db
          .select({ msgCount: count() })
          .from(voiceMessages)
          .where(eq(voiceMessages.callId, call.id));
        return { ...call, messageCount: Number(msgCount) };
      })
    );

    const [{ total }] = await db.select({ total: count() }).from(voiceCalls);

    return res.json({
      calls: callsWithCounts,
      total: Number(total),
      page,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting voice calls");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/voice/calls/:id", async (req, res) => {
  try {
    const call = await db.query.voiceCalls.findFirst({
      where: eq(voiceCalls.id, req.params.id),
    });

    if (!call) return res.status(404).json({ error: "Call not found" });

    const messages = await db.query.voiceMessages.findMany({
      where: eq(voiceMessages.callId, call.id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });

    return res.json({
      call: { ...call, messageCount: messages.length },
      messages,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting voice call detail");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/voice/tts/:messageId", async (req, res) => {
  try {
    const message = await db.query.voiceMessages.findFirst({
      where: eq(voiceMessages.id, req.params.messageId),
    });

    if (!message) return res.status(404).send("Message not found");

    const config = await db.query.voiceConfigs.findFirst();
    const voice =
      (config?.voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer") || "nova";

    const audioBuffer = await textToSpeech(message.content, voice, "mp3");

    await db
      .update(voiceMessages)
      .set({ audioReady: true })
      .where(eq(voiceMessages.id, message.id));

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length.toString());
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(audioBuffer);
  } catch (err) {
    req.log.error({ err }, "Error generating TTS audio");
    return res.status(500).send("TTS generation failed");
  }
});

router.post("/voice/outbound", async (req, res) => {
  try {
    const { toNumber, purpose } = req.body as {
      toNumber?: string;
      purpose?: string;
    };

    if (!toNumber) {
      return res.status(400).json({ error: "toNumber is required" });
    }

    const config = await db.query.voiceConfigs.findFirst();

    if (!config?.twilioAccountSid || !config?.twilioAuthToken || !config?.twilioPhoneNumber) {
      return res.status(400).json({
        error:
          "Twilio credentials not configured. Please add your Account SID, Auth Token, and phone number in Settings.",
      });
    }

    const twilio = (await import("twilio")).default;
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string);
    const baseUrl = `${proto}://${host}`;

    const call = await client.calls.create({
      to: toNumber,
      from: config.twilioPhoneNumber,
      url: `${baseUrl}/api/voice/outbound-twiml`,
      statusCallback: `${baseUrl}/api/voice/status`,
      statusCallbackEvent: ["completed", "failed", "busy", "no-answer"],
      statusCallbackMethod: "POST",
    });

    await db.insert(voiceCalls).values({
      callSid: call.sid,
      fromNumber: config.twilioPhoneNumber,
      toNumber,
      direction: "outbound",
      status: call.status,
    });

    return res.json({
      callSid: call.sid,
      status: call.status,
      toNumber,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating outbound call");
    return res.status(500).json({ error: "Failed to initiate call. Check your Twilio credentials." });
  }
});

export default router;
