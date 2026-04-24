import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Save, Upload, Loader2, Eye } from "lucide-react";

const PREVIEW_VARS = {
  studentName: "Jane Q. Student",
  courseTitle: "Sample Course Title",
  date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  instructorName: "Prof. Sample Tutor",
};

function fillTemplate(tpl: string, vars: Record<string, string>) {
  let out = tpl || "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
  }
  return out;
}

function buildPreviewSvg(tpl: any) {
  const accent = tpl?.accentColor || "#7c3aed";
  const bg = tpl?.bgColor || "#fdfaf6";
  const W = 800, H = 565;
  const headline = tpl?.headlineText || "Certificate of Completion";
  const inst = tpl?.institutionName || "BreedSkool Academy";
  const body = fillTemplate(tpl?.bodyTemplate || "", PREVIEW_VARS);
  const sigName = tpl?.signatoryName || "";
  const sigTitle = tpl?.signatoryTitle || "";
  const escape = (s: string) => String(s || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[c] || c));
  const wrap = (text: string, max: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > max) { lines.push(line); line = w; }
      else line = (line + " " + w).trim();
    }
    if (line) lines.push(line);
    return lines.slice(0, 4);
  };
  const bodyLines = wrap(body, 72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${accent}" stroke-width="3"/>
    <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="${accent}" stroke-width="0.7" stroke-dasharray="3 4" stroke-opacity="0.6"/>
    ${tpl?.institutionLogoUrl ? `<image href="${escape(tpl.institutionLogoUrl)}" x="${W / 2 - 35}" y="50" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>` : ""}
    <text x="${W / 2}" y="${tpl?.institutionLogoUrl ? 145 : 90}" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="${accent}" font-weight="700" letter-spacing="2">${escape(inst.toUpperCase())}</text>
    <text x="${W / 2}" y="${tpl?.institutionLogoUrl ? 195 : 145}" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#1f2937" font-weight="700">${escape(headline)}</text>
    <line x1="${W / 2 - 60}" y1="${tpl?.institutionLogoUrl ? 210 : 160}" x2="${W / 2 + 60}" y2="${tpl?.institutionLogoUrl ? 210 : 160}" stroke="${accent}" stroke-width="1.5"/>
    <text x="${W / 2}" y="${tpl?.institutionLogoUrl ? 240 : 195}" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#6b7280" font-style="italic">This certificate is proudly presented to</text>
    <text x="${W / 2}" y="${tpl?.institutionLogoUrl ? 290 : 245}" text-anchor="middle" font-family="'Brush Script MT',cursive" font-size="46" fill="${accent}" font-weight="700">${escape(PREVIEW_VARS.studentName)}</text>
    ${bodyLines.map((line, i) => `<text x="${W / 2}" y="${(tpl?.institutionLogoUrl ? 330 : 290) + i * 18}" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#374151">${escape(line)}</text>`).join("")}
    ${tpl?.signatureImageUrl ? `<image href="${escape(tpl.signatureImageUrl)}" x="${W * 0.18 - 50}" y="${H - 130}" width="100" height="40" preserveAspectRatio="xMidYMid meet"/>` : ""}
    <line x1="${W * 0.18 - 65}" y1="${H - 90}" x2="${W * 0.18 + 65}" y2="${H - 90}" stroke="#374151" stroke-width="1"/>
    <text x="${W * 0.18}" y="${H - 75}" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#1f2937" font-weight="700">${escape(sigName)}</text>
    <text x="${W * 0.18}" y="${H - 60}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#6b7280">${escape(sigTitle)}</text>
    ${tpl?.sealImageUrl
      ? `<image href="${escape(tpl.sealImageUrl)}" x="${W / 2 - 30}" y="${H - 130}" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>`
      : `<g transform="translate(${W / 2} ${H - 95})"><circle r="28" fill="${accent}" fill-opacity="0.1" stroke="${accent}" stroke-width="1.5"/><text text-anchor="middle" y="-2" font-family="Georgia,serif" font-size="7" fill="${accent}" font-weight="700">OFFICIAL</text><text text-anchor="middle" y="9" font-family="Georgia,serif" font-size="7" fill="${accent}" font-weight="700">SEAL</text></g>`}
    <line x1="${W * 0.82 - 65}" y1="${H - 90}" x2="${W * 0.82 + 65}" y2="${H - 90}" stroke="#374151" stroke-width="1"/>
    <text x="${W * 0.82}" y="${H - 75}" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#1f2937" font-weight="700">${escape(PREVIEW_VARS.date)}</text>
    <text x="${W * 0.82}" y="${H - 60}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#6b7280">Date Issued · Tutor: ${escape(PREVIEW_VARS.instructorName)}</text>
    <text x="${W / 2}" y="${H - 35}" text-anchor="middle" font-family="'Courier New',monospace" font-size="8" fill="#9ca3af" letter-spacing="1">CERTIFICATE ID: BS-XXXX-XXXX</text>
  </svg>`;
}

export default function AdminCertificateTemplate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  const { data: tpl, isLoading } = useQuery<any>({
    queryKey: ["/api/certificate-template"],
    queryFn: async () => (await fetch("/api/certificate-template")).json(),
  });

  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { if (tpl && !draft) setDraft(tpl); }, [tpl, draft]);

  const saveMutation = useMutation({
    mutationFn: async (updates: any) => (await apiRequest("PATCH", "/api/admin/certificate-template", updates)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-template"] });
      toast({ title: "Template saved", description: "Future certificates will use these settings." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const uploadImage = async (file: File, field: string) => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const data = await res.json();
    setDraft((d: any) => ({ ...d, [field]: data.url }));
  };

  const previewSvg = useMemo(() => draft ? buildPreviewSvg(draft) : "", [draft]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-md mx-auto text-center"><p>Admin access required.</p></div>
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const set = (key: string, val: any) => setDraft((d: any) => ({ ...d, [key]: val }));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="pt-24 max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-violet-600" /> Certificate Template</h1>
            <p className="text-sm text-gray-500">Edit the template once — every issued certificate uses these fields automatically.</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(draft)}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            data-testid="button-save-template"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save template
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Form */}
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <Label className="text-xs">Institution name</Label>
                <Input value={draft.institutionName || ""} onChange={(e) => set("institutionName", e.target.value)} data-testid="input-institution-name" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Headline</Label>
                  <Input value={draft.headlineText || ""} onChange={(e) => set("headlineText", e.target.value)} data-testid="input-headline-text" />
                </div>
                <div>
                  <Label className="text-xs">Border style</Label>
                  <Select value={draft.borderStyle || "classic"} onValueChange={(v) => set("borderStyle", v)}>
                    <SelectTrigger data-testid="select-border-style"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="modern">Modern (thin lines)</SelectItem>
                      <SelectItem value="ornate">Ornate (dotted + corners)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Body text (placeholders: <code>{`{{studentName}}`}</code>, <code>{`{{courseTitle}}`}</code>, <code>{`{{date}}`}</code>, <code>{`{{instructorName}}`}</code>)</Label>
                <Textarea
                  value={draft.bodyTemplate || ""}
                  onChange={(e) => set("bodyTemplate", e.target.value)}
                  className="min-h-[100px] font-mono text-xs"
                  data-testid="input-body-template"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Signatory name</Label>
                  <Input value={draft.signatoryName || ""} onChange={(e) => set("signatoryName", e.target.value)} data-testid="input-signatory-name" />
                </div>
                <div>
                  <Label className="text-xs">Signatory title</Label>
                  <Input value={draft.signatoryTitle || ""} onChange={(e) => set("signatoryTitle", e.target.value)} data-testid="input-signatory-title" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Accent color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={draft.accentColor || "#7c3aed"} onChange={(e) => set("accentColor", e.target.value)} className="w-14 p-1 h-10" data-testid="input-accent-color" />
                    <Input value={draft.accentColor || ""} onChange={(e) => set("accentColor", e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Background color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={draft.bgColor || "#fdfaf6"} onChange={(e) => set("bgColor", e.target.value)} className="w-14 p-1 h-10" data-testid="input-bg-color" />
                    <Input value={draft.bgColor || ""} onChange={(e) => set("bgColor", e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Image fields */}
              {(["institutionLogoUrl", "signatureImageUrl", "sealImageUrl"] as const).map((field) => {
                const labels: Record<string, string> = {
                  institutionLogoUrl: "Institution logo",
                  signatureImageUrl: "Signature image (PNG with transparency works best)",
                  sealImageUrl: "Official seal (optional)",
                };
                return (
                  <div key={field}>
                    <Label className="text-xs">{labels[field]}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={draft[field] || ""}
                        onChange={(e) => set(field, e.target.value)}
                        placeholder="https://… or upload below"
                        data-testid={`input-${field}`}
                      />
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], field)} />
                        <Button asChild type="button" variant="outline"><span><Upload className="h-4 w-4" /></span></Button>
                      </label>
                    </div>
                    {draft[field] && (
                      <img src={draft[field]} alt="" className="h-12 mt-2 rounded border object-contain bg-white p-1" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* RIGHT: Live preview */}
          <Card className="lg:sticky lg:top-24 self-start">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-violet-600" /> Live preview</h3>
                <Link href="/admin/courses">
                  <Button size="sm" variant="ghost" className="text-xs">← Back to courses</Button>
                </Link>
              </div>
              <div className="border rounded-xl overflow-hidden bg-white shadow-inner" dangerouslySetInnerHTML={{ __html: previewSvg }} />
              <p className="text-[10px] text-gray-400 mt-2 text-center">Preview uses placeholder student/course/date/tutor values.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
