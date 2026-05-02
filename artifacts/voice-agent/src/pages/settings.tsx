import { useState, useEffect } from "react";
import { useGetVoiceConfig, useUpdateVoiceConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Copy, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function Settings() {
  const { data: config, isLoading } = useGetVoiceConfig();
  const mutation = useUpdateVoiceConfig();

  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (config) {
      setAccountSid(config.twilioAccountSid ?? "");
      setAuthToken("");
      setPhoneNumber(config.twilioPhoneNumber ?? "");
      setIsActive(config.isActive ?? false);
    }
  }, [config]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    const payload: Record<string, unknown> = {
      twilioPhoneNumber: phoneNumber || undefined,
      twilioAccountSid: accountSid || undefined,
      isActive,
    };
    if (authToken) payload.twilioAuthToken = authToken;

    mutation.mutate(payload as Parameters<typeof mutation.mutate>[0], {
      onSuccess: () => {
        setSaved(true);
        setAuthToken("");
      },
      onError: () => setSaveError("Failed to save settings."),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const webhookUrl = config?.webhookUrl ?? "";
  const isMissingCredentials = !config?.twilioAccountSid || !config?.twilioPhoneNumber;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Twilio credentials and webhook configuration</p>
      </div>

      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">Settings saved successfully.</AlertDescription>
        </Alert>
      )}
      {saveError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Webhook URL */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Webhook URL</CardTitle>
          <p className="text-xs text-muted-foreground">
            Copy this URL and paste it as your Twilio phone number's Voice webhook (HTTP POST)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMissingCredentials && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Add your Twilio credentials below, then set this webhook URL in your Twilio console.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Inbound Voice URL</Label>
            <div className="relative">
              <code className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2.5 pr-10 text-xs font-mono text-foreground break-all">
                {webhookUrl || "Save Twilio credentials first"}
              </code>
              {webhookUrl && <CopyButton text={webhookUrl} />}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Setup instructions</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Save your Twilio credentials below</li>
                <li>Go to your Twilio console → Phone Numbers → Active numbers</li>
                <li>Select your phone number</li>
                <li>Under "Voice Configuration" → set webhook to the URL above (HTTP POST)</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twilio credentials */}
      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Twilio Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sid">Account SID</Label>
              <Input
                id="sid"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token">Auth Token</Label>
              <Input
                id="token"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder={config?.twilioAuthToken ? "••••••••" : "Enter auth token..."}
                className="font-mono text-sm"
              />
              {config?.twilioAuthToken && !authToken && (
                <p className="text-xs text-muted-foreground">Leave blank to keep existing token</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Twilio Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15550001234"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
              <div>
                <p className="text-sm font-medium">Voice Agent Active</p>
                <p className="text-xs text-muted-foreground">Enable to start answering calls</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5 text-sm">
            {[
              {
                label: "Twilio Account SID",
                ok: !!config?.twilioAccountSid,
              },
              {
                label: "Twilio Auth Token",
                ok: !!config?.twilioAuthToken,
              },
              {
                label: "Twilio Phone Number",
                ok: !!config?.twilioPhoneNumber,
              },
              {
                label: "Voice Agent",
                ok: config?.isActive,
              },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium",
                  ok ? "text-emerald-600" : "text-amber-600"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-amber-400")} />
                  {ok ? "Configured" : "Not set"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
