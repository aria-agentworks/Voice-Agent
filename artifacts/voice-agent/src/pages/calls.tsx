import { useState } from "react";
import { useGetVoiceCalls } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PhoneIncoming, PhoneOutgoing, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(s: number | null | undefined) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  "in-progress": "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  "no-answer": "bg-amber-100 text-amber-700",
};

export default function Calls() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetVoiceCalls({
    page,
    limit: 20,
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
          c.callSid.includes(search)
      )
    : calls;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Call Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} total calls</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by number or SID..."
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
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="no-answer">No Answer</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-0 px-0 pt-0">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
            <div />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No calls found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/40 transition-colors"
                >
                  <div className={cn("rounded-full p-1.5", call.direction === "inbound" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                    {call.direction === "inbound"
                      ? <PhoneIncoming className="h-3.5 w-3.5" />
                      : <PhoneOutgoing className="h-3.5 w-3.5" />}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{call.fromNumber}</p>
                  <p className="text-sm text-muted-foreground truncate">{call.toNumber}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(call.startedAt)}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDuration(call.durationSeconds)}</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_COLORS[call.status] ?? "bg-muted text-muted-foreground")}>
                    {call.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
