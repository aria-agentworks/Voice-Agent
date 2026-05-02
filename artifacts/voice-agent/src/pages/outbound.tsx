import { useState } from "react";
import { useCreateOutboundCall, useGetVoiceCalls, useGetVoiceConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { PhoneOutgoing, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Outbound() {
  const [toNumber, setToNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: config } = useGetVoiceConfig();
  const { data: callsData, isLoading } = useGetVoiceCalls({ direction: "outbound", page: 1, limit: 10 });
  const mutation = useCreateOutboundCall();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    mutation.mutate(
      { toNumber, purpose: purpose || undefined },
      {
        onSuccess: (data) => {
          setSuccess(`Call initiated to ${data.toNumber} (SID: ${data.callSid})`);
          setToNumber("");
          setPurpose("");
        },
        onError: () => {
          setError("Failed to initiate call. Check your Twilio credentials in Settings.");
        },
      }
    );
  };

  const notConfigured = config && (!config.twilioAccountSid || !config.twilioPhoneNumber);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Outbound Dialer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Initiate outbound calls from your Twilio number
        </p>
      </div>

      {notConfigured && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Twilio credentials are not configured.{" "}
            <Link href="/settings" className="underline font-medium">
              Go to Settings
            </Link>{" "}
            to add them.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dialer form */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PhoneOutgoing className="h-4 w-4 text-primary" />
              Place a Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success && (
              <Alert className="border-emerald-200 bg-emerald-50 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 text-sm">{success}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="to">Phone Number</Label>
                <Input
                  id="to"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value)}
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">E.164 format recommended (e.g. +15550001234)</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purpose">Purpose (optional)</Label>
                <Input
                  id="purpose"
                  placeholder="e.g. appointment reminder, follow-up..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Brief context for the AI during this call
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || !toNumber || notConfigured}
              >
                {mutation.isPending ? "Calling..." : "Call Now"}
              </Button>
            </form>

            {config?.twilioPhoneNumber && (
              <p className="mt-3 text-xs text-center text-muted-foreground">
                Calling from {config.twilioPhoneNumber}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent outbound calls */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Outbound Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0 p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !callsData?.calls?.length ? (
              <div className="py-12 text-center text-muted-foreground text-sm px-4">
                No outbound calls yet. Place your first call above.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {callsData.calls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{call.toNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(call.startedAt)}</p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[call.status] ?? "bg-muted text-muted-foreground")}>
                      {call.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
