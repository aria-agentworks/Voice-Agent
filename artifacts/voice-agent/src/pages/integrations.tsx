import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plug, Plus, Trash2, TestTube2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Webhook, CalendarDays, UserSearch, Ban, Zap, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const API = "/api";

interface WebhookAction {
  id: string;
  actionType: string;
  name: string;
  description: string;
  method: string;
  url: string;
  headersJson: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
}

const ACTION_TYPES = [
  {
    value: "book_appointment",
    label: "Book Appointment",
    icon: CalendarDays,
    color: "text-blue-600 bg-blue-50",
    description: "Called when a caller wants to schedule an appointment. The AI extracts name, phone, date, time, and reason.",
  },
  {
    value: "check_availability",
    label: "Check Availability",
    icon: CalendarDays,
    color: "text-green-600 bg-green-50",
    description: "Called when a caller asks about available time slots. Return available slots for the AI to relay.",
  },
  {
    value: "cancel_appointment",
    label: "Cancel Appointment",
    icon: Ban,
    color: "text-red-600 bg-red-50",
    description: "Called when a caller wants to cancel or reschedule. The AI extracts name, phone, and appointment date.",
  },
  {
    value: "lookup_patient",
    label: "Lookup Patient",
    icon: UserSearch,
    color: "text-purple-600 bg-purple-50",
    description: "Called when a caller asks about their records or existing appointments. Return patient data as JSON.",
  },
  {
    value: "custom",
    label: "Custom Action",
    icon: Zap,
    color: "text-amber-600 bg-amber-50",
    description: "A custom webhook that can be triggered for any other purpose.",
  },
];

const SYSTEM_TEMPLATES = [
  {
    name: "Epic MyChart / FHIR",
    description: "EHR integration via FHIR R4 REST API",
    baseUrl: "https://your-epic-instance.com/api/FHIR/R4",
    headers: '{\n  "Authorization": "Bearer YOUR_TOKEN",\n  "Accept": "application/fhir+json"\n}',
    bookBody: '{\n  "resourceType": "Appointment",\n  "status": "booked",\n  "participant": [{"actor": {"display": "{{patientName}}"}}]\n}',
  },
  {
    name: "Dentrix / Henry Schein",
    description: "Dental software via REST API",
    baseUrl: "https://api.your-dentrix.com/v1",
    headers: '{\n  "X-API-Key": "YOUR_API_KEY",\n  "Content-Type": "application/json"\n}',
    bookBody: '{\n  "patient_name": "{{patientName}}",\n  "phone": "{{patientPhone}}",\n  "appointment_date": "{{requestedDate}}",\n  "appointment_time": "{{requestedTime}}",\n  "reason": "{{reason}}"\n}',
  },
  {
    name: "Salesforce Health Cloud",
    description: "CRM-based patient management",
    baseUrl: "https://your-instance.salesforce.com/services/data/v59.0",
    headers: '{\n  "Authorization": "Bearer YOUR_OAUTH_TOKEN",\n  "Content-Type": "application/json"\n}',
    bookBody: '{\n  "Name": "{{patientName}}",\n  "Phone": "{{patientPhone}}",\n  "Subject": "Appointment Request",\n  "Description": "{{reason}}"\n}',
  },
  {
    name: "Custom REST API",
    description: "Any REST API endpoint",
    baseUrl: "https://your-api.com/api/v1",
    headers: '{\n  "Authorization": "Bearer YOUR_TOKEN",\n  "Content-Type": "application/json"\n}',
    bookBody: '{\n  "patient_name": "{{patientName}}",\n  "phone": "{{patientPhone}}",\n  "date": "{{requestedDate}}",\n  "time": "{{requestedTime}}",\n  "reason": "{{reason}}"\n}',
  },
];

function TestResult({ result }: { result: { success: boolean; statusCode: number; responseBody: string; elapsedMs: number } | null }) {
  if (!result) return null;
  return (
    <div className={`mt-3 p-3 rounded-lg border text-xs font-mono ${result.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      <div className="flex items-center gap-2 mb-1">
        {result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        <span className="font-semibold">{result.success ? "Success" : "Failed"}</span>
        <span className="text-muted-foreground">HTTP {result.statusCode} · {result.elapsedMs}ms</span>
      </div>
      {result.responseBody && (
        <pre className="whitespace-pre-wrap break-all mt-1 max-h-32 overflow-y-auto">{result.responseBody}</pre>
      )}
    </div>
  );
}

function ActionCard({ action, onUpdate, onDelete }: {
  action: WebhookAction;
  onUpdate: (id: string, data: Partial<WebhookAction>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...action });
  const [showHeaders, setShowHeaders] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; statusCode: number; responseBody: string; elapsedMs: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const typeCfg = ACTION_TYPES.find((t) => t.value === action.actionType);
  const Icon = typeCfg?.icon ?? Webhook;

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/voice/integrations/${action.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: "Test Patient", patientPhone: "+15550001234", requestedDate: "tomorrow", requestedTime: "2pm", reason: "Test" }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, statusCode: 0, responseBody: "Connection failed", elapsedMs: 0 });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    onUpdate(action.id, form);
    setEditing(false);
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${action.isActive ? "border-border" : "border-border/50 opacity-60"}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeCfg?.color ?? "text-muted-foreground bg-muted"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{action.name}</span>
            <Badge variant="outline" className="text-[10px] h-4">{typeCfg?.label ?? action.actionType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{action.url}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={action.isActive}
            onCheckedChange={(v) => onUpdate(action.id, { isActive: v })}
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Method</p>
                  <Badge variant="outline">{action.method}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <p className="font-mono text-xs break-all">{action.url}</p>
                </div>
                {action.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{action.description}</p>
                  </div>
                )}
              </div>

              {testResult && <TestResult result={testResult} />}

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-1.5">
                  <TestTube2 className="h-3.5 w-3.5" />
                  {testing ? "Testing..." : "Test Webhook"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => onDelete(action.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Method</label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["GET", "POST", "PUT", "PATCH"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-3">
                  <label className="text-xs font-medium text-muted-foreground">URL</label>
                  <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Headers (JSON)</label>
                  <button type="button" onClick={() => setShowHeaders((v) => !v)} className="text-xs text-muted-foreground flex items-center gap-1">
                    {showHeaders ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showHeaders ? "Hide" : "Show"}
                  </button>
                </div>
                {showHeaders && (
                  <Textarea
                    value={form.headersJson}
                    onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder={'{\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Request Body Template (JSON)</label>
                <Textarea
                  value={form.bodyTemplate}
                  onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder={'{\n  "patient_name": "{{patientName}}",\n  "date": "{{requestedDate}}"\n}'}
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code className="bg-muted px-1 rounded">{"{{patientName}}"}</code>{" "}
                  <code className="bg-muted px-1 rounded">{"{{patientPhone}}"}</code>{" "}
                  <code className="bg-muted px-1 rounded">{"{{requestedDate}}"}</code>{" "}
                  <code className="bg-muted px-1 rounded">{"{{requestedTime}}"}</code>{" "}
                  <code className="bg-muted px-1 rounded">{"{{reason}}"}</code>
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewActionForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    actionType: "book_appointment", name: "", description: "", method: "POST", url: "", headersJson: "{}", bodyTemplate: "",
  });
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const { toast } = useToast();

  function applyTemplate(i: number) {
    const t = SYSTEM_TEMPLATES[i]!;
    setSelectedTemplate(i);
    setForm((f) => ({
      ...f,
      url: t.baseUrl + (form.actionType === "book_appointment" ? "/appointments" : "/patients"),
      headersJson: t.headers,
      bodyTemplate: t.bookBody,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) { toast({ title: "Name and URL required", variant: "destructive" }); return; }
    const res = await fetch(`${API}/voice/integrations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { toast({ title: "Integration added" }); onCreated(); }
    else { toast({ title: "Failed to add integration", variant: "destructive" }); }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Webhook Integration</CardTitle>
        <CardDescription>Connect the AI agent to an external system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick templates */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick-start template</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SYSTEM_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(i)}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    selectedTemplate === i ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Action Type</label>
              <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Book via Epic" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description (shown to AI)</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this webhook does..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">HTTP Method</label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Endpoint URL</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-ehr.com/api/..." />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Auth Headers (JSON)</label>
              <Textarea
                value={form.headersJson}
                onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
                rows={3}
                className="font-mono text-xs"
                placeholder={'{\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Request Body Template (JSON)</label>
              <Textarea
                value={form.bodyTemplate}
                onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                rows={5}
                className="font-mono text-xs"
                placeholder={'{\n  "patient_name": "{{patientName}}",\n  "date": "{{requestedDate}}"\n}'}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{patientName}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{patientPhone}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{requestedDate}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{requestedTime}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{reason}}"}</code>{" "}
                as placeholders
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Add Integration</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: actions = [], isLoading } = useQuery<WebhookAction[]>({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch(`${API}/voice/integrations`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookAction> }) => {
      const res = await fetch(`${API}/voice/integrations/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API}/voice/integrations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast({ title: "Integration removed" });
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Connect the AI agent to your EHR, dental software, or any REST API
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Integration
          </Button>
        )}
      </div>

      {/* How it works */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: "1", text: "Caller asks to book an appointment" },
              { step: "2", text: "AI extracts name, date, time, and reason" },
              { step: "3", text: "Your webhook is called with those details" },
              { step: "4", text: "AI relays the response back to the caller" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">{step}</span>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <NewActionForm
          onCreated={() => { queryClient.invalidateQueries({ queryKey: ["integrations"] }); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Action type overview */}
      {!showForm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ACTION_TYPES.slice(0, 4).map((t) => {
            const Icon = t.icon;
            const configured = actions.some((a) => a.actionType === t.value && a.isActive);
            return (
              <div key={t.value} className={`p-3 rounded-lg border ${configured ? "border-green-200 bg-green-50" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded ${t.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {configured ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 ml-auto" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground ml-auto">Not set</span>
                  )}
                </div>
                <p className="text-xs font-medium">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Configured integrations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
          Loading...
        </div>
      ) : actions.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No integrations configured</p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              Add a webhook to connect the AI to your EHR, dental software, or any external system. Without integrations, appointments are saved internally.
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" /> Add Your First Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
