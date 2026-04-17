import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileText, Image, Link2, Type, AlignLeft, Save, RotateCcw, ChevronDown,
  ChevronRight, Globe, Layers, ShoppingBag, BookOpen, Target, Home,
  CheckCircle, Edit3, ExternalLink
} from "lucide-react";

interface ContentBlock {
  id: string;
  page: string;
  section: string;
  key: string;
  value: string | null;
  defaultValue: string | null;
  type: string;
  label: string;
  description: string | null;
  order: number;
}

const PAGE_META: Record<string, { label: string; icon: any; color: string }> = {
  global: { label: "Global Settings", icon: Globe, color: "text-violet-400" },
  landing: { label: "Landing Page", icon: Home, color: "text-orange-400" },
  breedskool: { label: "BreedSkool", icon: BookOpen, color: "text-blue-400" },
  shop: { label: "Shop", icon: ShoppingBag, color: "text-emerald-400" },
  campaigns: { label: "Campaigns", icon: Target, color: "text-pink-400" },
  blog: { label: "Blog", icon: Layers, color: "text-cyan-400" },
};

const SECTION_LABELS: Record<string, string> = {
  site: "Site Identity",
  contact: "Contact & Social Links",
  platform_bar: "Platform Bar",
  how_it_works: "How It Works",
  tiers: "Influencer Tiers",
  ecosystem: "Ecosystem Section",
  campaigns_preview: "Campaigns Preview",
  why_taskdrip: "Why Taskdrip",
  testimonials: "Testimonials",
  final_cta: "Final Call to Action",
  hero: "Hero Section",
  features: "Features Section",
};

function typeIcon(type: string) {
  switch (type) {
    case "image": return <Image className="w-3.5 h-3.5 text-pink-400" />;
    case "url": return <Link2 className="w-3.5 h-3.5 text-blue-400" />;
    case "html": return <FileText className="w-3.5 h-3.5 text-yellow-400" />;
    case "textarea": return <AlignLeft className="w-3.5 h-3.5 text-green-400" />;
    default: return <Type className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function ContentBlockEditor({ block, onSave, onReset, isSaving, isResetting }: {
  block: ContentBlock;
  onSave: (id: string, value: string) => void;
  onReset: (id: string) => void;
  isSaving: boolean;
  isResetting: boolean;
}) {
  const effectiveValue = block.value ?? block.defaultValue ?? "";
  const [localValue, setLocalValue] = useState(effectiveValue);
  const isDirty = localValue !== effectiveValue;
  const isModified = block.value !== null && block.value !== "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {typeIcon(block.type || "text")}
          <span className="text-gray-200 text-sm font-semibold">{block.label}</span>
          {isModified && (
            <Badge className="text-xs bg-purple-900/40 text-purple-300 border-purple-700/40">Customised</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { onReset(block.id); setLocalValue(block.defaultValue ?? ""); }}
              disabled={isResetting}
              className="text-gray-500 hover:text-orange-400 h-7 px-2"
              data-testid={`button-reset-${block.id}`}
              title="Reset to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          {isDirty && (
            <Button
              size="sm"
              onClick={() => onSave(block.id, localValue)}
              disabled={isSaving}
              className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs"
              data-testid={`button-save-${block.id}`}
            >
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
        </div>
      </div>

      {block.type === "image" ? (
        <div className="space-y-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={block.defaultValue || "https://…"}
            className="bg-gray-800 border-gray-700 text-white text-sm"
            data-testid={`input-content-${block.id}`}
          />
          {localValue && (
            <div className="relative h-24 rounded-lg overflow-hidden bg-gray-700">
              <img
                src={localValue}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}
        </div>
      ) : block.type === "url" ? (
        <div className="flex gap-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={block.defaultValue || "https://…"}
            className="bg-gray-800 border-gray-700 text-white text-sm flex-1"
            data-testid={`input-content-${block.id}`}
          />
          {localValue && (
            <a href={localValue} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 h-10 w-10 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      ) : block.type === "textarea" || block.type === "html" ? (
        <Textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={block.defaultValue || "Enter text…"}
          rows={3}
          className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
          data-testid={`textarea-content-${block.id}`}
        />
      ) : (
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={block.defaultValue || "Enter text…"}
          className="bg-gray-800 border-gray-700 text-white text-sm"
          data-testid={`input-content-${block.id}`}
        />
      )}

      {block.description && (
        <p className="text-xs text-gray-600">{block.description}</p>
      )}
      {!isDirty && block.value === null && block.defaultValue && (
        <p className="text-xs text-gray-600">Showing default value — edit to customise.</p>
      )}
    </div>
  );
}

function SectionCard({ sectionKey, blocks, onSave, onReset, savingId, resettingId }: {
  sectionKey: string;
  blocks: ContentBlock[];
  onSave: (id: string, value: string) => void;
  onReset: (id: string) => void;
  savingId: string | null;
  resettingId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const label = SECTION_LABELS[sectionKey] || sectionKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const modifiedCount = blocks.filter((b) => b.value !== null && b.value !== "").length;

  return (
    <div className="rounded-xl border border-gray-700/50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-800/60 hover:bg-gray-800 transition-colors"
        onClick={() => setOpen((o) => !o)}
        data-testid={`section-toggle-${sectionKey}`}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <span className="text-white font-semibold text-sm">{label}</span>
          <Badge className="text-xs bg-gray-700 text-gray-400 border-0">{blocks.length} fields</Badge>
          {modifiedCount > 0 && (
            <Badge className="text-xs bg-purple-900/40 text-purple-300 border-purple-700/40">
              {modifiedCount} customised
            </Badge>
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-gray-700/30">
          {blocks.map((block) => (
            <div key={block.id} className="px-5 py-4 bg-gray-900/30">
              <ContentBlockEditor
                block={block}
                onSave={onSave}
                onReset={onReset}
                isSaving={savingId === block.id}
                isResetting={resettingId === block.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentEditorPanel() {
  const { toast } = useToast();
  const [activePage, setActivePage] = useState("landing");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const { data: allContent = [], isLoading } = useQuery<ContentBlock[]>({
    queryKey: ["/api/admin/page-content"],
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      apiRequest("PUT", `/api/admin/page-content/${id}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/page-content"] });
      toast({ title: "Content saved", description: "Change is live on the site." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
    onSettled: () => setSavingId(null),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/page-content/${id}/reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/page-content"] });
      toast({ title: "Reset to default" });
    },
    onError: () => toast({ title: "Reset failed", variant: "destructive" }),
    onSettled: () => setResettingId(null),
  });

  const handleSave = useCallback((id: string, value: string) => {
    setSavingId(id);
    saveMutation.mutate({ id, value });
  }, [saveMutation]);

  const handleReset = useCallback((id: string) => {
    setResettingId(id);
    resetMutation.mutate(id);
  }, [resetMutation]);

  // Group content by page → section
  const pageContent = allContent.filter((b) => b.page === activePage);
  const sections = [...new Set(pageContent.map((b) => b.section))];
  const sectionGroups = sections.reduce<Record<string, ContentBlock[]>>((acc, sec) => {
    acc[sec] = pageContent.filter((b) => b.section === sec).sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  const pages = Object.keys(PAGE_META);
  const totalModified = allContent.filter((b) => b.value !== null && b.value !== "").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                Site Content Editor
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Edit text, images, and links across all pages. Changes go live instantly. Use "Reset" to restore any field to its default.
              </CardDescription>
            </div>
            {totalModified > 0 && (
              <Badge className="bg-purple-900/30 text-purple-300 border-purple-700/30 px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                {totalModified} customised
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="flex gap-5">
        {/* Page Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {pages.map((page) => {
            const meta = PAGE_META[page];
            const Icon = meta.icon;
            const count = allContent.filter((b) => b.page === page && b.value !== null && b.value !== "").length;
            return (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                data-testid={`page-tab-${page}`}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activePage === page
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${activePage === page ? "text-white" : meta.color}`} />
                  {meta.label}
                </div>
                {count > 0 && (
                  <Badge className={`text-xs border-0 ${activePage === page ? "bg-white/20 text-white" : "bg-purple-900/30 text-purple-400"}`}>
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading content editor…</p>
              </div>
            </div>
          ) : pageContent.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center">
                <Layers className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No editable content blocks found for this page.</p>
                <p className="text-gray-600 text-xs mt-1">Content blocks are created automatically when the app starts.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                {(() => { const meta = PAGE_META[activePage]; const Icon = meta?.icon; return Icon ? <Icon className={`w-5 h-5 ${meta.color}`} /> : null; })()}
                <h3 className="text-white font-bold text-base">{PAGE_META[activePage]?.label || activePage}</h3>
                <Badge className="text-xs bg-gray-800 text-gray-400 border-gray-700">{pageContent.length} editable fields</Badge>
              </div>
              {sections.map((section) => (
                <SectionCard
                  key={section}
                  sectionKey={section}
                  blocks={sectionGroups[section]}
                  onSave={handleSave}
                  onReset={handleReset}
                  savingId={savingId}
                  resettingId={resettingId}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
