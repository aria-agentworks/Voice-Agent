import { logger } from "./logger";
import { score, intentLabel } from "./scorer";
import { createHash } from "crypto";

export interface RawLead {
  source: string;
  text: string;
  url: string | null;
  contact: string | null;
  subreddit: string | null;
  author: string | null;
  created_at: string;
}

export interface ScoredLead extends RawLead {
  id: string;
  intent_score: number;
  intent_label: string;
  saved: boolean;
}

const QUERIES = [
  "need help with tool",
  "looking for software",
  "recommend a tool",
  "best app for",
  "automate my workflow",
  "alternatives to",
  "struggling with",
];

const SUBREDDITS = [
  "entrepreneur",
  "smallbusiness",
  "SideProject",
  "startups",
  "productivity",
];

function makeId(text: string, url: string | null): string {
  return createHash("md5")
    .update(`${text}${url ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

export async function fetchRedditLeads(): Promise<ScoredLead[]> {
  const results: ScoredLead[] = [];
  const seen = new Set<string>();

  for (const query of QUERIES) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10`;
      const res = await fetch(url, {
        headers: { "User-Agent": "intent-engine/1.0" },
      });

      if (!res.ok) {
        logger.warn({ status: res.status, query }, "Reddit fetch failed");
        continue;
      }

      const data = (await res.json()) as {
        data: { children: Array<{ data: Record<string, unknown> }> };
      };

      for (const child of data.data.children) {
        const post = child.data;
        const title = String(post.title ?? "");
        const selftext = String(post.selftext ?? "");
        const fullText = `${title} ${selftext}`.trim();
        const postUrl = post.url ? String(post.url) : null;

        const id = makeId(fullText, postUrl);
        if (seen.has(id)) continue;
        seen.add(id);

        const intentScore = score(fullText);
        results.push({
          id,
          source: "reddit",
          text: fullText.slice(0, 500),
          url: postUrl,
          contact: null,
          subreddit: post.subreddit ? String(post.subreddit) : null,
          author: post.author ? String(post.author) : null,
          created_at: new Date(Number(post.created_utc ?? 0) * 1000).toISOString(),
          intent_score: intentScore,
          intent_label: intentLabel(intentScore),
          saved: false,
        });
      }
    } catch (err) {
      logger.error({ err, query }, "Error fetching Reddit leads");
    }
  }

  // Also search in subreddits
  for (const subreddit of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=15`;
      const res = await fetch(url, {
        headers: { "User-Agent": "intent-engine/1.0" },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as {
        data: { children: Array<{ data: Record<string, unknown> }> };
      };

      for (const child of data.data.children) {
        const post = child.data;
        const title = String(post.title ?? "");
        const selftext = String(post.selftext ?? "");
        const fullText = `${title} ${selftext}`.trim();
        const postUrl = post.url ? String(post.url) : null;

        const id = makeId(fullText, postUrl);
        if (seen.has(id)) continue;
        seen.add(id);

        const intentScore = score(fullText);
        if (intentScore < 5) continue; // Only include medium/high intent from subreddit browsing

        results.push({
          id,
          source: "reddit",
          text: fullText.slice(0, 500),
          url: postUrl,
          contact: null,
          subreddit: post.subreddit ? String(post.subreddit) : null,
          author: post.author ? String(post.author) : null,
          created_at: new Date(Number(post.created_utc ?? 0) * 1000).toISOString(),
          intent_score: intentScore,
          intent_label: intentLabel(intentScore),
          saved: false,
        });
      }
    } catch (err) {
      logger.error({ err, subreddit }, "Error fetching subreddit leads");
    }
  }

  return results.sort((a, b) => b.intent_score - a.intent_score);
}

export function getExampleLeads(): ScoredLead[] {
  const examples = [
    {
      text: "Looking for a tool to automate my outreach workflow — any recommendations?",
      url: "https://reddit.com/r/entrepreneur/example1",
      subreddit: "entrepreneur",
      author: "startup_founder_23",
    },
    {
      text: "Need help finding software that can scrape leads and score them by intent. Tried a few but they're all overpriced.",
      url: "https://reddit.com/r/smallbusiness/example2",
      subreddit: "smallbusiness",
      author: "solo_ops",
    },
    {
      text: "Best app for tracking inbound leads from multiple sources in one place?",
      url: "https://reddit.com/r/SideProject/example3",
      subreddit: "SideProject",
      author: "buildinpublic",
    },
    {
      text: "Recommend a good alternative to Hunter.io — struggling with deliverability and cost",
      url: "https://reddit.com/r/startups/example4",
      subreddit: "startups",
      author: "saas_grinder",
    },
    {
      text: "How do I automate cold outreach without getting flagged as spam? Looking for a solid workflow.",
      url: "https://reddit.com/r/productivity/example5",
      subreddit: "productivity",
      author: "growth_hacking_daily",
    },
  ];

  return examples.map((ex, i) => {
    const intentScore = score(ex.text);
    return {
      id: makeId(ex.text, ex.url),
      source: "reddit",
      text: ex.text,
      url: ex.url,
      contact: null,
      subreddit: ex.subreddit,
      author: ex.author,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      intent_score: intentScore,
      intent_label: intentLabel(intentScore),
      saved: false,
    };
  });
}
