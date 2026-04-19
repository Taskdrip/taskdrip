import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navigation } from "@/components/ui/navigation";
import {
  Megaphone, Plus, Edit, Trash2, Eye, MousePointerClick, BarChart3, ExternalLink,
  Image, Monitor, Smartphone, Globe, ArrowLeft, AlertCircle, CheckCircle2,
  XCircle, Clock, ShoppingBag, BookOpen, Rss, Newspaper, Target, Settings,
  TrendingUp, DollarSign, ToggleLeft, Code2, Shield, Upload, X, LayoutDashboard,
  Laptop, Tablet, Mail, MessageSquare, Send, Building2, Phone, Tag, Gift, Coins,
  ChevronRight, User, Calendar
} from "lucide-react";
import { Link } from "wouter";

const PLACEMENTS = [
  { value: "banner_top", label: "Top Banner (Global)", icon: Monitor, description: "Appears at the top of all main pages" },
  { value: "sidebar", label: "Sidebar", icon: Smartphone, description: "Right sidebar on content pages" },
  { value: "feed", label: "Feed (between posts)", icon: Rss, description: "Inserted between social feed posts" },
  { value: "shop", label: "Shop Page", icon: ShoppingBag, description: "Inside the shop/marketplace" },
  { value: "blog", label: "Blog", icon: Newspaper, description: "Inside blog listing and posts" },
  { value: "breedskool", label: "BreedSkool", icon: BookOpen, description: "Inside the courses section" },
  { value: "campaigns", label: "Campaigns", icon: Target, description: "Inside the campaigns listing" },
  { value: "between_content", label: "Between Content", icon: Globe, description: "Injected between page sections" },
];

const EMPTY_AD = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  advertiserName: "",
  advertiserLogo: "",
  placement: "banner_top",
  adType: "display",
  isActive: true,
  startDate: "",
  endDate: "",
  budget: "",
  cpm: "",
  sortOrder: 0,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
};

function ImageUploadField({
  label, value, onChange, onFileChange, fieldName, hint, dimensions, maxSize
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
  fieldName: string;
  hint?: string;
  dimensions: string;
  maxSize: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value || "");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileChange(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange("");
  };

  const clear = () => {
    setPreview("");
    onChange("");
    onFileChange(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const displaySrc = preview || value;

  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
        {displaySrc ? (
          <div className="relative">
            <img src={displaySrc} alt="preview" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
            <button
              onClick={clear}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-4 text-gray-500 hover:text-blue-600"
          >
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Click to upload</span>
            <span className="text-xs text-gray-400">or drag and drop</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid={`input-file-${fieldName}`} onChange={handleFile} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Recommended: {dimensions}</span>
        <span className="flex items-center gap-1"><Image className="w-3 h-3" /> Max size: {maxSize}</span>
        <span>Formats: JPG, PNG, WebP</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function AdForm({ form, setForm, imageFile, setImageFile, logoFile, setLogoFile }: {
  form: any;
  setForm: (f: any) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
}) {
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Ad Title *</Label>
          <Input data-testid="input-ad-title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Summer Campaign – BrandX" />
        </div>
        <div>
          <Label>Advertiser / Company Name *</Label>
          <Input value={form.advertiserName} onChange={e => set("advertiserName", e.target.value)} placeholder="e.g. BrandX Inc." />
        </div>
        <div>
          <Label>Click Destination URL *</Label>
          <Input value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)} placeholder="https://brand.com/campaign" />
        </div>
      </div>

      <div>
        <Label>Ad Description</Label>
        <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description or tagline..." rows={2} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageUploadField
          label="Featured Ad Image *"
          value={form.imageUrl}
          onChange={url => set("imageUrl", url)}
          onFileChange={setImageFile}
          fieldName="ad-image"
          dimensions="1200 × 628 px (landscape)"
          maxSize="2 MB"
          hint="Used in banner, feed, and display placements. Landscape images perform best."
        />
        <ImageUploadField
          label="Advertiser Logo"
          value={form.advertiserLogo}
          onChange={url => set("advertiserLogo", url)}
          onFileChange={setLogoFile}
          fieldName="ad-logo"
          dimensions="200 × 200 px (square)"
          maxSize="500 KB"
          hint="Square logo shown alongside the ad. Transparent PNG recommended."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Placement *</Label>
          <Select value={form.placement} onValueChange={v => set("placement", v)}>
            <SelectTrigger data-testid="select-placement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENTS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2"><p.icon className="h-3.5 w-3.5" />{p.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ad Type</Label>
          <Select value={form.adType} onValueChange={v => set("adType", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="display">Display (Banner)</SelectItem>
              <SelectItem value="native">Native (In-feed)</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
        </div>
        <div>
          <Label>Total Budget ($)</Label>
          <Input type="number" value={form.budget} onChange={e => set("budget", e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label>CPM (cost per 1k impressions)</Label>
          <Input type="number" value={form.cpm} onChange={e => set("cpm", e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} data-testid="switch-ad-active" />
        <Label>Active (show this ad now)</Label>
      </div>
    </div>
  );
}

const AD_TYPE_LABELS: Record<string, string> = {
  platform_ads: "Platform Ads",
  social_media: "Social Media Promotion",
  influencer_network: "Influencer Network",
  sponsored_content: "Sponsored Blog / Content",
  featured_post: "Featured / Sponsored Post",
  giveaway_campaign: "Giveaway Campaign",
  all: "Full Package",
};

const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500/mo",
  "500_2000": "$500 – $2,000/mo",
  "2000_10000": "$2,000 – $10,000/mo",
  over_10000: "$10,000+/mo",
};

function formatAdBudget(value: any) {
  const numeric = Number(value);
  if (value !== "" && value !== null && value !== undefined && !Number.isNaN(numeric)) {
    return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return BUDGET_LABELS[value] || value || "Not specified";
}

function ApplicationDetailDialog({ app, onClose, onStatusChange }: {
  app: any;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [emailSubject, setEmailSubject] = useState(`Re: Your Advertising Application – ${app.companyName}`);
  const [emailBody, setEmailBody] = useState(`Hi ${app.contactName || app.companyName},\n\nThank you for your interest in advertising with Taskdrip! We've reviewed your application and would love to discuss your campaign in more detail.\n\nBest regards,\nTaskdrip Advertising Team`);
  const [activeTab, setActiveTab] = useState<"details" | "email">("details");
  const [adminNote, setAdminNote] = useState(app.adminNotes || "");

  const emailMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/admin/advertise-applications/${app.id}/email`, data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/advertise-applications"] });
      toast({ title: data?.emailSent ? "Email sent successfully!" : "Reply saved (email unavailable — SENDGRID_API_KEY not set)", description: data?.emailSent ? `Sent to ${app.email}` : "Application marked as contacted." });
      onStatusChange("contacted");
    },
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });

  const noteMutation = useMutation({
    mutationFn: (notes: string) => apiRequest("PATCH", `/api/admin/advertise-applications/${app.id}`, { adminNotes: notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/advertise-applications"] }); toast({ title: "Notes saved" }); },
  });

  const statusColor = {
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    contacted: "bg-blue-50 text-blue-700 border-blue-200",
    pending_payment: "bg-violet-50 text-violet-700 border-violet-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  }[app.status] || "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {app.companyName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className={statusColor}>
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {AD_TYPE_LABELS[app.adType] || app.adType}
                </Badge>
                {app.budget && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                    {formatAdBudget(app.budget)}
                  </Badge>
                )}
                {app.payment && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Payment {String(app.payment.status || "submitted").replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
            <Select value={app.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-36 h-8 text-xs" data-testid={`select-detail-status-${app.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab("details")} className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${activeTab === "details" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}>
            <User className="h-4 w-4" /> Applicant Details
          </button>
          <button onClick={() => setActiveTab("email")} className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${activeTab === "email" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}>
            <Mail className="h-4 w-4" /> Reply by Email
          </button>
        </div>

        <div className="px-6 py-5">
          {activeTab === "details" && (
            <div className="space-y-5">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: User, label: "Contact Name", value: app.contactName },
                  { icon: Mail, label: "Email", value: app.email, href: `mailto:${app.email}` },
                  { icon: Phone, label: "Phone", value: app.phone || "—" },
                  { icon: Globe, label: "Website", value: app.website || "—", href: app.website },
                  { icon: Tag, label: "Industry", value: app.industry?.replace(/_/g, " ") || "—" },
                  { icon: Calendar, label: "Applied", value: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-gray-100 rounded-lg mt-0.5 flex-shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">{item.value}</a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 truncate">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Campaign info */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Campaign Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-500 mb-0.5">Ad Type</p>
                    <p className="text-sm font-bold text-blue-900">{AD_TYPE_LABELS[app.adType] || app.adType}</p>
                  </div>
                  <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                    <p className="text-xs text-green-500 mb-0.5">Ads Budget</p>
                    <p className="text-sm font-bold text-green-900">{formatAdBudget(app.budget)}</p>
                  </div>
                  {app.platforms && (
                    <div className="col-span-2 rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 mb-0.5">Preferred Channels</p>
                      <p className="text-sm font-medium text-gray-900">{app.platforms}</p>
                    </div>
                  )}
                  {app.tdripBudget && (
                    <div className="col-span-2 rounded-xl bg-violet-50 border border-violet-100 p-3">
                      <p className="text-xs text-violet-500 mb-0.5">$TDRIP Points Budget</p>
                      <p className="text-sm font-medium text-violet-900">{app.tdripBudget}</p>
                    </div>
                  )}
                  {app.payment && (
                    <div className="col-span-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-xs text-emerald-500 mb-0.5">Smart Checkout Payment</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="font-medium text-emerald-900">Amount: ${Number(app.payment.amount || 0).toFixed(2)}</p>
                        <p className="font-medium text-emerald-900">Status: {String(app.payment.status || "submitted").replace(/_/g, " ")}</p>
                        {app.payment.network && <p className="font-medium text-emerald-900">Network: {app.payment.network}</p>}
                        {app.payment.transactionHash && <p className="font-mono text-xs text-emerald-900 break-all">Tx: {app.payment.transactionHash}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(app.goals || app.giveawayType || app.message) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {app.goals && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Campaign Goals</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{app.goals}</p>
                      </div>
                    )}
                    {app.giveawayType && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Giveaway / Task Requirements</p>
                        <p className="text-sm text-gray-700 bg-emerald-50 rounded-xl p-3 border border-emerald-100 leading-relaxed">{app.giveawayType}</p>
                      </div>
                    )}
                    {app.message && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Additional Message</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed italic">"{app.message}"</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Admin notes */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Internal Notes</p>
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Add internal notes about this applicant..."
                  rows={3}
                  className="text-sm resize-none"
                  data-testid={`textarea-admin-notes-${app.id}`}
                />
                <Button size="sm" variant="outline" className="mt-2" onClick={() => noteMutation.mutate(adminNote)} disabled={noteMutation.isPending}>
                  {noteMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 pt-1">
                <a href={`mailto:${app.email}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Mail className="h-3.5 w-3.5" /> Open Email Client
                  </Button>
                </a>
                <Button size="sm" className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setActiveTab("email")}>
                  <Send className="h-3.5 w-3.5" /> Compose Reply
                </Button>
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-500">Sending to</p>
                  <p className="text-sm font-semibold text-blue-900">{app.contactName} — {app.email}</p>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  data-testid="input-email-subject"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Message</Label>
                <Textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={10}
                  className="text-sm resize-none"
                  data-testid="input-email-body"
                  placeholder="Write your reply here..."
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Email is sent via Taskdrip's system. The applicant status will be updated to "Contacted" and your reply will be saved to the application record.</p>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => emailMutation.mutate({ subject: emailSubject, body: emailBody, applicantEmail: app.email, applicantName: app.contactName })}
                disabled={emailMutation.isPending || !emailSubject || !emailBody}
                data-testid="button-send-email"
              >
                {emailMutation.isPending ? "Sending..." : <><Send className="h-4 w-4" /> Send Email Reply</>}
              </Button>

              <div className="text-center">
                <a href={`mailto:${app.email}?subject=${encodeURIComponent(emailSubject)}`} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Or open in your local email client instead →
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-gray-600 w-20 text-right shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs font-semibold text-gray-700 w-10 text-right shrink-0">{value}</div>
    </div>
  );
}

function AdAnalyticsPanel({ adId }: { adId: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/ads/analytics/${adId}`],
    enabled: !!adId,
    staleTime: 30000,
  });

  if (isLoading) return <div className="animate-pulse h-40 bg-gray-50 rounded-xl" />;
  if (!data) return null;

  const deviceMax = Math.max(...Object.values(data.byDevice || {}).map(Number), 1);
  const browserMax = Math.max(...Object.values(data.byBrowser || {}).map(Number), 1);

  const deviceColors: Record<string, string> = { desktop: "bg-blue-500", mobile: "bg-green-500", tablet: "bg-purple-500" };
  const browserColors = ["bg-blue-400", "bg-orange-400", "bg-green-400", "bg-red-400", "bg-indigo-400"];

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{data.totalImpressions}</div>
          <div className="text-xs text-blue-500">Tracked Impressions</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">{data.totalClicks}</div>
          <div className="text-xs text-purple-500">Tracked Clicks</div>
        </div>
      </div>

      {Object.keys(data.byDevice || {}).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5" /> Device Breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(data.byDevice).map(([device, count]: any) => (
              <AnalyticsBar key={device} label={device} value={count} max={deviceMax} color={deviceColors[device] || "bg-gray-400"} />
            ))}
          </div>
        </div>
      )}

      {Object.keys(data.byBrowser || {}).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Browser Breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(data.byBrowser).map(([browser, count]: any, i) => (
              <AnalyticsBar key={browser} label={browser} value={count} max={browserMax} color={browserColors[i % browserColors.length]} />
            ))}
          </div>
        </div>
      )}

      {data.totalImpressions === 0 && data.totalClicks === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">No analytics data yet — analytics populate as the ad receives traffic.</p>
      )}
    </div>
  );
}

function AdCard({ ad, onEdit, onDelete, onToggle }: { ad: any; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
  const placement = PLACEMENTS.find(p => p.value === ad.placement);
  return (
    <Card data-testid={`card-ad-${ad.id}`} className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {ad.imageUrl && (
          <div className="rounded-lg overflow-hidden mb-4 border border-gray-100 h-32 bg-gray-50">
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
          </div>
        )}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {ad.advertiserLogo && (
              <img src={ad.advertiserLogo} alt="" className="w-7 h-7 rounded-lg border border-gray-100 object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{ad.title}</p>
              <p className="text-sm text-gray-500">{ad.advertiserName}</p>
            </div>
          </div>
          <div className={`ml-2 px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0 ${ad.isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive}`}>
            {ad.isActive ? "Live" : "Paused"}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {placement && <placement.icon className="h-3.5 w-3.5 text-gray-400" />}
          <span className="text-xs text-gray-500">{placement?.label || ad.placement}</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-xs text-gray-500 capitalize">{ad.adType}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-sm font-bold text-gray-800">{(ad.impressions || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><Eye className="h-3 w-3" />Views</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-sm font-bold text-gray-800">{(ad.clicks || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><MousePointerClick className="h-3 w-3" />Clicks</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-sm font-bold text-gray-800">{ctr}%</p>
            <p className="text-xs text-gray-400">CTR</p>
          </div>
        </div>

        {showAnalytics && <AdAnalyticsPanel adId={ad.id} />}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Switch checked={ad.isActive} onCheckedChange={onToggle} data-testid={`switch-ad-${ad.id}`} />
            <span className="text-xs text-gray-500">{ad.isActive ? "Running" : "Paused"}</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setShowAnalytics(v => !v)} className={showAnalytics ? "text-blue-600 bg-blue-50" : ""} title="Analytics">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`button-edit-ad-${ad.id}`}><Edit className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete} data-testid={`button-delete-ad-${ad.id}`}><Trash2 className="h-4 w-4" /></Button>
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAds() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_AD);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [adSenseCode, setAdSenseCode] = useState("");
  const [adSenseEnabled, setAdSenseEnabled] = useState(false);
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data: ads = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/ads"] });
  const { data: applications = [] } = useQuery<any[]>({ queryKey: ["/api/admin/advertise-applications"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") fd.append(k, String(v)); });
      if (imageFile) fd.append("image", imageFile);
      if (logoFile) fd.append("logo", logoFile);
      const res = await fetch("/api/admin/ads", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ads"] }); setDialogOpen(false); toast({ title: "Ad created successfully" }); },
    onError: (e: Error) => toast({ title: "Failed to create ad", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      if (imageFile || logoFile) {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") fd.append(k, String(v)); });
        if (imageFile) fd.append("image", imageFile);
        if (logoFile) fd.append("logo", logoFile);
        const res = await fetch(`/api/admin/ads/${id}`, { method: "PATCH", body: fd, credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }
      return apiRequest("PATCH", `/api/admin/ads/${id}`, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ads"] }); setDialogOpen(false); toast({ title: "Ad updated" }); },
    onError: (e: Error) => toast({ title: "Failed to update ad", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/ads/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ads"] }); setDeleteConfirm(null); toast({ title: "Ad removed" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const appUpdateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/advertise-applications/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/advertise-applications"] }); toast({ title: "Application updated" }); },
  });

  const openAdd = () => { setEditingAd(null); setForm(EMPTY_AD); setImageFile(null); setLogoFile(null); setDialogOpen(true); };
  const openEdit = (ad: any) => {
    setEditingAd(ad);
    setForm({ ...EMPTY_AD, ...ad, startDate: ad.startDate ? ad.startDate.split("T")[0] : "", endDate: ad.endDate ? ad.endDate.split("T")[0] : "" });
    setImageFile(null);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.linkUrl || !form.advertiserName) {
      return toast({ title: "Title, destination URL and advertiser name are required", variant: "destructive" });
    }
    if (!form.imageUrl && !imageFile) {
      return toast({ title: "Please upload a featured ad image", variant: "destructive" });
    }
    if (editingAd) updateMutation.mutate({ id: editingAd.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredAds = filterPlacement === "all" ? ads : ads.filter((a: any) => a.placement === filterPlacement);
  const totalImpressions = ads.reduce((s: number, a: any) => s + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((s: number, a: any) => s + (a.clicks || 0), 0);
  const liveAds = ads.filter((a: any) => a.isActive).length;
  const pendingApps = applications.filter((a: any) => a.status === "pending").length;
  const globalCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  if ((user as any)?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center"><Shield className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-lg font-semibold">Admin access required</p></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><Megaphone className="h-7 w-7 text-blue-600" /></div>
                Ads Control Center
              </h1>
              <p className="text-gray-500 mt-1">Manage sponsored ads, Google AdSense, analytics, and advertiser applications</p>
            </div>
            <Button onClick={openAdd} data-testid="button-add-ad" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Create Ad
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Live Ads", value: liveAds, icon: CheckCircle2, color: "text-green-600 bg-green-50", border: "border-green-100" },
            { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-600 bg-blue-50", border: "border-blue-100" },
            { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-purple-600 bg-purple-50", border: "border-purple-100" },
            { label: "Global CTR", value: `${globalCtr}%`, icon: TrendingUp, color: "text-indigo-600 bg-indigo-50", border: "border-indigo-100" },
            { label: "Ad Applications", value: pendingApps, icon: Megaphone, color: "text-amber-600 bg-amber-50", border: "border-amber-100" },
          ].map(s => (
            <Card key={s.label} className={`border shadow-sm ${s.border}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="sponsored">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="sponsored" className="gap-2"><Image className="h-4 w-4" /> Sponsored Ads</TabsTrigger>
            <TabsTrigger value="adsense" className="gap-2"><Code2 className="h-4 w-4" /> Google AdSense</TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Megaphone className="h-4 w-4" /> Applications
              {pendingApps > 0 && <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingApps}</span>}
            </TabsTrigger>
            <TabsTrigger value="placements" className="gap-2"><Monitor className="h-4 w-4" /> Placements</TabsTrigger>
          </TabsList>

          {/* ── Sponsored Ads Tab ── */}
          <TabsContent value="sponsored">
            <div className="flex items-center gap-3 mb-6">
              <Label className="text-sm text-gray-600">Filter by placement:</Label>
              <Select value={filterPlacement} onValueChange={setFilterPlacement}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  {PLACEMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-64 bg-gray-100 border-0" />)}
              </div>
            ) : filteredAds.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 bg-white">
                <CardContent className="py-16 text-center">
                  <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-500 mb-2">No ads configured</p>
                  <p className="text-sm text-gray-400 mb-6">Create your first sponsored ad to monetize your platform traffic.</p>
                  <Button onClick={openAdd} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Create First Ad</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAds.map((ad: any) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    onEdit={() => openEdit(ad)}
                    onDelete={() => setDeleteConfirm(ad.id)}
                    onToggle={v => updateMutation.mutate({ id: ad.id, data: { isActive: v } })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Google AdSense Tab ── */}
          <TabsContent value="adsense">
            <div className="max-w-2xl space-y-6">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-blue-600">G</span>
                    </div>
                    Google AdSense Integration
                  </CardTitle>
                  <CardDescription>Paste your AdSense publisher code to enable Google ads across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                      <p className="font-medium text-gray-800">AdSense Status</p>
                      <p className="text-sm text-gray-500">Enable to show Google ads site-wide</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={adSenseEnabled} onCheckedChange={setAdSenseEnabled} data-testid="switch-adsense-enabled" />
                      <span className={`text-sm font-medium ${adSenseEnabled ? "text-green-600" : "text-gray-400"}`}>
                        {adSenseEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Publisher Code (auto ad script)</Label>
                    <div className="relative">
                      <Textarea
                        data-testid="input-adsense-code"
                        value={adSenseCode}
                        onChange={e => setAdSenseCode(e.target.value)}
                        placeholder={`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXX" crossorigin="anonymous"></script>`}
                        rows={5}
                        className="font-mono text-xs resize-none"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Paste your AdSense script tag from your Google AdSense dashboard.</p>
                  </div>

                  <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> How to get your AdSense code
                    </p>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal pl-4">
                      <li>Go to <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" className="underline">adsense.google.com</a></li>
                      <li>Navigate to Ads → By site → Get code</li>
                      <li>Copy the auto ads script tag</li>
                      <li>Paste it above and save</li>
                    </ol>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast({ title: "AdSense settings saved" })} data-testid="button-save-adsense">
                    Save AdSense Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Applications Tab ── */}
          <TabsContent value="applications">
            {applications.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 bg-white">
                <CardContent className="py-12 text-center">
                  <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No advertising applications yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Applications from the "Advertise With Us" page will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => {
                  const statusColor = {
                    approved: "bg-green-50 text-green-700 border-green-200",
                    rejected: "bg-red-50 text-red-700 border-red-200",
                    contacted: "bg-blue-50 text-blue-700 border-blue-200",
                    pending_payment: "bg-violet-50 text-violet-700 border-violet-200",
                    pending: "bg-amber-50 text-amber-700 border-amber-200",
                  }[app.status] || "bg-gray-50 text-gray-500 border-gray-200";

                  return (
                    <Card
                      key={app.id}
                      data-testid={`card-app-${app.id}`}
                      className="border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
                      onClick={() => setSelectedApp(app)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <p className="font-bold text-gray-900">{app.companyName}</p>
                              <Badge variant="outline" className={statusColor}>
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </Badge>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {AD_TYPE_LABELS[app.adType] || app.adType?.replace(/_/g, " ")}
                              </Badge>
                              {app.payment && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  Paid ${Number(app.payment.amount || 0).toFixed(2)}
                                </Badge>
                              )}
                              {app.status === "pending" && (
                                <Badge className="bg-red-500 text-white text-xs animate-pulse">Action Required</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                              <div><span className="text-xs text-gray-400">Contact</span><p className="font-medium">{app.contactName}</p></div>
                              <div><span className="text-xs text-gray-400">Email</span><p className="font-medium truncate">{app.email}</p></div>
                              <div><span className="text-xs text-gray-400">Ads Budget</span><p className="font-medium">{formatAdBudget(app.budget)}</p></div>
                              <div><span className="text-xs text-gray-400">Applied</span><p className="font-medium">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}</p></div>
                            </div>
                            {app.message && <p className="text-sm text-gray-500 mt-2 italic line-clamp-1">"{app.message}"</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={e => { e.stopPropagation(); setSelectedApp(app); }}
                              data-testid={`button-view-app-${app.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" /> View & Reply
                            </Button>
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                              <Select value={app.status} onValueChange={status => appUpdateMutation.mutate({ id: app.id, data: { status } })}>
                                <SelectTrigger className="w-32 h-7 text-xs" data-testid={`select-app-status-${app.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Placements Tab ── */}
          <TabsContent value="placements">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLACEMENTS.map(p => {
                const adsHere = ads.filter((a: any) => a.placement === p.value);
                const activeHere = adsHere.filter((a: any) => a.isActive).length;
                return (
                  <Card key={p.value} className="border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg"><p.icon className="h-5 w-5 text-blue-600" /></div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.label}</p>
                            <p className="text-xs text-gray-500">{p.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={activeHere > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>
                          {activeHere > 0 ? `${activeHere} Live` : "Empty"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{adsHere.length} ad{adsHere.length !== 1 ? "s" : ""} configured</span>
                        <Button size="sm" variant="ghost" className="text-blue-600 gap-1.5 h-7"
                          onClick={() => setFilterPlacement(p.value)}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              {editingAd ? "Edit Sponsored Ad" : "Create Sponsored Ad"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AdForm form={form} setForm={setForm} imageFile={imageFile} setImageFile={setImageFile} logoFile={logoFile} setLogoFile={setLogoFile} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-ad"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingAd ? "Save Changes" : "Create Ad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Remove Ad</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm">This will permanently delete the ad and all its stats. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removing..." : "Remove Ad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Detail Dialog */}
      {selectedApp && (
        <ApplicationDetailDialog
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={status => {
            appUpdateMutation.mutate({ id: selectedApp.id, data: { status } });
            setSelectedApp((prev: any) => prev ? { ...prev, status } : null);
          }}
        />
      )}
    </div>
  );
}
