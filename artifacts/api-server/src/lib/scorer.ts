export function score(text: string): number {
  const t = text.toLowerCase();

  if (t.includes("need help")) return 10;
  if (t.includes("looking for") && (t.includes("tool") || t.includes("software") || t.includes("app"))) return 10;
  if (t.includes("recommend") && (t.includes("tool") || t.includes("software"))) return 9;
  if (t.includes("best tool") || t.includes("best software") || t.includes("best app")) return 9;
  if (t.includes("looking for")) return 9;
  if (t.includes("how do i") || t.includes("how can i")) return 8;
  if (t.includes("tool") || t.includes("software") || t.includes("app")) return 8;
  if (t.includes("recommend") || t.includes("suggestion")) return 7;
  if (t.includes("automate") || t.includes("automation")) return 7;
  if (t.includes("help me") || t.includes("anyone know")) return 6;
  if (t.includes("alternatives") || t.includes("alternative to")) return 6;
  if (t.includes("trying to") || t.includes("want to")) return 5;
  if (t.includes("issue") || t.includes("problem") || t.includes("struggling")) return 4;

  return 3;
}

export function intentLabel(score: number): string {
  if (score >= 8) return "High Intent";
  if (score >= 5) return "Medium Intent";
  return "Low Intent";
}
