import { Router } from "express";
import { db } from "@workspace/db";
import { voiceWebhookActions } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/voice/integrations", async (req, res) => {
  try {
    const actions = await db.query.voiceWebhookActions.findMany({
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
    res.json(actions);
  } catch (err) {
    req.log.error({ err }, "Error fetching integrations");
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.post("/voice/integrations", async (req, res) => {
  try {
    const { actionType, name, description, method, url, headersJson, bodyTemplate } =
      req.body as Record<string, string>;

    if (!actionType || !name || !url) {
      return res.status(400).json({ error: "actionType, name, and url are required" });
    }

    const [action] = await db
      .insert(voiceWebhookActions)
      .values({
        actionType,
        name,
        description: description || "",
        method: method || "POST",
        url,
        headersJson: headersJson || "{}",
        bodyTemplate: bodyTemplate || "",
        isActive: true,
      })
      .returning();

    res.status(201).json(action);
  } catch (err) {
    req.log.error({ err }, "Error creating integration");
    res.status(500).json({ error: "Failed to create integration" });
  }
});

router.put("/voice/integrations/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, method, url, headersJson, bodyTemplate, isActive } =
      req.body as Record<string, string> & { isActive?: boolean };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (method !== undefined) updates.method = method;
    if (url !== undefined) updates.url = url;
    if (headersJson !== undefined) updates.headersJson = headersJson;
    if (bodyTemplate !== undefined) updates.bodyTemplate = bodyTemplate;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(voiceWebhookActions)
      .set(updates)
      .where(eq(voiceWebhookActions.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Integration not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating integration");
    res.status(500).json({ error: "Failed to update integration" });
  }
});

router.delete("/voice/integrations/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(voiceWebhookActions).where(eq(voiceWebhookActions.id, id));
    res.json({ deleted: true, id });
  } catch (err) {
    req.log.error({ err }, "Error deleting integration");
    res.status(500).json({ error: "Failed to delete integration" });
  }
});

router.post("/voice/integrations/:id/test", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const action = await db.query.voiceWebhookActions.findFirst({
      where: eq(voiceWebhookActions.id, id),
    });

    if (!action) return res.status(404).json({ error: "Integration not found" });

    const testPayload = req.body as Record<string, unknown>;
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const parsed = JSON.parse(action.headersJson);
      headers = { ...headers, ...parsed };
    } catch {}

    const startTime = Date.now();
    let body: string | undefined;

    if (action.bodyTemplate) {
      try {
        const template = JSON.parse(action.bodyTemplate);
        const merged = { ...template, ...testPayload };
        body = JSON.stringify(merged);
      } catch {
        body = action.bodyTemplate;
      }
    } else {
      body = JSON.stringify({ test: true, ...testPayload });
    }

    const fetchOptions: RequestInit = {
      method: action.method,
      headers,
    };
    if (action.method !== "GET" && action.method !== "HEAD") {
      fetchOptions.body = body;
    }

    const response = await fetch(action.url, fetchOptions);
    const elapsed = Date.now() - startTime;
    let responseBody = "";
    try { responseBody = await response.text(); } catch {}

    res.json({
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseBody: responseBody.slice(0, 2000),
      elapsedMs: elapsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.json({
      success: false,
      statusCode: 0,
      statusText: "Connection failed",
      responseBody: message,
      elapsedMs: 0,
    });
  }
});

export async function callWebhookAction(
  action: { method: string; url: string; headersJson: string; bodyTemplate: string },
  args: Record<string, unknown>
): Promise<string> {
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const parsed = JSON.parse(action.headersJson);
    headers = { ...headers, ...parsed };
  } catch {}

  let body: string | undefined;
  if (action.bodyTemplate) {
    try {
      const template = JSON.parse(action.bodyTemplate);
      const merged = { ...template, ...args };
      body = JSON.stringify(merged);
    } catch {
      body = action.bodyTemplate;
    }
  } else {
    body = JSON.stringify(args);
  }

  const fetchOptions: RequestInit = { method: action.method, headers };
  if (action.method !== "GET" && action.method !== "HEAD") {
    fetchOptions.body = body;
  }

  const response = await fetch(action.url, fetchOptions);
  const text = await response.text();
  return text.slice(0, 1000);
}

export default router;
