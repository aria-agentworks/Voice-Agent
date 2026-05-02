import { useRoute, Link } from "wouter";
import { useGetVoiceCall, getGetVoiceCallQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PhoneIncoming, PhoneOutgoing, Clock, MessageSquare, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(s: number | null | undefined) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
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

export default function CallDetail() {
  const [, params] = useRoute("/calls/:id");
  const id = params?.id ?? "";

  const { data, isLoading } = useGetVoiceCall(id, {
    query: { enabled: !!id, queryKey: getGetVoiceCallQueryKey(id) },
  });

  const call = data?.call;
  const messages = data?.messages ?? [];

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-12", i % 2 === 0 ? "w-3/4" : "w-2/3 ml-auto")} />
          ))}
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/calls">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to calls
          </Button>
        </Link>
        <p className="text-muted-foreground">Call not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/calls">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Call Detail</h1>
      </div>

      {/* Call metadata */}
      <Card className="border-card-border">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={cn("rounded-full p-3 shrink-0", call.direction === "inbound" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
              {call.direction === "inbound"
                ? <PhoneIncoming className="h-5 w-5" />
                : <PhoneOutgoing className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold">
                  {call.direction === "inbound" ? call.fromNumber : call.toNumber}
                </span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[call.status] ?? "bg-muted text-muted-foreground")}>
                  {call.status}
                </span>
                {call.outcome && (
                  <Badge variant="outline" className="text-xs capitalize">{call.outcome}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{formatDateFull(call.startedAt)}</p>
            </div>
            <div className="flex gap-6 shrink-0 text-sm">
              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide font-medium">Duration</span>
                </div>
                <p className="font-semibold mt-0.5">{formatDuration(call.durationSeconds)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide font-medium">Messages</span>
                </div>
                <p className="font-semibold mt-0.5">{call.messageCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-xs uppercase tracking-wide font-medium">Direction</span>
                </div>
                <p className="font-semibold mt-0.5 capitalize">{call.direction}</p>
              </div>
            </div>
          </div>

          {call.summary && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Summary
              </p>
              <p className="text-sm text-foreground leading-relaxed">{call.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {!messages.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transcript available</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex gap-3", isAssistant ? "flex-row" : "flex-row-reverse")}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      isAssistant ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn("max-w-[75%]", isAssistant ? "" : "items-end flex flex-col")}>
                      <div className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        isAssistant
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      )}>
                        {msg.content}
                      </div>
                      <p className={cn("text-xs text-muted-foreground mt-1", isAssistant ? "text-left" : "text-right")}>
                        {isAssistant ? "AI Agent" : "Caller"} · {formatMsgTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical details */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[
              { label: "Call SID", value: call.callSid },
              { label: "From", value: call.fromNumber },
              { label: "To", value: call.toNumber },
              { label: "Started", value: formatDateFull(call.startedAt) },
              call.endedAt ? { label: "Ended", value: formatDateFull(call.endedAt) } : null,
            ].filter(Boolean).map((item) => (
              <div key={item!.label}>
                <dt className="text-muted-foreground">{item!.label}</dt>
                <dd className="font-mono text-xs mt-0.5 text-foreground break-all">{item!.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
