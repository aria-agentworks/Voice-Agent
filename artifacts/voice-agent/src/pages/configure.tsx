import { useState, useEffect } from "react";
import {
  useGetVoiceConfig,
  useUpdateVoiceConfig,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Stethoscope, Smile, Scale, UtensilsCrossed, Scissors, Building2,
  Plus, Trash2, ChevronDown, ChevronUp, HelpCircle, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BUSINESS_TEMPLATES = [
  {
    type: "medical",
    label: "Medical",
    icon: Stethoscope,
    greeting: "Thank you for calling {name}. This is our AI assistant. How can I help you today?",
    instructions: "Help patients schedule appointments, answer questions about our services, and take messages. If urgent, offer to transfer to on-call staff.",
    faqs: [
      { question: "Do you accept new patients?", answer: "Yes, we are currently accepting new patients. We'd be happy to schedule you for an initial consultation." },
      { question: "What insurance do you accept?", answer: "We accept most major insurance plans. Please bring your insurance card to your appointment and we'll verify your coverage." },
      { question: "How do I request a prescription refill?", answer: "Prescription refills can be requested by calling us during office hours or through our patient portal. Please allow 48 hours for processing." },
    ],
    script: "1. Greet the caller warmly and identify yourself as the AI assistant.\n2. Ask how you can help them today.\n3. If scheduling: collect name, date of birth, preferred date/time, reason for visit, and insurance info.\n4. If urgent medical concern: express empathy and offer to transfer to clinical staff or advise them to call 911 if emergency.\n5. Confirm appointment details and provide office address if needed.\n6. Thank them and say goodbye.",
  },
  {
    type: "dental",
    label: "Dental",
    icon: Smile,
    greeting: "Thank you for calling {name} Dental. How can I assist you today?",
    instructions: "Help patients schedule cleanings, exams, and emergency appointments. Answer questions about our dental services and insurance.",
    faqs: [
      { question: "How much does a cleaning cost?", answer: "A routine cleaning and exam typically costs between $150 and $300 depending on your insurance. We can provide an exact quote after verifying your coverage." },
      { question: "Do you handle dental emergencies?", answer: "Yes, we reserve same-day slots for dental emergencies. Please call us first thing in the morning and we will do our best to see you." },
      { question: "Do you offer teeth whitening?", answer: "Yes, we offer both in-office professional whitening and take-home whitening kits. Prices start at $200 for take-home kits." },
    ],
    script: "1. Greet caller and identify as AI assistant for the dental office.\n2. Determine if this is a new or existing patient.\n3. If scheduling: collect name, preferred date, type of appointment (cleaning, exam, emergency, cosmetic).\n4. If pain or emergency: show empathy and offer earliest available slot or same-day if available.\n5. Confirm appointment and let them know what to bring (ID, insurance card).\n6. Thank them and close the call.",
  },
  {
    type: "legal",
    label: "Legal",
    icon: Scale,
    greeting: "Thank you for calling {name}. How may I direct your call?",
    instructions: "Schedule consultations, take case inquiry messages, answer basic questions. For urgent legal matters, offer to transfer.",
    faqs: [
      { question: "How much do you charge for a consultation?", answer: "Initial consultations are typically free for the first 30 minutes. We can discuss our fee structure in detail during that meeting." },
      { question: "What types of cases do you handle?", answer: "We handle a wide range of cases. I can take down your details and have one of our attorneys contact you to discuss your specific situation." },
      { question: "How long will my case take?", answer: "Case timelines vary greatly depending on the type and complexity. An attorney will be able to give you a better estimate after reviewing your case." },
    ],
    script: "1. Greet caller professionally.\n2. Ask if they are an existing client or a new inquiry.\n3. For new inquiries: gather their name, contact number, and brief description of their legal matter.\n4. For existing clients: take a message with name, case reference if known, and best callback time.\n5. Let them know an attorney will return their call within 1 business day.\n6. Do NOT give legal advice — only collect information and schedule callbacks.",
  },
  {
    type: "restaurant",
    label: "Restaurant",
    icon: UtensilsCrossed,
    greeting: "Thanks for calling {name}! How can I help you?",
    instructions: "Take reservations, answer questions about hours, menu, and specials. For large parties, collect contact info.",
    faqs: [
      { question: "What are your hours?", answer: "We are open Monday through Thursday from 11am to 10pm, Friday and Saturday from 11am to 11pm, and Sunday from 12pm to 9pm." },
      { question: "Do you take reservations?", answer: "Yes, we accept reservations for parties of all sizes. I can book one for you right now — just let me know your preferred date, time, and party size." },
      { question: "Do you have vegetarian or vegan options?", answer: "Yes, we have a dedicated section on our menu for vegetarian and vegan dishes. Our chef can also accommodate most dietary restrictions with advance notice." },
    ],
    script: "1. Greet caller with energy and friendliness.\n2. Ask if they'd like to make a reservation or have a question.\n3. For reservations: collect date, time, party size, name, and phone number.\n4. For questions: answer from knowledge base.\n5. For large parties (8+): note it as a special event and take contact info for the manager to follow up.\n6. Confirm any reservation details and thank them.",
  },
  {
    type: "salon",
    label: "Salon",
    icon: Scissors,
    greeting: "Thank you for calling {name}. How can I help you today?",
    instructions: "Book appointments for our services, answer questions about pricing and availability.",
    faqs: [
      { question: "How much does a haircut cost?", answer: "Haircuts start at $45 for a basic cut and style. Prices vary based on length and the stylist you choose. I can give you an exact quote when we discuss the services you're looking for." },
      { question: "Do you do color treatments?", answer: "Yes, we offer a full range of color services including highlights, balayage, full color, and color correction. Color services start at $80." },
      { question: "How far in advance should I book?", answer: "We recommend booking at least 3 to 5 days in advance, especially for weekends. Color appointments should be booked at least a week ahead." },
    ],
    script: "1. Greet caller warmly.\n2. Ask if they're looking to book an appointment or have a question.\n3. For bookings: ask what service they're interested in, their name, and preferred date/time.\n4. Confirm the appointment details.\n5. Let them know they'll receive a reminder call the day before.\n6. Thank them and say goodbye.",
  },
  {
    type: "general",
    label: "General",
    icon: Building2,
    greeting: "Thank you for calling {name}. How can I assist you?",
    instructions: "Answer questions about our services and take messages for the team.",
    faqs: [
      { question: "What are your business hours?", answer: "We are open Monday through Friday from 9am to 5pm. We are closed on weekends and public holidays." },
      { question: "How can I get a quote?", answer: "I'd be happy to help with that. Let me take down your details and have someone from our team follow up with a customized quote." },
    ],
    script: "1. Greet the caller and identify the business.\n2. Ask how you can help them.\n3. Answer questions from the knowledge base where possible.\n4. For complex requests or sales inquiries, collect name and callback number.\n5. Thank them for calling and close warmly.",
  },
];

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "onyx", label: "Onyx" },
  { value: "nova", label: "Nova (default)" },
  { value: "shimmer", label: "Shimmer" },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

type Hours = Record<string, { open: string; close: string; closed: boolean }>;
type FaqEntry = { question: string; answer: string };

function parseHours(json: string): Hours {
  try {
    return JSON.parse(json);
  } catch {
    return Object.fromEntries(
      DAYS.map((d) => [d, { open: "09:00", close: "17:00", closed: d === "sunday" }])
    );
  }
}

function parseServices(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

function parseFaq(json: string): FaqEntry[] {
  try { return JSON.parse(json); } catch { return []; }
}

function FaqEditor({ faqs, onChange }: { faqs: FaqEntry[]; onChange: (f: FaqEntry[]) => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const add = () => {
    const q = newQ.trim();
    const a = newA.trim();
    if (!q || !a) return;
    const updated = [...faqs, { question: q, answer: a }];
    onChange(updated);
    setNewQ("");
    setNewA("");
    setExpanded(updated.length - 1);
  };

  const remove = (i: number) => {
    onChange(faqs.filter((_, idx) => idx !== i));
    if (expanded === i) setExpanded(null);
  };

  const update = (i: number, field: "question" | "answer", value: string) => {
    onChange(faqs.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));
  };

  return (
    <div className="space-y-3">
      {faqs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No FAQ entries yet. Add your first one below.
        </p>
      )}

      {faqs.map((faq, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors">
            <button
              type="button"
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-sm font-medium truncate">{faq.question || `FAQ #${i + 1}`}</span>
              {expanded === i ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-2 p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {expanded === i && (
            <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Question</Label>
                <Input
                  value={faq.question}
                  onChange={(e) => update(i, "question", e.target.value)}
                  placeholder="e.g. Do you accept new patients?"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Answer the agent will say</Label>
                <Textarea
                  value={faq.answer}
                  onChange={(e) => update(i, "answer", e.target.value)}
                  placeholder="e.g. Yes, we are accepting new patients..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add FAQ</p>
        <Input
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Question callers ask..."
          className="text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); } }}
        />
        <Textarea
          value={newA}
          onChange={(e) => setNewA(e.target.value)}
          placeholder="Exact answer the agent should give..."
          rows={2}
          className="text-sm resize-none"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={!newQ.trim() || !newA.trim()}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add to Knowledge Base
        </Button>
      </div>
    </div>
  );
}

export default function Configure() {
  const { data: config, isLoading } = useGetVoiceConfig();
  const mutation = useUpdateVoiceConfig();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("general");
  const [greeting, setGreeting] = useState("");
  const [instructions, setInstructions] = useState("");
  const [voice, setVoice] = useState("nova");
  const [transferNumber, setTransferNumber] = useState("");
  const [hours, setHours] = useState<Hours>(
    Object.fromEntries(
      DAYS.map((d) => [d, { open: "09:00", close: "17:00", closed: d === "sunday" }])
    )
  );
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [script, setScript] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (config) {
      setBusinessName(config.businessName ?? "");
      setBusinessType(config.businessType ?? "general");
      setGreeting(config.greeting ?? "");
      setInstructions(config.instructions ?? "");
      setVoice(config.voice ?? "nova");
      setTransferNumber(config.transferNumber ?? "");
      setHours(parseHours(config.hoursJson ?? "{}"));
      setServices(parseServices(config.servicesJson ?? "[]"));
      setFaqs(parseFaq((config as Record<string, unknown>).faqJson as string ?? "[]"));
      setScript((config as Record<string, unknown>).scriptJson as string ?? "");
    }
  }, [config]);

  const applyTemplate = (tmpl: typeof BUSINESS_TEMPLATES[0]) => {
    setBusinessType(tmpl.type);
    setGreeting(tmpl.greeting.replace("{name}", businessName || "Us"));
    setInstructions(tmpl.instructions);
    setFaqs(tmpl.faqs);
    setScript(tmpl.script);
  };

  const addService = () => {
    const v = serviceInput.trim();
    if (v && !services.includes(v)) setServices((s) => [...s, v]);
    setServiceInput("");
  };

  const removeService = (svc: string) => setServices((s) => s.filter((x) => x !== svc));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    mutation.mutate(
      {
        data: {
          businessName,
          businessType,
          greeting,
          instructions,
          voice,
          transferNumber: transferNumber || undefined,
          hoursJson: JSON.stringify(hours),
          servicesJson: JSON.stringify(services),
          faqJson: JSON.stringify(faqs),
          scriptJson: script,
        } as Parameters<typeof mutation.mutate>[0]["data"],
      },
      {
        onSuccess: () => setSaved(true),
        onError: () => setSaveError("Failed to save configuration."),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configure</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your AI voice agent's personality, knowledge, and call script
        </p>
      </div>

      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">Configuration saved successfully.</AlertDescription>
        </Alert>
      )}
      {saveError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{saveError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template picker */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Business Template</CardTitle>
            <p className="text-xs text-muted-foreground">
              Select your business type to auto-fill the greeting, FAQ, and call script
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BUSINESS_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const active = businessType === tmpl.type;
                return (
                  <button
                    key={tmpl.type}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {tmpl.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Basic info */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Business Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sunrise Medical Clinic"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="greeting">Opening Greeting</Label>
              <Input
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="What the AI says when it picks up..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">General Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="How the AI should handle calls in general..."
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>AI Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transfer">Transfer Number</Label>
                <Input
                  id="transfer"
                  type="tel"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                  placeholder="+15550001234"
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Services Offered</CardTitle>
            <p className="text-xs text-muted-foreground">The AI uses this to answer questions about what you offer</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                placeholder="Add a service..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addService(); }
                }}
              />
              <Button type="button" variant="outline" onClick={addService}>Add</Button>
            </div>
            {services.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <span
                    key={svc}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {svc}
                    <button
                      type="button"
                      onClick={() => removeService(svc)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQ / Knowledge Base */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">Knowledge Base (FAQ)</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add Q&A pairs your agent will use verbatim when callers ask these questions.
                  Selecting a template above auto-fills industry-specific FAQs.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FaqEditor faqs={faqs} onChange={setFaqs} />
          </CardContent>
        </Card>

        {/* Call Script */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">Call Script</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Write a step-by-step script for the AI to follow on every call — what to ask,
                  what to collect, and how to close. Selecting a template above provides a starting script.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={10}
              placeholder={`Example:\n1. Greet the caller and identify the business.\n2. Ask how you can help them today.\n3. If scheduling: collect their name, preferred date/time, and reason.\n4. Confirm appointment details and provide address.\n5. Thank them and say goodbye.`}
              className="resize-none font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Business hours */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Business Hours</CardTitle>
            <p className="text-xs text-muted-foreground">Outside these hours, callers hear an after-hours message</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const h = hours[day] ?? { open: "09:00", close: "17:00", closed: false };
                return (
                  <div key={day} className="grid grid-cols-[5rem_1fr] gap-3 items-center">
                    <span className="text-sm capitalize font-medium">{day.slice(0, 3)}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={!h.closed}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...h, closed: !e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      {!h.closed ? (
                        <>
                          <Input
                            type="time"
                            value={h.open}
                            onChange={(e) =>
                              setHours((prev) => ({
                                ...prev,
                                [day]: { ...h, open: e.target.value },
                              }))
                            }
                            className="h-8 text-sm w-28"
                          />
                          <span className="text-muted-foreground text-sm">–</span>
                          <Input
                            type="time"
                            value={h.close}
                            onChange={(e) =>
                              setHours((prev) => ({
                                ...prev,
                                [day]: { ...h, close: e.target.value },
                              }))
                            }
                            className="h-8 text-sm w-28"
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </form>
    </div>
  );
}
