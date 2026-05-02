export interface DefaultKeyword {
  phrase: string;
  score: number;
  category: string;
}

export const DEFAULT_KEYWORDS: DefaultKeyword[] = [
  // High Intent (9-10) — strong buying/tool-seeking signals
  { phrase: "need help with", score: 10, category: "high" },
  { phrase: "looking for a tool", score: 10, category: "high" },
  { phrase: "looking for software", score: 10, category: "high" },
  { phrase: "looking for an app", score: 10, category: "high" },
  { phrase: "best tool for", score: 9, category: "high" },
  { phrase: "best software for", score: 9, category: "high" },
  { phrase: "best app for", score: 9, category: "high" },
  { phrase: "recommend a tool", score: 9, category: "high" },
  { phrase: "recommend software", score: 9, category: "high" },
  { phrase: "anyone know a tool", score: 9, category: "high" },
  { phrase: "what do you use for", score: 9, category: "high" },
  { phrase: "how do you automate", score: 9, category: "high" },
  { phrase: "need to automate", score: 9, category: "high" },
  { phrase: "looking to automate", score: 9, category: "high" },
  { phrase: "is there a tool", score: 9, category: "high" },
  { phrase: "is there software", score: 9, category: "high" },

  // Medium-High Intent (7-8) — evaluating options or describing pain
  { phrase: "looking for", score: 8, category: "medium" },
  { phrase: "how do i", score: 8, category: "medium" },
  { phrase: "how can i", score: 8, category: "medium" },
  { phrase: "alternatives to", score: 8, category: "medium" },
  { phrase: "alternative to", score: 8, category: "medium" },
  { phrase: "switched from", score: 8, category: "medium" },
  { phrase: "replace", score: 7, category: "medium" },
  { phrase: "recommend", score: 7, category: "medium" },
  { phrase: "suggestion", score: 7, category: "medium" },
  { phrase: "automate", score: 7, category: "medium" },
  { phrase: "automation", score: 7, category: "medium" },
  { phrase: "workflow", score: 7, category: "medium" },
  { phrase: "too expensive", score: 7, category: "medium" },
  { phrase: "cheaper alternative", score: 8, category: "medium" },
  { phrase: "free alternative", score: 8, category: "medium" },
  { phrase: "open source alternative", score: 7, category: "medium" },
  { phrase: "self-hosted", score: 7, category: "medium" },
  { phrase: "pricing is too high", score: 7, category: "medium" },

  // Low-Medium Intent (5-6) — general pain/problem awareness
  { phrase: "help me", score: 6, category: "low" },
  { phrase: "anyone know", score: 6, category: "low" },
  { phrase: "trying to", score: 5, category: "low" },
  { phrase: "want to", score: 5, category: "low" },
  { phrase: "struggling with", score: 6, category: "low" },
  { phrase: "frustrated with", score: 6, category: "low" },
  { phrase: "tired of", score: 6, category: "low" },
  { phrase: "problem with", score: 5, category: "low" },
  { phrase: "issue with", score: 5, category: "low" },
  { phrase: "pain point", score: 6, category: "low" },
  { phrase: "wish there was", score: 7, category: "medium" },
  { phrase: "why is there no", score: 7, category: "medium" },
  { phrase: "does anyone", score: 5, category: "low" },
  { phrase: "can anyone", score: 5, category: "low" },
];
