import { openai } from "@workspace/integrations-openai-ai-server";

export interface LeadAnalysis {
  lead_id: string;
  summary: string;
  pain_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  urgency: "LOW" | "MEDIUM" | "HIGH";
  tech_level: "NON_TECHNICAL" | "TECHNICAL" | "DEVELOPER";
  recommended_channel: "POST_REPLY" | "EMAIL" | "DM";
  recommended_style: "EMPATHETIC" | "DIRECT" | "CURIOSITY";
  reasoning: string;
  key_angles: string[];
  avoid: string[];
  opening_hook: string;
}

const SYSTEM_PROMPT = `You are an expert B2B outreach strategist. You analyze social media posts and forum threads from potential buyers to determine the ideal outreach strategy.

Given a lead post, respond ONLY with valid JSON matching this exact structure:
{
  "summary": "One sentence: what this person actually needs right now",
  "pain_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "urgency": "LOW|MEDIUM|HIGH",
  "tech_level": "NON_TECHNICAL|TECHNICAL|DEVELOPER",
  "recommended_channel": "POST_REPLY|EMAIL|DM",
  "recommended_style": "EMPATHETIC|DIRECT|CURIOSITY",
  "reasoning": "2-3 sentences explaining WHY this style and channel will work best for this specific person",
  "key_angles": ["Angle 1 to hit", "Angle 2 to hit", "Angle 3 to hit"],
  "avoid": ["Thing to avoid 1", "Thing to avoid 2"],
  "opening_hook": "The exact first sentence you'd open with — must feel personal, not generic"
}

Pain levels:
- CRITICAL: They're actively blocked, losing money/time, need solution NOW
- HIGH: Clearly frustrated, actively searching, comparing options
- MEDIUM: Exploring alternatives, not in crisis
- LOW: Early research, gathering info

Urgency: how soon they need to move. HIGH = this week. MEDIUM = this month. LOW = exploring.

Channel:
- POST_REPLY: Best default — public, builds credibility with other readers too
- EMAIL: Only if enrichment found email and post text is private/niche
- DM: If the post is very personal or they've expressed strong emotion

Style:
- EMPATHETIC: Lead is frustrated, venting, or asking for help after suffering
- DIRECT: Lead knows what they want and is comparing options — cut to the chase
- CURIOSITY: Lead is early-stage or undecided — a question opens dialogue

Avoid list: specific phrases/approaches that would feel tone-deaf or salesy given this person's post.`;

export async function analyzeLead(
  leadId: string,
  text: string,
  source: string,
  author: string | null,
  enrichmentContext?: {
    emails: string[];
    company: string | null;
    bio: string | null;
  }
): Promise<LeadAnalysis> {
  const contextParts: string[] = [];
  if (author) contextParts.push(`Author: ${author}`);
  if (source) contextParts.push(`Source: ${source}`);
  if (enrichmentContext?.company) contextParts.push(`Company: ${enrichmentContext.company}`);
  if (enrichmentContext?.emails?.length) contextParts.push(`Has email: yes`);
  if (enrichmentContext?.bio) contextParts.push(`Bio: ${enrichmentContext.bio.slice(0, 200)}`);

  const userMessage = [
    `POST TEXT:\n"${text}"`,
    contextParts.length > 0 ? `\nCONTEXT:\n${contextParts.join("\n")}` : "",
  ].join("");

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let parsed: Omit<LeadAnalysis, "lead_id">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      summary: "Could not parse analysis.",
      pain_level: "MEDIUM",
      urgency: "MEDIUM",
      tech_level: "NON_TECHNICAL",
      recommended_channel: "POST_REPLY",
      recommended_style: "EMPATHETIC",
      reasoning: "Fallback to empathetic post reply.",
      key_angles: ["Understand their need", "Offer value first", "Keep it brief"],
      avoid: ["Hard selling", "Generic pitches"],
      opening_hook: "Saw your post — this sounds familiar.",
    };
  }

  return { lead_id: leadId, ...parsed };
}
