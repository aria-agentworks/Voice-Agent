import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Phone, Clock, CheckCircle2, XCircle, AlertCircle,
  Plus, User, X, MessageSquare, Send, Loader2, Bell, BellOff, Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  requestedDate: string;
  requestedTime: string;
  reason: string;
  notes: string;
  status: string;
  externalId?: string;
  callId?: string;
  reminderSentAt?: string | null;
  createdAt: string;
}

interface AppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: AlertCircle,   color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2,  color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", icon: XCircle,       color: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Completed", icon: CheckCircle2,  color: "bg-blue-100 text-blue-700 border-blue-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    patientName: "", patientPhone: "", requestedDate: "", requestedTime: "", reason: "", notes: "",
  });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientName.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/voice/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.sms?.success) {
          toast({ title: "Appointment created", description: "SMS confirmation sent to patient." });
        } else if (form.patientPhone && data.sms?.error) {
          toast({ title: "Appointment created", description: `SMS skipped: ${data.sms.error}` });
        } else {
          toast({ title: "Appointment created" });
        }
        onCreated();
        onClose();
      } else {
        toast({ title: "Failed to create", variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">New Appointment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Patient Name *</label>
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} placeholder="+1..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input type="time" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
            </div>
          </div>
          {form.patientPhone && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">SMS confirmation will be sent to {form.patientPhone}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={sending}>
              {sending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create{form.patientPhone ? " + Send SMS" : ""}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SmsBadge({ sending }: { sending: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
      sending ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse" : "bg-green-50 border-green-200 text-green-700"
    }`}>
      <MessageSquare className="h-2.5 w-2.5" />
      {sending ? "Sending…" : "SMS sent"}
    </span>
  );
}

function ReminderBadge({ sentAt }: { sentAt: string }) {
  const d = new Date(sentAt);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-violet-50 border-violet-200 text-violet-700" title={`Reminder sent ${label}`}>
      <Bell className="h-2.5 w-2.5" />
      Reminded
    </span>
  );
}

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [smsSending, setSmsSending] = useState<Record<string, boolean>>({});
  const [smsSent, setSmsSent] = useState<Record<string, boolean>>({});
  const [reminderRunning, setReminderRunning] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reminderPreview } = useQuery<{
    pendingReminders: number;
    scheduledFor: { id: string; patientName: string; patientPhone: string; requestedDate: string; requestedTime: string }[];
    notEligible: number;
  }>({
    queryKey: ["reminders-preview"],
    queryFn: async () => {
      const res = await fetch(`${API}/voice/reminders/preview`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  async function handleRunReminders() {
    setReminderRunning(true);
    try {
      const res = await fetch(`${API}/voice/reminders/run`, { method: "POST" });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["reminders-preview"] });
      if (data.sent > 0) {
        toast({ title: `Reminders sent!`, description: `${data.sent} reminder${data.sent > 1 ? "s" : ""} sent, ${data.skipped} skipped.` });
      } else {
        toast({ title: "No reminders sent", description: `${data.skipped} appointment${data.skipped !== 1 ? "s" : ""} not eligible (need ISO date set to tomorrow).` });
      }
    } catch {
      toast({ title: "Reminder job failed", variant: "destructive" });
    } finally {
      setReminderRunning(false);
    }
  }

  const { data, isLoading } = useQuery<AppointmentsResponse>({
    queryKey: ["appointments", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`${API}/voice/appointments?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API}/voice/appointments/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: status === "confirmed" ? "Appointment confirmed" : "Appointment cancelled" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API}/voice/appointments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Appointment deleted" });
    },
  });

  async function handleSendSms(appt: Appointment) {
    if (!appt.patientPhone) {
      toast({ title: "No phone number", description: "Add a phone number to this appointment first.", variant: "destructive" });
      return;
    }
    setSmsSending((s) => ({ ...s, [appt.id]: true }));
    try {
      const res = await fetch(`${API}/voice/appointments/${appt.id}/sms`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSmsSent((s) => ({ ...s, [appt.id]: true }));
        toast({ title: "SMS sent!", description: `Confirmation sent to ${appt.patientPhone}` });
      } else {
        toast({ title: "SMS failed", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "SMS failed", variant: "destructive" });
    } finally {
      setSmsSending((s) => ({ ...s, [appt.id]: false }));
    }
  }

  const appointments = data?.appointments ?? [];

  const counts = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  appointments.forEach((a) => { if (a.status in counts) counts[a.status as keyof typeof counts]++; });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["appointments"] })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Requests booked by the AI agent — confirm, cancel, or send SMS reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
            onClick={handleRunReminders}
            disabled={reminderRunning}
            title="Send 24-hour reminder SMS to all appointments scheduled for tomorrow"
          >
            {reminderRunning
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Bell className="h-3.5 w-3.5" />
            }
            Run Reminders
            {reminderPreview && reminderPreview.pendingReminders > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                {reminderPreview.pendingReminders}
              </span>
            )}
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>
      </div>

      {/* Reminder info banner */}
      {reminderPreview && reminderPreview.pendingReminders > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <Bell className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900">
              {reminderPreview.pendingReminders} appointment{reminderPreview.pendingReminders !== 1 ? "s" : ""} due for a reminder tomorrow
            </p>
            <p className="text-xs text-violet-700 mt-0.5">
              {reminderPreview.scheduledFor.map((a) => a.patientName).join(", ")} — reminders run automatically every hour, or click "Run Reminders" to send now.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pending", "confirmed", "cancelled", "completed"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? "all" : s); setPage(1); }}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                statusFilter === s ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cfg.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{counts[s]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} total</span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No appointments yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Appointments booked by the AI agent during calls will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{appt.patientName}</span>
                      <StatusBadge status={appt.status} />
                      {appt.reminderSentAt && <ReminderBadge sentAt={appt.reminderSentAt} />}
                      {smsSent[appt.id] && <SmsBadge sending={false} />}
                      {smsSending[appt.id] && <SmsBadge sending={true} />}
                      {appt.externalId && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          EXT: {appt.externalId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {appt.patientPhone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{appt.patientPhone}
                        </span>
                      )}
                      {appt.requestedDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />{appt.requestedDate}
                        </span>
                      )}
                      {appt.requestedTime && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{appt.requestedTime}
                        </span>
                      )}
                    </div>
                    {appt.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {appt.patientPhone && appt.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSendSms(appt)}
                        disabled={smsSending[appt.id]}
                      >
                        {smsSending[appt.id]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Send className="h-3 w-3" />
                        }
                        SMS
                      </Button>
                    )}
                    {appt.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => updateMutation.mutate({ id: appt.id, status: "confirmed" })}
                      >
                        Confirm
                      </Button>
                    )}
                    {appt.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateMutation.mutate({ id: appt.id, status: "cancelled" })}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(appt.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
