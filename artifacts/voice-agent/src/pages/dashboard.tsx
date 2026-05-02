import { useGetVoiceCallStats, useGetVoiceCalls, useGetVoiceConfig, useGetVoiceAnalytics, useGetVoiceCallsLive } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import {
  PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, TrendingUp,
  AlertTriangle, ArrowRight, Radio, RefreshCw, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from "recharts";
import { useEffect, useState } from "react";

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function formatHour(h: number) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function formatDay(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  "in-progress": "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  "no-answer": "bg-amber-100 text-amber-700",
};

const OUTCOME_COLORS: Record<string, string> = {
  appointment_booked: "text-emerald-600",
  inquiry_handled: "text-blue-600",
  complaint: "text-red-600",
  transfer_requested: "text-violet-600",
  wrong_number: "text-muted-foreground",
  callback_requested: "text-amber-600",
  resolved: "text-teal-600",
};

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetVoiceCallStats();
  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useGetVoiceCalls({ page: 1, limit: 8 });
  const { data: config } = useGetVoiceConfig();
  const { data: analytics, isLoading: analyticsLoading } = useGetVoiceAnalytics({ days: 7 });
  const { data: liveCalls, refetch: refetchLive } = useGetVoiceCallsLive();

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats();
      refetchCalls();
      refetchLive();
      setLastRefresh(new Date());
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    refetchStats();
    refetchCalls();
    refetchLive();
    setLastRefresh(new Date());
  };

  const liveCount = liveCalls?.length ?? 0;
  const missedToday = analytics?.missedToday ?? 0;

  // Daily chart — show short day label
  const dailyData = analytics?.daily?.map((d) => ({
    ...d,
    label: formatDay(d.date),
  })) ?? [];

  // Hourly — collapse to business hours view (6am–10pm) for cleaner viz
  const hourlyData = analytics?.hourly?.filter((h) => h.hour >= 6 && h.hour <= 22) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Inactive banner */}
      {config && !config.isActive && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 flex items-center gap-2">
            Voice agent is not active — configure your Twilio credentials and enable it in{" "}
            <Link href="/settings" className="underline font-medium">Settings</Link>.
          </AlertDescription>
        </Alert>
      )}

      {/* Live calls alert */}
      {liveCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <PulsingDot />
          <p className="text-sm font-semibold text-emerald-800">
            {liveCount} call{liveCount > 1 ? "s" : ""} in progress right now
          </p>
          <div className="flex-1" />
          {liveCalls?.map((call) => (
            <Link key={call.id} href={`/calls/${call.id}`}>
              <span className="text-xs font-mono bg-emerald-100 text-emerald-700 rounded px-2 py-0.5 hover:bg-emerald-200 transition-colors">
                {call.direction === "inbound" ? call.fromNumber : call.toNumber}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {config?.businessName ?? "Your Business"} — real-time overview
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refreshed {lastRefresh.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Calls", value: stats?.totalCalls, icon: PhoneCall, color: "text-primary" },
          { label: "Today", value: stats?.todayCalls, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Inbound", value: stats?.inboundCount, icon: PhoneIncoming, color: "text-blue-600" },
          { label: "Avg Duration", value: stats?.avgDurationSeconds != null ? formatDuration(Math.round(stats.avgDurationSeconds)) : null, icon: Clock, color: "text-violet-600", isText: true },
          { label: "Missed Today", value: missedToday, icon: AlertTriangle, color: missedToday > 0 ? "text-red-500" : "text-muted-foreground", alert: missedToday > 0 },
        ].map(({ label, value, icon: Icon, color, isText, alert }) => (
          <Card key={label} className={cn("border-card-border", alert && "border-red-200 bg-red-50/50")}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16 mt-1.5" />
                  ) : (
                    <p className={cn("text-2xl font-bold mt-1", alert && missedToday > 0 ? "text-red-600" : "text-foreground")}>
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day volume chart */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Call Volume — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : !dailyData.some((d) => d.count > 0) ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                No call data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                    formatter={(val: number, name: string) => [val, name === "inbound" ? "Inbound" : name === "outbound" ? "Outbound" : "Total"]}
                  />
                  <Bar dataKey="inbound" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outbound" stackId="a" fill="hsl(217 91% 70%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" />
                Inbound
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-400 inline-block" />
                Outbound
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hourly distribution */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Calls by Time of Day
              {analytics?.peakHour != null && (
                <span className="text-xs font-normal text-muted-foreground">
                  Peak: {formatHour(analytics.peakHour)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : !hourlyData.some((h) => h.count > 0) ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                No call data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                    labelFormatter={(h) => `${formatHour(Number(h))} – ${formatHour(Number(h) + 1)}`}
                    formatter={(val: number) => [val, "Calls"]}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {hourlyData.map((entry) => (
                      <Cell
                        key={entry.hour}
                        fill={entry.hour === analytics?.peakHour ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn("rounded-full p-1.5 shrink-0", call.direction === "inbound" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                      {call.direction === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {call.direction === "inbound" ? call.fromNumber : call.toNumber}
                      </p>
                      {call.summary ? (
                        <p className="text-xs text-muted-foreground truncate">{call.summary}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{formatTime(call.startedAt)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {call.outcome && (
                        <span className={cn("text-xs font-medium capitalize hidden sm:block", OUTCOME_COLORS[call.outcome] ?? "text-muted-foreground")}>
                          {call.outcome.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[call.status] ?? "bg-muted text-muted-foreground")}>
                        {call.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDuration(call.durationSeconds)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcomes */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : !stats?.byOutcome?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.byOutcome.map(({ outcome, count }) => {
                  const total = stats.totalCalls || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={outcome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-medium capitalize", OUTCOME_COLORS[outcome] ?? "text-foreground")}>
                          {(outcome || "unknown").replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {analytics?.peakHour != null && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Peak call hour: <span className="font-semibold text-foreground">{formatHour(analytics.peakHour)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
