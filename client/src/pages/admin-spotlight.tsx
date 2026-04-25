import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Sparkles, ArrowLeft, GripVertical, Eye } from "lucide-react";
import type { SpotlightItem } from "@shared/schema";

const ITEM_TYPES = [
  { value: "shop_product", label: "Shop Product" },
  { value: "campaign", label: "Campaign" },
  { value: "course", label: "Course" },
  { value: "service", label: "Service" },
  { value: "p2p", label: "P2P Listing" },
  { value: "ad", label: "Ad" },
  { value: "custom", label: "Custom (link to anything)" },
];

const PAGES = [
  { value: "all", label: "All Pages" },
  { value: "landing", label: "Landing Page" },
  { value: "feed", label: "Feed" },
  { value: "shop", label: "Shop" },
  { value: "products", label: "Products / Brands" },
  { value: "services", label: "Services" },
  { value: "campaigns", label: "Campaigns / Tasks" },
  { value: "courses", label: "Courses (BreedSkool)" },
  { value: "ads", label: "Ads" },
  { value: "p2p", label: "P2P Hub" },
  { value: "blog", label: "Blog" },
  { value: "influencers", label: "Influencer Discovery" },
];

const EMPTY: any = {
  name: "",
  itemType: "custom",
  itemId: "",
  customTitle: "",
  customDescription: "",
  customImage: "",
  customLink: "",
  badgeLabel: "",
  targetPages: ["all"],
  sortOrder: 0,
  isActive: true,
};

export default function AdminSpotlight() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const { data: items = [], isLoading } = useQuery<SpotlightItem[]>({
    queryKey: ["/api/admin/spotlight"],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const body = {
        ...payload,
        targetPages: Array.isArray(payload.targetPages) ? payload.targetPages.join(",") : payload.targetPages,
      };
      const res = editing
        ? await apiRequest("PUT", `/api/admin/spotlight/${editing.id}`, body)
        : await apiRequest("POST", "/api/admin/spotlight", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlight"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spotlight"] });
      toast({ title: editing ? "Spotlight updated" : "Spotlight created" });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/spotlight/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlight"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spotlight"] });
      toast({ title: "Deleted" });
    },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      ...item,
      targetPages: typeof item.targetPages === "string" ? item.targetPages.split(",").map((p: string) => p.trim()) : ["all"],
    });
    setOpen(true);
  };

  if (authLoading) return null;
  if (!user || (user as any).userType !== "admin") {
    return <div className="min-h-screen flex items-center justify-center"><Card><CardContent className="p-8"><p>Admin access required.</p></CardContent></Card></div>;
  }

  const togglePage = (page: string) => {
    setForm((f: any) => {
      const cur = Array.isArray(f.targetPages) ? f.targetPages : [];
      if (cur.includes(page)) return { ...f, targetPages: cur.filter((p: string) => p !== page) };
      return { ...f, targetPages: [...cur, page] };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavigationFixed />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-amber-500" />
                Spotlight Manager
              </h1>
              <p className="text-sm text-gray-500">Curate featured items shown across top pages.</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-add-spotlight">
            <Plus className="w-4 h-4 mr-1" /> Add Spotlight
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Spotlight Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No spotlight items yet. Click "Add Spotlight" to feature your first item.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900" data-testid={`row-spotlight-${item.id}`}>
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {item.customImage ? (
                      <img src={item.customImage} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-white flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{item.customTitle || item.name}</p>
                        {item.badgeLabel && <Badge className="bg-red-500 text-white text-xs">{item.badgeLabel}</Badge>}
                        {!item.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {ITEM_TYPES.find(t => t.value === item.itemType)?.label || item.itemType} · Pages: {item.targetPages || "all"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} data-testid={`button-edit-spotlight-${item.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this spotlight item?")) deleteMutation.mutate(item.id); }} data-testid={`button-delete-spotlight-${item.id}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Spotlight" : "Add Spotlight"}</DialogTitle>
            <DialogDescription>Featured item that appears in the spotlight section on selected pages.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div>
              <Label>Internal Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spring 2026 Premium Course" required data-testid="input-spotlight-name" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Item Type *</Label>
                <Select value={form.itemType} onValueChange={(v) => setForm({ ...form, itemType: v })}>
                  <SelectTrigger data-testid="select-spotlight-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item ID (optional, for linking to existing entity)</Label>
                <Input value={form.itemId || ""} onChange={(e) => setForm({ ...form, itemId: e.target.value })} placeholder="UUID of product/campaign/etc" data-testid="input-spotlight-itemid" />
              </div>
            </div>

            <div>
              <Label>Display Title *</Label>
              <Input value={form.customTitle} onChange={(e) => setForm({ ...form, customTitle: e.target.value })} placeholder="What users see" required data-testid="input-spotlight-title" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.customDescription || ""} onChange={(e) => setForm({ ...form, customDescription: e.target.value })} placeholder="Short description (1–2 lines)" data-testid="textarea-spotlight-description" />
            </div>

            <div>
              <Label>Featured Image (upload from device)</Label>
              <ImageUpload value={form.customImage} onChange={(url) => setForm({ ...form, customImage: url })} testId="spotlight-image" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link URL (where users go)</Label>
                <Input value={form.customLink || ""} onChange={(e) => setForm({ ...form, customLink: e.target.value })} placeholder="/shop/abc or https://..." data-testid="input-spotlight-link" />
              </div>
              <div>
                <Label>Badge (optional)</Label>
                <Input value={form.badgeLabel || ""} onChange={(e) => setForm({ ...form, badgeLabel: e.target.value })} placeholder="HOT, NEW, TRENDING" data-testid="input-spotlight-badge" />
              </div>
            </div>

            <div>
              <Label>Target Pages *</Label>
              <p className="text-xs text-gray-500 mb-2">Choose where this spotlight item should appear. "All Pages" overrides individual selections.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAGES.map((p) => {
                  const checked = (Array.isArray(form.targetPages) ? form.targetPages : []).includes(p.value);
                  return (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => togglePage(p.value)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${checked ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-gray-900 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
                      data-testid={`toggle-page-${p.value}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} data-testid="input-spotlight-sort" />
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-spotlight-active" />
                <Label>Active (visible)</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" disabled={saveMutation.isPending} data-testid="button-save-spotlight">
                {saveMutation.isPending ? "Saving..." : editing ? "Update Spotlight" : "Create Spotlight"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
