import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PhoneOutgoing, Plus, Play, Pause, RotateCcw, Trash2, Users,
  ChevronRight, ChevronLeft, X, Upload, CheckCircle2,
  AlertCircle, Loader2, Phone, Clock, UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

interface Campaign {
  id: string;
  name: string;
  description: string;
  purpose: string;
  status: string;
  totalContacts: number;
  calledCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
}

interface Contact {
  id: string;
  campaignId: string;
  name: string;
  phone: string;
  notes: string;
  status: string;
  callSid?: string;
  calledAt?: string;
}

const CAMPAIGN_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "bg-gray-100 text-gray-600 border-gray-200",   icon: AlertCircle },
  running:   { label: "Running",   color: "bg-blue-100 text-blue-700 border-blue-200",   icon: Play },
  paused:    { label: "Paused",    color: "bg-amber-100 text-amber-700 border-amber-200", icon: Pause },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
};

const CONTACT_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",   color: "bg-gray-100 text-gray-600" },
  calling:    { label: "Calling…",  color: "bg-blue-100 text-blue-700" },
  completed:  { label: "Completed", color: "bg-green-100 text-green-700" },
  failed:     { label: "Failed",    color: "bg-red-100 text-red-700" },
  "no-answer":{ label: "No Answer", color: "bg-amber-100 text-amber-700" },
  skipped:    { label: "Skipped",   color: "bg-gray-100 text-gray-500" },
};

function CampaignBadge({ status }: { status: string }) {
  const cfg = CAMPAIGN_STATUS[status] ?? CAMPAIGN_STATUS.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function ContactStatusBadge({ status }: { status: string }) {
  const cfg = CONTACT_STATUS[status] ?? CONTACT_STATUS.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseContactsCsv(raw: string): Array<{ name: string; phone: string; notes: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ""));
      return { name: cols[0] ?? "", phone: cols[1] ?? "", notes: cols[2] ?? "" };
    })
    .filter((c) => c.name && c.phone);
}

// ── Create Campaign Modal ─────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState<"info" | "contacts">("info");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [csvText, setCsvText] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string; notes: string }>>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function addManual() {
    if (!manualName.trim() || !manualPhone.trim()) return;
    setContacts((c) => [...c, { name: manualName.trim(), phone: manualPhone.trim(), notes: "" }]);
    setManualName(""); setManualPhone("");
  }

  function importCsv() {
    const parsed = parseContactsCsv(csvText);
    if (!parsed.length) { toast({ title: "No valid rows found", variant: "destructive" }); return; }
    setContacts((c) => [...c, ...parsed]);
    setCsvText("");
    toast({ title: `${parsed.length} contacts imported` });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseContactsCsv(text);
      setContacts((c) => [...c, ...parsed]);
      toast({ title: `${parsed.length} contacts imported from ${file.name}` });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleCreate() {
    if (!name.trim()) { toast({ title: "Campaign name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/voice/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, purpose, contacts }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Campaign created!", description: contacts.length ? `${contacts.length} contacts added.` : "Add contacts to get started." });
        onCreated(data.id);
        onClose();
      } else {
        toast({ title: data.error ?? "Failed to create", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "info" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
            <span className={`text-sm font-medium ${step === "info" ? "" : "text-muted-foreground"}`}>Campaign info</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "contacts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
            <span className={`text-sm font-medium ${step === "contacts" ? "" : "text-muted-foreground"}`}>Add contacts</span>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === "info" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Campaign name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. May Appointment Confirmations" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal notes about this campaign" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Message script</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={4}
                  placeholder="What the AI says when the call connects. Leave blank for the default appointment reminder script."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep("contacts")} disabled={!name.trim()}>Next: Add Contacts</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Add contact manually</label>
                <div className="flex gap-2">
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Full name" className="flex-1" onKeyDown={(e) => e.key === "Enter" && addManual()} />
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="+1..." className="w-36" onKeyDown={(e) => e.key === "Enter" && addManual()} />
                  <Button variant="outline" onClick={addManual} size="sm" className="shrink-0"><UserPlus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Or paste CSV (Name, Phone, Notes)</label>
                <div className="flex gap-2">
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={3}
                    placeholder={"John Smith, +15551234567\nJane Doe, +15559876543, prefers morning"}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono"
                  />
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="sm" onClick={importCsv} disabled={!csvText.trim()}>Import</Button>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="h-3 w-3" />
                    </Button>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
                  </div>
                </div>
              </div>

              {contacts.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
                    <span className="text-xs font-medium">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => setContacts([])} className="text-xs text-muted-foreground hover:text-red-500">Clear all</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-border">
                    {contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                        <span className="text-xs font-medium flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>
                        <button onClick={() => setContacts((arr) => arr.filter((_, j) => j !== i))}>
                          <X className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep("info")} className="gap-1.5">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Campaign{contacts.length > 0 ? ` (${contacts.length})` : ""}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Campaign Detail View ──────────────────────────────────────────────────────
function CampaignDetail({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [callingId, setCallingId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const { data: contactsData, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["campaign-contacts", campaign.id],
    queryFn: async () => {
      const res = await fetch(`${API}/voice/campaigns/${campaign.id}/contacts`);
      return res.json();
    },
    refetchInterval: campaign.status === "running" ? 3000 : 10000,
  });

  const { data: liveData } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch(`${API}/voice/campaigns`);
      return res.json();
    },
    refetchInterval: 4000,
  });

  const current = liveData?.campaigns.find((c) => c.id === campaign.id) ?? campaign;
  const contacts = contactsData?.contacts ?? [];

  async function callAction(action: "start" | "pause" | "reset") {
    const url = action === "reset"
      ? `${API}/voice/campaigns/${campaign.id}/reset`
      : `${API}/voice/campaigns/${campaign.id}/${action}`;
    const res = await fetch(url, { method: "POST" });
    const d = await res.json();
    if (!d.success && d.error) { toast({ title: d.error, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["campaign-contacts", campaign.id] });
    const labels = { start: "Campaign started — calls will begin shortly", pause: "Campaign paused", reset: "Campaign reset to draft" };
    toast({ title: labels[action] });
  }

  async function callContact(contact: Contact) {
    setCallingId(contact.id);
    try {
      const res = await fetch(`${API}/voice/campaigns/${campaign.id}/contacts/${contact.id}/call`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast({ title: "Call initiated", description: `Calling ${contact.name}…` });
      } else {
        toast({ title: "Call failed", description: d.error, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["campaign-contacts", campaign.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setCallingId(null);
    }
  }

  async function deleteContact(contactId: string) {
    await fetch(`${API}/voice/campaigns/${campaign.id}/contacts/${contactId}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["campaign-contacts", campaign.id] });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  }

  async function addManualContact() {
    if (!manualName.trim() || !manualPhone.trim()) return;
    setAddingContact(true);
    try {
      await fetch(`${API}/voice/campaigns/${campaign.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: [{ name: manualName.trim(), phone: manualPhone.trim() }] }),
      });
      setManualName(""); setManualPhone("");
      queryClient.invalidateQueries({ queryKey: ["campaign-contacts", campaign.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setAddingContact(false);
    }
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground -ml-2">
        <ChevronLeft className="h-4 w-4" /> All Campaigns
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{current.name}</h1>
            <CampaignBadge status={current.status} />
          </div>
          {current.description && <p className="text-muted-foreground text-sm mt-0.5">{current.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {current.status === "running" && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => callAction("pause")}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {(current.status === "draft" || current.status === "paused") && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => callAction("start")}>
              <Play className="h-3.5 w-3.5" /> {current.status === "paused" ? "Resume" : "Start Campaign"}
            </Button>
          )}
          {current.status === "completed" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => callAction("reset")}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset & Re-run
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: current.totalContacts,  color: "" },
          { label: "Called",    value: current.calledCount,    color: "text-blue-600" },
          { label: "Completed", value: current.completedCount, color: "text-green-600" },
          { label: "Failed",    value: current.failedCount,    color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {current.totalContacts > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{current.calledCount} / {current.totalContacts}</span>
          </div>
          <ProgressBar
            value={current.calledCount}
            max={current.totalContacts}
            color={current.status === "running" ? "bg-blue-500" : current.status === "completed" ? "bg-green-500" : "bg-primary"}
          />
        </div>
      )}

      {current.purpose && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Script</p>
          <p className="text-sm">{current.purpose}</p>
        </div>
      )}

      {/* Add contact inline */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Add contact</label>
          <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Name" onKeyDown={(e) => e.key === "Enter" && addManualContact()} />
        </div>
        <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="+1..." className="w-36" onKeyDown={(e) => e.key === "Enter" && addManualContact()} />
        <Button variant="outline" onClick={addManualContact} disabled={addingContact || !manualName.trim() || !manualPhone.trim()}>
          {addingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Contacts list */}
      <Card>
        <CardHeader className="px-4 py-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" /> Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No contacts yet — add one above</div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-2.5 w-2.5" />
                      <span className="font-mono">{c.phone}</span>
                      {c.calledAt && (
                        <>
                          <Clock className="h-2.5 w-2.5 ml-1" />
                          {new Date(c.calledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </>
                      )}
                    </p>
                  </div>
                  <ContactStatusBadge status={c.status} />
                  {(c.status === "pending" || c.status === "failed" || c.status === "no-answer") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => callContact(c)}
                      disabled={callingId === c.id || current.status === "running"}
                      title={current.status === "running" ? "Pause campaign to call individually" : "Call now"}
                    >
                      {callingId === c.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <PhoneOutgoing className="h-3 w-3" />
                      }
                      Call
                    </Button>
                  )}
                  <button onClick={() => deleteContact(c.id)} className="text-muted-foreground hover:text-red-500 ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Outbound() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch(`${API}/voice/campaigns`);
      return res.json();
    },
    refetchInterval: 8000,
  });

  const campaigns = data?.campaigns ?? [];
  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  async function deleteCampaign(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`${API}/voice/campaigns/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    toast({ title: "Campaign deleted" });
  }

  if (selected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <CampaignDetail
          campaign={selected}
          onBack={() => { setSelectedId(null); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            setSelectedId(id);
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outbound Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Upload a contact list and let the AI agent call each one with your script
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Summary stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total campaigns",  value: campaigns.length },
            { label: "Running",          value: campaigns.filter((c) => c.status === "running").length },
            { label: "Completed",        value: campaigns.filter((c) => c.status === "completed").length },
            { label: "Contacts reached", value: campaigns.reduce((s, c) => s + c.completedCount, 0) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <PhoneOutgoing className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">No campaigns yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
            Create a campaign, upload your patient list, and the AI will call each contact with your custom script.
          </p>
          <Button className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create your first campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="border-border cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedId(c.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{c.name}</span>
                      <CampaignBadge status={c.status} />
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>}
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.totalContacts} contacts</span>
                        <span className="flex items-center gap-3">
                          <span className="text-green-600">{c.completedCount} completed</span>
                          {c.failedCount > 0 && <span className="text-red-500">{c.failedCount} failed</span>}
                        </span>
                      </div>
                      {c.totalContacts > 0 && (
                        <ProgressBar
                          value={c.calledCount}
                          max={c.totalContacts}
                          color={c.status === "running" ? "bg-blue-500" : c.status === "completed" ? "bg-green-500" : "bg-primary"}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => deleteCampaign(e, c.id)} className="p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
