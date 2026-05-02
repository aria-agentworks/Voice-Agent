export function generateResponse(text: string, source: string): string {
  const t = text.toLowerCase();

  const intro = `Saw your ${source === "reddit" ? "post" : "listing"} — `;

  if (t.includes("need help")) {
    return `${intro}sounds like you could use a better workflow. I built something that handles exactly this. Want me to show you how it works?`;
  }
  if (t.includes("looking for") && (t.includes("tool") || t.includes("software"))) {
    return `${intro}you're looking for exactly what I've built. It handles this without the usual headaches. Happy to give you a quick walkthrough if you're interested.`;
  }
  if (t.includes("recommend") || t.includes("suggestion")) {
    return `${intro}I've been in the same spot. Built a tool specifically for this — no bloat, just what you need. Want to take a look?`;
  }
  if (t.includes("automate") || t.includes("automation")) {
    return `${intro}automation is exactly the right call here. I made something that does this out of the box. Worth a 10-minute chat if you're open to it.`;
  }
  if (t.includes("alternatives") || t.includes("alternative")) {
    return `${intro}if you're looking for alternatives, I might have what you need. Built it after running into the same wall. Let me know if you want to compare notes.`;
  }
  if (t.includes("struggling") || t.includes("problem") || t.includes("issue")) {
    return `${intro}this is a common pain point. I've been solving it with a tool I built — might save you a lot of time. Want me to walk you through it?`;
  }

  return `${intro}came across this and thought I could help. I built a tool that might solve exactly what you're dealing with. Happy to share more if you're interested.`;
}
