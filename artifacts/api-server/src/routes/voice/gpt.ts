import { openai } from "@workspace/integrations-openai-ai-server";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface FaqEntry {
  question: string;
  answer: string;
}

export interface BusinessConfig {
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

function buildSystemPrompt(config: BusinessConfig, history: ConversationMessage[]): string {
  let services: string[] = [];
  try { services = JSON.parse(config.servicesJson); } catch {}

  let faqs: FaqEntry[] = [];
  try { faqs = JSON.parse(config.faqJson ?? "[]"); } catch {}

  const hoursStr = getBusinessHoursSummary(config.hoursJson);
  const businessTypeContext = BUSINESS_TYPE_CONTEXT[config.businessType] || BUSINESS_TYPE_CONTEXT.general;
  const wantsTransfer =
    history.some((m) => m.role === "assistant" && m.content.toLowerCase().includes("transfer you")) &&
    config.transferNumber;

  const faqSection =
    faqs.length > 0
      ? ["KNOWLEDGE BASE — use these exact answers when callers ask these questions:",
          ...faqs.map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`),
        ].join("\n")
      : "";

  const scriptSection = config.scriptJson?.trim()
    ? `CALL SCRIPT — follow this flow during the call:\n${config.scriptJson.trim()}`
    : "";

  return [
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
    "- When confirming an appointment, repeat back the details clearly.",
    "- If a caller seems upset or distressed, express empathy before solving their issue.",
    "- If you cannot help with something specific, offer to take a message or transfer them.",
    "- When answering from the knowledge base, use the exact answer provided — do not improvise.",
    wantsTransfer ? `- The caller is being transferred. Say: "Connecting you now. Please hold."` : "",
    !wantsTransfer && config.transferNumber
      ? `- If the caller needs urgent help or insists on speaking to a person, say: "Let me transfer you to a staff member. Please hold."`
      : "",
  ].filter(Boolean).join("\n");
}

const VOICE_TOOLS: Parameters<typeof openai.chat.completions.create>[0]["tools"] = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book or schedule an appointment for a caller. Use when the caller wants to schedule, book, or make an appointment.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Full name of the patient/caller" },
          patientPhone: { type: "string", description: "Phone number of the caller" },
          requestedDate: { type: "string", description: "Requested appointment date (e.g. 'tomorrow', 'Monday', 'June 15')" },
          requestedTime: { type: "string", description: "Requested appointment time (e.g. '2pm', '10:30am')" },
          reason: { type: "string", description: "Reason for the appointment or chief complaint" },
        },
        required: ["patientName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check appointment availability for a given date/time. Use when the caller asks about availability or open slots.",
      parameters: {
        type: "object",
        properties: {
          requestedDate: { type: "string", description: "Date to check availability for" },
          requestedTime: { type: "string", description: "Preferred time (optional)" },
          reason: { type: "string", description: "Reason or type of appointment" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description: "Cancel or reschedule an existing appointment. Use when the caller wants to cancel or change an appointment.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Name of the patient" },
          patientPhone: { type: "string", description: "Phone number" },
          requestedDate: { type: "string", description: "Date of the appointment to cancel" },
          requestedTime: { type: "string", description: "Time of the appointment to cancel" },
        },
        required: ["patientName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_patient",
      description: "Look up an existing patient or caller record. Use when the caller asks about their appointment, account, or existing records.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Name of the patient to look up" },
          patientPhone: { type: "string", description: "Phone number to look up" },
        },
        required: [],
      },
    },
  },
];

export async function generateVoiceResponse(
  userInput: string,
  config: BusinessConfig,
  history: ConversationMessage[]
): Promise<string> {
  const systemContent = buildSystemPrompt(config, history);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemContent },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
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

export async function generateVoiceResponseWithFunctions(
  userInput: string,
  config: BusinessConfig,
  history: ConversationMessage[],
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<string>
): Promise<string> {
  const systemContent = buildSystemPrompt(config, history);

  const messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  }> = [
    { role: "system", content: systemContent },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userInput },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 300,
    messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
    tools: VOICE_TOOLS,
    tool_choice: "auto",
  });

  const choice = response.choices[0];
  if (!choice) return "I'm sorry, I didn't catch that. Could you please repeat?";

  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0];
    if (!toolCall) return choice.message.content ?? "I'm sorry, I didn't catch that. Could you please repeat?";

    let args: Record<string, unknown> = {};
    try { args = JSON.parse(toolCall.function.arguments); } catch {}

    const toolResult = await onToolCall(toolCall.function.name, args);

    const followUpMessages = [
      ...messages,
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [{ id: toolCall.id, type: "function" as const, function: { name: toolCall.function.name, arguments: toolCall.function.arguments } }],
      },
      {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: toolResult,
      },
    ];

    const followUp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: followUpMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
    });

    return followUp.choices[0]?.message?.content ?? toolResult;
  }

  return choice.message.content ?? "I'm sorry, I didn't catch that. Could you please repeat?";
}
