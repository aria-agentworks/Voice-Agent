export interface ReplyVariant {
  label: string;
  style: string;
  message: string;
}

interface LeadContext {
  intentType: "looking_for_tool" | "alternatives" | "recommendation" | "struggling" | "automation" | "general";
  specificTool: string | null;
  painPoint: string | null;
  triedSomething: string | null;
  urgency: boolean;
  platform: "reddit" | "hacker_news" | "twitter" | "other";
}

const TOOL_MENTIONS = [
  "salesforce", "hubspot", "pipedrive", "airtable", "notion", "hunter", "apollo",
  "outreach", "salesloft", "mailchimp", "intercom", "zapier", "make", "monday",
  "linear", "jira", "asana", "clickup", "slack", "zoom", "calendly", "typeform",
  "lemlist", "instantly", "smartlead", "reply.io", "woodpecker", "close.io",
];

const PAIN_SIGNALS: Record<string, string> = {
  "overpriced": "the cost",
  "expensive": "the cost",
  "too costly": "the pricing",
  "complex": "the complexity",
  "complicated": "how complex it is",
  "hard to use": "the learning curve",
  "time.consuming": "how much time it takes",
  "slow": "the speed",
  "broken": "the reliability issues",
  "doesn't work": "the reliability",
  "spam": "deliverability",
  "deliverability": "deliverability",
  "false positive": "the accuracy",
  "inaccurate": "the accuracy",
};

function extractContext(text: string, source: string): LeadContext {
  const t = text.toLowerCase();

  // Intent type
  let intentType: LeadContext["intentType"] = "general";
  if (t.includes("alternative") || t.includes("switch from") || t.includes("replace")) {
    intentType = "alternatives";
  } else if (t.includes("recommend") || t.includes("suggestion") || t.includes("what do you use") || t.includes("anyone use")) {
    intentType = "recommendation";
  } else if (t.includes("looking for") || t.includes("need a tool") || t.includes("need software") || t.includes("searching for")) {
    intentType = "looking_for_tool";
  } else if (t.includes("automate") || t.includes("automation") || t.includes("workflow")) {
    intentType = "automation";
  } else if (t.includes("struggling") || t.includes("problem") || t.includes("issue") || t.includes("frustrated") || t.includes("pain")) {
    intentType = "struggling";
  }

  // Specific tool mentioned
  let specificTool: string | null = null;
  for (const tool of TOOL_MENTIONS) {
    if (t.includes(tool)) {
      specificTool = tool.charAt(0).toUpperCase() + tool.slice(1);
      break;
    }
  }

  // Pain point
  let painPoint: string | null = null;
  for (const [signal, label] of Object.entries(PAIN_SIGNALS)) {
    if (t.includes(signal)) {
      painPoint = label;
      break;
    }
  }

  // Tried something
  let triedSomething: string | null = null;
  const triedPatterns = ["tried", "using", "been using", "currently use", "we use"];
  for (const p of triedPatterns) {
    if (t.includes(p)) {
      triedSomething = specificTool ? `${specificTool}` : "a few options";
      break;
    }
  }

  // Urgency
  const urgency = t.includes("asap") || t.includes("urgent") || t.includes("this week") || t.includes("need now") || t.includes("quickly");

  // Platform
  const platform = source === "reddit" ? "reddit"
    : source === "hacker_news" ? "hacker_news"
    : source === "twitter" ? "twitter"
    : "other";

  return { intentType, specificTool, painPoint, triedSomething, urgency, platform };
}

function buildEmpathetic(ctx: LeadContext): string {
  const isHN = ctx.platform === "hacker_news";
  const opener = isHN ? "Completely understand this one." : "Been there.";

  let body = "";

  if (ctx.intentType === "alternatives" && ctx.specificTool) {
    body = `We switched away from ${ctx.specificTool} for the same reason${ctx.painPoint ? ` — ${ctx.painPoint} was the tipping point` : ""}. Built our own solution after nothing else fit the bill.`;
  } else if (ctx.intentType === "struggling" && ctx.painPoint) {
    body = `${ctx.painPoint === "the cost" ? "The pricing on most tools in this space" : `The ${ctx.painPoint} problem`} is genuinely frustrating — especially when you're already stretched thin.`;
  } else if (ctx.intentType === "looking_for_tool" || ctx.intentType === "recommendation") {
    body = `Finding something that actually fits without a six-month integration headache is harder than it should be.`;
  } else if (ctx.intentType === "automation") {
    body = `Automating this properly is trickier than vendors make it look — most tools handle 80% of the workflow and leave the rest to you.`;
  } else {
    body = `This is a problem more people run into than admit.`;
  }

  const cta = ctx.urgency
    ? `I built a tool specifically for this use case — happy to give you a quick demo this week if timing works.`
    : `I built something that handles this end-to-end. Happy to walk you through it — no pitch, just show you if it's a fit.`;

  return `${opener} ${body} ${cta}`;
}

function buildDirect(ctx: LeadContext): string {
  let hook = "";

  if (ctx.intentType === "alternatives" && ctx.specificTool) {
    hook = `If ${ctx.specificTool} isn't cutting it${ctx.painPoint ? ` because of ${ctx.painPoint}` : ""}, here's what we built instead:`;
  } else if (ctx.intentType === "looking_for_tool") {
    hook = `What you're describing is exactly what we built this for:`;
  } else if (ctx.intentType === "automation") {
    hook = `We handle this automation out of the box —`;
  } else if (ctx.intentType === "recommendation") {
    hook = `Short answer: here's what actually works for this:`;
  } else if (ctx.intentType === "struggling") {
    hook = `There's a faster way to fix this:`;
  } else {
    hook = `Quick thought on this:`;
  }

  const value = ctx.painPoint
    ? `We built it specifically to solve ${ctx.painPoint} — no contracts, no bloat, just the functionality you need.`
    : `We focused on making this frictionless — setup takes minutes and you're not paying for features you won't use.`;

  const cta = ctx.urgency
    ? `Can send you a walkthrough today if you want to move quickly.`
    : `Worth taking 10 minutes to look? Happy to share more.`;

  return `${hook} ${value} ${cta}`;
}

function buildCuriosity(ctx: LeadContext): string {
  const isHN = ctx.platform === "hacker_news";

  let question = "";

  if (ctx.intentType === "alternatives" && ctx.specificTool) {
    question = `What specifically isn't working with ${ctx.specificTool}${ctx.painPoint ? ` — is it mainly ${ctx.painPoint}` : ""}?`;
  } else if (ctx.intentType === "looking_for_tool") {
    question = `What's the one thing that's made all the tools you've looked at so far miss the mark?`;
  } else if (ctx.intentType === "automation") {
    question = `Is the goal to reduce manual steps, or is it more about connecting tools that don't talk to each other?`;
  } else if (ctx.intentType === "recommendation") {
    question = `What does your current setup look like? Would help me point you toward the right fit.`;
  } else if (ctx.intentType === "struggling") {
    question = `How long have you been dealing with this${ctx.painPoint ? ` — is ${ctx.painPoint} the main blocker` : ""}?`;
  } else {
    question = `What's the core problem you're trying to solve here?`;
  }

  const bridge = isHN
    ? `I ask because I ran into the same thing and ended up building a tool around it.`
    : `I ask because I was in the same spot and ended up building something to fix it.`;

  const cta = `If the problem is what I think it is, I can probably show you how we solved it in about 10 minutes.`;

  return `${question} ${bridge} ${cta}`;
}

export function generateVariants(text: string, source: string): ReplyVariant[] {
  const ctx = extractContext(text, source);

  return [
    {
      label: "EMPATHETIC",
      style: "Leads with understanding — builds trust before offering help",
      message: buildEmpathetic(ctx),
    },
    {
      label: "DIRECT",
      style: "Leads with value — short, punchy, straight to the point",
      message: buildDirect(ctx),
    },
    {
      label: "CURIOSITY",
      style: "Leads with a question — opens conversation, feels human",
      message: buildCuriosity(ctx),
    },
  ];
}

export function generateResponse(text: string, source: string): string {
  const variants = generateVariants(text, source);
  return variants[0].message;
}
