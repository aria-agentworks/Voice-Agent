import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, keywordsTable } from "@workspace/db";
import {
  GetKeywordsResponse,
  CreateKeywordBody,
  UpdateKeywordBody,
  UpdateKeywordParams,
  DeleteKeywordParams,
  DeleteKeywordResponse,
  UpdateKeywordResponse,
} from "@workspace/api-zod";
import { DEFAULT_KEYWORDS } from "../lib/default-keywords";

const router: IRouter = Router();

async function ensureSeeded() {
  const existing = await db.select().from(keywordsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(keywordsTable).values(
      DEFAULT_KEYWORDS.map((kw) => ({
        id: randomUUID(),
        phrase: kw.phrase,
        score: kw.score,
        category: kw.category,
        enabled: true,
      }))
    );
  }
}

router.get("/keywords", async (req, res): Promise<void> => {
  await ensureSeeded();
  const keywords = await db
    .select()
    .from(keywordsTable)
    .orderBy(keywordsTable.score, keywordsTable.phrase);

  res.json(
    GetKeywordsResponse.parse({
      keywords: keywords.map((k) => ({
        id: k.id,
        phrase: k.phrase,
        score: k.score,
        category: k.category,
        enabled: k.enabled,
        created_at: k.createdAt.toISOString(),
      })),
      total: keywords.length,
    })
  );
});

router.post("/keywords", async (req, res): Promise<void> => {
  const body = CreateKeywordBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [kw] = await db
    .insert(keywordsTable)
    .values({
      id: randomUUID(),
      phrase: body.data.phrase.toLowerCase().trim(),
      score: body.data.score,
      category: body.data.category ?? "custom",
      enabled: true,
    })
    .returning();

  res.status(201).json({
    id: kw.id,
    phrase: kw.phrase,
    score: kw.score,
    category: kw.category,
    enabled: kw.enabled,
    created_at: kw.createdAt.toISOString(),
  });
});

router.post("/keywords/reset", async (_req, res): Promise<void> => {
  await db.delete(keywordsTable);
  await db.insert(keywordsTable).values(
    DEFAULT_KEYWORDS.map((kw) => ({
      id: randomUUID(),
      phrase: kw.phrase,
      score: kw.score,
      category: kw.category,
      enabled: true,
    }))
  );

  const keywords = await db
    .select()
    .from(keywordsTable)
    .orderBy(keywordsTable.score, keywordsTable.phrase);

  res.json(
    GetKeywordsResponse.parse({
      keywords: keywords.map((k) => ({
        id: k.id,
        phrase: k.phrase,
        score: k.score,
        category: k.category,
        enabled: k.enabled,
        created_at: k.createdAt.toISOString(),
      })),
      total: keywords.length,
    })
  );
});

router.patch("/keywords/:id", async (req, res): Promise<void> => {
  const params = UpdateKeywordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateKeywordBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof keywordsTable.$inferInsert> = {};
  if (body.data.phrase !== undefined) updates.phrase = body.data.phrase.toLowerCase().trim();
  if (body.data.score !== undefined) updates.score = body.data.score;
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.enabled !== undefined) updates.enabled = body.data.enabled;

  const [kw] = await db
    .update(keywordsTable)
    .set(updates)
    .where(eq(keywordsTable.id, params.data.id))
    .returning();

  if (!kw) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  res.json(
    UpdateKeywordResponse.parse({
      id: kw.id,
      phrase: kw.phrase,
      score: kw.score,
      category: kw.category,
      enabled: kw.enabled,
      created_at: kw.createdAt.toISOString(),
    })
  );
});

router.delete("/keywords/:id", async (req, res): Promise<void> => {
  const params = DeleteKeywordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(keywordsTable)
    .where(eq(keywordsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  res.json(DeleteKeywordResponse.parse({ deleted: true, id: params.data.id }));
});

export default router;
