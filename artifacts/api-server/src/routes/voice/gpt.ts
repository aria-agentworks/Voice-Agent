import { openai } from "@workspace/integrations-openai-ai-server";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessConfig {
  businessName: string;
  businessType: string;
  greeting: string;
  instructions: string;
  hoursJson: string;
  servicesJson: string;
  transferNumber?: string | null;
}

const BUSINESS_TYPE_CONTEXT: Record<string, string> = {
  medical: "a medical office (general practice, family medicine, internal medicine)",
  dental: "a dental office (general dentistry, family dental practice)",
  legal: "a law office (legal services and consultations)",
  salon: "a beauty salon or spa (haircuts, coloring, spa treatments, facials)",
  restaurant: "a restaurant or food establishment (reservations, hours, menu inquiries)",
  general: "a business providing professional services",
};

export async function generateVoiceResponse(
  userInput: string,
  config: BusinessConfig,
  history: ConversationMessage[]
): Promise<string> {
  let services: string[] = [];
  try {
    services = JSON.parse(config.servicesJson);
  } catch {}

  let hoursStr = "";
  try {
    const hours = JSON.parse(config.hoursJson);
    const entries = Object.entries(hours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(", ");
    hoursStr = entries;
  } catch {}

  const businessTypeContext =
    BUSINESS_TYPE_CONTEXT[config.businessType] || BUSINESS_TYPE_CONTEXT.general;

  const systemContent = [
    `You are the AI front desk assistant for ${config.businessName}, ${businessTypeContext}.`,
    services.length > 0
      ? `Services offered: ${services.join(", ")}.`
      : "",
    hoursStr ? `Business hours: ${hoursStr}.` : "",
    config.instructions ? `Special instructions: ${config.instructions}` : "",
    "",
    "CRITICAL RULES FOR PHONE CALLS:",
    "- Keep every response to 1-2 short sentences. This is a phone call — be brief.",
    "- Be warm, professional, and helpful.",
    "- Do NOT use markdown, bullet points, lists, or any formatting.",
    "- Speak naturally as if talking on the phone.",
    "- If the caller wants to schedule an appointment, ask for their name and preferred time.",
    "- If you cannot help, say you will transfer them to a staff member.",
    config.transferNumber
      ? `- To transfer, say: "Let me transfer you now. Please hold."`
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
    model: "gpt-5-mini",
    max_completion_tokens: 200,
    messages,
  });

  return (
    response.choices[0]?.message?.content ??
    "I'm sorry, I didn't catch that. Could you please repeat?"
  );
}
