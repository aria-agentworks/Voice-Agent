import { openai } from "@workspace/integrations-openai-ai-server";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface FaqEntry {
  question: string;
  answer: string;
}

interface BusinessConfig {
  businessName: string;
  businessType: string;
  greeting: string;
  instructions: string;
  hoursJson: string;
  servicesJson: string;
  faqJson?: string | null;
  scriptJson?: string | null;
  transferNumber?: string | null;
  timezone?: string | null;
}

interface HourEntry {
  open: string;
  close: string;
  closed: boolean;
}

const BUSINESS_TYPE_CONTEXT: Record<string, string> = {
  medical: "a medical office (general practice, family medicine, internal medicine)",
  dental: "a dental office (general dentistry, family dental practice)",
  legal: "a law office (legal services and consultations)",
  salon: "a beauty salon or spa (haircuts, coloring, spa treatments, facials)",
  restaurant: "a restaurant or food establishment (reservations, hours, menu inquiries)",
  general: "a business providing professional services",
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function isWithinBusinessHours(hoursJson: string, timezone?: string | null): boolean {
  try {
    const hours: Record<string, HourEntry> = JSON.parse(hoursJson);
    const tz = timezone || "America/New_York";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "";
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
    const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
    const currentMinutes = parseInt(hourPart) * 60 + parseInt(minutePart);

    const entry = hours[weekday];
    if (!entry || entry.closed) return false;

    const [openH, openM] = entry.open.split(":").map(Number);
    const [closeH, closeM] = entry.close.split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    return currentMinutes >= openMin && currentMinutes < closeMin;
  } catch {
    return true;
  }
}

export function getBusinessHoursSummary(hoursJson: string): string {
  try {
    const hours: Record<string, HourEntry> = JSON.parse(hoursJson);
    return DAYS.map((day) => {
      const entry = hours[day];
      if (!entry || entry.closed) return `${day}: Closed`;
      return `${day}: ${entry.open}–${entry.close}`;
    }).join(", ");
  } catch {
    return "";
  }
}

export async function generateVoiceResponse(
  userInput: string,
  config: BusinessConfig,
  history: ConversationMessage[]
): Promise<string> {
  let services: string[] = [];
  try {
    services = JSON.parse(config.servicesJson);
  } catch {}

  let faqs: FaqEntry[] = [];
  try {
    faqs = JSON.parse(config.faqJson ?? "[]");
  } catch {}

  const hoursStr = getBusinessHoursSummary(config.hoursJson);
  const businessTypeContext =
    BUSINESS_TYPE_CONTEXT[config.businessType] || BUSINESS_TYPE_CONTEXT.general;

  const wantsTransfer =
    history.some((m) => m.role === "assistant" && m.content.toLowerCase().includes("transfer you")) &&
    config.transferNumber;

  const faqSection =
    faqs.length > 0
      ? [
          "KNOWLEDGE BASE — use these exact answers when callers ask these questions:",
          ...faqs.map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`),
        ].join("\n")
      : "";

  const scriptSection = config.scriptJson?.trim()
    ? `CALL SCRIPT — follow this flow during the call:\n${config.scriptJson.trim()}`
    : "";

  const systemContent = [
    `You are the AI front desk assistant for ${config.businessName}, ${businessTypeContext}.`,
    services.length > 0 ? `Services offered: ${services.join(", ")}.` : "",
    hoursStr ? `Business hours: ${hoursStr}.` : "",
    config.instructions ? `Special instructions: ${config.instructions}` : "",
    faqSection,
    scriptSection,
    "",
    "CRITICAL RULES FOR PHONE CALLS:",
    "- Keep every response to 1-2 short sentences maximum. This is a phone call — be concise.",
    "- Be warm, professional, and helpful.",
    "- Do NOT use markdown, bullet points, numbered lists, or any text formatting.",
    "- Speak naturally as if you are talking on the phone.",
    "- If the caller wants to schedule an appointment, ask for their name and preferred date/time.",
    "- When confirming an appointment, repeat back the details clearly.",
    "- If a caller seems upset or distressed, express empathy before solving their issue.",
    "- If you cannot help with something specific, offer to take a message or transfer them.",
    "- When answering from the knowledge base, use the exact answer provided — do not improvise.",
    wantsTransfer ? `- The caller is being transferred. Say: "Connecting you now. Please hold."` : "",
    !wantsTransfer && config.transferNumber
      ? `- If the caller needs urgent help or insists on speaking to a person, say: "Let me transfer you to a staff member. Please hold."`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemContent },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: userInput },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 200,
    messages,
  });

  return (
    response.choices[0]?.message?.content ??
    "I'm sorry, I didn't catch that. Could you please repeat?"
  );
}
