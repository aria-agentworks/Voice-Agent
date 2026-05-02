import { Router } from "express";
import { db } from "@workspace/db";
import { voiceCalls } from "@workspace/db";
import { sql, and, gte, eq, or } from "drizzle-orm";

const router = Router();

router.get("/voice/analytics", async (req, res) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  try {
    const hourlyRaw = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${voiceCalls.startedAt})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(voiceCalls)
      .groupBy(sql`EXTRACT(HOUR FROM ${voiceCalls.startedAt})`);

    const hourlyMap = new Map(hourlyRaw.map((r) => [Number(r.hour), Number(r.count)]));
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourlyMap.get(h) ?? 0,
    }));

    const dailyRaw = await db
      .select({
        date: sql<string>`TO_CHAR(${voiceCalls.startedAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
        inbound: sql<number>`SUM(CASE WHEN ${voiceCalls.direction} = 'inbound' THEN 1 ELSE 0 END)::int`,
        outbound: sql<number>`SUM(CASE WHEN ${voiceCalls.direction} = 'outbound' THEN 1 ELSE 0 END)::int`,
      })
      .from(voiceCalls)
      .where(gte(voiceCalls.startedAt, since))
      .groupBy(sql`TO_CHAR(${voiceCalls.startedAt}, 'YYYY-MM-DD')`);

    const dailyMap = new Map(dailyRaw.map((r) => [r.date, r]));
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      daily.push({
        date: key,
        count: Number(entry?.count ?? 0),
        inbound: Number(entry?.inbound ?? 0),
        outbound: Number(entry?.outbound ?? 0),
      });
    }

    const peakEntry = hourly.reduce((a, b) => (b.count > a.count ? b : a), { hour: 0, count: 0 });
    const peakHour = peakEntry.count > 0 ? peakEntry.hour : null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ missed }] = await db
      .select({ missed: sql<number>`COUNT(*)::int` })
      .from(voiceCalls)
      .where(
        and(
          gte(voiceCalls.startedAt, todayStart),
          or(
            eq(voiceCalls.status, "no-answer"),
            eq(voiceCalls.status, "failed"),
            eq(voiceCalls.status, "busy")
          )
        )
      );

    return res.json({
      hourly,
      daily,
      peakHour,
      missedToday: Number(missed ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting voice analytics");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
