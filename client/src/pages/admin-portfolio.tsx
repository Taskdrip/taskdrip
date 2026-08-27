import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type SocialLink = { label: string; url: string };

type PortfolioProfile = {
  contentVersion?: number;
  name: string;
  eyebrow: string;
  headline: string;
  summary: string;
  bio: string;
  location: string;
  email: string;
  portraitUrl: string;
  cvUrl: string;
  socialLinks: SocialLink[];
  skills: string[];
  services: string[];
};

type PortfolioProject = {
  slug: string;
  title: string;
  category: string;
  year: string;
  summary: string;
  description: string;
  role: string;
  technologies: string[];
  outcomes: string[];
  imageUrl: string;
  liveUrl: string;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
};

const EMPTY_PROJECT: PortfolioProject = {
  slug: "",
  title: "",
  category: "Software Product",
  year: new Date().getFullYear().toString(),
  summary: "",
  description: "",
  role: "",
  technologies: [],
  outcomes: [],
  imageUrl: "",
  liveUrl: "",
  featured: false,
  visible: true,
  sortOrder: 1,
};

const DEFAULT_SOCIALS: SocialLink[] = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/taskdrip/" },
  { label: "Instagram", url: "https://www.instagram.com/taskdriper" },
  { label: "TikTok", url: "https://www.tiktok.com/@taskdrip" },
  { label: "X", url: "https://x.com/taskdrip" },
  { label: "YouTube", url: "https://www.youtube.com/@Taskdriper" },
  { label: "Telegram", url: "https://t.me/taskdrip" },
  { label: "WhatsApp chat", url: "https://wa.me/message/CHINRBNHGJNDN1" },
];

function listToText(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function textToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function linesToList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="resize-y border-gray-700 bg-gray-950/70 text-sm text-white placeholder:text-gray-600"
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-gray-700 bg-gray-950/70 text-sm text-white placeholder:text-gray-600"
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
      <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 animate-pulse text-cyan-400" /> Loading portfolio editor…</div>
    </div>
  );
}

export default function AdminPortfolio() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [projectDraft, setProjectDraft] = useState<PortfolioProject>(EMPTY_PROJECT);

  const { data, isLoading, isError } = useQuery<{ profile: PortfolioProfile; projects: PortfolioProject[] }>({
    queryKey: ["/api/admin/abraham-portfolio"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = `/admin-login?redirect=${encodeURIComponent("/admin/portfolio")}`;
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!data) return;
    setProfile({
      ...data.profile,
      socialLinks: Array.isArray(data.profile?.socialLinks) ? data.profile.socialLinks : DEFAULT_SOCIALS,
      skills: Array.isArray(data.profile?.skills) ? data.profile.skills : [],
      services: Array.isArray(data.profile?.services) ? data.profile.services : [],
    });
    setProjects(Array.isArray(data.projects) ? data.projects : []);
  }, [data]);

  const isAdmin = user?.userType === "admin" || ["admin", "content_editor"].includes(user?.role || "");
  const featuredCount = useMemo(() => projects.filter((project) => project.featured && project.visible).length, [projects]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Profile is not loaded");
      const normalizedProjects = projects.map((project, index) => ({
        ...project,
        slug: slugify(project.slug || project.title),
        title: project.title.trim(),
        sortOrder: index + 1,
      }));
      const response = await apiRequest("PUT", "/api/admin/abraham-portfolio", {
        profile: {
          ...profile,
          socialLinks: profile.socialLinks.filter((link) => link.label.trim() && link.url.trim()),
          skills: profile.skills.filter(Boolean),
          services: profile.services.filter(Boolean),
        },
        projects: normalizedProjects,
      });
      return response.json();
    },
    onSuccess: (saved) => {
      setProfile(saved.profile);
      setProjects(saved.projects);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/abraham-portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/abraham-portfolio"] });
      toast({ title: "Portfolio published", description: "Your public portfolio is now up to date." });
    },
    onError: (error: Error) => toast({ title: "Could not save portfolio", description: error.message, variant: "destructive" }),
  });

  function updateProfile<K extends keyof PortfolioProfile>(key: K, value: PortfolioProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  function openNewProject() {
    setEditingIndex(null);
    setProjectDraft({ ...EMPTY_PROJECT, sortOrder: projects.length + 1 });
  }

  function openProject(index: number) {
    setEditingIndex(index);
    setProjectDraft({ ...projects[index], technologies: [...(projects[index].technologies || [])], outcomes: [...(projects[index].outcomes || [])] });
  }

  function saveProjectDraft() {
    const next = { ...projectDraft, slug: slugify(projectDraft.slug || projectDraft.title) };
    if (!next.title.trim() || !next.slug) {
      toast({ title: "Add a project title", description: "A title is used to create the project detail URL.", variant: "destructive" });
      return;
    }
    if (editingIndex === null) setProjects((current) => [...current, next]);
    else setProjects((current) => current.map((project, index) => index === editingIndex ? next : project));
    setEditingIndex(null);
    toast({ title: editingIndex === null ? "Project added" : "Project updated", description: "Save the portfolio to publish this change." });
  }

  function removeProject(index: number) {
    if (!window.confirm(`Remove “${projects[index].title}” from the portfolio?`)) return;
    setProjects((current) => current.filter((_, projectIndex) => projectIndex !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function moveProject(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    setProjects((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  if (authLoading || (isAuthenticated && isLoading)) return <LoadingState />;
  if (!isAuthenticated) return null;
  if (!isAdmin || isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center text-gray-300">
        <div><h1 className="text-xl font-bold text-white">Portfolio editor unavailable</h1><p className="mt-2 text-sm">You need admin access to manage this page.</p><Link href="/admin" className="mt-5 inline-flex text-sm text-cyan-300">Back to dashboard</Link></div>
      </div>
    );
  }
  if (!profile) return <LoadingState />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-xl border border-white/10 p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Admin studio</p><h1 className="text-lg font-black">Abraham Tahbat portfolio</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/abraham-tahbat" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"><Eye className="h-4 w-4" /> Preview</Link>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 bg-cyan-400 font-bold text-gray-950 hover:bg-cyan-300"><Save className="h-4 w-4" />{saveMutation.isPending ? "Publishing…" : "Publish changes"}</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4"><p className="text-2xl font-black">{projects.length}</p><p className="text-xs text-gray-400">Total projects</p></div>
          <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4"><p className="text-2xl font-black">{featuredCount}</p><p className="text-xs text-gray-400">Featured on home</p></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-2xl font-black">{projects.filter((project) => project.visible).length}</p><p className="text-xs text-gray-400">Visible to recruiters</p></div>
        </div>

        <Card className="border-white/10 bg-gray-900">
          <CardHeader><CardTitle>Profile and recruiter details</CardTitle><CardDescription className="text-gray-500">This is the story, contact information, social proof, and CV link visitors see on the public page.</CardDescription></CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <Field label="Display name" value={profile.name} onChange={(value) => updateProfile("name", value)} />
            <Field label="Eyebrow" value={profile.eyebrow} onChange={(value) => updateProfile("eyebrow", value)} placeholder="Founder & CTO · ..." />
            <div className="lg:col-span-2"><Field label="Headline" value={profile.headline} onChange={(value) => updateProfile("headline", value)} /></div>
            <div className="lg:col-span-2"><Field label="Short summary" value={profile.summary} onChange={(value) => updateProfile("summary", value)} multiline rows={3} /></div>
            <div className="lg:col-span-2"><Field label="Bio" value={profile.bio} onChange={(value) => updateProfile("bio", value)} multiline rows={6} /></div>
            <Field label="Location" value={profile.location} onChange={(value) => updateProfile("location", value)} />
            <Field label="Contact email" value={profile.email} onChange={(value) => updateProfile("email", value)} />
            <Field label="Portrait image URL" value={profile.portraitUrl} onChange={(value) => updateProfile("portraitUrl", value)} />
            <Field label="CV / résumé URL" value={profile.cvUrl} onChange={(value) => updateProfile("cvUrl", value)} />
            <Field label="Capabilities (comma separated)" value={listToText(profile.skills)} onChange={(value) => updateProfile("skills", textToList(value))} multiline rows={3} />
            <Field label="Ways I help (comma separated)" value={listToText(profile.services)} onChange={(value) => updateProfile("services", textToList(value))} multiline rows={3} />
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between"><Label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Social handles</Label><Button variant="outline" size="sm" onClick={() => updateProfile("socialLinks", [...profile.socialLinks, { label: "", url: "" }])} className="gap-1 border-gray-700 text-gray-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> Add handle</Button></div>
              {profile.socialLinks.map((link, index) => (
                <div key={`${index}-${link.label}`} className="grid gap-2 sm:grid-cols-[0.35fr_1fr_auto]">
                  <Input value={link.label} onChange={(event) => updateProfile("socialLinks", profile.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Network" className="border-gray-700 bg-gray-950/70 text-white" />
                  <Input value={link.url} onChange={(event) => updateProfile("socialLinks", profile.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://..." className="border-gray-700 bg-gray-950/70 text-white" />
                  <Button variant="ghost" size="icon" onClick={() => updateProfile("socialLinks", profile.socialLinks.filter((_, itemIndex) => itemIndex !== index))} className="text-gray-500 hover:bg-red-500/10 hover:text-red-300"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-7 xl:grid-cols-[1fr_0.9fr]">
          <Card className="border-white/10 bg-gray-900">
            <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Projects ({projects.length})</CardTitle><CardDescription className="text-gray-500">Reorder, feature, hide, edit, or remove case studies.</CardDescription></div><Button onClick={openNewProject} className="shrink-0 gap-2 bg-purple-600 hover:bg-purple-500"><Plus className="h-4 w-4" /> Add project</Button></CardHeader>
            <CardContent className="space-y-3">
              {projects.map((project, index) => (
                <div key={`${project.slug}-${index}`} className={`rounded-2xl border p-4 transition ${project.visible ? "border-white/10 bg-gray-950/50" : "border-gray-800 bg-gray-950/20 opacity-60"}`}>
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-1 h-5 w-5 shrink-0 text-gray-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{project.title || "Untitled project"}</h3><span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">{project.category}</span>{project.featured && <span className="rounded-full bg-purple-400/10 px-2 py-1 text-[10px] font-bold text-purple-300">Featured</span>}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{project.summary || "Add a short project summary."}</p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-gray-600"><span>{project.year}</span>{project.liveUrl && <><span>·</span><span className="truncate">{project.liveUrl}</span></>}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => moveProject(index, -1)} disabled={index === 0} className="text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Move project up">↑</Button>
                      <Button variant="ghost" size="icon" onClick={() => moveProject(index, 1)} disabled={index === projects.length - 1} className="text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Move project down">↓</Button>
                      <Button variant="ghost" size="icon" onClick={() => openProject(index)} className="text-cyan-300 hover:bg-cyan-400/10" aria-label={`Edit ${project.title}`}><ExternalLink className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeProject(index)} className="text-gray-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${project.title}`}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="h-fit border-cyan-400/20 bg-cyan-400/[0.03]">
            <CardHeader><CardTitle>{editingIndex === null ? "Add a project" : "Edit project"}</CardTitle><CardDescription className="text-gray-500">Every project gets its own detailed case-study page.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Title" value={projectDraft.title} onChange={(value) => setProjectDraft((current) => ({ ...current, title: value, slug: current.slug || slugify(value) }))} /><Field label="Slug" value={projectDraft.slug} onChange={(value) => setProjectDraft((current) => ({ ...current, slug: value }))} placeholder="my-project" /></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Category" value={projectDraft.category} onChange={(value) => setProjectDraft((current) => ({ ...current, category: value }))} /><Field label="Year" value={projectDraft.year} onChange={(value) => setProjectDraft((current) => ({ ...current, year: value }))} /></div>
              <Field label="Summary" value={projectDraft.summary} onChange={(value) => setProjectDraft((current) => ({ ...current, summary: value }))} multiline rows={3} />
              <Field label="Detailed description" value={projectDraft.description} onChange={(value) => setProjectDraft((current) => ({ ...current, description: value }))} multiline rows={5} />
              <Field label="My role" value={projectDraft.role} onChange={(value) => setProjectDraft((current) => ({ ...current, role: value }))} />
              <Field label="Technologies (comma separated)" value={listToText(projectDraft.technologies)} onChange={(value) => setProjectDraft((current) => ({ ...current, technologies: textToList(value) }))} multiline rows={2} />
              <Field label="Outcomes (one per line)" value={(projectDraft.outcomes || []).join("\n")} onChange={(value) => setProjectDraft((current) => ({ ...current, outcomes: linesToList(value) }))} multiline rows={4} />
              <Field label="Project image URL" value={projectDraft.imageUrl} onChange={(value) => setProjectDraft((current) => ({ ...current, imageUrl: value }))} placeholder="https://..." />
              <Field label="Live / shop link" value={projectDraft.liveUrl} onChange={(value) => setProjectDraft((current) => ({ ...current, liveUrl: value }))} placeholder="https://... or /shop/product/..." />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/50 px-3 py-3 text-sm text-gray-300">Featured on home <Switch checked={projectDraft.featured} onCheckedChange={(checked) => setProjectDraft((current) => ({ ...current, featured: checked }))} /></label>
                <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/50 px-3 py-3 text-sm text-gray-300">{projectDraft.visible ? <><Eye className="mr-2 h-4 w-4 text-emerald-300" /> Visible</> : <><EyeOff className="mr-2 h-4 w-4 text-gray-500" /> Hidden</>} <Switch checked={projectDraft.visible} onCheckedChange={(checked) => setProjectDraft((current) => ({ ...current, visible: checked }))} /></label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4"><Button variant="ghost" onClick={() => setEditingIndex(null)} className="text-gray-400 hover:bg-white/5 hover:text-white">Clear</Button><Button onClick={saveProjectDraft} className="gap-2 bg-cyan-400 font-bold text-gray-950 hover:bg-cyan-300"><Save className="h-4 w-4" /> {editingIndex === null ? "Add to list" : "Update project"}</Button></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gray-900/60 px-5 py-4 text-sm text-gray-400">
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-cyan-300" /> Recruiters can view the CV inline at the public URL.</span>
          <Link href="/abraham-tahbat#cv" target="_blank" className="inline-flex items-center gap-2 font-semibold text-cyan-300 hover:text-cyan-200">Preview CV section <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </main>
    </div>
  );
}