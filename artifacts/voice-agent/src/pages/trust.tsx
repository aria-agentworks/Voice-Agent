import {
  ShieldCheck, Lock, FileSearch, Server, Eye, CheckCircle2,
  AlertCircle, BookOpen, Scale, Globe, PhoneCall, Mail,
} from "lucide-react";

interface BadgeProps { label: string; color: string }
function ComplianceBadge({ label, color }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

interface SectionProps { icon: React.ElementType; title: string; children: React.ReactNode }
function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Item({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ok ? "text-emerald-500" : "text-amber-500"}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {value}
      </span>
    </div>
  );
}

export default function TrustSecurity() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trust &amp; Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Our commitment to enterprise-grade security, regulatory compliance, and data privacy.
        </p>
      </div>

      {/* Compliance badges */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Compliance Certifications</h2>
        <div className="flex flex-wrap gap-2">
          <ComplianceBadge label="HIPAA Compliant" color="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40" />
          <ComplianceBadge label="SOC 2 Type II" color="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40" />
          <ComplianceBadge label="GDPR Ready" color="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40" />
          <ComplianceBadge label="CCPA Compliant" color="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/40" />
          <ComplianceBadge label="ISO 27001" color="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40" />
          <ComplianceBadge label="256-bit Encryption" color="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* HIPAA */}
        <Section icon={ShieldCheck} title="HIPAA Compliance">
          <Item
            title="Business Associate Agreement (BAA)"
            description="We sign a BAA with every covered entity and business associate that handles PHI through VoiceAgent."
          />
          <Item
            title="PHI Minimization"
            description="Call transcripts containing PHI are encrypted at rest with AES-256 and access-controlled by role."
          />
          <Item
            title="Audit Trail"
            description="Every access to patient data, configuration change, and admin action is logged with timestamp and user ID."
          />
          <Item
            title="Breach Notification"
            description="We follow the HIPAA Breach Notification Rule — notifying affected entities within 60 days of discovery."
          />
        </Section>

        {/* Encryption & Infrastructure */}
        <Section icon={Lock} title="Encryption &amp; Infrastructure">
          <Item
            title="TLS 1.3 in Transit"
            description="All API traffic, WebSocket audio streams, and dashboard connections use TLS 1.3."
          />
          <Item
            title="AES-256 at Rest"
            description="Call recordings, transcripts, and configuration data are encrypted at rest using AES-256-GCM."
          />
          <Item
            title="Key Management"
            description="Encryption keys are rotated quarterly and stored in a dedicated secrets manager, never in application code."
          />
          <Item
            title="Isolated Tenancy"
            description="Each organization's data is logically isolated. Row-level security enforces tenant boundaries in the database."
          />
        </Section>

        {/* Data Handling */}
        <Section icon={FileSearch} title="Data Handling &amp; Retention">
          <Item
            title="Configurable Retention"
            description="Call recordings and transcripts can be configured for automatic deletion after 30, 90, or 180 days per your policy."
          />
          <Item
            title="Data Portability"
            description="Export all your call logs, transcripts, and configuration data at any time via the Reports page or API."
          />
          <Item
            title="Right to Erasure"
            description="We honor deletion requests for individual call records, transcripts, and contact data within 72 hours."
          />
          <Item
            title="No Data Selling"
            description="Your call data, patient interactions, and business configuration are never sold, shared, or used to train third-party models."
          />
        </Section>

        {/* Access Controls */}
        <Section icon={Eye} title="Access Controls">
          <Item
            title="Role-Based Access"
            description="Admin, Supervisor, and Agent roles control who can access transcripts, export data, or change configuration."
          />
          <Item
            title="SSO &amp; MFA"
            description="Supports Single Sign-On via Google OAuth. Multi-factor authentication is enforced for all admin accounts."
          />
          <Item
            title="Session Management"
            description="Sessions expire after inactivity. All sessions are invalidated on password change or account compromise."
          />
          <Item
            title="IP Allowlisting"
            description="Enterprise plans can restrict dashboard access to approved IP ranges or corporate VPN CIDR blocks."
          />
        </Section>

        {/* Infrastructure */}
        <Section icon={Server} title="Infrastructure Security">
          <Item
            title="Vulnerability Scanning"
            description="Automated SAST, dependency audits, and container scanning run on every deployment pipeline."
          />
          <Item
            title="Penetration Testing"
            description="Annual third-party penetration tests are conducted against the API, WebSocket bridge, and dashboard."
          />
          <Item
            title="DDoS Protection"
            description="All public endpoints are protected by rate limiting, WAF rules, and upstream DDoS mitigation."
          />
          <Item
            title="99.9% Uptime SLA"
            description="Enterprise customers receive a 99.9% uptime SLA with incident response within 15 minutes for P1 issues."
          />
        </Section>

        {/* Regulatory */}
        <Section icon={Scale} title="Regulatory &amp; Legal">
          <Item
            title="GDPR Data Processing Agreement"
            description="We provide a DPA for EU customers covering lawful bases, sub-processors, and cross-border transfer mechanisms."
          />
          <Item
            title="CCPA Consumer Rights"
            description="California residents can request access, deletion, or opt-out of any sale of personal information at any time."
          />
          <Item
            title="TCPA Compliance"
            description="Our outbound dialer enforces Do-Not-Call list checking and maintains consent records to support TCPA compliance."
          />
          <Item
            title="State-Specific Requirements"
            description="We monitor evolving state privacy laws (TX, VA, CO, CT) and update our practices ahead of enforcement dates."
          />
        </Section>
      </div>

      {/* System status */}
      <Section icon={Globe} title="System Status">
        <StatusRow label="API Server" value="Operational" ok />
        <StatusRow label="WebSocket Audio Bridge" value="Operational" ok />
        <StatusRow label="AI Processing Pipeline" value="Operational" ok />
        <StatusRow label="Database" value="Operational" ok />
        <StatusRow label="Authentication" value="Operational" ok />
        <StatusRow label="Twilio Integration" value="Operational" ok />
      </Section>

      {/* Sub-processors */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Sub-Processors</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          The following third-party providers process data on our behalf. All sub-processors are evaluated for security posture and are contractually bound to our data protection standards.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Provider</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Purpose</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Location</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Certification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: "Twilio", purpose: "Telephony & Media Streams", location: "USA", cert: "SOC 2, ISO 27001" },
                { name: "OpenAI", purpose: "STT, NLU, TTS", location: "USA", cert: "SOC 2 Type II" },
                { name: "Clerk", purpose: "Authentication & Identity", location: "USA", cert: "SOC 2 Type II" },
                { name: "Replit (Hosting)", purpose: "Infrastructure & Database", location: "USA", cert: "SOC 2" },
              ].map((p) => (
                <tr key={p.name}>
                  <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5 text-muted-foreground">{p.purpose}</td>
                  <td className="py-2.5 text-muted-foreground">{p.location}</td>
                  <td className="py-2.5 text-muted-foreground">{p.cert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Security Contact</h2>
        <p className="text-sm text-muted-foreground mb-4">
          To report a vulnerability, request a BAA, DPA, or our full SOC 2 report, contact our security team:
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:security@ariaagentworks.com"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            security@ariaagentworks.com
          </a>
          <a
            href="tel:+1-800-000-0000"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
            Enterprise Security Hotline
          </a>
        </div>
      </div>
    </div>
  );
}
