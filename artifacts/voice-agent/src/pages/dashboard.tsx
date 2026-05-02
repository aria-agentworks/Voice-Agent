import { useGetVoiceCallStats, useGetVoiceCalls, useGetVoiceConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    "in-progress": "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    "no-answer": "bg-amber-100 text-amber-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetVoiceCallStats();
  const { data: callsData, isLoading: callsLoading } = useGetVoiceCalls({ page: 1, limit: 8 });
  const { data: config } = useGetVoiceConfig();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Inactive banner */}
      {config && !config.isActive && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 flex items-center gap-2">
            Voice agent is not active — configure your Twilio credentials and enable it in{" "}
            <Link href="/settings" className="underline font-medium">
              Settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {config?.businessName ?? "Your Business"} — real-time call overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Calls",
            value: stats?.totalCalls,
            icon: PhoneCall,
            color: "text-primary",
          },
          {
            label: "Today",
            value: stats?.todayCalls,
            icon: TrendingUp,
            color: "text-emerald-600",
          },
          {
            label: "Inbound",
            value: stats?.inboundCount,
            icon: PhoneIncoming,
            color: "text-blue-600",
          },
          {
            label: "Avg Duration",
            value: stats?.avgDurationSeconds != null ? formatDuration(Math.round(stats.avgDurationSeconds)) : null,
            icon: Clock,
            color: "text-violet-600",
            isText: true,
          },
        ].map(({ label, value, icon: Icon, color, isText }) => (
          <Card key={label} className="border-card-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {label}
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16 mt-1.5" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {isText ? (value ?? "—") : (value ?? 0)}
                    </p>
                  )}
                </div>
                <div className={cn("rounded-lg bg-muted p-2", color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent calls */}
        <Card className="lg:col-span-2 border-card-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Calls</CardTitle>
            <Link href="/calls" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {callsLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !callsData?.calls?.length ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No calls yet. Connect your Twilio number to get started.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {callsData.calls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={cn("rounded-full p-1.5", call.direction === "inbound" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                      {call.direction === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {call.direction === "inbound" ? call.fromNumber : call.toNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTime(call.startedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={call.status} />
                      <span className="text-xs text-muted-foreground">{formatDuration(call.durationSeconds)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call breakdown */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : !stats?.byOutcome?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-2.5">
                {stats.byOutcome.map(({ outcome, count }) => {
                  const total = stats.totalCalls || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={outcome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium capitalize text-foreground">{outcome || "unknown"}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
