import { Router } from "express";
import { db } from "@workspace/db";
import { voiceCalls, voiceMessages, voiceConfigs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateVoiceResponse, isWithinBusinessHours, getBusinessHoursSummary } from "./gpt.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function xmlSafe(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${content}</Response>`;
}

function gatherTwiml(action: string, sayText: string): string {
  return twiml(`
    <Say voice="Polly.Joanna-Neural">${xmlSafe(sayText)}</Say>
    <Gather input="speech" action="${action}" method="POST" speechTimeout="3" timeout="10" language="en-US">
    </Gather>
    <Say voice="Polly.Joanna-Neural">I didn't catch that. Thank you for calling. Goodbye!</Say>
    <Hangup/>
  `);
}

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string);
  return `${proto}://${host}`;
}

router.post("/voice/inbound", async (req, res) => {
  const { CallSid, From, To } = req.body as Record<string, string>;
  res.setHeader("Content-Type", "text/xml");

  try {
    const config = await db.query.voiceConfigs.findFirst();

    if (!config) {
      return res.send(
        twiml(
          `<Say voice="Polly.Joanna-Neural">Sorry, this service is not configured. Goodbye.</Say><Hangup/>`
        )
      );
    }

    const existing = await db.query.voiceCalls.findFirst({
      where: eq(voiceCalls.callSid, CallSid),
    });

    if (!existing) {
      await db.insert(voiceCalls).values({
        callSid: CallSid,
        fromNumber: From || "unknown",
        toNumber: To || config.twilioPhoneNumber || "unknown",
        direction: "inbound",
        status: "in-progress",
      });
    }

    // After-hours handling
    if (config.hoursJson && !isWithinBusinessHours(config.hoursJson, config.timezone)) {
      const hoursSummary = getBusinessHoursSummary(config.hoursJson);
      const afterHoursMsg = `Thank you for calling ${config.businessName}. We are currently closed. Our hours are ${hoursSummary}. Please call back during business hours or leave a message after the tone.`;
      return res.send(
        twiml(`
          <Say voice="Polly.Joanna-Neural">${xmlSafe(afterHoursMsg)}</Say>
          <Record maxLength="120" action="/api/voice/status" transcribeCallback="/api/voice/status" />
          <Say voice="Polly.Joanna-Neural">Thank you for your message. Goodbye.</Say>
          <Hangup/>
        `)
      );
    }

    const greeting =
      config.greeting || `Thank you for calling ${config.businessName}. How can I help you today?`;

    return res.send(gatherTwiml("/api/voice/gather", greeting));
  } catch (err) {
    req.log.error({ err }, "Error handling inbound call");
    return res.send(
      twiml(
        `<Say voice="Polly.Joanna-Neural">We are experiencing technical difficulties. Please try again later.</Say><Hangup/>`
      )
    );
  }
});

router.post("/voice/gather", async (req, res) => {
  const { CallSid, SpeechResult } = req.body as Record<string, string>;
  res.setHeader("Content-Type", "text/xml");

  try {
    if (!SpeechResult || !SpeechResult.trim()) {
      return res.send(
        twiml(`
        <Say voice="Polly.Joanna-Neural">I didn't catch that. Could you please repeat?</Say>
        <Gather input="speech" action="/api/voice/gather" method="POST" speechTimeout="3" timeout="10">
        </Gather>
        <Hangup/>
      `)
      );
    }

    const call = await db.query.voiceCalls.findFirst({
      where: eq(voiceCalls.callSid, CallSid),
    });

    if (!call) {
      return res.send(
        twiml(`<Say voice="Polly.Joanna-Neural">Session not found. Goodbye.</Say><Hangup/>`)
      );
    }

    const config = await db.query.voiceConfigs.findFirst();
    if (!config) {
      return res.send(
        twiml(`<Say voice="Polly.Joanna-Neural">Service not configured. Goodbye.</Say><Hangup/>`)
      );
    }

    const historyMessages = await db.query.voiceMessages.findMany({
      where: eq(voiceMessages.callId, call.id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });

    await db.insert(voiceMessages).values({
      callId: call.id,
      role: "user",
      content: SpeechResult.trim(),
    });

    const history = historyMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const aiResponse = await generateVoiceResponse(SpeechResult.trim(), config, history);

    const [savedMessage] = await db
      .insert(voiceMessages)
      .values({
        callId: call.id,
        role: "assistant",
        content: aiResponse,
        audioReady: false,
      })
      .returning();

    const baseUrl = getBaseUrl(req);
    const ttsUrl = `${baseUrl}/api/voice/tts/${savedMessage.id}`;

    return res.send(
      twiml(`
      <Play>${ttsUrl}</Play>
      <Gather input="speech" action="/api/voice/gather" method="POST" speechTimeout="3" timeout="10" language="en-US">
      </Gather>
      <Say voice="Polly.Joanna-Neural">Thank you for calling ${xmlSafe(config.businessName)}. Goodbye!</Say>
      <Hangup/>
    `)
    );
  } catch (err) {
    req.log.error({ err }, "Error handling gather");
    return res.send(
      twiml(
        `<Say voice="Polly.Joanna-Neural">I am having trouble right now. Please try again shortly.</Say><Hangup/>`
      )
    );
  }
});

router.post("/voice/outbound-twiml", async (req, res) => {
  const { CallSid, To } = req.body as Record<string, string>;
  res.setHeader("Content-Type", "text/xml");

  try {
    const config = await db.query.voiceConfigs.findFirst();
    if (!config) {
      return res.send(
        twiml(
          `<Say voice="Polly.Joanna-Neural">Hello, this is an automated call. Thank you. Goodbye.</Say><Hangup/>`
        )
      );
    }

    const existing = await db.query.voiceCalls.findFirst({
      where: eq(voiceCalls.callSid, CallSid),
    });

    if (!existing) {
      await db.insert(voiceCalls).values({
        callSid: CallSid,
        fromNumber: config.twilioPhoneNumber || "unknown",
        toNumber: To || "unknown",
        direction: "outbound",
        status: "in-progress",
      });
    }

    const greeting = `Hello, this is ${config.businessName} calling. How can I assist you today?`;
    return res.send(gatherTwiml("/api/voice/gather", greeting));
  } catch (err) {
    req.log.error({ err }, "Error in outbound TwiML");
    return res.send(
      twiml(
        `<Say voice="Polly.Joanna-Neural">Hello, this is an automated call. Thank you. Goodbye.</Say><Hangup/>`
      )
    );
  }
});

async function autoSummarizeCall(callId: string, logger: { error: (obj: object, msg: string) => void }) {
  try {
    const messages = await db.query.voiceMessages.findMany({
      where: eq(voiceMessages.callId, callId),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
    if (messages.length < 2) return;

    const transcript = messages
      .map((m) => `${m.role === "user" ? "Caller" : "Agent"}: ${m.content}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            'Summarize this phone call in one concise sentence. Classify outcome as one of: appointment_booked, inquiry_handled, complaint, transfer_requested, wrong_number, callback_requested, resolved, no_answer. Return JSON: {"summary": "...", "outcome": "..."}',
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    if (parsed.summary || parsed.outcome) {
      await db
        .update(voiceCalls)
        .set({
          summary: parsed.summary ?? undefined,
          outcome: parsed.outcome ?? undefined,
        })
        .where(eq(voiceCalls.id, callId));
    }
  } catch (err) {
    logger.error({ err }, "Auto-summarize failed");
  }
}

router.post("/voice/status", async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body as Record<string, string>;

  try {
    const call = await db.query.voiceCalls.findFirst({
      where: eq(voiceCalls.callSid, CallSid),
    });

    if (call) {
      const isTerminal = ["completed", "failed", "busy", "no-answer", "canceled"].includes(
        CallStatus
      );
      await db
        .update(voiceCalls)
        .set({
          status: CallStatus || "completed",
          durationSeconds: CallDuration ? parseInt(CallDuration, 10) : undefined,
          endedAt: isTerminal ? new Date() : undefined,
        })
        .where(eq(voiceCalls.id, call.id));

      if (isTerminal && CallStatus === "completed") {
        autoSummarizeCall(call.id, req.log).catch(() => {});
      }
    }
  } catch (err) {
    req.log.error({ err }, "Error handling status callback");
  }

  res.status(200).send("OK");
});

export default router;
