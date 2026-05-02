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
import { CheckCircle2, Stethoscope, Smile, Scale, UtensilsCrossed, Scissors, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BUSINESS_TEMPLATES = [
  {
    type: "medical",
    label: "Medical",
    icon: Stethoscope,
    greeting: "Thank you for calling {name}. This is our AI assistant. How can I help you today?",
    instructions: "Help patients schedule appointments, answer questions about our services, and take messages. If urgent, offer to transfer to on-call staff.",
  },
  {
    type: "dental",
    label: "Dental",
    icon: Smile,
    greeting: "Thank you for calling {name} Dental. How can I assist you today?",
    instructions: "Help patients schedule cleanings, exams, and emergency appointments. Answer questions about our dental services and insurance.",
  },
  {
    type: "legal",
    label: "Legal",
    icon: Scale,
    greeting: "Thank you for calling {name}. How may I direct your call?",
    instructions: "Schedule consultations, take case inquiry messages, answer basic questions. For urgent legal matters, offer to transfer.",
  },
  {
    type: "restaurant",
    label: "Restaurant",
    icon: UtensilsCrossed,
    greeting: "Thanks for calling {name}! How can I help you?",
    instructions: "Take reservations, answer questions about hours, menu, and specials. For large parties, collect contact info.",
  },
  {
    type: "salon",
    label: "Salon",
    icon: Scissors,
    greeting: "Thank you for calling {name}. How can I help you today?",
    instructions: "Book appointments for our services, answer questions about pricing and availability.",
  },
  {
    type: "general",
    label: "General",
    icon: Building2,
    greeting: "Thank you for calling {name}. How can I assist you?",
    instructions: "Answer questions about our services and take messages for the team.",
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
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
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
    }
  }, [config]);

  const applyTemplate = (tmpl: typeof BUSINESS_TEMPLATES[0]) => {
    setBusinessType(tmpl.type);
    setGreeting(tmpl.greeting.replace("{name}", businessName || "Us"));
    setInstructions(tmpl.instructions);
  };

  const addService = () => {
    const v = serviceInput.trim();
    if (v && !services.includes(v)) {
      setServices((s) => [...s, v]);
    }
    setServiceInput("");
  };

  const removeService = (svc: string) => setServices((s) => s.filter((x) => x !== svc));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    mutation.mutate(
      {
        businessName,
        businessType,
        greeting,
        instructions,
        voice,
        transferNumber: transferNumber || undefined,
        hoursJson: JSON.stringify(hours),
        servicesJson: JSON.stringify(services),
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
          Customize your AI voice agent's personality and behavior
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
            <p className="text-xs text-muted-foreground">Select your business type to pre-fill the AI's greeting and instructions</p>
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
              <Label htmlFor="greeting">Greeting</Label>
              <Input
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="What the AI says when it picks up..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="How the AI should handle calls..."
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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addService();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addService}>
                Add
              </Button>
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

        {/* Business hours */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Business Hours</CardTitle>
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
