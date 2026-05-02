import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Phone, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Search, ChevronDown, User, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createdAt: string;
  call?: { id: string; callSid: string; fromNumber: string } | null;
}

interface AppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: AlertCircle, color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-blue-100 text-blue-700 border-blue-200" },
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
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientName.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const res = await fetch(`${API}/voice/appointments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { toast({ title: "Appointment created" }); onCreated(); onClose(); }
    else { toast({ title: "Failed to create", variant: "destructive" }); }
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
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Appointment updated" });
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
            Requests booked by the AI agent during calls
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Appointment
        </Button>
      </div>

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

      {/* Filter */}
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
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
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
                  <div className="flex items-center gap-2 shrink-0">
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
