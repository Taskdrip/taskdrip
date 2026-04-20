import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Send, Settings, Zap, BarChart3, Users, FileText, Plus, Trash2,
  Play, Eye, Edit, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  Server, Shield, Globe, Key, TestTube, Inbox, Bot, ChevronRight,
  ArrowLeft, Copy, Info, Layers, BookOpen, ExternalLink, Terminal, Lock,
  Database, HelpCircle, Package, Bell, Download
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailSettings {
  smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string;
  smtpSsl?: boolean; smtpTls?: boolean; smtpFromEmail?: string; smtpFromName?: string;
  imapHost?: string; imapPort?: number; imapUser?: string; imapPass?: string; imapSsl?: boolean;
  siteUrl?: string; domain?: string; unsubscribeUrl?: string; logoUrl?: string;
  spfRecord?: string; dkimPublicKey?: string; dmarcRecord?: string;
  isVerified?: boolean; lastTestedAt?: string;
}

interface EmailCampaign {
  id: string; name: string; subject: string; htmlBody: string; textBody?: string;
  targetSegment: string; status: string; scheduledAt?: string; sentAt?: string;
  totalRecipients: number; sent: number; delivered: number; opened: number;
  clicked: number; bounced: number; unsubscribed: number; createdAt: string;
}

interface EmailTemplate {
  id: string; name: string; category: string; subject: string;
  htmlBody: string; textBody?: string; variables?: string[]; isActive: boolean; createdAt: string;
}

interface EmailAutoResponder {
  id: string; name: string; trigger: string; triggerDelay: number;
  subject: string; htmlBody: string; targetUserType: string;
  isActive: boolean; aiGenerated: boolean; sentCount: number; openCount: number; createdAt: string;
}

interface EmailLog {
  id: string; recipientEmail: string; recipientName?: string; subject: string;
  status: string; errorMessage?: string; sentAt: string; openedAt?: string; clickedAt?: string;
  campaignId?: string; autoResponderId?: string;
}

interface Contact {
  id: string; email: string; firstName: string; lastName: string;
  userType: string; creatorTier?: string; isVerified: boolean; totalFollowers: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { value: "all", label: "All Users" },
  { value: "influencers", label: "Influencers Only" },
  { value: "brands", label: "Brands Only" },
  { value: "verified", label: "Verified Users" },
  { value: "unverified", label: "Unverified Users" },
  { value: "tier_rising_sparks", label: "Rising Sparks (10K–100K)" },
  { value: "tier_growth_engines", label: "Growth Engines (100K–1M)" },
  { value: "tier_power_influencers", label: "Power Influencers (1M–10M)" },
  { value: "tier_global_titans", label: "Global Titans (10M+)" },
];

const TRIGGERS = [
  { value: "signup", label: "User Signs Up" },
  { value: "campaign_join", label: "Joins a Campaign" },
  { value: "campaign_complete", label: "Completes a Campaign" },
  { value: "purchase", label: "Makes a Purchase" },
  { value: "kyc_approved", label: "KYC Approved" },
  { value: "payout_sent", label: "Payout Sent" },
  { value: "custom", label: "Custom / Manual" },
];

const TEMPLATE_CATS = ["general", "welcome", "campaign", "newsletter", "promo", "auto_responder"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-yellow-100 text-yellow-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    sent_log: "bg-green-100 text-green-700",
    opened: "bg-purple-100 text-purple-700",
    clicked: "bg-indigo-100 text-indigo-700",
    bounced: "bg-red-100 text-red-700",
  };
  return <Badge className={`${map[status] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>{status}</Badge>;
}

function openRate(opened: number, sent: number) {
  if (!sent) return "0%";
  return `${((opened / sent) * 100).toFixed(1)}%`;
}

function clickRate(clicked: number, sent: number) {
  if (!sent) return "0%";
  return `${((clicked / sent) * 100).toFixed(1)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Setup Guide Component ─────────────────────────────────────────────────────

function CopyBox({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
      <div className={`flex items-start gap-2 bg-gray-900 text-green-400 rounded-lg px-4 py-3 ${mono ? "font-mono" : ""} text-xs break-all`}>
        <span className="flex-1">{value}</span>
        <button onClick={copy} className="shrink-0 mt-0.5 text-gray-400 hover:text-white transition-colors">
          {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function StepCard({ step, title, icon: Icon, color, children }: { step: number; title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>{step}</div>
          <Icon className="h-4 w-4 text-gray-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SetupGuide({ domain }: { domain: string }) {
  const [section, setSection] = useState<"namecheap" | "vps" | "newbiz">("namecheap");

  const spf = `v=spf1 include:privateemail.com ~all`;
  const dmarc = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; adkim=s; aspf=s`;
  const mxRecord = `mail.privateemail.com`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="h-7 w-7" />
          <h2 className="text-xl font-bold">Email & Domain Setup Guide</h2>
        </div>
        <p className="text-purple-100 text-sm leading-relaxed">
          Complete step-by-step instructions to configure your domain, SSL, email delivery, and email marketing. Deploy via <strong>GitHub → Railway</strong>, connect your Namecheap domain, and get a new business up and running without touching any code.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { key: "namecheap", label: "Namecheap DNS Setup" },
            { key: "vps", label: "GitHub → Railway Deployment" },
            { key: "newbiz", label: "New Business Checklist" },
          ].map(s => (
            <button key={s.key} onClick={() => setSection(s.key as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${section === s.key ? "bg-white text-purple-700" : "bg-white/20 hover:bg-white/30 text-white"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── NAMECHEAP SECTION ── */}
      {section === "namecheap" && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Before you start — what you need</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Your domain <strong>{domain}</strong> managed via Namecheap DNS (default)</li>
                <li>A <strong>Namecheap Private Email</strong> subscription (or any SMTP provider)</li>
                <li>This app deployed on <strong>Railway</strong> (SSL is automatic) — see the Railway tab for deployment steps</li>
              </ul>
            </div>
          </div>

          <StepCard step={1} title="Connect Your Domain to Railway (SSL Auto-Provisioned)" icon={Globe} color="bg-purple-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Once your app is deployed on Railway, SSL is <strong>100% automatic</strong> — Railway provisions a free Let's Encrypt certificate for every custom domain. Here's how to connect {domain}:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In Railway → open your service → go to <strong>Settings → Domains</strong></li>
                <li>Click <strong>Add Custom Domain</strong> and type <code className="bg-gray-100 px-1 rounded">{domain}</code></li>
                <li>Railway will show you a <strong>CNAME value</strong> (looks like <code className="bg-gray-100 px-1 rounded">xxxx.up.railway.app</code>)</li>
                <li>In Namecheap → <strong>Domain List</strong> → <strong>Manage</strong> → <strong>Advanced DNS</strong> → add:</li>
              </ol>
              <div className="mt-3">
                <CopyBox label="CNAME Record — Host: @ (root domain)" value={`Type: CNAME\nHost: @\nValue: [copy from Railway dashboard].up.railway.app\nTTL: Automatic`} mono={false} />
                <CopyBox label="CNAME Record — Host: www" value={`Type: CNAME\nHost: www\nValue: [copy from Railway dashboard].up.railway.app\nTTL: Automatic`} mono={false} />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                <p className="font-semibold mb-1">ℹ️ Important: Namecheap CNAME on root (@)</p>
                <p>Namecheap does not support CNAME on the @ (root) record for most plans. Instead, use the <strong>URL Redirect</strong> or switch to <strong>Cloudflare DNS</strong> (free) which supports CNAME flattening on root. Alternatively, add the www CNAME and redirect @ → www from Railway or Cloudflare.</p>
              </div>
              <p className="text-xs text-gray-500">DNS changes take 5–30 minutes to propagate. Railway detects the DNS change and auto-provisions your SSL certificate within minutes.</p>
            </div>
          </StepCard>

          <StepCard step={2} title="Set Up Namecheap Private Email (SMTP)" icon={Mail} color="bg-blue-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Namecheap Private Email gives you professional <strong>@{domain}</strong> email addresses. Go to <strong>namecheap.com → Apps → Private Email</strong> and subscribe.</p>
              <p className="font-semibold">After setting up, use these SMTP settings in the <strong>SMTP / IMAP / Domain</strong> tab:</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Field</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["SMTP Host", "mail.privateemail.com"],
                      ["SMTP Port (TLS)", "587"],
                      ["SMTP Port (SSL)", "465"],
                      ["Username", `noreply@${domain} (your created mailbox)`],
                      ["Password", "Your Private Email mailbox password"],
                      ["From Name", "Taskdrip"],
                      [`From Email`, `noreply@${domain}`],
                      ["TLS", "Enabled (STARTTLS)"],
                      ["IMAP Host", "mail.privateemail.com"],
                      ["IMAP Port", "993 (SSL)"],
                    ].map(([field, val]) => (
                      <tr key={field} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-800">{field}</td>
                        <td className="px-4 py-2 font-mono text-gray-600">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">First create the <code className="bg-gray-100 px-1 rounded">noreply@{domain}</code> mailbox in Namecheap Private Email control panel, then use those credentials here.</p>
            </div>
          </StepCard>

          <StepCard step={3} title="Configure DNS Records to Prevent Spam (SPF · DKIM · DMARC · MX)" icon={Shield} color="bg-green-600">
            <div className="space-y-4 text-sm text-gray-700">
              <p>Go to <strong>Namecheap → Domain List → Manage → Advanced DNS</strong> and add these records:</p>

              <div className="space-y-1">
                <p className="font-semibold text-gray-900">📌 MX Record (for receiving email)</p>
                <CopyBox label="MX Record — Host: @, Priority: 10" value={`mail.privateemail.com`} />
                <CopyBox label="MX Record — Host: @, Priority: 20 (backup)" value={`mail2.privateemail.com`} />
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-gray-900">📌 SPF Record (prevents spoofing)</p>
                <p className="text-xs text-gray-500">Type: TXT · Host: @ · Value:</p>
                <CopyBox label="SPF TXT Record" value={spf} />
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-gray-900">📌 DKIM Record (email authentication)</p>
                <p className="text-xs text-gray-500">Get your DKIM key from Namecheap Private Email control panel → Domain Settings → Email Authentication. It will look like this:</p>
                <CopyBox label="DKIM TXT Record — Host: default._domainkey" value={`v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4...YOUR_ACTUAL_KEY_HERE`} />
                <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">⚠️ Copy the actual DKIM public key from your Namecheap Email control panel — the above is just a format example.</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-gray-900">📌 DMARC Record (reporting + policy)</p>
                <p className="text-xs text-gray-500">Type: TXT · Host: _dmarc · Value:</p>
                <CopyBox label="DMARC TXT Record" value={dmarc} />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                <p className="font-semibold mb-1">✅ DNS Checklist</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>MX record → mail.privateemail.com (priority 10)</li>
                  <li>SPF TXT record → @ (root domain)</li>
                  <li>DKIM TXT record → default._domainkey.{domain}</li>
                  <li>DMARC TXT record → _dmarc.{domain}</li>
                </ul>
                <p className="mt-2">Use <a href="https://mxtoolbox.com/SuperTool.aspx" target="_blank" className="underline font-semibold">mxtoolbox.com</a> to verify all records are live (allow 10–60 min for propagation).</p>
              </div>
            </div>
          </StepCard>

          <StepCard step={4} title="SSL Certificate (Automatic on Railway)" icon={Lock} color="bg-indigo-600">
            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p><strong>Deployed on Railway:</strong> SSL/TLS is fully automatic. Railway provisions and auto-renews a free Let's Encrypt certificate for every custom domain — zero configuration required on your part.</p>
              </div>
              <p>Once your CNAME record from Step 1 propagates and Railway detects it, the padlock 🔒 appears in your browser automatically — typically within 5–15 minutes of DNS going live.</p>
              <p className="text-xs text-gray-500">See the "GitHub → Railway Deployment" tab for how to get your app onto Railway before connecting the domain.</p>
            </div>
          </StepCard>

          <StepCard step={5} title="Save Settings & Test Email Delivery" icon={TestTube} color="bg-pink-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to the <strong>SMTP / IMAP / Domain</strong> tab and fill in all fields from Step 2</li>
                <li>Enter your domain in <strong>Domain</strong> and site URL in <strong>Site URL</strong></li>
                <li>Copy the DNS records from Step 3 into the DNS Records fields and click <strong>Save DNS Records</strong></li>
                <li>Click <strong>"Test Connection"</strong> to verify SMTP works</li>
                <li>Enter your email in <strong>"Send Test Email"</strong> and confirm you receive it</li>
                <li>Check that the test email doesn't land in spam — if it does, double-check your SPF/DKIM/DMARC records</li>
              </ol>
            </div>
          </StepCard>

          <StepCard step={6} title="Free Alternative SMTP Providers" icon={Package} color="bg-orange-500">
            <div className="text-sm text-gray-700 space-y-3">
              <p>If you prefer not to use Namecheap Private Email, here are excellent free alternatives:</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Provider</th>
                      <th className="text-left px-4 py-2 font-semibold">Free Limit</th>
                      <th className="text-left px-4 py-2 font-semibold">SMTP Host</th>
                      <th className="text-left px-4 py-2 font-semibold">Port</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Brevo (Sendinblue)", "300/day", "smtp-relay.brevo.com", "587"],
                      ["Mailjet", "200/day", "in-v3.mailjet.com", "587"],
                      ["Mailgun", "100/day (trial)", "smtp.mailgun.org", "587"],
                      ["SendGrid", "100/day", "smtp.sendgrid.net", "587"],
                      ["Zoho Mail", "5GB, custom domain", "smtp.zoho.com", "587"],
                      ["Gmail (App PW)", "500/day", "smtp.gmail.com", "587"],
                    ].map(([p, f, h, port]) => (
                      <tr key={p} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-800">{p}</td>
                        <td className="px-4 py-2 text-green-700">{f}</td>
                        <td className="px-4 py-2 font-mono text-gray-600">{h}</td>
                        <td className="px-4 py-2">{port}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">For production at scale, Brevo or Mailjet are recommended as they are purpose-built for bulk email with good deliverability and free tiers.</p>
            </div>
          </StepCard>
        </div>
      )}

      {/* ── RAILWAY DEPLOYMENT SECTION ── */}
      {section === "vps" && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 flex gap-3">
            <Server className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="text-sm text-violet-800">
              <p className="font-semibold mb-1">GitHub → Railway: Zero-Server Deployment</p>
              <p>Push your code to GitHub, connect it to Railway, and you're live — Railway handles builds, restarts, SSL, scaling, and logs automatically. No server management required.</p>
            </div>
          </div>

          <StepCard step={1} title="Push Your Code to GitHub" icon={Terminal} color="bg-gray-800">
            <div className="space-y-3 text-sm text-gray-700">
              <p>If you haven't already, create a GitHub repository and push your code:</p>
              <CopyBox label="Initialize and push to GitHub" value={`git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main`} />
              <p className="text-xs text-gray-500">Make sure your <code className="bg-gray-100 px-1 rounded">.gitignore</code> includes <code className="bg-gray-100 px-1 rounded">.env</code>, <code className="bg-gray-100 px-1 rounded">node_modules/</code>, and <code className="bg-gray-100 px-1 rounded">dist/</code> — never push secrets to GitHub.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">⚠️ Secrets must NOT be in your repo</p>
                <p>DATABASE_URL, SESSION_SECRET, and GROQ_API_KEY must only be set via Railway's environment variable dashboard — never committed to GitHub.</p>
              </div>
            </div>
          </StepCard>

          <StepCard step={2} title="Create a Railway Project & Deploy from GitHub" icon={Globe} color="bg-violet-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <strong>railway.app</strong> → Sign up / Log in (free tier available)</li>
                <li>Click <strong>New Project → Deploy from GitHub repo</strong></li>
                <li>Authorize Railway to access your GitHub account</li>
                <li>Select your repository (e.g. <code className="bg-gray-100 px-1 rounded">taskdrip</code>)</li>
                <li>Railway auto-detects Node.js and will use <code className="bg-gray-100 px-1 rounded">npm run build</code> → <code className="bg-gray-100 px-1 rounded">npm start</code></li>
              </ol>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                <p className="font-semibold">✅ This app is Railway-ready out of the box</p>
                <p className="mt-1">The <code className="bg-gray-100 px-1 rounded">package.json</code> already has the correct <code className="bg-gray-100 px-1 rounded">build</code> and <code className="bg-gray-100 px-1 rounded">start</code> scripts. The server automatically reads <code className="bg-gray-100 px-1 rounded">process.env.PORT</code> — exactly what Railway requires.</p>
              </div>
            </div>
          </StepCard>

          <StepCard step={3} title="Set Environment Variables in Railway" icon={Key} color="bg-orange-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>In Railway → your service → <strong>Variables</strong> tab → add each one:</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Variable Name</th>
                      <th className="text-left px-4 py-2 font-semibold">Value / Where to get it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["DATABASE_URL", "Neon Postgres → Project → Connection string (pooled)"],
                      ["SESSION_SECRET", "Generate: openssl rand -hex 32 (any 64-char random string)"],
                      ["GROQ_API_KEY", "console.groq.com → API Keys → Create key (free)"],
                      ["NODE_ENV", "production"],
                    ].map(([v, desc]) => (
                      <tr key={v} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-mono text-violet-700 font-semibold text-xs">{v}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CopyBox label="Generate SESSION_SECRET (run in any terminal)" value={`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`} />
              <p className="text-xs text-gray-500">Railway automatically sets the PORT variable — do not add it manually. The app reads it correctly already.</p>
            </div>
          </StepCard>

          <StepCard step={4} title="Set Up Neon PostgreSQL (Free Serverless DB)" icon={Database} color="bg-blue-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <strong>neon.tech</strong> → Create account (free tier = 512MB database)</li>
                <li>Create a new project → choose region closest to your Railway deployment</li>
                <li>Copy the <strong>Pooled connection string</strong> from the dashboard</li>
                <li>Paste it as <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> in Railway Variables (Step 3)</li>
                <li>After first deployment, push the database schema:</li>
              </ol>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Option A — Via Railway CLI (recommended)</p>
                <CopyBox label="Install Railway CLI and run migration" value={`npm install -g @railway/cli
railway login
railway run npm run db:push`} />
                <p className="text-xs font-semibold text-gray-700 mb-2 mt-3">Option B — Add to Railway build command</p>
                <p className="text-xs text-gray-600 mb-2">In Railway → service → Settings → Build Command, change to:</p>
                <CopyBox label="Custom build command (runs migration automatically)" value={`npm run build && npm run db:push`} />
              </div>
              <p className="text-xs text-gray-500">Railway PostgreSQL plugin is also available (adds Postgres directly in Railway), but Neon's free tier is more generous and serverless.</p>
            </div>
          </StepCard>

          <StepCard step={5} title="Connect Custom Domain & Get SSL" icon={Lock} color="bg-green-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>In Railway → your service → <strong>Settings → Networking → Add Custom Domain</strong></li>
                <li>Enter <code className="bg-gray-100 px-1 rounded">{domain}</code> and <code className="bg-gray-100 px-1 rounded">www.{domain}</code></li>
                <li>Railway shows a CNAME target (e.g. <code className="bg-gray-100 px-1 rounded">xxxxx.up.railway.app</code>)</li>
                <li>In Namecheap Advanced DNS, add CNAME records pointing both <code className="bg-gray-100 px-1 rounded">www</code> and <code className="bg-gray-100 px-1 rounded">@</code> to that value</li>
                <li>Wait 5–30 minutes for DNS to propagate</li>
                <li>Railway automatically provisions your SSL certificate — the 🔒 padlock appears automatically</li>
              </ol>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                <p><strong>✅ SSL is completely free and automatic on Railway.</strong> Certificates are provisioned via Let's Encrypt and auto-renew every 90 days with zero action from you.</p>
              </div>
              <p className="text-xs text-gray-500">See the "Namecheap DNS Setup" tab for exact DNS record values including MX, SPF, DKIM, and DMARC for email deliverability.</p>
            </div>
          </StepCard>

          <StepCard step={6} title="Enable Auto-Deploy on Git Push" icon={RefreshCw} color="bg-pink-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Railway automatically redeploys your app every time you push to GitHub — no manual steps needed:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In Railway → service → <strong>Settings → Source</strong> — confirm <strong>Auto Deploy</strong> is enabled</li>
                <li>Make a code change and push to GitHub</li>
                <li>Railway builds, deploys, and zero-downtime swaps your live app automatically</li>
              </ol>
              <CopyBox label="Daily deployment workflow" value={`# Make changes locally
git add .
git commit -m "Your change description"
git push origin main
# Railway automatically picks this up and redeploys`} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                {[
                  { label: "Build Logs", desc: "View in Railway → service → Deployments → click any deployment" },
                  { label: "Live Logs", desc: "Railway → service → Logs tab — real-time server output" },
                  { label: "Rollback", desc: "Railway → Deployments → click any past deployment → Rollback" },
                ].map(item => (
                  <div key={item.label} className="bg-violet-50 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-violet-900">{item.label}</p>
                    <p className="text-violet-700 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </StepCard>

          <StepCard step={7} title="Seed Demo Data After First Deploy" icon={Database} color="bg-indigo-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>After your first successful Railway deployment, run the demo seed to populate the database with sample campaigns, users, and products:</p>
              <CopyBox label="Run via Railway CLI" value={`railway run npx tsx server/seed-demo.ts`} />
              <p className="text-xs text-gray-500">This creates the admin account (demo@taskdrip.online / Admin@2024) and demo brand account. <strong>Change the admin password immediately after seeding.</strong></p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p>After seeding, go to <strong>Admin Panel → Admin Credentials</strong> and change your email and password before going live.</p>
              </div>
            </div>
          </StepCard>
        </div>
      )}

      {/* ── NEW BUSINESS DEPLOYMENT GUIDE ── */}
      {section === "newbiz" && (
        <div className="space-y-5">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3">
            <Package className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-sm text-purple-800">
              <p className="font-semibold mb-1">Deploying this codebase for a new business / client</p>
              <p>Everything in this platform is configurable without touching a single line of code. This guide walks through all the settings a new owner needs to change.</p>
            </div>
          </div>

          <StepCard step={1} title="Change the Domain & Branding" icon={Globe} color="bg-purple-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>In the <strong>Admin → Master Settings</strong> panel, update:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Platform Name</strong> — change from "Taskdrip" to your brand name</li>
                <li><strong>Tagline</strong> — change "Influencers Marketplace" to your tagline</li>
                <li><strong>Support Email</strong> — update to support@yourdomain.com</li>
                <li><strong>Footer Copyright</strong> — update to © 2025 YourBrand</li>
                <li><strong>Logo & Favicon</strong> — upload your brand assets</li>
              </ul>
              <p className="text-xs text-gray-500">These settings are stored in the database — no code edits needed. They propagate site-wide instantly.</p>
            </div>
          </StepCard>

          <StepCard step={2} title="Environment Variables to Configure" icon={Key} color="bg-gray-800">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Set these in <strong>Railway → service → Variables</strong> (or a <code className="bg-gray-100 px-1 rounded">.env</code> file locally for testing):</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Variable</th>
                      <th className="text-left px-4 py-2 font-semibold">Purpose</th>
                      <th className="text-left px-4 py-2 font-semibold">Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["DATABASE_URL", "Neon PostgreSQL connection string", "✅ Yes"],
                      ["SESSION_SECRET", "Random 64-char string for session security", "✅ Yes"],
                      ["GROQ_API_KEY", "AI Guide Bot (free at console.groq.com)", "✅ Yes"],
                      ["NODE_ENV", "Set to 'production' on live server", "✅ Yes"],
                    ].map(([v, p, r]) => (
                      <tr key={v} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-mono text-purple-700 font-medium">{v}</td>
                        <td className="px-4 py-2 text-gray-600">{p}</td>
                        <td className="px-4 py-2 text-green-700">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">SMTP credentials are NOT stored as env vars — they're saved directly through this Email CRM admin panel to the database.</p>
            </div>
          </StepCard>

          <StepCard step={3} title="Change Admin Credentials" icon={Lock} color="bg-red-600">
            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-red-800 text-xs"><strong>IMPORTANT:</strong> Change the default admin credentials immediately after deployment. The default demo account (demo@taskdrip.online / Admin@2024) should not remain on a live server.</p>
              </div>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <strong>Admin Panel → Admin Credentials</strong> section</li>
                <li>Change the admin email to your business email</li>
                <li>Set a strong password (16+ characters, mixed case, symbols)</li>
                <li>Optionally create additional admin accounts under <strong>User Management</strong></li>
              </ol>
            </div>
          </StepCard>

          <StepCard step={4} title="Configure Payment Methods" icon={Database} color="bg-green-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Go to <strong>Admin → Master Settings → Payment Methods</strong> to configure how influencers get paid:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Crypto wallets</strong> — Add USDT wallet addresses for TRC-20, BEP-20, ERC-20, TON</li>
                <li><strong>Bank Transfer</strong> — Add your bank account details</li>
                <li><strong>PayPal</strong> — Add PayPal email or client ID</li>
                <li><strong>Paystack / Stripe</strong> — Add API keys for card payments</li>
              </ul>
              <p className="text-xs text-gray-500">All payment method fields are admin-controlled from the UI — no code changes needed.</p>
            </div>
          </StepCard>

          <StepCard step={5} title="Email Setup for Your Domain" icon={Mail} color="bg-blue-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Register your domain with Namecheap (or any registrar)</li>
                <li>Subscribe to <strong>Namecheap Private Email</strong> or any SMTP provider (Brevo is free up to 300/day)</li>
                <li>Add DNS records (MX, SPF, DKIM, DMARC) as shown in the <strong>Namecheap</strong> tab</li>
                <li>Go to <strong>SMTP / IMAP / Domain</strong> tab and enter your SMTP credentials</li>
                <li>Update the domain and site URL fields</li>
                <li>Click <strong>Test Connection</strong> to verify everything works</li>
              </ol>
              <p className="text-xs text-gray-500">The email templates (welcome emails, campaign notifications, payout confirmations) automatically use your brand name and domain once saved.</p>
            </div>
          </StepCard>

          <StepCard step={6} title="Set Up Your First Email Campaign" icon={Send} color="bg-pink-600">
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to the <strong>Campaigns</strong> tab and click <strong>New Campaign</strong></li>
                <li>Choose <strong>Load from AI Template</strong> — pick "welcome influencer" or "newsletter"</li>
                <li>Select your target segment (All Users, Influencers Only, Brands Only, etc.)</li>
                <li>Customize the subject and HTML body with your branding</li>
                <li>Click <strong>Create</strong> then <strong>Send Now</strong> to blast immediately</li>
              </ol>
              <p className="text-xs text-gray-500">Variables like <code className="bg-gray-100 px-1 rounded">{"{{first_name}}"}</code> are automatically replaced with each recipient's real data.</p>
            </div>
          </StepCard>

          <StepCard step={7} title="Auto-Responders (Set & Forget Email Automation)" icon={Bot} color="bg-indigo-600">
            <div className="space-y-3 text-sm text-gray-700">
              <p>Auto-responders send emails automatically when users take actions. Set these up once and they run forever:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  ["User Signs Up", "Send welcome email with getting-started guide"],
                  ["Joins a Campaign", "Confirm participation + instructions"],
                  ["Completes a Campaign", "Congratulate + show earnings"],
                  ["KYC Approved", "Unlock notification + premium campaign access"],
                  ["Payout Sent", "Confirmation with transaction details"],
                  ["Makes a Purchase", "Order confirmation + digital product delivery"],
                ].map(([trigger, desc]) => (
                  <div key={trigger} className="bg-indigo-50 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-indigo-900">{trigger}</p>
                    <p className="text-indigo-700 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Go to <strong>Auto-Responders</strong> tab → <strong>New Auto-Responder</strong>. Choose the trigger event, load an AI template, and enable it.</p>
            </div>
          </StepCard>

          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <HelpCircle className="h-6 w-6 text-purple-600" />
                <h3 className="font-bold text-purple-900 text-base">Quick Checklist for New Deployment</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  "✅ Change admin email + password",
                  "✅ Update platform name & branding",
                  "✅ Add your domain in Email Settings",
                  "✅ Configure SMTP credentials",
                  "✅ Add DNS records (MX, SPF, DKIM, DMARC)",
                  "✅ Test email delivery",
                  "✅ Set up payment methods (crypto wallets, bank)",
                  "✅ Configure Groq API key for AI Guide Bot",
                  "✅ Create welcome auto-responder",
                  "✅ Launch first campaign blast",
                  "✅ Push code to GitHub",
                  "✅ Deploy on Railway (auto-detects Node.js)",
                  "✅ Set env vars in Railway Variables tab",
                  "✅ Run db:push after first Railway deploy",
                  "✅ Add custom domain in Railway → SSL auto",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-purple-800">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminEmail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // ── Settings state
  const [settings, setSettings] = useState<EmailSettings>({});
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // ── Welcome email test state
  const [welcomeTestEmail, setWelcomeTestEmail] = useState("");
  const [welcomeTestName, setWelcomeTestName] = useState("");
  const [welcomeTestType, setWelcomeTestType] = useState("creator");
  const [sendingWelcomeTest, setSendingWelcomeTest] = useState(false);

  // ── Campaign state
  const [campaignModal, setCampaignModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Partial<EmailCampaign> | null>(null);
  const [campaignPreview, setCampaignPreview] = useState<EmailCampaign | null>(null);
  const [blastConfirm, setBlastConfirm] = useState<string | null>(null);

  // ── Template state
  const [templateModal, setTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [aiTemplateKey, setAiTemplateKey] = useState("");

  // ── Auto-responder state
  const [arModal, setArModal] = useState(false);
  const [editAr, setEditAr] = useState<Partial<EmailAutoResponder> | null>(null);

  // ── Queries
  const { data: settingsData } = useQuery<EmailSettings>({ queryKey: ["/api/admin/email/settings"] });
  const { data: emailStatus, refetch: refetchStatus } = useQuery<{ configured: boolean; provider: string; smtpHost?: string; sendgridAvailable: boolean }>({ queryKey: ["/api/admin/email/status"], refetchInterval: 30000 });
  const { data: campaigns = [] } = useQuery<EmailCampaign[]>({ queryKey: ["/api/admin/email/campaigns"] });
  const { data: templates = [] } = useQuery<EmailTemplate[]>({ queryKey: ["/api/admin/email/templates"] });
  const { data: autoResponders = [] } = useQuery<EmailAutoResponder[]>({ queryKey: ["/api/admin/email/auto-responders"] });
  const { data: logs = [] } = useQuery<EmailLog[]>({ queryKey: ["/api/admin/email/logs"] });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/admin/email/contacts"] });
  const { data: aiTemplates = {} } = useQuery<Record<string, any>>({ queryKey: ["/api/admin/email/ai-templates"] });
  const { data: newsletterSubs = [], refetch: refetchSubs } = useQuery<any[]>({ queryKey: ["/api/admin/newsletter-subscribers"] });

  const updateSubStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/newsletter-subscribers/${id}/status`, { status }),
    onSuccess: () => { refetchSubs(); toast({ title: "Status updated" }); },
  });

  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  // ── Mutations
  const saveSettings = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/settings", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/settings"] }); toast({ title: "Settings saved" }); setSettingsDirty(false); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const createCampaign = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/campaigns", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setCampaignModal(false); toast({ title: "Campaign created" }); },
  });

  const updateCampaign = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/campaigns/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setCampaignModal(false); toast({ title: "Campaign updated" }); },
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); toast({ title: "Campaign deleted" }); },
  });

  const sendCampaign = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/email/campaigns/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setBlastConfirm(null); toast({ title: "Campaign blast started! Emails are being sent in the background." }); },
    onError: () => toast({ title: "Blast failed", variant: "destructive" }),
  });

  const createTemplate = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/templates", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); setTemplateModal(false); toast({ title: "Template created" }); },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/templates/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); setTemplateModal(false); toast({ title: "Template updated" }); },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); toast({ title: "Template deleted" }); },
  });

  const createAr = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/auto-responders", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); setArModal(false); toast({ title: "Auto-responder created" }); },
  });

  const updateAr = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/auto-responders/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); setArModal(false); toast({ title: "Auto-responder updated" }); },
  });

  const deleteAr = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/auto-responders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); toast({ title: "Deleted" }); },
  });

  const toggleAr = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/admin/email/auto-responders/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }),
  });

  // ── Handlers
  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await apiRequest("POST", "/api/admin/email/test-smtp", settings);
      const data = await res.json();
      if (data.success) toast({ title: "✅ SMTP connection successful!" });
      else toast({ title: `SMTP failed: ${data.error}`, variant: "destructive" });
    } catch { toast({ title: "Test failed", variant: "destructive" }); }
    setTestingSmtp(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) { toast({ title: "Enter a test email", variant: "destructive" }); return; }
    setSendingTest(true);
    try {
      const res = await apiRequest("POST", "/api/admin/email/send-test", { to: testEmail, subject: "Test from Taskdrip Email CRM", html: "<h2>Hello!</h2><p>This is a test email from your Taskdrip Email Marketing CRM.</p>" });
      const data = await res.json();
      if (data.success) toast({ title: `Test email sent to ${testEmail}` });
      else toast({ title: `Failed: ${data.error}`, variant: "destructive" });
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
    setSendingTest(false);
  };

  const handleSendWelcomeTest = async () => {
    if (!welcomeTestEmail || !welcomeTestName) { toast({ title: "Enter email and name", variant: "destructive" }); return; }
    setSendingWelcomeTest(true);
    try {
      const res = await apiRequest("POST", "/api/admin/email/test-welcome", { email: welcomeTestEmail, firstName: welcomeTestName, userType: welcomeTestType });
      const data = await res.json();
      if (data.success) toast({ title: `Welcome email sent to ${welcomeTestEmail}`, description: `Delivered via ${data.provider || "email provider"}` });
      else toast({ title: `Failed: ${data.error}`, variant: "destructive" });
    } catch { toast({ title: "Failed to send welcome test", variant: "destructive" }); }
    setSendingWelcomeTest(false);
  };

  const handleSaveCampaign = () => {
    if (!editCampaign) return;
    if (editCampaign.id) updateCampaign.mutate(editCampaign as any);
    else createCampaign.mutate(editCampaign as any);
  };

  const handleSaveTemplate = () => {
    if (!editTemplate) return;
    if (editTemplate.id) updateTemplate.mutate(editTemplate as any);
    else createTemplate.mutate(editTemplate as any);
  };

  const handleSaveAr = () => {
    if (!editAr) return;
    if (editAr.id) updateAr.mutate(editAr as any);
    else createAr.mutate(editAr as any);
  };

  const handleLoadAiTemplate = (key: string) => {
    const t = (aiTemplates as any)[key];
    if (!t) return;
    setEditCampaign(prev => ({ ...prev, subject: t.subject, htmlBody: t.body }));
    setAiTemplateKey(key);
    toast({ title: "AI template loaded" });
  };

  // Stats
  const totalSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.opened || 0), 0);
  const totalClicked = campaigns.reduce((s, c) => s + (c.clicked || 0), 0);
  const activeAutoResponders = autoResponders.filter(a => a.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Marketing CRM</h1>
            <p className="text-sm text-gray-500">Campaigns · Templates · Auto-Responders · SMTP / IMAP · Domain Management</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {emailStatus?.configured ? (
              <Badge className="bg-green-100 text-green-700 border-0 gap-1"><CheckCircle className="h-3 w-3" />Email Active ({emailStatus.provider.toUpperCase()})</Badge>
            ) : emailStatus ? (
              <Badge className="bg-red-100 text-red-700 border-0 gap-1"><AlertCircle className="h-3 w-3" />Email Not Configured</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-500 border-0 gap-1"><Clock className="h-3 w-3" />Checking…</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-gray-200 p-1 h-auto flex-wrap gap-1">
          {[
            { value: "overview", icon: BarChart3, label: "Overview" },
            { value: "campaigns", icon: Send, label: "Campaigns" },
            { value: "templates", icon: FileText, label: "Templates" },
            { value: "auto-responders", icon: Bot, label: "Auto-Responders" },
            { value: "newsletter", icon: Bell, label: "Newsletter Subscribers" },
            { value: "contacts", icon: Users, label: "Contacts" },
            { value: "logs", icon: Inbox, label: "Email Logs" },
            { value: "settings", icon: Settings, label: "SMTP / IMAP" },
            { value: "how-it-works", icon: HelpCircle, label: "How It Works" },
            { value: "setup-guide", icon: BookOpen, label: "DNS Setup Guide" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <tab.icon className="h-4 w-4" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─────────────── OVERVIEW ─────────────── */}
        <TabsContent value="overview">
          {/* Email provider status banner */}
          {emailStatus && !emailStatus.configured && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">Email not configured — welcome emails won't be sent!</p>
                <p className="text-red-700 text-xs mt-1">New users who register will NOT receive a welcome email until you set up an email provider. Go to <strong>SMTP / IMAP / Domain</strong> tab to configure your SMTP server, or add a <code className="bg-red-100 px-1 rounded">SENDGRID_API_KEY</code> environment variable.</p>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs shrink-0" onClick={() => setActiveTab("settings")}>Configure Now</Button>
            </div>
          )}
          {emailStatus?.configured && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-800 text-sm">Email is active — welcome emails will be sent automatically</p>
                <p className="text-green-700 text-xs mt-0.5">Provider: <strong>{emailStatus.provider === "smtp" ? `SMTP (${emailStatus.smtpHost})` : "SendGrid"}</strong> · All new registrations will trigger the welcome email flow.</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">{emailStatus.provider.toUpperCase()}</Badge>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} color="bg-purple-600" />
            <StatCard label="Opened" value={totalOpened.toLocaleString()} icon={Eye} color="bg-blue-600" />
            <StatCard label="Clicked" value={totalClicked.toLocaleString()} icon={Zap} color="bg-green-600" />
            <StatCard label="Active Auto-Responders" value={activeAutoResponders} icon={Bot} color="bg-orange-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <StatCard label="Total Campaigns" value={campaigns.length} icon={Layers} color="bg-indigo-600" />
            <StatCard label="Email Templates" value={templates.length} icon={FileText} color="bg-pink-600" />
          </div>

          {/* Test welcome email panel */}
          <Card className="mb-6 border border-purple-100 bg-purple-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-purple-600" />
                Test Welcome Email (New Registration Flow)
              </CardTitle>
              <p className="text-xs text-gray-500">Send a preview of the exact welcome email new users receive when they sign up. Use this to verify your email setup is working correctly.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px]">
                  <Label className="text-xs text-gray-600 mb-1 block">Recipient Email</Label>
                  <Input placeholder="test@example.com" value={welcomeTestEmail} onChange={e => setWelcomeTestEmail(e.target.value)} className="text-sm h-9" data-testid="input-welcome-test-email" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs text-gray-600 mb-1 block">First Name</Label>
                  <Input placeholder="John" value={welcomeTestName} onChange={e => setWelcomeTestName(e.target.value)} className="text-sm h-9" data-testid="input-welcome-test-name" />
                </div>
                <div className="min-w-[130px]">
                  <Label className="text-xs text-gray-600 mb-1 block">User Type</Label>
                  <Select value={welcomeTestType} onValueChange={setWelcomeTestType}>
                    <SelectTrigger className="text-sm h-9" data-testid="select-welcome-test-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creator">Influencer / Creator</SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSendWelcomeTest} disabled={sendingWelcomeTest || !emailStatus?.configured} className="bg-purple-600 hover:bg-purple-700 h-9 text-sm" data-testid="button-send-welcome-test">
                  {sendingWelcomeTest ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Sending…</> : <><Send className="h-3 w-3 mr-1" />Send Welcome Email Test</>}
                </Button>
              </div>
              {!emailStatus?.configured && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Configure SMTP or SendGrid first before sending test emails.</p>}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-purple-600" />Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.sent} sent · {openRate(c.opened, c.sent)} open rate</p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                ))}
                {campaigns.length === 0 && <p className="text-gray-400 text-sm p-6">No campaigns yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-orange-500" />Auto-Responders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {autoResponders.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">Trigger: {a.trigger} · {a.sentCount} sent</p>
                    </div>
                    <Switch checked={a.isActive} onCheckedChange={v => toggleAr.mutate({ id: a.id, isActive: v })} />
                  </div>
                ))}
                {autoResponders.length === 0 && <p className="text-gray-400 text-sm p-6">No auto-responders yet</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────── CAMPAIGNS ─────────────── */}
        <TabsContent value="campaigns">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Campaigns</h2>
            <Button onClick={() => { setEditCampaign({ targetSegment: "all", status: "draft", htmlBody: "" }); setCampaignModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Campaign
            </Button>
          </div>
          <div className="space-y-3">
            {campaigns.map(c => (
              <Card key={c.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                        {statusBadge(c.status)}
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-2">Subject: {c.subject}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{SEGMENTS.find(s => s.value === c.targetSegment)?.label || c.targetSegment}</span>
                        <span className="flex items-center gap-1"><Send className="h-3 w-3" />{c.sent} sent</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{openRate(c.opened, c.sent)} open</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{clickRate(c.clicked, c.sent)} click</span>
                        {c.scheduledAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(c.scheduledAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === "draft" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => setBlastConfirm(c.id)}>
                          <Play className="h-3 w-3" />Send
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setCampaignPreview(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditCampaign({ ...c }); setCampaignModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteCampaign.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm">Create your first email blast campaign</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── TEMPLATES ─────────────── */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <Button onClick={() => { setEditTemplate({ category: "general", htmlBody: "", isActive: true }); setTemplateModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Template
            </Button>
          </div>

          {/* AI Templates */}
          <Card className="mb-4 border-purple-100 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2"><Bot className="h-4 w-4" />AI-Generated Template Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(aiTemplates).map(([key, t]: [string, any]) => (
                  <button key={key} onClick={() => { setEditTemplate({ name: key.replace(/_/g, " "), category: "auto_responder", subject: t.subject, htmlBody: t.body, isActive: true }); setTemplateModal(true); }}
                    className="text-left p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <p className="text-xs font-semibold text-gray-800 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.subject}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{t.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{t.subject}</p>
                    </div>
                    <Badge className="text-xs bg-indigo-50 text-indigo-700 border-0 shrink-0 ml-2">{t.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setEditTemplate({ ...t }); setTemplateModal(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No custom templates yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── AUTO-RESPONDERS ─────────────── */}
        <TabsContent value="auto-responders">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Auto-Responders</h2>
              <p className="text-sm text-gray-500">Automated emails triggered by user actions, powered by AI templates</p>
            </div>
            <Button onClick={() => { setEditAr({ trigger: "signup", triggerDelay: 0, targetUserType: "all", isActive: true, htmlBody: "" }); setArModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Auto-Responder
            </Button>
          </div>

          {/* Quick setup from AI templates */}
          <Card className="mb-4 border-orange-100 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2"><Zap className="h-4 w-4" />Quick Setup — AI Auto-Responder Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { key: "welcome_creator", trigger: "signup", delay: 0, label: "Welcome Influencer", userType: "creator" },
                  { key: "welcome_brand", trigger: "signup", delay: 0, label: "Welcome Brand", userType: "brand" },
                  { key: "campaign_approved", trigger: "campaign_complete", delay: 0, label: "Campaign Approved", userType: "creator" },
                  { key: "payout_sent", trigger: "payout_sent", delay: 0, label: "Payout Sent", userType: "creator" },
                  { key: "kyc_approved", trigger: "kyc_approved", delay: 0, label: "KYC Approved", userType: "creator" },
                  { key: "newsletter", trigger: "custom", delay: 0, label: "Weekly Newsletter", userType: "all" },
                ].map(item => {
                  const t = (aiTemplates as any)[item.key];
                  return (
                    <button key={item.key} onClick={() => {
                      setEditAr({
                        name: item.label, trigger: item.trigger, triggerDelay: item.delay,
                        targetUserType: item.userType, isActive: true, aiGenerated: true,
                        subject: t?.subject || "", htmlBody: t?.body || "",
                      });
                      setArModal(true);
                    }} className="text-left p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors">
                      <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{TRIGGERS.find(tr => tr.value === item.trigger)?.label}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {autoResponders.map(a => (
              <Card key={a.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${a.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                        <Bot className={`h-4 w-4 ${a.isActive ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-gray-900">{a.name}</h3>
                          {a.aiGenerated && <Badge className="bg-purple-50 text-purple-700 border-0 text-xs">AI</Badge>}
                        </div>
                        <p className="text-xs text-gray-500">
                          Trigger: {TRIGGERS.find(t => t.value === a.trigger)?.label} · Delay: {a.triggerDelay}min · {a.targetUserType} users
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.sentCount} sent · {a.openCount} opened</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={a.isActive} onCheckedChange={v => toggleAr.mutate({ id: a.id, isActive: v })} />
                      <Button size="sm" variant="outline" onClick={() => { setEditAr({ ...a }); setArModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteAr.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {autoResponders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No auto-responders configured</p>
                <p className="text-sm">Use the quick setup above or create a custom one</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── CONTACTS ─────────────── */}
        {/* ─────────────── NEWSLETTER SUBSCRIBERS ─────────────── */}
        <TabsContent value="newsletter">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Newsletter Subscribers</h2>
              <p className="text-sm text-gray-500">{newsletterSubs.length} footer opt-in subscribers · {newsletterSubs.filter((s: any) => s.status === "active").length} active</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchSubs()} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" />Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const csv = ["Email,Name,Status,Source,Subscribed At",
                  ...newsletterSubs.map((s: any) => `${s.email},${s.name || ""},${s.status},${s.source},${new Date(s.subscribedAt).toLocaleDateString()}`)
                ].join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = "newsletter-subscribers.csv";
                a.click();
              }}>
                <Download className="h-3.5 w-3.5" />Export CSV
              </Button>
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Email", "Name", "Status", "Source", "Subscribed", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {newsletterSubs.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.email}</td>
                      <td className="px-4 py-3 text-gray-600">{s.name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border-0 ${s.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.source || "footer"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm" variant="ghost"
                          className={`text-xs h-7 ${s.status === "active" ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                          onClick={() => updateSubStatusMutation.mutate({ id: s.id, status: s.status === "active" ? "unsubscribed" : "active" })}
                        >
                          {s.status === "active" ? "Unsubscribe" : "Re-activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {newsletterSubs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No newsletter subscribers yet</p>
                  <p className="text-sm mt-1">Subscribers from the footer email form will appear here</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────── CONTACTS ─────────────── */}
        <TabsContent value="contacts">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
              <p className="text-sm text-gray-500">{contacts.length} registered users</p>
            </div>
            <div className="flex gap-2">
              {SEGMENTS.map(s => (
                <Badge key={s.value} className="bg-gray-100 text-gray-700 border-0 text-xs cursor-default">
                  {s.label}: {
                    s.value === "all" ? contacts.length :
                    s.value === "influencers" ? contacts.filter(c => c.userType === "creator").length :
                    s.value === "brands" ? contacts.filter(c => c.userType === "brand").length :
                    s.value === "verified" ? contacts.filter(c => c.isVerified).length :
                    s.value.startsWith("tier_") ? contacts.filter(c => c.creatorTier === s.value.replace("tier_", "")).length : 0
                  }
                </Badge>
              ))}
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Name", "Email", "Type", "Tier", "Followers", "Verified"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border-0 ${c.userType === "creator" ? "bg-blue-50 text-blue-700" : c.userType === "brand" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                          {c.userType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.creatorTier?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{(c.totalFollowers || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {c.isVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No contacts yet</p>}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────── LOGS ─────────────── */}
        <TabsContent value="logs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Send Logs</h2>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/email/logs"] })} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Recipient", "Subject", "Status", "Type", "Sent At", "Opened"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{l.recipientName || l.recipientEmail}</p>
                        <p className="text-xs text-gray-500">{l.recipientEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{l.subject}</td>
                      <td className="px-4 py-3">{statusBadge(l.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.campaignId ? "Campaign" : l.autoResponderId ? "Auto" : "Manual"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.sentAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.openedAt ? new Date(l.openedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No email logs yet</p>}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────── SETTINGS ─────────────── */}
        <TabsContent value="settings">
          {/* Quick-start banner */}
          {!emailStatus?.configured && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />Email is not active — choose an option below to enable welcome emails and campaigns</p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="bg-white border border-amber-100 rounded-lg p-3">
                  <p className="font-semibold text-gray-800 text-xs mb-1">⚡ Option 1 — SendGrid (Fastest)</p>
                  <p className="text-xs text-gray-600">Create a free SendGrid account at <strong>sendgrid.com</strong>, get your API key, then add it as <code className="bg-gray-100 px-1 rounded text-xs">SENDGRID_API_KEY</code> in your environment variables. No SMTP config needed.</p>
                </div>
                <div className="bg-white border border-amber-100 rounded-lg p-3">
                  <p className="font-semibold text-gray-800 text-xs mb-1">🔧 Option 2 — SMTP Server</p>
                  <p className="text-xs text-gray-600">Fill in the SMTP form below with your email provider credentials (Gmail App Password, Namecheap Private Email, Brevo, Mailgun, etc.).</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* SMTP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4 text-purple-600" />SMTP Configuration (Outgoing)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">SMTP Host</Label>
                    <Input placeholder="smtp.gmail.com" value={settings.smtpHost || ""} onChange={e => { setSettings(p => ({ ...p, smtpHost: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Port</Label>
                    <Input placeholder="587" type="number" value={settings.smtpPort || ""} onChange={e => { setSettings(p => ({ ...p, smtpPort: parseInt(e.target.value) })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Username / Email</Label>
                  <Input placeholder="you@yourdomain.com" value={settings.smtpUser || ""} onChange={e => { setSettings(p => ({ ...p, smtpUser: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Password / App Password</Label>
                  <Input type="password" placeholder="••••••••" value={settings.smtpPass || ""} onChange={e => { setSettings(p => ({ ...p, smtpPass: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">From Name</Label>
                    <Input placeholder="Taskdrip" value={settings.smtpFromName || ""} onChange={e => { setSettings(p => ({ ...p, smtpFromName: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">From Email</Label>
                    <Input placeholder="no-reply@taskdrip.online" value={settings.smtpFromEmail || ""} onChange={e => { setSettings(p => ({ ...p, smtpFromEmail: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!settings.smtpSsl} onCheckedChange={v => { setSettings(p => ({ ...p, smtpSsl: v })); setSettingsDirty(true); }} />
                    <Label className="text-xs">SSL (port 465)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={settings.smtpTls !== false} onCheckedChange={v => { setSettings(p => ({ ...p, smtpTls: v })); setSettingsDirty(true); }} />
                    <Label className="text-xs">STARTTLS (port 587)</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp} className="gap-1 flex-1">
                    <TestTube className="h-4 w-4" />{testingSmtp ? "Testing…" : "Test Connection"}
                  </Button>
                  <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Save SMTP
                  </Button>
                </div>
                {/* Send test email */}
                <div className="border-t pt-4">
                  <Label className="text-xs font-medium">Send Test Email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                    <Button onClick={handleSendTest} disabled={sendingTest} variant="outline" className="gap-1 shrink-0">
                      <Send className="h-4 w-4" />{sendingTest ? "Sending…" : "Send"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IMAP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Inbox className="h-4 w-4 text-blue-600" />IMAP Configuration (Incoming)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  IMAP settings are stored for reference and future inbox reading integration. Outgoing mail uses SMTP.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">IMAP Host</Label>
                    <Input placeholder="imap.gmail.com" value={settings.imapHost || ""} onChange={e => { setSettings(p => ({ ...p, imapHost: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Port</Label>
                    <Input placeholder="993" type="number" value={settings.imapPort || ""} onChange={e => { setSettings(p => ({ ...p, imapPort: parseInt(e.target.value) })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Username</Label>
                  <Input placeholder="you@yourdomain.com" value={settings.imapUser || ""} onChange={e => { setSettings(p => ({ ...p, imapUser: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Password</Label>
                  <Input type="password" placeholder="••••••••" value={settings.imapPass || ""} onChange={e => { setSettings(p => ({ ...p, imapPass: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!settings.imapSsl} onCheckedChange={v => { setSettings(p => ({ ...p, imapSsl: v })); setSettingsDirty(true); }} />
                  <Label className="text-xs">SSL/TLS Encryption</Label>
                </div>
                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-blue-600 hover:bg-blue-700">
                  Save IMAP
                </Button>
              </CardContent>
            </Card>

            {/* Domain & Site */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-green-600" />Domain & Site URL Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Site URL</Label>
                  <Input placeholder="https://taskdrip.online" value={settings.siteUrl || ""} onChange={e => { setSettings(p => ({ ...p, siteUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Used in email links (CTA buttons, footer links)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Domain</Label>
                  <Input placeholder="taskdrip.online" value={settings.domain || ""} onChange={e => { setSettings(p => ({ ...p, domain: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Unsubscribe URL</Label>
                  <Input placeholder="https://taskdrip.online/unsubscribe" value={settings.unsubscribeUrl || ""} onChange={e => { setSettings(p => ({ ...p, unsubscribeUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Logo URL (for email header)</Label>
                  <Input placeholder="https://taskdrip.online/logo.png" value={settings.logoUrl || ""} onChange={e => { setSettings(p => ({ ...p, logoUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-green-600 hover:bg-green-700">
                  Save Domain Settings
                </Button>
              </CardContent>
            </Card>

            {/* DNS Records */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-orange-600" />DNS Records (SPF · DKIM · DMARC)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  Add these DNS records at your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.) to prevent emails going to spam.
                </div>
                <div>
                  <Label className="text-xs font-medium">SPF Record (TXT)</Label>
                  <Textarea placeholder={`v=spf1 include:_spf.${settings.domain || "yourdomain.com"} ~all`}
                    value={settings.spfRecord || ""} rows={2}
                    onChange={e => { setSettings(p => ({ ...p, spfRecord: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on @ / root</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">DKIM Public Key (TXT)</Label>
                  <Textarea placeholder="v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
                    value={settings.dkimPublicKey || ""} rows={3}
                    onChange={e => { setSettings(p => ({ ...p, dkimPublicKey: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on mail._domainkey</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">DMARC Record (TXT)</Label>
                  <Textarea placeholder={`v=DMARC1; p=quarantine; rua=mailto:dmarc@${settings.domain || "yourdomain.com"}`}
                    value={settings.dmarcRecord || ""} rows={2}
                    onChange={e => { setSettings(p => ({ ...p, dmarcRecord: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on _dmarc</p>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Recommended Free SMTP Providers</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    {[
                      { name: "Gmail SMTP", host: "smtp.gmail.com", port: "587 (TLS) / 465 (SSL)", note: "Use App Password (2FA required)" },
                      { name: "Outlook / Hotmail", host: "smtp-mail.outlook.com", port: "587", note: "Use account credentials" },
                      { name: "Zoho Mail", host: "smtp.zoho.com", port: "587 / 465", note: "Free plan: 5GB" },
                      { name: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: "587", note: "300 free emails/day" },
                      { name: "Mailjet", host: "in-v3.mailjet.com", port: "587", note: "200 free emails/day" },
                    ].map(p => (
                      <div key={p.name} className="flex justify-between items-start py-1.5 border-b last:border-b-0">
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="text-gray-500 ml-2">{p.host}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">{p.port}</p>
                          <p className="text-gray-400 text-xs">{p.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-orange-600 hover:bg-orange-700">
                  Save DNS Records
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────── HOW IT WORKS ─────────────── */}
        <TabsContent value="how-it-works">
          <div className="max-w-4xl space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-7 w-7" />
                <h2 className="text-xl font-bold">Email Marketing System — Full Guide</h2>
              </div>
              <p className="text-purple-100 text-sm leading-relaxed">Everything you need to know to run effective email campaigns, automated welcome flows, and targeted broadcasts on Taskdrip.</p>
            </div>

            {/* Step 1 */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <Server className="h-4 w-4 text-gray-600" />
                  Set Up Your Email Provider (Required First Step)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <p>Before any email can be sent — including welcome emails — you must configure an email provider. You have two options:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-semibold text-green-800 mb-2">⚡ SendGrid (Recommended)</p>
                    <ol className="text-xs text-green-700 space-y-1 list-decimal ml-4">
                      <li>Create a free account at <strong>sendgrid.com</strong></li>
                      <li>Go to Settings → API Keys → Create API Key (Full Access)</li>
                      <li>Copy the key</li>
                      <li>In your server environment, add the variable: <code className="bg-green-100 px-1 rounded">SENDGRID_API_KEY</code></li>
                      <li>Restart the app — emails will start working immediately</li>
                    </ol>
                    <p className="text-xs text-green-600 mt-2">Free tier: 100 emails/day forever</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-semibold text-blue-800 mb-2">🔧 SMTP (Custom Email)</p>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal ml-4">
                      <li>Go to the <strong>SMTP / IMAP</strong> tab above</li>
                      <li>Enter your SMTP credentials (Gmail, Namecheap, Brevo, etc.)</li>
                      <li>Click <strong>Test Connection</strong> to verify</li>
                      <li>Click <strong>Save SMTP</strong></li>
                      <li>Use Send Test Email to confirm delivery</li>
                    </ol>
                    <p className="text-xs text-blue-600 mt-2">Best for custom domain email (e.g. no-reply@taskdrip.online)</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>Note:</strong> If both SMTP and SendGrid are configured, SMTP takes priority. SendGrid is used as a fallback only when SMTP is not set up.
                </div>
              </CardContent>
            </Card>

            {/* Step 2 — Welcome Emails */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <Inbox className="h-4 w-4 text-gray-600" />
                  Welcome Emails — Automatic on Registration
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-3">
                <p>Welcome emails are triggered automatically when a new user signs up. No configuration is needed beyond the email provider setup above.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="font-semibold text-gray-800 mb-1">Influencer Welcome Email</p>
                    <p className="text-xs text-gray-600">Sent to creators/influencers. Encourages them to complete their profile, browse campaigns, and set up their wallet.</p>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="font-semibold text-gray-800 mb-1">Brand Welcome Email</p>
                    <p className="text-xs text-gray-600">Sent to brand accounts. Highlights the influencer network and prompts them to create their first campaign.</p>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <p className="font-semibold text-purple-800 text-xs mb-1">Testing the Welcome Flow</p>
                  <p className="text-xs text-purple-700">Go to the <strong>Overview</strong> tab and use the <strong>Test Welcome Email</strong> panel to send a preview to any email address. This lets you verify formatting and delivery without creating a real account.</p>
                </div>
                <p className="text-xs text-gray-500">To customize the welcome email content, go to <strong>Templates</strong> tab → click any AI template → edit and save.</p>
              </CardContent>
            </Card>

            {/* Step 3 — Campaigns */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <Send className="h-4 w-4 text-gray-600" />
                  Running Email Campaigns (Mass Broadcasts)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-3">
                <p>Email campaigns let you send a broadcast to a targeted segment of your users. Here's the step-by-step workflow:</p>
                <div className="space-y-2">
                  {[
                    { step: "Go to Campaigns tab", desc: "Click 'New Campaign' to open the campaign builder." },
                    { step: "Choose a target segment", desc: "All Users, Influencers Only, Brands Only, Verified Users, or a specific tier (Rising Sparks, Growth Engines, etc.)." },
                    { step: "Set subject line", desc: "Write a compelling subject. Use {{first_name}} to personalize — it will be replaced with each recipient's first name." },
                    { step: "Compose the HTML body", desc: "Write your email using HTML. Use the Templates tab to load a pre-built design, or write from scratch. Variables like {{first_name}}, {{email}} are supported." },
                    { step: "Save as Draft", desc: "Click Create Campaign. Status starts as 'draft'." },
                    { step: "Send the campaign", desc: "Click the green Send button on the campaign card. Confirm the blast. Emails are sent in the background — the page stays responsive." },
                    { step: "Monitor results", desc: "Check the Email Logs tab to see sent/failed status per recipient. Campaign cards show open rate and click rate as stats come in." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <div>
                        <p className="font-medium text-gray-800 text-xs">{item.step}</p>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  <strong>Template variables</strong> available in campaigns: <code>{"{{first_name}}"}</code>, <code>{"{{last_name}}"}</code>, <code>{"{{full_name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{username}}"}</code>, <code>{"{{user_type}}"}</code>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 — Auto-Responders */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <Bot className="h-4 w-4 text-gray-600" />
                  Auto-Responders (Triggered Emails)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-3">
                <p>Auto-responders fire automatically based on user actions — like signing up, completing a campaign, or making a purchase. Unlike one-off campaigns, they run continuously in the background.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { trigger: "signup", label: "User Signs Up", use: "Send an onboarding series or welcome drip" },
                    { trigger: "campaign_complete", label: "Completes a Campaign", use: "Congratulate them, suggest next campaigns" },
                    { trigger: "purchase", label: "Makes a Purchase", use: "Order confirmation, delivery instructions" },
                    { trigger: "kyc_approved", label: "KYC Approved", use: "Tell them they're verified, unlock premium campaigns" },
                    { trigger: "payout_sent", label: "Payout Sent", use: "Notify them their crypto payment is on the way" },
                    { trigger: "custom", label: "Manual / Custom", use: "Trigger manually via API for custom events" },
                  ].map(item => (
                    <div key={item.trigger} className="border border-gray-100 rounded-lg p-3">
                      <p className="font-semibold text-xs text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.use}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">To create an auto-responder: go to the <strong>Auto-Responders</strong> tab → New Auto-Responder → select a trigger → write the email body → activate it.</p>
              </CardContent>
            </Card>

            {/* Step 5 — Email Logs */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">5</div>
                  <Inbox className="h-4 w-4 text-gray-600" />
                  Reading Email Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>Every email sent through the platform is logged in the <strong>Email Logs</strong> tab. This includes welcome emails, campaign blasts, and auto-responders.</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { status: "sent", color: "bg-green-100 text-green-700", desc: "Email was delivered to the server without error" },
                    { status: "failed", color: "bg-red-100 text-red-700", desc: "Delivery failed — see error message for details" },
                    { status: "opened", color: "bg-purple-100 text-purple-700", desc: "Recipient opened the email (tracking pixel)" },
                  ].map(item => (
                    <div key={item.status} className="border border-gray-100 rounded-lg p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${item.color}`}>{item.status}</span>
                      <p className="text-xs text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">If you see many "failed" logs, check that your SMTP credentials are correct or that your SendGrid account is not in sandbox mode.</p>
              </CardContent>
            </Card>

            {/* Quick Reference */}
            <Card className="border border-purple-200 bg-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2"><Zap className="h-4 w-4" />Quick Reference — Common SMTP Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-purple-200">
                        <th className="text-left py-2 text-purple-700 font-semibold">Provider</th>
                        <th className="text-left py-2 text-purple-700 font-semibold">SMTP Host</th>
                        <th className="text-left py-2 text-purple-700 font-semibold">Port</th>
                        <th className="text-left py-2 text-purple-700 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {[
                        ["Gmail (App Password)", "smtp.gmail.com", "587", "Enable 2FA → create App Password"],
                        ["Namecheap Private Email", "mail.privateemail.com", "587", "Best for @taskdrip.online"],
                        ["Brevo (Sendinblue)", "smtp-relay.brevo.com", "587", "300 free/day, great deliverability"],
                        ["SendGrid (SMTP)", "smtp.sendgrid.net", "587", "Username: apikey, Password: your API key"],
                        ["Mailgun", "smtp.mailgun.org", "587", "Requires domain verification"],
                        ["Zoho Mail", "smtp.zoho.com", "587", "5GB free, custom domain"],
                      ].map(([provider, host, port, notes]) => (
                        <tr key={provider}>
                          <td className="py-2 font-medium text-gray-800">{provider}</td>
                          <td className="py-2 text-gray-600 font-mono">{host}</td>
                          <td className="py-2 text-gray-600">{port}</td>
                          <td className="py-2 text-gray-500">{notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────── SETUP GUIDE ─────────────── */}
        <TabsContent value="setup-guide">
          <SetupGuide domain={settings.domain || "taskdrip.online"} />
        </TabsContent>
      </Tabs>

      {/* ─────────────── CAMPAIGN MODAL ─────────────── */}
      <Dialog open={campaignModal} onOpenChange={v => { if (!v) { setCampaignModal(false); setEditCampaign(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCampaign?.id ? "Edit Campaign" : "New Email Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Campaign Name</Label>
                <Input placeholder="Monthly Newsletter — April" className="mt-1"
                  value={editCampaign?.name || ""} onChange={e => setEditCampaign(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Target Segment</Label>
                <Select value={editCampaign?.targetSegment || "all"} onValueChange={v => setEditCampaign(p => ({ ...p, targetSegment: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Email Subject</Label>
              <Input placeholder="🚀 New campaigns are live — earn crypto today!" className="mt-1"
                value={editCampaign?.subject || ""} onChange={e => setEditCampaign(p => ({ ...p, subject: e.target.value }))} />
            </div>

            {/* AI Quick-fill */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Load from AI Template</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(aiTemplates).map(key => (
                  <button key={key} onClick={() => handleLoadAiTemplate(key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${aiTemplateKey === key ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {key.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <p className="text-xs text-gray-400 mb-1">Available variables: {"{{first_name}}"} {"{{email}}"} {"{{username}}"} {"{{user_type}}"}</p>
              <Textarea placeholder="<h2>Hello {{first_name}}!</h2><p>Your email content here...</p>"
                rows={12} className="mt-1 font-mono text-xs"
                value={editCampaign?.htmlBody || ""} onChange={e => setEditCampaign(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">Schedule (optional)</Label>
              <Input type="datetime-local" className="mt-1"
                value={editCampaign?.scheduledAt?.slice(0, 16) || ""}
                onChange={e => setEditCampaign(p => ({ ...p, scheduledAt: e.target.value, status: e.target.value ? "scheduled" : "draft" }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setCampaignModal(false); setEditCampaign(null); }}>Cancel</Button>
            <Button onClick={handleSaveCampaign} disabled={createCampaign.isPending || updateCampaign.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editCampaign?.id ? "Update" : "Create"} Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── TEMPLATE MODAL ─────────────── */}
      <Dialog open={templateModal} onOpenChange={v => { if (!v) { setTemplateModal(false); setEditTemplate(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate?.id ? "Edit Template" : "New Email Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Template Name</Label>
                <Input placeholder="Welcome Email — Influencer" className="mt-1"
                  value={editTemplate?.name || ""} onChange={e => setEditTemplate(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Category</Label>
                <Select value={editTemplate?.category || "general"} onValueChange={v => setEditTemplate(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATE_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Subject</Label>
              <Input className="mt-1" value={editTemplate?.subject || ""} onChange={e => setEditTemplate(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <Textarea rows={14} className="mt-1 font-mono text-xs"
                value={editTemplate?.htmlBody || ""} onChange={e => setEditTemplate(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editTemplate?.isActive} onCheckedChange={v => setEditTemplate(p => ({ ...p, isActive: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setTemplateModal(false); setEditTemplate(null); }}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editTemplate?.id ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── AUTO-RESPONDER MODAL ─────────────── */}
      <Dialog open={arModal} onOpenChange={v => { if (!v) { setArModal(false); setEditAr(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAr?.id ? "Edit Auto-Responder" : "New Auto-Responder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Name</Label>
              <Input placeholder="Welcome Email for Influencers" className="mt-1"
                value={editAr?.name || ""} onChange={e => setEditAr(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium">Trigger Event</Label>
                <Select value={editAr?.trigger || "signup"} onValueChange={v => setEditAr(p => ({ ...p, trigger: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Delay (minutes)</Label>
                <Input type="number" placeholder="0" className="mt-1"
                  value={editAr?.triggerDelay ?? 0} onChange={e => setEditAr(p => ({ ...p, triggerDelay: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Target Users</Label>
                <Select value={editAr?.targetUserType || "all"} onValueChange={v => setEditAr(p => ({ ...p, targetUserType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="influencer">Influencers</SelectItem>
                    <SelectItem value="brand">Brands</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Email Subject</Label>
              <Input className="mt-1" value={editAr?.subject || ""} onChange={e => setEditAr(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <p className="text-xs text-gray-400 mb-1">Variables: {"{{first_name}}"} {"{{email}}"} {"{{user_type}}"}</p>
              <Textarea rows={12} className="mt-1 font-mono text-xs"
                value={editAr?.htmlBody || ""} onChange={e => setEditAr(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={!!editAr?.isActive} onCheckedChange={v => setEditAr(p => ({ ...p, isActive: v }))} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editAr?.aiGenerated} onCheckedChange={v => setEditAr(p => ({ ...p, aiGenerated: v }))} />
                <Label className="text-xs">AI Generated</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setArModal(false); setEditAr(null); }}>Cancel</Button>
            <Button onClick={handleSaveAr} disabled={createAr.isPending || updateAr.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editAr?.id ? "Update" : "Create"} Auto-Responder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── CAMPAIGN PREVIEW ─────────────── */}
      <Dialog open={!!campaignPreview} onOpenChange={v => { if (!v) setCampaignPreview(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Preview — {campaignPreview?.name}</DialogTitle>
          </DialogHeader>
          {campaignPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sent", val: campaignPreview.sent },
                  { label: "Open Rate", val: openRate(campaignPreview.opened, campaignPreview.sent) },
                  { label: "Click Rate", val: clickRate(campaignPreview.clicked, campaignPreview.sent) },
                  { label: "Bounced", val: campaignPreview.bounced },
                  { label: "Unsubscribed", val: campaignPreview.unsubscribed },
                  { label: "Total Recipients", val: campaignPreview.totalRecipients },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{s.val}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-xs font-medium text-gray-500 mb-1">Subject:</p>
                <p className="font-semibold text-gray-900 mb-4">{campaignPreview.subject}</p>
                <div className="border-t pt-4">
                  <iframe srcDoc={campaignPreview.htmlBody} className="w-full h-96 border-0" title="Email Preview" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────── BLAST CONFIRM ─────────────── */}
      <Dialog open={!!blastConfirm} onOpenChange={v => { if (!v) setBlastConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Campaign Blast</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">This will send the email campaign to all users in the selected segment. This action cannot be undone.</p>
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Make sure your SMTP is configured and tested before sending.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlastConfirm(null)}>Cancel</Button>
            <Button onClick={() => blastConfirm && sendCampaign.mutate(blastConfirm)} disabled={sendCampaign.isPending} className="bg-green-600 hover:bg-green-700 gap-1">
              <Send className="h-4 w-4" />{sendCampaign.isPending ? "Sending…" : "Send Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
