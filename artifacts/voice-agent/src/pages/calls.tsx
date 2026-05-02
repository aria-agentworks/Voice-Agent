import { useState } from "react";
import { useGetVoiceCalls, useCreateOutboundCall } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PhoneIncoming, PhoneOutgoing, Search, ChevronLeft, ChevronRight,
  Download, Phone, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatDuration(s: number | null | undefined) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  "in-progress": "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  "no-answer": "bg-amber-100 text-amber-700",
  busy: "bg-amber-100 text-amber-700",
};

const OUTCOME_COLORS: Record<string, string> = {
  appointment_booked: "text-emerald-600",
  inquiry_handled: "text-blue-600",
  complaint: "text-red-600",
  transfer_requested: "text-violet-600",
  callback_requested: "text-amber-600",
  resolved: "text-teal-600",
};

function QuickCallbackButton({ number }: { number: string }) {
  const { toast } = useToast();
  const mutation = useCreateOutboundCall();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        mutation.mutate(
          { toNumber: number, purpose: "Follow-up callback" },
          {
            onSuccess: () => toast({ title: "Call initiated", description: `Calling ${number}` }),
            onError: () => toast({ title: "Failed", description: "Check Twilio credentials in Settings", variant: "destructive" }),
          }
        );
      }}
      disabled={mutation.isPending}
      className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
      title={`Call back ${number}`}
    >
      <Phone className="h-3.5 w-3.5" />
    </button>
  );
}

export default function Calls() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetVoiceCalls({
    page,
    limit: 25,
    direction: direction || undefined,
    status: status || undefined,
  });

  const calls = data?.calls ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const filtered = search
    ? calls.filter(
        (c) =>
          c.fromNumber.includes(search) ||
          c.toNumber.includes(search) ||
          c.callSid.toLowerCase().includes(search.toLowerCase()) ||
          (c.summary ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : calls;

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = "/api/voice/calls/export";
    a.download = "";
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Call Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total calls</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search numbers, SID, or transcript..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={direction || "all"} onValueChange={(v) => { setDirection(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="no-answer">No Answer</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-card-border">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
          <div />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Number / Summary</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:block">Time</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:block">Duration</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:block">Outcome</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3.5 items-center">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-24 hidden md:block" />
                  <Skeleton className="h-4 w-12 hidden sm:block" />
                  <Skeleton className="h-4 w-20 hidden lg:block" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {search ? "No calls match your search" : "No calls found"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((call) => {
                const callNumber = call.direction === "inbound" ? call.fromNumber : call.toNumber;
                return (
                  <div
                    key={call.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn("rounded-full p-1.5", call.direction === "inbound" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                      {call.direction === "inbound"
                        ? <PhoneIncoming className="h-3.5 w-3.5" />
                        : <PhoneOutgoing className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{callNumber}</p>
                      {call.summary ? (
                        <p className="text-xs text-muted-foreground truncate">{call.summary}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{formatTime(call.startedAt)}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">{formatTime(call.startedAt)}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">{formatDuration(call.durationSeconds)}</p>
                    <span className={cn("text-xs font-medium capitalize whitespace-nowrap hidden lg:block", call.outcome ? (OUTCOME_COLORS[call.outcome] ?? "text-muted-foreground") : "text-muted-foreground")}>
                      {call.outcome ? call.outcome.replace(/_/g, " ") : "—"}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_COLORS[call.status] ?? "bg-muted text-muted-foreground")}>
                      {call.status}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <QuickCallbackButton number={callNumber} />
                      <Link href={`/calls/${call.id}`}>
                        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View detail">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
