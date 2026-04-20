import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContentEditorPanel } from "@/components/ContentEditorPanel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Settings, Navigation, Image, FileText, Palette, DollarSign, Megaphone,
  Save, Plus, Trash2, Edit, MoveUp, MoveDown, ChevronLeft, Eye, EyeOff,
  Globe, ArrowLeft, CheckCircle, RefreshCw, ToggleLeft, ToggleRight, Layers,
  Shield, Lock, ExternalLink, RotateCcw, Zap, Store, BookOpen, Users,
  Layout, Link2, GripVertical, X
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Types & Constants
// ──────────────────────────────────────────────────────────────

const MODULES = [
  { id: "site-settings", label: "Site Settings", icon: Globe, desc: "Name, logo, contact, SEO" },
  { id: "navigation", label: "Navigation & Menu", icon: Navigation, desc: "Edit nav labels & links" },
  { id: "hero-sliders", label: "Hero Sliders", icon: Image, desc: "Homepage carousel slides" },
  { id: "pages-content", label: "Pages & Content", icon: FileText, desc: "All text, images, buttons" },
  { id: "theme-colors", label: "Theme & Colors", icon: Palette, desc: "Brand colors & gradients" },
  { id: "fees-rates", label: "Fees & Rates", icon: DollarSign, desc: "Platform fees & P2P rates" },
  { id: "footer-management", label: "Footer Management", icon: Layout, desc: "Footer columns & links" },
  { id: "announcement", label: "Announcement", icon: Megaphone, desc: "Site-wide banner message" },
];

const DEFAULT_NAV_ITEMS = [
  { id: "1", label: "Home", href: "/", visible: true },
  { id: "2", label: "Tasks", href: "/tasks", visible: true },
  { id: "3", label: "Shop", href: "/shop", visible: true },
  { id: "4", label: "P2P Market", href: "/p2p-hub", visible: true },
  { id: "5", label: "Influencers", href: "/influencers", visible: true },
  { id: "6", label: "BreedSkool", href: "/breedskool", visible: true },
  { id: "7", label: "Feed", href: "/feed", visible: false },
  { id: "8", label: "Blog", href: "/blog", visible: false },
  { id: "9", label: "Leaderboard", href: "/leaderboard", visible: false },
  { id: "10", label: "$TDrip", href: "/tdrip", visible: false },
];

const THEME_PRESETS = [
  { id: "purple", label: "Purple (Default)", primary: "#7c3aed", secondary: "#4f46e5", accent: "#f97316", bg: "#0f0f1a" },
  { id: "blue", label: "Ocean Blue", primary: "#2563eb", secondary: "#0284c7", accent: "#06b6d4", bg: "#0a0f1a" },
  { id: "emerald", label: "Emerald Green", primary: "#059669", secondary: "#10b981", accent: "#34d399", bg: "#0a1a12" },
  { id: "rose", label: "Rose Pink", primary: "#e11d48", secondary: "#f43f5e", accent: "#fb923c", bg: "#1a0a0f" },
  { id: "amber", label: "Amber Gold", primary: "#d97706", secondary: "#f59e0b", accent: "#fcd34d", bg: "#1a150a" },
  { id: "slate", label: "Steel Slate", primary: "#475569", secondary: "#64748b", accent: "#94a3b8", bg: "#0f1117" },
];

const sliderFormSchema = z.object({
  badge: z.string().optional(),
  headline: z.string().min(1, "Headline is required"),
  subheadline: z.string().optional(),
  ctaPrimaryLabel: z.string().optional(),
  ctaPrimaryLink: z.string().optional(),
  ctaSecondaryLabel: z.string().optional(),
  ctaSecondaryLink: z.string().optional(),
  backgroundImage: z.string().optional(),
  overlayColor: z.string().optional(),
  accentColor: z.string().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  targetPages: z.string().default("landing"),
});
type SliderFormData = z.infer<typeof sliderFormSchema>;

// ──────────────────────────────────────────────────────────────
// Site Settings Panel
// ──────────────────────────────────────────────────────────────

function SiteSettingsPanel() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { data: allContent = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/site-content"] });

  const globalContent = Array.isArray(allContent)
    ? allContent.filter((item: any) => item.page === "global")
    : [];

  const getVal = (key: string) => {
    const item = globalContent.find((c: any) => c.contentKey === key);
    return item?.value || item?.defaultValue || "";
  };

  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (globalContent.length > 0) {
      const initial: Record<string, string> = {};
      globalContent.forEach((c: any) => { initial[c.contentKey] = c.value || c.defaultValue || ""; });
      setFields(initial);
    }
  }, [allContent.length]);

  const saveMutation = useMutation({
    mutationFn: (updates: Array<{ key: string; value: string }>) =>
      apiRequest("PUT", "/api/admin/site-content", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-content"] });
      toast({ title: "Site settings saved", description: "Changes are live." });
      setSaving(false);
    },
    onError: () => { toast({ title: "Save failed", variant: "destructive" }); setSaving(false); },
  });

  function saveAll() {
    setSaving(true);
    const updates = Object.entries(fields).map(([key, value]) => ({ key, value }));
    saveMutation.mutate(updates);
  }

  const FIELD_GROUPS = [
    {
      title: "Site Identity",
      fields: [
        { key: "global.site.platform_name", label: "Platform Name", type: "text" },
        { key: "global.site.tagline", label: "Tagline (Under Logo)", type: "text" },
        { key: "global.site.logo_url", label: "Logo Image URL", type: "text", placeholder: "https://..." },
        { key: "global.site.contact_email", label: "Support Email", type: "text" },
        { key: "global.site.footer_copyright", label: "Footer Copyright", type: "text" },
        { key: "global.site.footer_description", label: "Footer Description", type: "textarea" },
      ],
    },
    {
      title: "SEO & Social Sharing",
      fields: [
        { key: "global.seo.meta_description", label: "Meta Description (SEO)", type: "textarea" },
        { key: "global.seo.og_title", label: "Social Share Title (OG)", type: "text" },
        { key: "global.seo.og_image", label: "Social Share Image URL (OG)", type: "text", placeholder: "https://..." },
      ],
    },
  ];

  if (isLoading) return <LoadingState label="Loading site settings…" />;

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Globe}
        title="Site Settings"
        description="Control your platform's name, branding, contact details, and SEO metadata."
        action={<Button onClick={saveAll} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white gap-2"><Save className="w-4 h-4" />{saving ? "Saving…" : "Save All"}</Button>}
      />
      {FIELD_GROUPS.map((group) => (
        <Card key={group.title} className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-gray-300 text-sm">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={fields[f.key] ?? getVal(f.key)}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}…`}
                    className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
                    rows={3}
                    data-testid={`input-site-${f.key}`}
                  />
                ) : (
                  <Input
                    value={fields[f.key] ?? getVal(f.key)}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}…`}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    data-testid={`input-site-${f.key}`}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Navigation Panel
// ──────────────────────────────────────────────────────────────

interface NavItem { id: string; label: string; href: string; visible: boolean; }

function NavigationPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<NavItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editHref, setEditHref] = useState("");

  const { data: navConfig, isLoading } = useQuery<{ items: NavItem[] | null }>({
    queryKey: ["/api/nav-config"],
  });

  useEffect(() => {
    if (navConfig) {
      setItems(navConfig.items ?? DEFAULT_NAV_ITEMS);
    }
  }, [navConfig]);

  const saveMutation = useMutation({
    mutationFn: (updatedItems: NavItem[]) => apiRequest("PUT", "/api/admin/nav-config", { items: updatedItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nav-config"] });
      toast({ title: "Navigation saved", description: "Menu changes are live." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function toggleVisible(id: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, visible: !item.visible } : item));
  }
  function moveUp(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function addItem() {
    if (!newLabel.trim() || !newHref.trim()) return;
    setItems((prev) => [...prev, { id: Date.now().toString(), label: newLabel.trim(), href: newHref.trim(), visible: true }]);
    setNewLabel("");
    setNewHref("");
  }
  function startEdit(item: NavItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditHref(item.href);
  }
  function saveEdit() {
    setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, label: editLabel, href: editHref } : i));
    setEditingId(null);
  }

  if (isLoading) return <LoadingState label="Loading navigation config…" />;

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Navigation}
        title="Navigation & Menu"
        description="Control which pages appear in the public navigation bar and their labels. Toggle visibility, reorder, rename, or add custom links."
        action={<Button onClick={() => saveMutation.mutate(items)} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white gap-2"><Save className="w-4 h-4" />{saveMutation.isPending ? "Saving…" : "Save Menu"}</Button>}
      />
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold">Public Navigation Items</CardTitle>
          <CardDescription className="text-gray-500 text-xs">These appear in the top nav for logged-out visitors. Toggle eye icon to show/hide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.visible ? "bg-gray-800 border-gray-700" : "bg-gray-900 border-gray-800 opacity-60"}`}>
              {editingId === item.id ? (
                <>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-sm h-8 w-28" placeholder="Label" data-testid={`input-nav-label-${item.id}`} />
                  <Input value={editHref} onChange={(e) => setEditHref(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-sm h-8 flex-1" placeholder="/path" data-testid={`input-nav-href-${item.id}`} />
                  <Button size="sm" onClick={saveEdit} className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3" data-testid={`button-nav-save-${item.id}`}><CheckCircle className="w-3.5 h-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-500 w-5 text-center">{idx + 1}</span>
                  <span className="text-white text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-gray-500 text-xs font-mono">{item.href}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleVisible(item.id)} className="h-7 w-7 p-0 text-gray-500 hover:text-white" data-testid={`button-nav-toggle-${item.id}`} title={item.visible ? "Hide from nav" : "Show in nav"}>
                      {item.visible ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveUp(item.id)} className="h-7 w-7 p-0 text-gray-500 hover:text-white" data-testid={`button-nav-up-${item.id}`} disabled={idx === 0}><MoveUp className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => moveDown(item.id)} className="h-7 w-7 p-0 text-gray-500 hover:text-white" data-testid={`button-nav-down-${item.id}`} disabled={idx === items.length - 1}><MoveDown className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0 text-gray-500 hover:text-blue-400" data-testid={`button-nav-edit-${item.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="h-7 w-7 p-0 text-gray-500 hover:text-red-400" data-testid={`button-nav-delete-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Advertise)" className="bg-gray-800 border-gray-700 text-white text-sm h-9 w-32" data-testid="input-nav-new-label" />
            <Input value={newHref} onChange={(e) => setNewHref(e.target.value)} placeholder="/path or https://…" className="bg-gray-800 border-gray-700 text-white text-sm h-9 flex-1" data-testid="input-nav-new-href" />
            <Button onClick={addItem} disabled={!newLabel.trim() || !newHref.trim()} className="h-9 bg-purple-600 hover:bg-purple-700 text-white gap-2 text-sm" data-testid="button-nav-add"><Plus className="w-3.5 h-3.5" />Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Hero Sliders Panel
// ──────────────────────────────────────────────────────────────

function HeroSlidersPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any>(null);

  const { data: sliders = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/hero-sliders"] });

  const form = useForm<SliderFormData>({
    resolver: zodResolver(sliderFormSchema),
    defaultValues: { badge: "", headline: "", subheadline: "", ctaPrimaryLabel: "", ctaPrimaryLink: "", ctaSecondaryLabel: "", ctaSecondaryLink: "", backgroundImage: "", overlayColor: "from-black/90 via-black/70 to-black/40", accentColor: "from-purple-400 via-pink-400 to-orange-400", order: 0, isActive: true, targetPages: "landing" },
  });

  const createMutation = useMutation({
    mutationFn: (data: SliderFormData) => apiRequest("POST", "/api/admin/hero-sliders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] }); queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] }); toast({ title: "Slider created" }); setDialogOpen(false); form.reset(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SliderFormData }) => apiRequest("PUT", `/api/admin/hero-sliders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] }); queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] }); toast({ title: "Slider updated" }); setDialogOpen(false); setEditingSlider(null); form.reset(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/hero-sliders/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] }); queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] }); toast({ title: "Slider deleted" }); },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PUT", `/api/admin/hero-sliders/${id}`, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] }); queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] }); },
  });

  function openCreate() { setEditingSlider(null); form.reset({ badge: "", headline: "", subheadline: "", ctaPrimaryLabel: "", ctaPrimaryLink: "", ctaSecondaryLabel: "", ctaSecondaryLink: "", backgroundImage: "", overlayColor: "from-black/90 via-black/70 to-black/40", accentColor: "from-purple-400 via-pink-400 to-orange-400", order: sliders.length, isActive: true, targetPages: "landing" }); setDialogOpen(true); }
  function openEdit(s: any) { setEditingSlider(s); form.reset({ badge: s.badge || "", headline: s.headline || "", subheadline: s.subheadline || "", ctaPrimaryLabel: s.ctaPrimaryLabel || "", ctaPrimaryLink: s.ctaPrimaryLink || "", ctaSecondaryLabel: s.ctaSecondaryLabel || "", ctaSecondaryLink: s.ctaSecondaryLink || "", backgroundImage: s.backgroundImage || "", overlayColor: s.overlayColor || "from-black/90 via-black/70 to-black/40", accentColor: s.accentColor || "from-purple-400 via-pink-400 to-orange-400", order: s.order ?? 0, isActive: s.isActive ?? true, targetPages: s.targetPages || "landing" }); setDialogOpen(true); }
  function onSubmit(data: SliderFormData) { editingSlider ? updateMutation.mutate({ id: editingSlider.id, data }) : createMutation.mutate(data); }

  const ACCENT_PRESETS = [
    { label: "Purple–Pink–Orange", value: "from-purple-400 via-pink-400 to-orange-400" },
    { label: "Blue–Cyan–Emerald", value: "from-blue-400 via-cyan-400 to-emerald-400" },
    { label: "Orange–Pink–Purple", value: "from-orange-400 via-pink-400 to-purple-400" },
    { label: "Indigo–Blue–Cyan", value: "from-indigo-400 via-blue-400 to-cyan-400" },
    { label: "Yellow–Orange–Red", value: "from-yellow-400 via-orange-400 to-red-400" },
  ];

  if (isLoading) return <LoadingState label="Loading hero sliders…" />;

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Image}
        title="Hero Sliders"
        description="Manage the homepage hero carousel. Create slides with headlines, CTAs, and background images."
        action={<Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white gap-2" data-testid="button-slider-new"><Plus className="w-4 h-4" />New Slide</Button>}
      />

      <div className="grid gap-4">
        {sliders.map((slider: any) => (
          <Card key={slider.id} className={`bg-gray-900 border-gray-800 overflow-hidden ${!slider.isActive ? "opacity-60" : ""}`}>
            <div className="flex">
              {slider.backgroundImage && (
                <div className="w-28 shrink-0 bg-gray-800 relative overflow-hidden">
                  <img src={slider.backgroundImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
              )}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {slider.badge && <Badge className="text-xs bg-purple-900/40 text-purple-300 border-purple-700/40">{slider.badge}</Badge>}
                      <Badge className={`text-xs border-0 ${slider.isActive ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"}`}>{slider.isActive ? "Active" : "Hidden"}</Badge>
                      <span className="text-xs text-gray-600">Order: {slider.order}</span>
                    </div>
                    <h3 className="text-white font-bold text-sm line-clamp-1">{slider.headline}</h3>
                    {slider.subheadline && <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{slider.subheadline}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {slider.ctaPrimaryLabel && <span className="text-xs bg-white text-gray-900 px-2 py-0.5 rounded-full font-medium">{slider.ctaPrimaryLabel}</span>}
                      {slider.ctaSecondaryLabel && <span className="text-xs border border-white/30 text-white px-2 py-0.5 rounded-full">{slider.ctaSecondaryLabel}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: slider.id, isActive: !slider.isActive })} className="h-8 w-8 p-0 text-gray-500 hover:text-white" data-testid={`button-slider-toggle-${slider.id}`} title={slider.isActive ? "Hide slide" : "Show slide"}>
                      {slider.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(slider)} className="h-8 w-8 p-0 text-gray-500 hover:text-blue-400" data-testid={`button-slider-edit-${slider.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(slider.id)} className="h-8 w-8 p-0 text-gray-500 hover:text-red-400" data-testid={`button-slider-delete-${slider.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {sliders.length === 0 && (
          <Card className="bg-gray-900 border-gray-800"><CardContent className="py-12 text-center"><Image className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-500 text-sm">No slides yet. Click "New Slide" to create one.</p></CardContent></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-950 border-gray-800 text-white overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-white">{editingSlider ? "Edit Slide" : "Create New Slide"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="badge" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Badge Text</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="For Influencers" data-testid="input-slider-badge" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Display Order</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} className="bg-gray-800 border-gray-700 text-white text-sm" data-testid="input-slider-order" /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="headline" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Headline *</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="Your main headline" data-testid="input-slider-headline" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="subheadline" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Subheadline</FormLabel><FormControl><Textarea {...field} className="bg-gray-800 border-gray-700 text-white text-sm resize-none" rows={2} placeholder="Supporting description…" data-testid="input-slider-subheadline" /></FormControl></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="ctaPrimaryLabel" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Primary CTA Label</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="Get Started" data-testid="input-slider-cta-primary-label" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="ctaPrimaryLink" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Primary CTA Link</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="/signup" data-testid="input-slider-cta-primary-link" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="ctaSecondaryLabel" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Secondary CTA Label</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="Learn More" data-testid="input-slider-cta-secondary-label" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="ctaSecondaryLink" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Secondary CTA Link</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="/about" data-testid="input-slider-cta-secondary-link" /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="backgroundImage" render={({ field }) => (<FormItem><FormLabel className="text-gray-300 text-sm">Background Image URL</FormLabel><FormControl><Input {...field} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="https://images.unsplash.com/…" data-testid="input-slider-bg-image" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="accentColor" render={({ field }) => (
                <FormItem><FormLabel className="text-gray-300 text-sm">Headline Gradient</FormLabel>
                  <div className="grid grid-cols-1 gap-2">
                    {ACCENT_PRESETS.map((p) => (
                      <button key={p.value} type="button" onClick={() => field.onChange(p.value)} className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${field.value === p.value ? "border-purple-500 bg-purple-900/20" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`} data-testid={`button-slider-accent-${p.id ?? p.value.slice(0, 10)}`}>
                        <span className={`w-16 h-4 rounded bg-gradient-to-r ${p.value} shrink-0`} />
                        <span className="text-gray-300">{p.label}</span>
                        {field.value === p.value && <CheckCircle className="w-3.5 h-3.5 text-purple-400 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )} />
              <div className="flex items-center gap-3 pt-2">
                <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex items-center gap-2"><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-slider-active" /><Label className="text-gray-300 text-sm cursor-pointer">Active (visible on site)</Label></FormItem>)} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-white" data-testid="button-slider-cancel">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-slider-submit">
                  {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingSlider ? "Update Slide" : "Create Slide"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Pages & Content Panel (wrapper around ContentEditorPanel)
// ──────────────────────────────────────────────────────────────

function PagesContentPanel() {
  return (
    <div className="space-y-6">
      <PanelHeader icon={FileText} title="Pages & Content" description="Edit all text, headlines, descriptions, button labels, and images across every page. Changes go live instantly." />
      <ContentEditorPanel />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Theme & Colors Panel
// ──────────────────────────────────────────────────────────────

function ThemeColorsPanel() {
  const { toast } = useToast();
  const [theme, setTheme] = useState({ primaryColor: "#7c3aed", secondaryColor: "#4f46e5", accentColor: "#f97316", bgColor: "#0f0f1a", textColor: "#ffffff", navBg: "#ffffff", navText: "#111827" });
  const [applied, setApplied] = useState(false);

  const { data: savedTheme } = useQuery<any>({ queryKey: ["/api/theme-config"] });

  useEffect(() => {
    if (savedTheme && Object.keys(savedTheme).length > 0) {
      setTheme((prev) => ({ ...prev, ...savedTheme }));
    }
  }, [savedTheme]);

  const saveMutation = useMutation({
    mutationFn: (themeData: typeof theme) => apiRequest("PUT", "/api/admin/theme-config", themeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/theme-config"] });
      applyThemeToDOM(theme);
      setApplied(true);
      toast({ title: "Theme saved", description: "Color changes are live." });
      setTimeout(() => setApplied(false), 3000);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function applyThemeToDOM(t: typeof theme) {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", t.primaryColor);
    root.style.setProperty("--brand-secondary", t.secondaryColor);
    root.style.setProperty("--brand-accent", t.accentColor);
    root.style.setProperty("--brand-bg", t.bgColor);
  }

  function applyPreset(preset: typeof THEME_PRESETS[0]) {
    const next = { ...theme, primaryColor: preset.primary, secondaryColor: preset.secondary, accentColor: preset.accent, bgColor: preset.bg };
    setTheme(next);
    applyThemeToDOM(next);
  }

  const COLOR_FIELDS = [
    { key: "primaryColor" as const, label: "Primary Brand Color", desc: "Main buttons, active nav, highlights" },
    { key: "secondaryColor" as const, label: "Secondary Color", desc: "Secondary accents, hover states" },
    { key: "accentColor" as const, label: "Accent / CTA Color", desc: "Call-to-action buttons, badges" },
    { key: "bgColor" as const, label: "Dark Background Color", desc: "Hero sections, dark panels" },
    { key: "navBg" as const, label: "Navigation Background", desc: "Top navigation bar background" },
    { key: "navText" as const, label: "Navigation Text Color", desc: "Nav links and logo text color" },
  ];

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Palette}
        title="Theme & Colors"
        description="Define your brand's color palette. Saved colors are applied as CSS variables site-wide."
        action={
          <Button onClick={() => saveMutation.mutate(theme)} disabled={saveMutation.isPending} className={`gap-2 ${applied ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"} text-white`} data-testid="button-theme-save">
            {applied ? <><CheckCircle className="w-4 h-4" />Applied!</> : <><Save className="w-4 h-4" />{saveMutation.isPending ? "Saving…" : "Save & Apply"}</>}
          </Button>
        }
      />

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3"><CardTitle className="text-white text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Quick Presets</CardTitle><CardDescription className="text-gray-500 text-xs">Apply a ready-made color palette instantly</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_PRESETS.map((preset) => (
              <button key={preset.id} onClick={() => applyPreset(preset)} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all text-left" data-testid={`button-theme-preset-${preset.id}`}>
                <div className="flex gap-1 shrink-0">
                  <div className="w-4 h-4 rounded-full" style={{ background: preset.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: preset.accent }} />
                </div>
                <span className="text-gray-300 text-xs font-medium">{preset.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3"><CardTitle className="text-white text-sm font-semibold">Custom Colors</CardTitle><CardDescription className="text-gray-500 text-xs">Fine-tune each color using the color picker or enter a hex value</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl border-2 border-gray-600 overflow-hidden cursor-pointer shadow-md" style={{ background: theme[f.key] }}>
                  <input type="color" value={theme[f.key]} onChange={(e) => setTheme((prev) => ({ ...prev, [f.key]: e.target.value }))} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" data-testid={`color-picker-${f.key}`} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{f.label}</p>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
              <Input value={theme[f.key]} onChange={(e) => setTheme((prev) => ({ ...prev, [f.key]: e.target.value }))} className="bg-gray-800 border-gray-700 text-white text-sm font-mono w-28 h-9" placeholder="#000000" data-testid={`input-color-${f.key}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3"><CardTitle className="text-white text-sm font-semibold">Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden border border-gray-700">
            <div className="h-10 flex items-center px-4 gap-4" style={{ background: theme.navBg }}>
              <div className="w-5 h-5 rounded-md" style={{ background: theme.primaryColor }} />
              <div className="flex gap-3">
                {["Home", "Tasks", "Shop"].map((l) => <span key={l} className="text-xs font-medium" style={{ color: theme.navText }}>{l}</span>)}
              </div>
              <div className="ml-auto flex gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: theme.primaryColor }}>Sign Up</div>
              </div>
            </div>
            <div className="h-24 flex items-center justify-center px-6" style={{ background: theme.bgColor }}>
              <div className="text-center">
                <div className="text-lg font-black text-white mb-1" style={{ textShadow: `0 0 30px ${theme.primaryColor}` }}>Platform Preview</div>
                <div className="flex gap-2 justify-center">
                  <div className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: theme.primaryColor }}>Primary Button</div>
                  <div className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: theme.accentColor }}>Accent Button</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Fees & Rates Panel
// ──────────────────────────────────────────────────────────────

function FeesRatesPanel() {
  const { toast } = useToast();

  const { data: platformFees = [], isLoading: loadingPlatform } = useQuery<any[]>({ queryKey: ["/api/admin/platform-fees"] });
  const { data: p2pFees = [], isLoading: loadingP2P } = useQuery<any[]>({ queryKey: ["/api/admin/p2p-fees"] });

  const [platformLocal, setPlatformLocal] = useState<Record<string, { feeType: string; value: string }>>({});
  const [p2pLocal, setP2PLocal] = useState<Record<string, { feeType: string; feeValue: string }>>({});

  useEffect(() => {
    if (Array.isArray(platformFees) && platformFees.length > 0) {
      const init: typeof platformLocal = {};
      platformFees.forEach((f: any) => { init[f.name] = { feeType: f.feeType || "percentage", value: f.value || "0" }; });
      setPlatformLocal(init);
    }
  }, [platformFees]);

  useEffect(() => {
    if (Array.isArray(p2pFees) && p2pFees.length > 0) {
      const init: typeof p2pLocal = {};
      p2pFees.forEach((f: any) => { init[f.type] = { feeType: f.feeType || "percentage", feeValue: f.feeValue || "0" }; });
      setP2PLocal(init);
    }
  }, [p2pFees]);

  const savePlatformFee = useMutation({
    mutationFn: ({ name, data }: { name: string; data: any }) => apiRequest("PATCH", `/api/admin/platform-fees/${name}`, data),
    onSuccess: (_, { name }) => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-fees"] }); toast({ title: `${name} fee saved` }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });
  const saveP2PFee = useMutation({
    mutationFn: ({ type, data }: { type: string; data: any }) => apiRequest("PATCH", `/api/admin/p2p-fees/${type}`, data),
    onSuccess: (_, { type }) => { queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-fees"] }); toast({ title: `P2P ${type} fee saved` }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const FEE_LABELS: Record<string, string> = {
    campaign_fee: "Campaign Creator Fee",
    withdrawal_fee: "Withdrawal Fee",
    listing_fee: "Product Listing Fee",
  };

  const P2P_LABELS: Record<string, string> = {
    p2p_usdt: "USDT P2P Trade",
    p2p_ton: "TON P2P Trade",
    p2p_bnb: "BNB P2P Trade",
    p2p_eth: "ETH P2P Trade",
  };

  if (loadingPlatform || loadingP2P) return <LoadingState label="Loading fee configuration…" />;

  return (
    <div className="space-y-6">
      <PanelHeader icon={DollarSign} title="Fees & Rates" description="Configure platform commission rates, withdrawal fees, and P2P transaction fees." />

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-purple-400" />Platform Fees</CardTitle>
          <CardDescription className="text-gray-500 text-xs">Fees charged to creators and brands for using the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(FEE_LABELS).map(([name, label]) => {
            const local = platformLocal[name] || { feeType: "percentage", value: "0" };
            return (
              <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-gray-500 text-xs capitalize">{name.replace(/_/g, " ")}</p>
                </div>
                <Select value={local.feeType} onValueChange={(v) => setPlatformLocal((prev) => ({ ...prev, [name]: { ...local, feeType: v } }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-9 w-28" data-testid={`select-platform-fee-type-${name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">Fixed $</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={local.value} onChange={(e) => setPlatformLocal((prev) => ({ ...prev, [name]: { ...local, value: e.target.value } }))} className="bg-gray-700 border-gray-600 text-white text-sm h-9 w-24" min="0" step="0.01" data-testid={`input-platform-fee-value-${name}`} />
                <Button size="sm" onClick={() => savePlatformFee.mutate({ name, data: { feeType: local.feeType, value: local.value } })} disabled={savePlatformFee.isPending} className="h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3" data-testid={`button-save-platform-fee-${name}`}><Save className="w-3.5 h-3.5" /></Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" />P2P Transaction Fees</CardTitle>
          <CardDescription className="text-gray-500 text-xs">Fees applied to peer-to-peer trades by asset type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {p2pFees.map((fee: any) => {
            const local = p2pLocal[fee.type] || { feeType: fee.feeType || "percentage", feeValue: fee.feeValue || "0" };
            const label = P2P_LABELS[fee.type] || fee.type;
            return (
              <div key={fee.id || fee.type} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-gray-500 text-xs">Min fee: {fee.minFee || "0"} · Max: {fee.maxFee || "none"}</p>
                </div>
                <Select value={local.feeType} onValueChange={(v) => setP2PLocal((prev) => ({ ...prev, [fee.type]: { ...local, feeType: v } }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-9 w-28" data-testid={`select-p2p-fee-type-${fee.type}`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">Fixed $</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={local.feeValue} onChange={(e) => setP2PLocal((prev) => ({ ...prev, [fee.type]: { ...local, feeValue: e.target.value } }))} className="bg-gray-700 border-gray-600 text-white text-sm h-9 w-24" min="0" step="0.01" data-testid={`input-p2p-fee-value-${fee.type}`} />
                <Button size="sm" onClick={() => saveP2PFee.mutate({ type: fee.type, data: { ...fee, feeType: local.feeType, feeValue: local.feeValue } })} disabled={saveP2PFee.isPending} className="h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3" data-testid={`button-save-p2p-fee-${fee.type}`}><Save className="w-3.5 h-3.5" /></Button>
              </div>
            );
          })}
          {p2pFees.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No P2P fee configs found. They initialize on first use.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Announcement Panel
// ──────────────────────────────────────────────────────────────

interface AnnouncementConfig {
  enabled: boolean;
  message: string;
  color: string;
  link: string;
  emoji: string;
}

const BANNER_COLORS = [
  { id: "purple", label: "Purple", bg: "bg-purple-600", preview: "#7c3aed" },
  { id: "blue", label: "Blue", bg: "bg-blue-600", preview: "#2563eb" },
  { id: "green", label: "Green", bg: "bg-emerald-600", preview: "#059669" },
  { id: "orange", label: "Orange", bg: "bg-orange-500", preview: "#f97316" },
  { id: "red", label: "Red", bg: "bg-red-600", preview: "#dc2626" },
  { id: "dark", label: "Dark", bg: "bg-gray-900", preview: "#111827" },
];

function AnnouncementPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AnnouncementConfig>({ enabled: false, message: "", color: "purple", link: "", emoji: "🔥" });

  const { data: saved, isLoading } = useQuery<AnnouncementConfig>({ queryKey: ["/api/announcement"] });

  useEffect(() => {
    if (saved) setConfig({ emoji: "🔥", ...saved });
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: (data: AnnouncementConfig) => apiRequest("PUT", "/api/admin/announcement", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcement"] });
      toast({ title: config.enabled ? "Announcement is now live!" : "Announcement hidden", description: "Changes saved." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const colorMeta = BANNER_COLORS.find((c) => c.id === config.color) || BANNER_COLORS[0];

  if (isLoading) return <LoadingState label="Loading announcement…" />;

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Megaphone}
        title="Announcement Banner"
        description="Display a site-wide notification bar at the top of every page. Great for promotions, updates, or important notices."
        action={<Button onClick={() => saveMutation.mutate(config)} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white gap-2" data-testid="button-announcement-save"><Save className="w-4 h-4" />{saveMutation.isPending ? "Saving…" : "Save Banner"}</Button>}
      />

      {/* Live preview */}
      <div className={`rounded-xl overflow-hidden border border-gray-700 ${!config.enabled ? "opacity-40" : ""}`}>
        <div className={`${colorMeta.bg} text-white text-center py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2`}>
          {config.emoji && <span>{config.emoji}</span>}
          <span>{config.message || "Your announcement message will appear here…"}</span>
          {config.link && <a href={config.link} className="underline text-white/80 text-xs ml-1">Learn more →</a>}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-5 space-y-5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700">
            <div>
              <p className="text-white text-sm font-medium">Show Announcement</p>
              <p className="text-gray-500 text-xs">Toggle to show or hide the banner site-wide</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((prev) => ({ ...prev, enabled: v }))} data-testid="switch-announcement-enabled" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Emoji</Label>
            <Input value={config.emoji} onChange={(e) => setConfig((prev) => ({ ...prev, emoji: e.target.value }))} className="bg-gray-800 border-gray-700 text-white text-sm w-20" placeholder="🔥" maxLength={4} data-testid="input-announcement-emoji" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Message</Label>
            <Textarea value={config.message} onChange={(e) => setConfig((prev) => ({ ...prev, message: e.target.value }))} className="bg-gray-800 border-gray-700 text-white text-sm resize-none" rows={2} placeholder="🚀 New campaigns just dropped — browse and apply now!" data-testid="textarea-announcement-message" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Link URL (optional)</Label>
            <Input value={config.link} onChange={(e) => setConfig((prev) => ({ ...prev, link: e.target.value }))} className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="/tasks or https://…" data-testid="input-announcement-link" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Banner Color</Label>
            <div className="flex gap-2 flex-wrap">
              {BANNER_COLORS.map((c) => (
                <button key={c.id} onClick={() => setConfig((prev) => ({ ...prev, color: c.id }))} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${config.color === c.id ? "border-purple-500 ring-1 ring-purple-500" : "border-gray-700"}`} data-testid={`button-announcement-color-${c.id}`}>
                  <div className="w-4 h-4 rounded-full" style={{ background: c.preview }} />
                  <span className="text-gray-300">{c.label}</span>
                  {config.color === c.id && <CheckCircle className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared UI Components
// ──────────────────────────────────────────────────────────────

function PanelHeader({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Footer Management Panel
// ──────────────────────────────────────────────────────────────

function FooterManagementPanel() {
  const { toast } = useToast();
  const [editingCol, setEditingCol] = useState<any>(null);
  const [newColTitle, setNewColTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: columns = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/footer-columns"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/footer-columns", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/footer-columns"] }); toast({ title: "Column created" }); setDialogOpen(false); setNewColTitle(""); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/admin/footer-columns/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/footer-columns"] }); toast({ title: "Saved" }); setEditingCol(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/footer-columns/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/footer-columns"] }); toast({ title: "Column deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const [editForm, setEditForm] = useState<any>(null);

  const startEdit = (col: any) => {
    setEditingCol(col.id);
    setEditForm({ title: col.title, links: Array.isArray(col.links) ? JSON.parse(JSON.stringify(col.links)) : [], isActive: col.isActive !== false, sortOrder: col.sortOrder || 0 });
  };

  const addLink = () => {
    setEditForm((prev: any) => ({ ...prev, links: [...(prev.links || []), { label: "", url: "", isExternal: false }] }));
  };

  const updateLink = (idx: number, field: string, val: any) => {
    setEditForm((prev: any) => {
      const links = [...(prev.links || [])];
      links[idx] = { ...links[idx], [field]: val };
      return { ...prev, links };
    });
  };

  const removeLink = (idx: number) => {
    setEditForm((prev: any) => ({ ...prev, links: prev.links.filter((_: any, i: number) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2"><Layout className="w-4 h-4 text-purple-400" />Footer Link Columns</CardTitle>
              <CardDescription className="text-gray-400 mt-1">Manage the footer columns and links shown across the site.</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-9" data-testid="button-add-footer-column"><Plus className="w-4 h-4" />Add Column</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : columns.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-gray-700">
              <Layout className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No footer columns yet.</p>
              <p className="text-gray-600 text-xs mt-1">Add columns like "Company", "Resources", "Legal" with links.</p>
            </div>
          ) : (
            columns.map((col: any) => (
              <div key={col.id} className="rounded-xl border border-gray-700 overflow-hidden" data-testid={`card-footer-col-${col.id}`}>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${col.isActive ? "bg-green-400" : "bg-gray-500"}`} />
                    <span className="text-white font-semibold text-sm">{col.title}</span>
                    <span className="text-gray-500 text-xs">({Array.isArray(col.links) ? col.links.length : 0} links)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(col)} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-400" data-testid={`button-edit-footer-col-${col.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(col.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-400" data-testid={`button-delete-footer-col-${col.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {editingCol === col.id && editForm && (
                  <div className="p-4 bg-gray-900 border-t border-gray-700 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-400 text-xs mb-1 block">Column Title</Label>
                        <Input value={editForm.title} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))} className="bg-gray-800 border-gray-700 text-white h-8 text-sm" data-testid="input-footer-col-title" />
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={editForm.isActive} onCheckedChange={v => setEditForm((p: any) => ({ ...p, isActive: v }))} />
                          <Label className="text-gray-400 text-xs">Active</Label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-gray-400 text-xs">Links</Label>
                        <Button size="sm" variant="ghost" onClick={addLink} className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300" data-testid="button-add-footer-link"><Plus className="w-3 h-3 mr-1" />Add Link</Button>
                      </div>
                      <div className="space-y-2">
                        {(editForm.links || []).map((link: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2" data-testid={`row-footer-link-${idx}`}>
                            <Input value={link.label} onChange={e => updateLink(idx, "label", e.target.value)} placeholder="Label" className="bg-gray-800 border-gray-700 text-white h-8 text-xs w-32 flex-shrink-0" />
                            <Input value={link.url} onChange={e => updateLink(idx, "url", e.target.value)} placeholder="/path or https://..." className="bg-gray-800 border-gray-700 text-white h-8 text-xs flex-1" />
                            <label className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                              <input type="checkbox" checked={!!link.isExternal} onChange={e => updateLink(idx, "isExternal", e.target.checked)} className="rounded w-3 h-3" />Ext
                            </label>
                            <Button variant="ghost" size="sm" onClick={() => removeLink(idx)} className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 flex-shrink-0"><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingCol(null)} className="border-gray-700 text-gray-400 hover:text-white h-8">Cancel</Button>
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: col.id, data: editForm })} disabled={updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white h-8" data-testid={`button-save-footer-col-${col.id}`}>
                        {updateMutation.isPending ? "Saving..." : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}
                      </Button>
                    </div>
                  </div>
                )}
                {editingCol !== col.id && Array.isArray(col.links) && col.links.length > 0 && (
                  <div className="px-4 py-2 bg-gray-900/50">
                    {col.links.map((link: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        <Link2 className="w-3 h-3 text-gray-600 flex-shrink-0" />
                        <span className="text-gray-400 text-xs">{link.label}</span>
                        <span className="text-gray-600 text-xs">→</span>
                        <span className="text-purple-400 text-xs truncate">{link.url}</span>
                        {link.isExternal && <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-white font-bold text-base mb-4">Add Footer Column</h3>
            <Label className="text-gray-400 text-xs mb-1.5 block">Column Title</Label>
            <Input value={newColTitle} onChange={e => setNewColTitle(e.target.value)} placeholder="e.g. Company, Resources, Legal" className="bg-gray-800 border-gray-700 text-white mb-4" data-testid="input-new-footer-col-title" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-gray-700 text-gray-400">Cancel</Button>
              <Button onClick={() => createMutation.mutate({ title: newColTitle, links: [], sortOrder: columns.length, isActive: true })} disabled={!newColTitle.trim() || createMutation.isPending} className="flex-1 bg-purple-600 hover:bg-purple-700" data-testid="button-create-footer-col">
                {createMutation.isPending ? "Creating..." : "Create Column"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Admin CMS Editor Page
// ──────────────────────────────────────────────────────────────

export default function AdminCMSEditor() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeModule, setActiveModule] = useState("site-settings");

  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 p-8 text-center max-w-sm">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Admin Access Required</h2>
          <p className="text-gray-400 text-sm mb-4">You need admin privileges to access the CMS editor.</p>
          <Button onClick={() => navigate("/admin-login")} className="bg-purple-600 hover:bg-purple-700 text-white">Go to Admin Login</Button>
        </Card>
      </div>
    );
  }

  const ActivePanel = {
    "site-settings": SiteSettingsPanel,
    "navigation": NavigationPanel,
    "hero-sliders": HeroSlidersPanel,
    "pages-content": PagesContentPanel,
    "theme-colors": ThemeColorsPanel,
    "fees-rates": FeesRatesPanel,
    "footer-management": FooterManagementPanel,
    "announcement": AnnouncementPanel,
  }[activeModule] || SiteSettingsPanel;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3.5 flex items-center gap-4 sticky top-0 z-30">
        <button onClick={() => navigate("/admin-dashboard")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm" data-testid="button-cms-back">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </button>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">CMS Editor</span>
            <span className="text-gray-500 text-xs ml-2">Full Web App Control</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-green-900/30 text-green-400 border-green-700/30 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />Live
          </Badge>
          <a href="/" target="_blank" rel="noreferrer" data-testid="link-cms-preview">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-1.5 text-xs h-8">
              <ExternalLink className="w-3.5 h-3.5" />Preview Site
            </Button>
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-800">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Content Modules</p>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const active = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${active ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
                  data-testid={`button-cms-module-${mod.id}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-gray-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{mod.label}</div>
                    <div className={`text-xs truncate ${active ? "text-purple-200" : "text-gray-600"}`}>{mod.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="rounded-xl bg-gray-800 p-3 text-center">
              <p className="text-gray-400 text-xs mb-2">Changes go live instantly</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">Database Connected</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <ActivePanel />
          </div>
        </main>
      </div>
    </div>
  );
}
