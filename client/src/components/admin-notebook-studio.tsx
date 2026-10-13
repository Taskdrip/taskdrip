import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileCog,
  FileText,
  LoaderCircle,
  Maximize2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  currentNotebookDiaryStartMonth,
  notebookDiaryPageCount,
  notebookDiaryPageDate,
} from "@shared/notebook-studio";
import NotebookKdpListingGuide from "./notebook-kdp-listing-guide";

type NotebookSettings = {
  subtitle: string;
  authorName: string;
  seriesName: string;
  pageCount: number;
  trimSize: string;
  customWidth: number | string;
  customHeight: number | string;
  binding: string;
  ink: string;
  paper: string;
  bleed: boolean;
  lineStyle: string;
  diaryStartMonth: string;
  lineSpacing: number | string;
  lineColor: string;
  lineThickness: number | string;
  showPageNumbers: boolean;
  ownershipPage: boolean;
  showDateField: boolean;
  showSubjectField: boolean;
  headerText: string;
  footerText: string;
};

type CoverDesign = {
  style: string;
  background: string;
  accent: string;
  description: string;
  backDescription: string;
  frontImageUrl?: string;
};

type ValidationResult = Record<string, unknown> | null;
type NotebookProject = {
  id: string;
  title: string;
  settings: NotebookSettings;
  coverDesign: CoverDesign;
  status: string;
  generatedInteriorKey?: string | null;
  generatedCoverKey?: string | null;
  validation?: ValidationResult;
  updatedAt?: string | null;
};

const API = "/api/admin/creator-studio/notebooks";
const PAPER = "#f5f0e6";
const DEFAULT_SETTINGS: NotebookSettings = {
  subtitle: "",
  authorName: "",
  seriesName: "",
  pageCount: 160,
  trimSize: "6x9",
  customWidth: 6,
  customHeight: 9,
  binding: "paperback",
  ink: "black",
  paper: "cream",
  bleed: false,
  lineStyle: "classic",
  diaryStartMonth: "",
  lineSpacing: 0.28,
  lineColor: "#c9d0c8",
  lineThickness: 0.6,
  showPageNumbers: true,
  ownershipPage: true,
  showDateField: false,
  showSubjectField: false,
  headerText: "",
  footerText: "",
};
const DEFAULT_COVER: CoverDesign = {
  style: "minimal",
  background: "#e7e2d4",
  accent: "#315a51",
  description: "",
  backDescription: "",
  frontImageUrl: "",
};
const TRIM_SIZES = [
  ["6x9", "6 × 9 in · Trade"],
  ["5.5x8.5", "5.5 × 8.5 in · Digest"],
  ["5x8", "5 × 8 in · Pocket"],
  ["8.27x11.69", "8.27 × 11.69 in · A4"],
  ["custom", "Custom dimensions"],
];
const LINE_STYLES = [
  ["lined-journal", "Lined journal"],
  ["diary", "Diary / calendar · dated daily pages"],
  ["classic", "Classic ruled"],
  ["wide", "Wide ruled"],
  ["college", "College ruled"],
  ["minimalist", "Minimalist"],
  ["business", "Business"],
  ["daily", "Daily planner"],
  ["meeting", "Meeting notes"],
  ["study", "Study notes"],
  ["dot", "Dot grid"],
  ["graph", "Graph"],
  ["premium", "Premium"],
  ["custom", "Custom"],
];
const COVER_STYLES = ["minimal", "botanical", "geometric", "technology", "business", "space", "education", "luxury", "colorful"];
const COVER_PALETTE = [
  { label: "Moss", background: "#e7e2d4", accent: "#315a51" },
  { label: "Terracotta", background: "#f0dfd0", accent: "#a34e36" },
  { label: "Ink", background: "#263b46", accent: "#d8bd82" },
  { label: "Orchid", background: "#e8dfec", accent: "#78576f" },
  { label: "Cornflower", background: "#dce5e9", accent: "#416477" },
];

function normalizeProject(project: NotebookProject): NotebookProject {
  return {
    ...project,
    title: project.title || "",
    settings: { ...DEFAULT_SETTINGS, ...(project.settings || {}) },
    coverDesign: { ...DEFAULT_COVER, ...(project.coverDesign || {}) },
  };
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const error = await response.json();
      if (typeof error?.message === "string") message = error.message;
    } catch {
      // Use the endpoint's generic error when the response isn't JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function projectUrl(id: string) {
  return `${API}/${encodeURIComponent(id)}`;
}

function formatDate(date?: string | null) {
  if (!date) return "Not updated yet";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "Not updated yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function toSafeNumber(value: number | string, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] || character);
}

function coverSvg(project: NotebookProject) {
  const { title, settings, coverDesign } = project;
  const bg = /^#[0-9a-f]{6}$/i.test(coverDesign.background) ? coverDesign.background : DEFAULT_COVER.background;
  const accent = /^#[0-9a-f]{6}$/i.test(coverDesign.accent) ? coverDesign.accent : DEFAULT_COVER.accent;
  const displayTitle = escapeXml(title || "Untitled notebook");
  const subtitle = escapeXml(settings.subtitle || "");
  const author = escapeXml(settings.authorName || "");
  const desc = escapeXml(coverDesign.description || "");
  const style = coverDesign.style;
  let motif = "";
  if (style === "botanical") {
    motif = `<path d="M600 290 C530 365 535 485 600 555 C665 485 670 365 600 290Z" fill="none" stroke="${accent}" stroke-width="5"/><path d="M600 548 C595 440 570 378 530 342 M602 486 C633 448 653 415 666 375" fill="none" stroke="${accent}" stroke-width="4"/><ellipse cx="547" cy="367" rx="31" ry="13" transform="rotate(36 547 367)" fill="${accent}" opacity=".62"/><ellipse cx="651" cy="420" rx="30" ry="13" transform="rotate(-44 651 420)" fill="${accent}" opacity=".62"/>`;
  } else if (style === "geometric" || style === "technology") {
    motif = `<circle cx="600" cy="415" r="104" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="600" cy="415" r="74" fill="none" stroke="${accent}" stroke-width="2" opacity=".6"/><path d="M600 292V538M477 415H723M513 328L687 502M687 328L513 502" stroke="${accent}" stroke-width="2" opacity=".55"/><circle cx="600" cy="415" r="9" fill="${accent}"/>`;
  } else if (style === "space") {
    motif = `<ellipse cx="600" cy="415" rx="118" ry="42" transform="rotate(-28 600 415)" fill="none" stroke="${accent}" stroke-width="3"/><ellipse cx="600" cy="415" rx="80" ry="25" transform="rotate(24 600 415)" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="600" cy="415" r="20" fill="${accent}"/><circle cx="696" cy="368" r="7" fill="${accent}"/>`;
  } else if (style === "business" || style === "education") {
    motif = `<path d="M480 482H720M500 450H700M520 418H680M540 386H660M560 354H640" stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity=".78"/>`;
  } else if (style === "luxury") {
    motif = `<rect x="470" y="300" width="260" height="230" rx="130" fill="none" stroke="${accent}" stroke-width="3"/><path d="M500 415H700M600 315V515" stroke="${accent}" stroke-width="1" opacity=".6"/>`;
  } else if (style === "colorful") {
    motif = `<circle cx="540" cy="400" r="65" fill="${accent}" opacity=".82"/><circle cx="630" cy="400" r="65" fill="${accent}" opacity=".48"/><circle cx="585" cy="475" r="65" fill="${accent}" opacity=".64"/>`;
  }
  const imageMarkup = coverDesign.frontImageUrl
    ? `<image href="${escapeXml(coverDesign.frontImageUrl)}" x="240" y="210" width="720" height="440" preserveAspectRatio="xMidYMid slice" opacity=".82"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800"><rect width="1200" height="1800" fill="${bg}"/><rect x="64" y="64" width="1072" height="1672" rx="8" fill="none" stroke="${accent}" stroke-width="3" opacity=".68"/><path d="M104 120H1096" stroke="${accent}" stroke-width="2" opacity=".5"/><text x="600" y="174" text-anchor="middle" fill="${accent}" font-family="Georgia,serif" font-size="24" letter-spacing="8">${escapeXml(settings.seriesName || "FIELD NOTES")}</text>${imageMarkup}<g>${motif}</g><text x="600" y="815" text-anchor="middle" fill="${accent}" font-family="Georgia,serif" font-size="66" font-weight="600">${displayTitle}</text>${subtitle ? `<text x="600" y="900" text-anchor="middle" fill="${accent}" opacity=".8" font-family="sans-serif" font-size="28">${subtitle}</text>` : ""}<path d="M520 1030H680" stroke="${accent}" stroke-width="3" opacity=".7"/><text x="600" y="1590" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="26" letter-spacing="4">${author.toUpperCase()}</text><text x="600" y="1645" text-anchor="middle" fill="${accent}" opacity=".68" font-family="sans-serif" font-size="15" letter-spacing="2">${desc}</text></svg>`;
}

function IconButton({ label, onClick, children, disabled = false, tone = "quiet" }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "quiet" | "danger";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "border-transparent text-[#a1483b] hover:border-[#edd4cc] hover:bg-[#fff4ef]"
          : "border-transparent text-[#62675d] hover:border-[#d8d4c8] hover:bg-[#f0ede4] hover:text-[#294b42]"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className="mb-1.5 block text-[11px] font-semibold tracking-[.01em] text-[#595b52]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] leading-4 text-[#858477]">{hint}</p>}
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-[#d9d4c8] bg-[#fffdf8] px-3 text-[13px] text-[#30372f] outline-none transition focus:border-[#597c67] focus:ring-2 focus:ring-[#597c67]/15";
const selectClass = `${inputClass} cursor-pointer`;
const textareaClass = "min-h-[92px] w-full resize-y rounded-xl border border-[#d9d4c8] bg-[#fffdf8] px-3 py-2.5 text-[13px] leading-5 text-[#30372f] outline-none transition focus:border-[#597c67] focus:ring-2 focus:ring-[#597c67]/15";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#315a51] px-4 text-[13px] font-semibold text-[#fbf8ef] shadow-sm transition hover:bg-[#26483f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75947e] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d8d4c8] bg-[#fffdf8] px-3.5 text-[13px] font-semibold text-[#42473f] transition hover:border-[#bdb9ab] hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75947e] disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminNotebookStudio() {
  const [projects, setProjects] = useState<NotebookProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NotebookProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<"interior" | "cover" | "validation" | "kdp">("interior");
  const [listSearch, setListSearch] = useState("");
  const [listCollapsed, setListCollapsed] = useState(false);
  const [zoom, setZoom] = useState(82);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState("1");
  const [spread, setSpread] = useState(false);
  const [remoteSvgUrl, setRemoteSvgUrl] = useState("");
  const [remoteSvgError, setRemoteSvgError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeProject = useMemo(() => projects.find((project) => project.id === activeId) || null, [projects, activeId]);
  const pageCount = Math.max(1, Number(draft?.settings.pageCount) || 160);
  const filteredProjects = useMemo(() => {
    const needle = listSearch.trim().toLowerCase();
    return needle ? projects.filter((project) => project.title.toLowerCase().includes(needle)) : projects;
  }, [projects, listSearch]);
  const dirty = !!draft && !!activeProject && JSON.stringify(draft) !== JSON.stringify(activeProject);

  const refreshProjects = useCallback(async (selectId?: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await requestJson<NotebookProject[]>(API);
      const next = Array.isArray(result) ? result.map(normalizeProject) : [];
      setProjects(next);
      const currentId = activeIdRef.current;
      const nextId = selectId || (currentId && next.some((item) => item.id === currentId) ? currentId : next[0]?.id || null);
      setActiveId(nextId);
      const selected = next.find((item) => item.id === nextId) || null;
      setDraft(selected ? normalizeProject(selected) : null);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    setDraft(activeProject ? normalizeProject(activeProject) : null);
    setPage(1);
    setJumpValue("1");
    setRemoteSvgUrl("");
    setRemoteSvgError("");
  }, [activeProject]);

  const updateDraft = (transform: (project: NotebookProject) => NotebookProject) => {
    setDraft((current) => current ? transform(current) : current);
  };
  const updateSettings = <K extends keyof NotebookSettings>(key: K, value: NotebookSettings[K]) => {
    updateDraft((project) => ({ ...project, settings: { ...project.settings, [key]: value } }));
  };
  const setPageLayout = (value: string) => {
    if (value !== "diary") {
      updateSettings("lineStyle", value);
      return;
    }
    const startMonth = currentNotebookDiaryStartMonth();
    const pageCount = notebookDiaryPageCount(startMonth);
    updateDraft((project) => ({
      ...project,
      settings: {
        ...project.settings,
        lineStyle: "diary",
        diaryStartMonth: startMonth,
        pageCount,
        ownershipPage: false,
      },
    }));
    setPage(1);
    setJumpValue("1");
  };
  const updateCover = <K extends keyof CoverDesign>(key: K, value: CoverDesign[K]) => {
    updateDraft((project) => ({ ...project, coverDesign: { ...project.coverDesign, [key]: value } }));
  };
  const report = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice((current) => current?.text === text ? null : current), 5200);
  };
  const activate = (project: NotebookProject) => {
    setActiveId(project.id);
    setDraft(normalizeProject(project));
    setTab("interior");
    setNotice(null);
    setBusy(`project:${project.id}`);
    void requestJson<NotebookProject>(projectUrl(project.id))
      .then((latest) => {
        const normalized = normalizeProject(latest);
        setProjects((current) => current.map((item) => item.id === normalized.id ? normalized : item));
        setDraft((current) => current?.id === normalized.id ? normalized : current);
      })
      .catch((error) => report("error", (error as Error).message))
      .finally(() => setBusy((current) => current === `project:${project.id}` ? "" : current));
  };

  const createProject = async () => {
    setBusy("create");
    try {
      const created = normalizeProject(await requestJson<NotebookProject>(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled notebook",
          settings: DEFAULT_SETTINGS,
          coverDesign: DEFAULT_COVER,
        }),
      }));
      setProjects((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setActiveId(created.id);
      setDraft(created);
      setTab("interior");
      report("success", "Notebook draft created.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const saveProject = async () => {
    if (!draft) return;
    setBusy("save");
    try {
      const saved = normalizeProject(await requestJson<NotebookProject>(projectUrl(draft.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          settings: draft.settings,
          coverDesign: draft.coverDesign,
        }),
      }));
      setProjects((current) => current.map((item) => item.id === saved.id ? saved : item));
      setDraft(saved);
      report("success", "Notebook changes saved.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const duplicateProject = async (project: NotebookProject) => {
    setBusy(`duplicate:${project.id}`);
    try {
      const copy = normalizeProject(await requestJson<NotebookProject>(`${projectUrl(project.id)}/duplicate`, { method: "POST" }));
      setProjects((current) => [copy, ...current]);
      setActiveId(copy.id);
      setDraft(copy);
      report("success", "Notebook duplicated.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const deleteProject = async (project: NotebookProject) => {
    if (!window.confirm(`Delete “${project.title || "Untitled notebook"}”? This cannot be undone.`)) return;
    setBusy(`delete:${project.id}`);
    try {
      await requestJson<{ success: true }>(projectUrl(project.id), { method: "DELETE" });
      const remaining = projects.filter((item) => item.id !== project.id);
      setProjects(remaining);
      if (activeId === project.id) {
        const next = remaining[0] || null;
        setActiveId(next?.id || null);
        setDraft(next ? normalizeProject(next) : null);
      }
      report("success", "Notebook deleted.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const generateProject = async () => {
    if (!draft) return;
    setBusy("generate");
    try {
      let target = draft;
      if (dirty) {
        target = normalizeProject(await requestJson<NotebookProject>(projectUrl(draft.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: draft.title, settings: draft.settings, coverDesign: draft.coverDesign }),
        }));
        setProjects((current) => current.map((item) => item.id === target.id ? target : item));
        setDraft(target);
      }
      const response = await requestJson<{ project: NotebookProject; validation: ValidationResult }>(`${projectUrl(target.id)}/generate`, { method: "POST" });
      const updated = normalizeProject({ ...response.project, validation: response.validation });
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      setDraft(updated);
      setTab("validation");
      report("success", "Interior and cover generation finished. Review validation before delivery.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const validateProject = async () => {
    if (!draft) return;
    setBusy("validate");
    try {
      let target = draft;
      if (dirty) {
        target = normalizeProject(await requestJson<NotebookProject>(projectUrl(draft.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: draft.title, settings: draft.settings, coverDesign: draft.coverDesign }),
        }));
        setProjects((current) => current.map((item) => item.id === target.id ? target : item));
        setDraft(target);
      }
      const result = await requestJson<{ validation: ValidationResult }>(`${projectUrl(target.id)}/validate`, { method: "POST" });
      const updated = { ...target, validation: result.validation };
      setDraft(updated);
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      report("success", "Validation refreshed.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const fetchFile = async (kind: "interior" | "cover" | "config" | "preview.svg", mode: "download" | "open" = "download") => {
    if (!draft) return;
    const url = `${projectUrl(draft.id)}/files/${kind}`;
    const popup = mode === "open" ? window.open("", "_blank", "noopener,noreferrer") : null;
    setBusy(`file:${kind}`);
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        let message = "The file could not be prepared.";
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch { /* Response wasn't JSON. */ }
        throw new Error(message);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (mode === "open") {
        if (popup) popup.location.href = objectUrl;
        else window.open(objectUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        const disposition = response.headers.get("Content-Disposition") || "";
        const filename = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1]?.replace(/"/g, "");
        const fallback = `${draft.title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "notebook"}-${kind.replace(".", "-")}.${kind === "interior" || kind === "cover" ? "pdf" : kind === "config" ? "json" : "svg"}`;
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename ? decodeURIComponent(filename) : fallback;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      }
      if (kind === "preview.svg" && mode === "open") {
        setRemoteSvgUrl(objectUrl);
        setRemoteSvgError("");
      }
    } catch (error) {
      popup?.close();
      if (kind === "preview.svg") setRemoteSvgError((error as Error).message);
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const exportCoverPng = async () => {
    if (!draft) return;
    setBusy("png");
    try {
      const svg = coverSvg(draft);
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Cover preview could not be rendered as an image."));
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1800;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser cannot prepare the PNG.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG export failed.")), "image/png"));
        const downloadUrl = URL.createObjectURL(png);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = `${draft.title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "notebook"}-front-preview.png`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      report("success", "Front preview PNG exported.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const loadSvgPreview = async () => {
    if (!draft) return;
    setBusy("file:preview.svg");
    setRemoteSvgError("");
    try {
      const response = await fetch(`${projectUrl(draft.id)}/files/preview.svg`, { credentials: "include" });
      if (!response.ok) {
        let message = "The generated SVG preview is not available.";
        try { message = (await response.json()).message || message; } catch { /* Keep generic message. */ }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setRemoteSvgUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } catch (error) {
      setRemoteSvgError((error as Error).message);
    } finally {
      setBusy("");
    }
  };

  useEffect(() => () => {
    if (remoteSvgUrl) URL.revokeObjectURL(remoteSvgUrl);
  }, [remoteSvgUrl]);

  const setPageNumber = (next: number) => {
    const clamped = Math.min(pageCount, Math.max(1, Math.round(next)));
    setPage(clamped);
    setJumpValue(String(clamped));
  };
  const setTrimPreset = (value: string) => {
    updateSettings("trimSize", value);
    const match = value.match(/^([\d.]+)x([\d.]+)$/);
    if (match) {
      updateDraft((project) => ({
        ...project,
        settings: { ...project.settings, trimSize: value, customWidth: Number(match[1]), customHeight: Number(match[2]) },
      }));
    }
  };
  const pickFrontImage = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      report("error", "Choose a PNG or JPEG cover image.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      report("error", "Cover images must be 25 MB or smaller.");
      return;
    }
    setBusy("upload");
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result?.url !== "string") {
        throw new Error(result?.message || "The cover image could not be uploaded.");
      }
      updateCover("frontImageUrl", result.url);
      report("success", "Cover image uploaded. Save the design to keep it with this project.");
    } catch (error) {
      report("error", (error as Error).message);
    } finally {
      setBusy("");
    }
  };

  const validationItems = useMemo(() => {
    if (!draft?.validation || typeof draft.validation !== "object") return [];
    const validation = draft.validation as Record<string, unknown>;
    const entries = Object.entries(validation);
    const nested = validation.items || validation.checks || validation.results || validation.messages;
    if (Array.isArray(nested)) return nested.map((entry, index) => {
      if (typeof entry === "string") return { key: `${index}`, label: entry, state: "info" };
      const item = entry as Record<string, unknown>;
      return {
        key: String(item.id || index),
        label: String(item.message || item.label || item.name || item.detail || "Validation note"),
        state: String(item.status || item.severity || (item.valid === true ? "pass" : item.valid === false ? "warning" : "info")).toLowerCase(),
      };
    });
    return entries
      .filter(([key]) => !["valid", "success", "status", "summary", "manualVerificationRequired"].includes(key))
      .map(([key, value]) => {
        const objectValue = value && typeof value === "object" ? value as Record<string, unknown> : null;
        return {
          key,
          label: String(objectValue?.message || objectValue?.label || objectValue?.detail || (typeof value === "string" ? value : key)),
          state: String(objectValue?.status || objectValue?.severity || (value === true ? "pass" : value === false ? "warning" : "info")).toLowerCase(),
        };
      });
  }, [draft?.validation]);

  const validationSummary = draft?.validation as Record<string, unknown> | undefined;
  const validationPassed = validationSummary?.valid === true
    || validationSummary?.success === true
    || ["passed", "ready", "manual"].includes(String(validationSummary?.status || "").toLowerCase());
  const manualVerification = validationSummary?.manualVerificationRequired === true
    || validationItems.some((item) => /manual|previewer|verify/i.test(item.label));
  const hasInterior = !!draft?.generatedInteriorKey;
  const hasCover = !!draft?.generatedCoverKey;

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#f3efe5] p-4 sm:p-7" aria-label="Loading notebook studio">
        <div className="mx-auto max-w-[1500px] animate-pulse space-y-5">
          <div className="h-28 rounded-[24px] bg-[#e7e1d5]" />
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="h-[600px] rounded-[22px] bg-[#e7e1d5]" />
            <div className="h-[600px] rounded-[22px] bg-[#e7e1d5]" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError && projects.length === 0) {
    return (
      <main className="min-h-[60vh] bg-[#f3efe5] px-4 py-16 text-[#30372f]">
        <section className="mx-auto max-w-xl rounded-[24px] border border-[#e4c7ba] bg-[#fffaf4] p-7 text-center shadow-[0_16px_48px_rgba(63,52,34,.07)]">
          <AlertCircle className="mx-auto h-9 w-9 text-[#a1483b]" />
          <h1 className="mt-4 font-serif text-2xl">Notebook shelf unavailable</h1>
          <p className="mt-2 text-sm text-[#77756a]">{loadError}</p>
          <button type="button" onClick={() => void refreshProjects()} className={`${primaryButton} mt-5`}><RefreshCw size={15} /> Try again</button>
        </section>
      </main>
    );
  }

  const renderInteriorPage = (pageNumber: number) => {
    const style = draft?.settings.lineStyle || "classic";
    const isDot = style === "dot";
    const isGraph = style === "graph";
    const isDiary = style === "diary";
    const spacing = toSafeNumber(draft?.settings.lineSpacing || 0.28, 0.28, 0.12, 0.8);
    const stroke = Math.max(0.5, toSafeNumber(draft?.settings.lineThickness || 0.6, 0.6, 0.1, 2));
    const lineColor = draft?.settings.lineColor || "#c9d0c8";
    const background = draft?.settings.paper === "white" ? "#fffefa" : "#fbf6e9";
    const backgroundStyle = isDiary
      ? {}
      : isDot
      ? { backgroundImage: `radial-gradient(${lineColor} ${stroke}px, transparent ${stroke + 0.35}px)`, backgroundSize: `${spacing * 31}px ${spacing * 31}px` }
      : isGraph
        ? { backgroundImage: `linear-gradient(to right, ${lineColor} ${stroke}px, transparent ${stroke}px), linear-gradient(to bottom, ${lineColor} ${stroke}px, transparent ${stroke}px)`, backgroundSize: `${spacing * 31}px ${spacing * 31}px` }
        : { backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${Math.max(16, spacing * 31 - stroke)}px, ${lineColor} ${Math.max(16, spacing * 31 - stroke)}px, ${lineColor} ${Math.max(16, spacing * 31)}px)` };
    const styleLabel = LINE_STYLES.find(([value]) => value === style)?.[1] || "Ruled";
    const diaryIsoDate = isDiary
      ? notebookDiaryPageDate(draft?.settings.diaryStartMonth || currentNotebookDiaryStartMonth(), pageNumber)
      : null;
    const diaryDate = diaryIsoDate ? new Date(`${diaryIsoDate}T12:00:00.000Z`) : null;
    const diaryWeekday = diaryDate
      ? new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(diaryDate)
      : "";
    const diaryFullDate = diaryDate
      ? new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(diaryDate)
      : "";
    const trim = draft?.settings.trimSize === "custom"
      ? [Number(draft.settings.customWidth), Number(draft.settings.customHeight)]
      : String(draft?.settings.trimSize || "6x9").split("x").map(Number);
    const aspect = trim.length === 2 && trim.every((dimension) => Number.isFinite(dimension) && dimension > 0)
      ? `${trim[0]} / ${trim[1]}`
      : "2 / 3";
    return (
      <article
        key={pageNumber}
        className="relative w-full max-w-[420px] shrink-0 overflow-hidden border border-[#d4cbb9] shadow-[0_24px_58px_rgba(67,57,39,.18),0_3px_8px_rgba(67,57,39,.08)]"
        style={{ aspectRatio: aspect, backgroundColor: background, ...backgroundStyle }}
        aria-label={`Interior page ${pageNumber} preview`}
      >
        <div className="absolute inset-[8%] flex flex-col">
          {isDiary ? (
            <div className="mb-3 border-b border-[#c8c0b0] pb-3">
              <p className="text-[clamp(8px,1.1vw,12px)] font-semibold uppercase tracking-[.13em] text-[#667066]">{diaryWeekday}</p>
              <p className="mt-1 font-serif text-[clamp(14px,2.4vw,23px)] text-[#42564c]">{diaryFullDate}</p>
            </div>
          ) : (draft?.settings.headerText || draft?.settings.showDateField || draft?.settings.showSubjectField) && (
            <div className="flex min-h-[9%] items-end justify-between gap-2 border-b border-[#c8c0b0] pb-2 text-[clamp(7px,1vw,11px)] text-[#667066]">
              <span className="truncate">{draft?.settings.headerText || (draft?.settings.showSubjectField ? "Subject" : "")}</span>
              <span className="shrink-0">{draft?.settings.showDateField ? "Date  __________" : ""}</span>
            </div>
          )}
          {!isDiary && draft?.settings.ownershipPage && pageNumber === 1 ? (
            <div className="flex flex-1 flex-col justify-center text-center">
              <BookOpen className="mx-auto mb-4 h-7 w-7 text-[#587464]" />
              <p className="font-serif text-[clamp(12px,2vw,22px)] text-[#42564c]">This notebook belongs to</p>
              <div className="mx-auto mt-10 w-4/5 border-b border-[#8b9386]" />
            </div>
          ) : (
            isDiary ? (
              <div
                className="min-h-0 flex-1"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${Math.max(16, spacing * 31 - stroke)}px, ${lineColor} ${Math.max(16, spacing * 31 - stroke)}px, ${lineColor} ${Math.max(16, spacing * 31)}px)`,
                }}
                aria-label="Ruled writing lines"
              />
            ) : <div className="flex-1" />
          )}
          <div className="flex items-center justify-between border-t border-[#d7d0c1]/70 pt-2 text-[clamp(7px,.85vw,10px)] text-[#71766c]">
            <span className="max-w-[70%] truncate">{draft?.settings.footerText || styleLabel}</span>
            {draft?.settings.showPageNumbers && <span className="tabular-nums">{pageNumber}</span>}
          </div>
        </div>
        {draft?.settings.bleed && <div className="pointer-events-none absolute inset-[2.5%] border border-dashed border-[#b87958]/55" aria-hidden="true" />}
      </article>
    );
  };

  return (
    <main className="notebook-studio min-h-[100dvh] bg-[#f3efe5] text-[#30372f]" aria-label="Admin notebook studio">
      <style>{`
        .notebook-studio { font-family: ui-sans-serif, system-ui, sans-serif; }
        .notebook-studio button, .notebook-studio input, .notebook-studio select, .notebook-studio textarea { -webkit-tap-highlight-color: transparent; }
        .notebook-studio ::selection { background: #cad8c8; color: #263e35; }
        .notebook-studio .nb-enter { animation: nb-enter .35s ease-out both; }
        @keyframes nb-enter { from { opacity: .25; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .notebook-studio .nb-enter { animation: none; } }
      `}</style>
      <header className="border-b border-[#ddd6c7] bg-[#faf7ef]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[#315a51] text-[#f7f2e7] shadow-[inset_0_1px_0_rgba(255,255,255,.18)]">
              <BookOpen size={21} strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8d7654]">Taskdrip / admin publishing</p>
              <h1 className="truncate font-serif text-[22px] font-semibold tracking-[-.025em] sm:text-[25px]">Notebook studio</h1>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="mr-auto flex items-center gap-2 rounded-full border border-[#dcd6c9] bg-[#f4f0e7] px-3 py-2 text-[11px] font-medium text-[#686a60] sm:mr-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#69896f]" />
              {projects.length} {projects.length === 1 ? "project" : "projects"} on shelf
            </div>
            <button type="button" onClick={() => void refreshProjects(activeId || undefined)} disabled={loading} className={secondaryButton}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => void createProject()} disabled={busy === "create"} className={primaryButton}>
              {busy === "create" ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} New notebook
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {notice && (
          <div role={notice.kind === "error" ? "alert" : "status"} className={`nb-enter mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${notice.kind === "error" ? "border-[#e6c6bb] bg-[#fff5ef] text-[#8c4539]" : "border-[#cbd9ca] bg-[#edf4eb] text-[#365d4a]"}`}>
            {notice.kind === "error" ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}
            <span className="min-w-0 flex-1">{notice.text}</span>
            <button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)} className="rounded-md p-1 opacity-70 hover:opacity-100"><X size={15} /></button>
          </div>
        )}
        {loadError && projects.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#e6c6bb] bg-[#fff5ef] px-4 py-3 text-[13px] text-[#8c4539]" role="alert">
            <span>{loadError}</span><button type="button" onClick={() => void refreshProjects()} className="font-semibold underline underline-offset-2">Retry</button>
          </div>
        )}

        <div className={`grid items-start gap-4 transition-[grid-template-columns] duration-300 lg:gap-5 ${listCollapsed ? "lg:grid-cols-[68px_minmax(0,1fr)]" : "lg:grid-cols-[292px_minmax(0,1fr)]"}`}>
          <aside className="overflow-hidden rounded-[22px] border border-[#ded8ca] bg-[#faf7ef] shadow-[0_10px_34px_rgba(65,55,38,.045)]">
            <div className={`flex items-center justify-between border-b border-[#e5dfd2] px-4 py-4 ${listCollapsed ? "lg:justify-center lg:px-2" : ""}`}>
              {!listCollapsed && <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#927958]">Your shelf</p><h2 className="mt-1 text-sm font-semibold">Notebook projects</h2></div>}
              <button type="button" aria-label={listCollapsed ? "Expand project list" : "Collapse project list"} onClick={() => setListCollapsed((value) => !value)} className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#6c7168] hover:bg-[#f0ece2] lg:flex">
                {listCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </button>
            </div>
            {!listCollapsed && (
              <>
                <div className="border-b border-[#e5dfd2] p-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8d81]" />
                    <input value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder="Find a notebook" aria-label="Find a notebook" className={`${inputClass} h-9 pl-9 text-xs`} />
                  </div>
                </div>
                <div className="max-h-[calc(100dvh-290px)] min-h-[260px] space-y-1.5 overflow-y-auto p-2.5">
                  {loading && projects.length > 0 && <p className="px-2 py-2 text-[11px] text-[#858477]">Refreshing shelf…</p>}
                  {filteredProjects.map((project, index) => {
                    const selected = project.id === activeId;
                    const rowBusy = busy === `delete:${project.id}` || busy === `duplicate:${project.id}`;
                    return (
                      <div key={project.id} className={`group rounded-[15px] border p-2.5 transition-all ${selected ? "border-[#bdd0c3] bg-[#eef3ec] shadow-[0_3px_12px_rgba(55,91,69,.06)]" : "border-transparent hover:border-[#e3ddcf] hover:bg-[#f6f2e9]"}`}>
                        <button type="button" onClick={() => activate(project)} className="flex w-full min-w-0 items-center gap-3 text-left">
                          <div className="relative grid h-[52px] w-[40px] shrink-0 place-items-center overflow-hidden rounded-[4px_7px_7px_4px] border border-black/10 shadow-sm" style={{ background: project.coverDesign?.background || "#e7e2d4" }}>
                            <span className="absolute inset-y-0 left-0 w-[4px] bg-black/10" />
                            <span className="px-1 text-center font-serif text-[7px] font-bold leading-tight" style={{ color: project.coverDesign?.accent || "#315a51" }}>{project.title || "Untitled"}</span>
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[12px] font-semibold ${selected ? "text-[#294b42]" : "text-[#3f443c]"}`}>{project.title || "Untitled notebook"}</span>
                            <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#858477]">
                              <span className={`h-1.5 w-1.5 rounded-full ${project.status === "generated" || project.status === "ready" ? "bg-[#6d9272]" : "bg-[#c89b58]"}`} />
                              <span className="capitalize">{String(project.status || "draft").replace(/[_-]/g, " ")}</span>
                              <span className="text-[#b5ae9e]">·</span>
                              <span>{project.settings?.pageCount || 160} pp</span>
                            </span>
                          </span>
                        </button>
                        {!listCollapsed && (
                          <div className="mt-1 flex items-center justify-between pl-[52px]">
                            <span className="flex items-center gap-1 text-[9px] text-[#9a978b]"><Clock3 size={10} />{formatDate(project.updatedAt)}</span>
                            <div className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                              <IconButton label="Duplicate notebook" onClick={() => void duplicateProject(project)} disabled={rowBusy}><Copy size={14} /></IconButton>
                              <IconButton label="Delete notebook" tone="danger" onClick={() => void deleteProject(project)} disabled={rowBusy}><Trash2 size={14} /></IconButton>
                            </div>
                          </div>
                        )}
                        {listCollapsed && <span className="sr-only">Project {index + 1}</span>}
                      </div>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ece1] text-[#7c806f]"><Search size={18} /></div>
                      <p className="mt-3 text-xs font-semibold text-[#565b52]">{projects.length ? "No matching notebooks" : "A clear shelf"}</p>
                      <p className="mt-1 max-w-[190px] text-[10px] leading-4 text-[#858477]">{projects.length ? "Try another title or clear your search." : "Create a notebook draft to begin setting up its print specifications."}</p>
                      {!projects.length && <button type="button" onClick={() => void createProject()} className="mt-3 text-[11px] font-semibold text-[#315a51] hover:underline">Create notebook</button>}
                    </div>
                  )}
                </div>
              </>
            )}
            {listCollapsed && (
              <div className="hidden flex-col items-center gap-3 py-4 lg:flex">
                {projects.slice(0, 6).map((project) => (
                  <button key={project.id} type="button" onClick={() => activate(project)} title={project.title || "Untitled notebook"} className={`grid h-10 w-8 place-items-center rounded-[3px_6px_6px_3px] border border-black/10 font-serif text-[7px] font-bold shadow-sm ${project.id === activeId ? "ring-2 ring-[#70917b] ring-offset-2 ring-offset-[#faf7ef]" : ""}`} style={{ background: project.coverDesign?.background || "#e7e2d4", color: project.coverDesign?.accent || "#315a51" }}>{project.title.slice(0, 3) || "—"}</button>
                ))}
                <span className="text-[9px] tabular-nums text-[#89877b]">{projects.length} total</span>
              </div>
            )}
          </aside>

          {!draft ? (
            <section className="flex min-h-[620px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#d2cbbb] bg-[#faf7ef] p-8 text-center">
              <div className="relative grid h-20 w-20 place-items-center rounded-[25px] bg-[#e9e6d8] text-[#557365]">
                <BookOpen size={31} strokeWidth={1.5} />
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[#faf7ef] bg-[#b87958] text-white"><Plus size={15} /></span>
              </div>
              <p className="mt-6 text-[9px] font-bold uppercase tracking-[.2em] text-[#927958]">Print starts here</p>
              <h2 className="mt-2 font-serif text-3xl tracking-[-.03em]">Make room for a new idea.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#737469]">Create a notebook project, set its trim and interior rules, then review the generated files and validation notes.</p>
              <button type="button" onClick={() => void createProject()} disabled={busy === "create"} className={`${primaryButton} mt-6`}><Plus size={16} /> Create notebook</button>
            </section>
          ) : (
            <section className="min-w-0 space-y-4 nb-enter">
              <div className="rounded-[22px] border border-[#ded8ca] bg-[#faf7ef] p-4 shadow-[0_10px_34px_rgba(65,55,38,.045)] sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <button type="button" onClick={() => { setActiveId(null); setDraft(null); }} className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#ded8ca] bg-[#fffdf8] text-[#5f675e] transition hover:bg-[#f0ede4] lg:hidden" aria-label="Back to notebook shelf"><ArrowLeft size={16} /></button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#d5dacb] bg-[#f1f2e9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#63745f]">{String(draft.status || "draft").replace(/[_-]/g, " ")}</span>
                        {dirty && <span className="flex items-center gap-1 text-[10px] font-medium text-[#a16d36]"><span className="h-1.5 w-1.5 rounded-full bg-[#c38a49]" />Unsaved changes</span>}
                      </div>
                      <input
                        aria-label="Notebook title"
                        value={draft.title}
                        maxLength={240}
                        onChange={(event) => updateDraft((project) => ({ ...project, title: event.target.value }))}
                        placeholder="Give this notebook a title"
                        className="mt-2 h-10 w-full min-w-0 border-0 bg-transparent p-0 font-serif text-[25px] font-semibold tracking-[-.035em] text-[#30372f] outline-none placeholder:text-[#b4ad9f] focus:ring-0 sm:text-[30px]"
                      />
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#858477]">
                        <span className="flex items-center gap-1"><Clock3 size={11} />Updated {formatDate(draft.updatedAt)}</span>
                        <span>{draft.settings.pageCount} interior pages</span>
                        <span>{draft.settings.trimSize === "custom" ? `${draft.settings.customWidth} × ${draft.settings.customHeight} in` : draft.settings.trimSize} trim</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={() => void saveProject()} disabled={!dirty || busy === "save"} className={secondaryButton}>
                      {busy === "save" ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} Save
                    </button>
                    <button type="button" onClick={() => void validateProject()} disabled={busy === "validate"} className={secondaryButton}>
                      {busy === "validate" ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Validate
                    </button>
                    <button type="button" onClick={() => void generateProject()} disabled={busy === "generate"} className={primaryButton}>
                      {busy === "generate" ? <LoaderCircle size={15} className="animate-spin" /> : <Printer size={15} />} Generate files
                    </button>
                    <div className="relative col-span-2 sm:col-span-1">
                      <details className="group relative">
                        <summary className={`${secondaryButton} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}><MoreHorizontal size={16} /> More <ChevronDown size={13} /></summary>
                        <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-[#ded8ca] bg-[#fffdf8] p-1.5 shadow-[0_12px_36px_rgba(45,41,31,.16)]">
                          <button type="button" onClick={() => void duplicateProject(draft)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-[#f2efe7]"><Copy size={14} /> Duplicate project</button>
                          <button type="button" onClick={() => void deleteProject(draft)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[#a1483b] hover:bg-[#fff3ed]"><Trash2 size={14} /> Delete project</button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`grid items-start gap-4 ${tab === "kdp" ? "" : "2xl:grid-cols-[minmax(310px,.72fr)_minmax(520px,1.28fr)]"}`}>
                <div className="space-y-4">
                  <section className="overflow-hidden rounded-[22px] border border-[#ded8ca] bg-[#faf7ef] shadow-[0_10px_34px_rgba(65,55,38,.045)]">
                    <div className="border-b border-[#e5dfd2] px-4 pt-4 sm:px-5">
                      <p className="text-[9px] font-bold uppercase tracking-[.19em] text-[#927958]">Print specification</p>
                      <div className="mt-3 flex gap-4 overflow-x-auto">
                        {([
                          ["interior", "Interior", FileText],
                          ["cover", "Cover", BookOpen],
                          ["validation", "Validation", FileCheck2],
                          ["kdp", "KDP listing", ClipboardList],
                        ] as const).map(([value, label, Icon]) => (
                          <button key={value} type="button" onClick={() => setTab(value)} className={`relative flex shrink-0 items-center gap-2 pb-3 text-[12px] font-semibold transition-colors ${tab === value ? "text-[#315a51]" : "text-[#828174] hover:text-[#555e53]"}`}>
                            <Icon size={14} />{label}
                            {value === "validation" && validationSummary && <span className={`h-1.5 w-1.5 rounded-full ${validationPassed ? "bg-[#6e9476]" : "bg-[#cb9958]"}`} />}
                            {tab === value && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#557866]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4 p-4 sm:p-5">
                      {tab === "interior" && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[13px] font-semibold text-[#41483e]">Page construction</p>
                            <p className="mt-1 text-[10px] leading-4 text-[#858477]">Choose the physical format and the details that repeat across the printed interior.</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Subtitle"><input value={draft.settings.subtitle} onChange={(event) => updateSettings("subtitle", event.target.value)} className={inputClass} placeholder="Optional subtitle" /></Field>
                            <Field label="Author name"><input value={draft.settings.authorName} onChange={(event) => updateSettings("authorName", event.target.value)} className={inputClass} placeholder="Name on the book" /></Field>
                            <Field label="Series name"><input value={draft.settings.seriesName} onChange={(event) => updateSettings("seriesName", event.target.value)} className={inputClass} placeholder="Optional series" /></Field>
                            <Field
                              label="Interior page count"
                              hint={draft.settings.lineStyle === "diary"
                                ? `${draft.settings.diaryStartMonth}-01 through Dec 31, 2027 · one dated page per day`
                                : "Print page count, excluding the cover."}
                            >
                              <input type="number" min={1} max={828} value={draft.settings.pageCount} disabled={draft.settings.lineStyle === "diary"} onChange={(event) => updateSettings("pageCount", toSafeNumber(event.target.value, 160, 1, 828))} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f0ede4] disabled:text-[#77776b]`} />
                            </Field>
                            <Field label="Trim size">
                              <select value={draft.settings.trimSize} onChange={(event) => setTrimPreset(event.target.value)} className={selectClass}>
                                {TRIM_SIZES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </Field>
                            {draft.settings.trimSize === "custom" && (
                              <div className="grid grid-cols-2 gap-2">
                                <Field label="Width (in)"><input type="number" step=".01" min="3" max="12" value={draft.settings.customWidth} onChange={(event) => updateSettings("customWidth", Number(event.target.value))} className={inputClass} /></Field>
                                <Field label="Height (in)"><input type="number" step=".01" min="3" max="12" value={draft.settings.customHeight} onChange={(event) => updateSettings("customHeight", Number(event.target.value))} className={inputClass} /></Field>
                              </div>
                            )}
                            <Field label="Binding">
                              <select value={draft.settings.binding} onChange={(event) => updateSettings("binding", event.target.value)} className={selectClass}>
                                <option value="paperback">Paperback</option><option value="hardcover">Hardcover</option><option value="spiral">Spiral bound</option>
                              </select>
                            </Field>
                            <Field label="Ink">
                              <select value={draft.settings.ink} onChange={(event) => updateSettings("ink", event.target.value)} className={selectClass}>
                                <option value="black">Black ink</option><option value="color">Color ink</option>
                              </select>
                            </Field>
                            <Field label="Paper">
                              <select value={draft.settings.paper} onChange={(event) => updateSettings("paper", event.target.value)} className={selectClass}>
                                <option value="white">White</option><option value="cream">Cream</option>
                              </select>
                            </Field>
                            <Field label="Page layout">
                              <select value={draft.settings.lineStyle} onChange={(event) => setPageLayout(event.target.value)} className={selectClass}>
                                {LINE_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </Field>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Line spacing (in)">
                              <input type="number" min=".12" max=".8" step=".01" value={draft.settings.lineSpacing} onChange={(event) => updateSettings("lineSpacing", Number(event.target.value))} className={inputClass} />
                            </Field>
                            <Field label="Line thickness">
                              <input type="number" min=".1" max="2" step=".1" value={draft.settings.lineThickness} onChange={(event) => updateSettings("lineThickness", Number(event.target.value))} className={inputClass} />
                            </Field>
                            <Field label="Line color">
                              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#d9d4c8] bg-[#fffdf8] px-2.5">
                                <input aria-label="Line color" type="color" value={draft.settings.lineColor} onChange={(event) => updateSettings("lineColor", event.target.value)} className="h-7 w-8 cursor-pointer rounded-md border-0 bg-transparent" />
                                <span className="text-[11px] uppercase tracking-wide text-[#77776b]">{draft.settings.lineColor}</span>
                              </div>
                            </Field>
                            <Field label="Header text">
                              <input value={draft.settings.headerText} onChange={(event) => updateSettings("headerText", event.target.value)} className={inputClass} placeholder="Optional running header" />
                            </Field>
                            <Field label="Footer text">
                              <input value={draft.settings.footerText} onChange={(event) => updateSettings("footerText", event.target.value)} className={inputClass} placeholder="Optional running footer" />
                            </Field>
                          </div>
                          <div className="grid gap-2 border-t border-[#e7e1d5] pt-3 sm:grid-cols-2">
                            {([
                              ["bleed", "Include bleed guides"],
                              ["showPageNumbers", "Show page numbers"],
                              ["ownershipPage", "Add ownership page"],
                              ["showDateField", "Show date field"],
                              ["showSubjectField", "Show subject field"],
                            ] as const).map(([key, label]) => (
                              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-[11px] text-[#5f6359] hover:bg-[#f2efe7]">
                                <input
                                  type="checkbox"
                                  checked={draft.settings[key]}
                                  disabled={key === "ownershipPage" && draft.settings.lineStyle === "diary"}
                                  onChange={(event) => updateSettings(key, event.target.checked)}
                                  className="h-4 w-4 accent-[#456e5a] disabled:cursor-not-allowed disabled:opacity-50"
                                />{label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {tab === "cover" && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[13px] font-semibold text-[#41483e]">Front cover direction</p>
                            <p className="mt-1 text-[10px] leading-4 text-[#858477]">Set a visual starting point for the generated cover. Review the finished file and all print specifications before use.</p>
                          </div>
                          <Field label="Cover style">
                            <select value={draft.coverDesign.style} onChange={(event) => updateCover("style", event.target.value)} className={selectClass}>
                              {COVER_STYLES.map((style) => <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>)}
                            </select>
                          </Field>
                          <div>
                            <p className="mb-2 text-[11px] font-semibold text-[#595b52]">Cover palette</p>
                            <div className="flex flex-wrap gap-2">
                              {COVER_PALETTE.map((palette) => (
                                <button type="button" key={palette.label} onClick={() => updateDraft((project) => ({ ...project, coverDesign: { ...project.coverDesign, background: palette.background, accent: palette.accent } }))} className={`group flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] transition ${draft.coverDesign.background === palette.background && draft.coverDesign.accent === palette.accent ? "border-[#6f927a] bg-[#edf2e9] text-[#3e6350]" : "border-[#e1dbcf] bg-[#fffdf8] text-[#696b60] hover:border-[#b9c5b6]"}`}>
                                  <span className="flex -space-x-1"><span className="h-3.5 w-3.5 rounded-full border border-white/80" style={{ backgroundColor: palette.background }} /><span className="h-3.5 w-3.5 rounded-full border border-white/80" style={{ backgroundColor: palette.accent }} /></span>{palette.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Background color">
                              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#d9d4c8] bg-[#fffdf8] px-2.5"><input aria-label="Cover background color" type="color" value={draft.coverDesign.background} onChange={(event) => updateCover("background", event.target.value)} className="h-7 w-8 cursor-pointer rounded-md border-0 bg-transparent" /><span className="text-[11px] uppercase text-[#77776b]">{draft.coverDesign.background}</span></div>
                            </Field>
                            <Field label="Accent color">
                              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#d9d4c8] bg-[#fffdf8] px-2.5"><input aria-label="Cover accent color" type="color" value={draft.coverDesign.accent} onChange={(event) => updateCover("accent", event.target.value)} className="h-7 w-8 cursor-pointer rounded-md border-0 bg-transparent" /><span className="text-[11px] uppercase text-[#77776b]">{draft.coverDesign.accent}</span></div>
                            </Field>
                          </div>
                          <Field label="Front-cover design description" hint="A short visual brief for the selected original vector theme.">
                            <textarea value={draft.coverDesign.description} onChange={(event) => updateCover("description", event.target.value)} className={textareaClass} placeholder="Describe the mood, motif, or visual detail to carry through." />
                          </Field>
                          <Field label="Back-cover description" hint="Optional copy on the back; the lower-right barcode area stays clear.">
                            <textarea value={draft.coverDesign.backDescription || ""} onChange={(event) => updateCover("backDescription", event.target.value)} className={textareaClass} placeholder="Add a short blurb or leave blank." maxLength={1200} />
                          </Field>
                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold text-[#595b52]">Optional uploaded front-cover image</p>
                            <div className="flex gap-2">
                              <span className={`${inputClass} min-w-0 flex-1 truncate`} title={draft.coverDesign.frontImageUrl || ""}>{draft.coverDesign.frontImageUrl || "No image uploaded"}</span>
                              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy === "upload"} className={secondaryButton} aria-label="Choose front cover image">{busy === "upload" ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}<span className="hidden sm:inline">{busy === "upload" ? "Uploading…" : "Choose"}</span></button>
                              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { void pickFrontImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                            </div>
                            <p className="mt-1.5 text-[10px] leading-4 text-[#858477]">PNG or JPEG, up to 25 MB. Use your own uploaded art; AI image generation is not configured here.</p>
                            {draft.coverDesign.frontImageUrl && <button type="button" onClick={() => updateCover("frontImageUrl", "")} className="mt-2 text-[10px] font-semibold text-[#9a5546] hover:underline">Remove image</button>}
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-[#e7e1d5] pt-3">
                            <button type="button" onClick={() => void saveProject()} disabled={!dirty || busy === "save"} className={secondaryButton}><Save size={15} /> Save cover design</button>
                            <button type="button" onClick={() => void exportCoverPng()} disabled={busy === "png"} className={primaryButton}>{busy === "png" ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />} Export front PNG</button>
                          </div>
                        </div>
                      )}

                      {tab === "validation" && (
                        <div className="space-y-4">
                          <div className={`rounded-[16px] border p-4 ${validationSummary ? validationPassed ? "border-[#cbd9ca] bg-[#eff4eb]" : "border-[#e5d6b9] bg-[#fbf4e5]" : "border-[#ddd8cb] bg-[#f4f1e8]"}`}>
                            <div className="flex items-start gap-3">
                              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${validationSummary ? validationPassed ? "bg-[#dae8d8] text-[#42644a]" : "bg-[#efe1bf] text-[#886b34]" : "bg-[#e9e6dc] text-[#727668]"}`}>
                                {validationSummary ? validationPassed ? <Check size={18} /> : <CircleHelp size={18} /> : <FileCog size={18} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold">{validationSummary ? validationPassed ? "Validation passed" : "Review the validation notes" : "No validation report yet"}</p>
                                <p className="mt-1 text-[10px] leading-4 text-[#737469]">{validationSummary ? String(validationSummary.summary || validationSummary.message || "Review every reported item before preparing files for print.") : "Run validation to check the current notebook project against available print rules."}</p>
                              </div>
                            </div>
                          </div>
                          {manualVerification && (
                            <div className="flex gap-2.5 rounded-xl border border-[#e6c7aa] bg-[#fff6ea] p-3 text-[11px] leading-5 text-[#825a36]">
                              <CircleHelp size={16} className="mt-0.5 shrink-0" />
                              <p>Manual verification is still required. Do not treat this result as print-service approval; review the actual files in the chosen printer’s preview workflow.</p>
                            </div>
                          )}
                          {validationSummary && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-[#e4dfd3] bg-[#fffdf8] p-3"><p className="text-[9px] uppercase tracking-[.13em] text-[#8b897c]">Interior file</p><p className="mt-1 text-[11px] font-semibold">{hasInterior ? "Generated" : "Not generated"}</p></div>
                              <div className="rounded-xl border border-[#e4dfd3] bg-[#fffdf8] p-3"><p className="text-[9px] uppercase tracking-[.13em] text-[#8b897c]">Cover file</p><p className="mt-1 text-[11px] font-semibold">{hasCover ? "Generated" : "Not generated"}</p></div>
                              <div className="rounded-xl border border-[#e4dfd3] bg-[#fffdf8] p-3"><p className="text-[9px] uppercase tracking-[.13em] text-[#8b897c]">Page count</p><p className="mt-1 text-[11px] font-semibold">{draft.settings.pageCount} pages</p></div>
                            </div>
                          )}
                          {validationItems.length > 0 ? (
                            <div className="divide-y divide-[#e8e2d6] rounded-xl border border-[#e4dfd3] bg-[#fffdf8]">
                              {validationItems.map((item) => {
                                const pass = ["pass", "passed", "ok", "success", "valid", "ready"].includes(item.state);
                                const bad = ["error", "failed", "invalid", "fail"].includes(item.state);
                                return <div key={item.key} className="flex items-start gap-2.5 px-3.5 py-3 text-[11px] leading-5">
                                  <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full ${pass ? "bg-[#dce9da] text-[#4c714f]" : bad ? "bg-[#f3ddd4] text-[#a25043]" : "bg-[#efe7d3] text-[#987c49]"}`}>{pass ? <Check size={10} /> : bad ? <X size={10} /> : <CircleHelp size={10} />}</span>
                                  <span className="text-[#5e6259]">{item.label}</span>
                                </div>;
                              })}
                            </div>
                          ) : validationSummary ? (
                            <p className="rounded-xl border border-[#e4dfd3] bg-[#fffdf8] px-4 py-3 text-[11px] leading-5 text-[#77776b]">The endpoint returned a validation result without individual notes.</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 border-t border-[#e7e1d5] pt-3">
                            <button type="button" onClick={() => void validateProject()} disabled={busy === "validate"} className={primaryButton}>{busy === "validate" ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Run validation</button>
                            <button type="button" onClick={() => void generateProject()} disabled={busy === "generate"} className={secondaryButton}><Printer size={15} /> Generate files</button>
                          </div>
                        </div>
                      )}

                      {tab === "kdp" && <NotebookKdpListingGuide title={draft.title} settings={draft.settings} />}
                    </div>
                  </section>

                  {tab === "interior" && (
                    <section className="rounded-[22px] border border-[#ded8ca] bg-[#faf7ef] p-4 shadow-[0_10px_34px_rgba(65,55,38,.045)] sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#927958]">Project files</p>
                          <h2 className="mt-1 text-[13px] font-semibold">Generated output</h2>
                          <p className="mt-1 text-[10px] text-[#858477]">Files are available after generation.</p>
                        </div>
                        <FileCheck2 size={17} className="mt-1 text-[#73866d]" />
                      </div>
                      <div className="mt-4 space-y-2">
                        {([
                          ["interior", "Interior PDF", hasInterior],
                          ["cover", "Cover PDF", hasCover],
                          ["config", "Project configuration", true],
                        ] as const).map(([kind, label, available]) => (
                          <div key={kind} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e4dfd3] bg-[#fffdf8] px-3 py-2.5">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0ede4] text-[#667566]">{kind === "config" ? <Settings2 size={15} /> : <FileText size={15} />}</div>
                            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#4b5047]">{label}</p><p className="mt-0.5 text-[9px] text-[#918e81]">{available ? kind === "config" ? "JSON settings export" : "Ready to retrieve" : "Generate project files first"}</p></div>
                            <button type="button" onClick={() => void fetchFile(kind)} disabled={!available || busy === `file:${kind}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#5a705f] hover:bg-[#eff2e9] disabled:cursor-not-allowed disabled:opacity-35" title={`Download ${label}`} aria-label={`Download ${label}`}>{busy === `file:${kind}` ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowDownToLine size={15} />}</button>
                            {kind !== "config" && <button type="button" onClick={() => void fetchFile(kind, "open")} disabled={!available || busy === `file:${kind}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#5a705f] hover:bg-[#eff2e9] disabled:cursor-not-allowed disabled:opacity-35" title={`Open ${label}`} aria-label={`Open ${label}`}><Maximize2 size={14} /></button>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {tab !== "kdp" && <section className="min-w-0 overflow-hidden rounded-[22px] border border-[#ded8ca] bg-[#e9e4d8] shadow-[0_10px_34px_rgba(65,55,38,.045)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d1c3] bg-[#f8f5ed] px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#927958]">{tab === "cover" ? "Cover proof" : tab === "validation" ? "Print checks" : "Interior proof"}</p>
                      <h2 className="mt-1 truncate text-[13px] font-semibold">{draft.title || "Untitled notebook"}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tab === "interior" && (
                        <>
                          <button type="button" onClick={() => setZoom((value) => Math.max(55, value - 10))} disabled={zoom <= 55} className="grid h-8 w-8 place-items-center rounded-lg text-[#65695f] hover:bg-[#ece8dd] disabled:opacity-35" aria-label="Zoom out"><ZoomOut size={15} /></button>
                          <span className="w-10 text-center text-[10px] tabular-nums text-[#727367]">{zoom}%</span>
                          <button type="button" onClick={() => setZoom((value) => Math.min(120, value + 10))} disabled={zoom >= 120} className="grid h-8 w-8 place-items-center rounded-lg text-[#65695f] hover:bg-[#ece8dd] disabled:opacity-35" aria-label="Zoom in"><ZoomIn size={15} /></button>
                          <span className="mx-1 h-5 w-px bg-[#d8d1c3]" />
                          <button type="button" onClick={() => setSpread((value) => !value)} className={`rounded-lg px-2.5 py-2 text-[10px] font-semibold ${spread ? "bg-[#dfe8dc] text-[#385c47]" : "text-[#727367] hover:bg-[#ece8dd]"}`}>{spread ? "Spread" : "Single"}</button>
                        </>
                      )}
                      {tab === "cover" && <button type="button" onClick={() => void exportCoverPng()} disabled={busy === "png"} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8d4c8] bg-[#fffdf8] px-3 text-[10px] font-semibold text-[#4a584c] hover:bg-[#f0ede4] disabled:opacity-50">{busy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG</button>}
                      {tab === "interior" && <button type="button" onClick={() => void loadSvgPreview()} disabled={!hasInterior || busy === "file:preview.svg"} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8d4c8] bg-[#fffdf8] px-3 text-[10px] font-semibold text-[#4a584c] hover:bg-[#f0ede4] disabled:opacity-50">{busy === "file:preview.svg" ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />} SVG preview</button>}
                    </div>
                  </div>

                  {tab === "interior" && (
                    <div className="min-h-[640px]">
                      {remoteSvgUrl && hasInterior ? (
                        <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 p-4 sm:p-8">
                          <div className="flex w-full max-w-2xl items-center justify-between rounded-xl border border-[#d8d1c3] bg-[#f8f5ed] px-3 py-2 text-[10px] text-[#74766b]">
                            <span className="flex items-center gap-2"><FileText size={13} />Generated SVG preview</span>
                            <button type="button" onClick={() => setRemoteSvgUrl("")} className="rounded-md p-1 hover:bg-[#ece8dd]" aria-label="Close SVG preview"><X size={14} /></button>
                          </div>
                          <img src={remoteSvgUrl} alt="Generated notebook interior SVG preview" className="max-h-[680px] max-w-full border border-[#d5cdbd] bg-[#fffdf8] shadow-[0_16px_42px_rgba(54,47,33,.16)]" />
                        </div>
                      ) : (
                        <>
                          {remoteSvgError && <div role="status" className="mx-4 mt-4 rounded-lg border border-[#e3d3b7] bg-[#fbf4e5] px-3 py-2 text-[10px] text-[#806741]">{remoteSvgError}</div>}
                          <div className="flex min-h-[520px] items-center justify-center overflow-auto px-3 py-7 sm:px-6" style={{ backgroundImage: "radial-gradient(#d6d0c3 0.7px, transparent 0.7px)", backgroundSize: "14px 14px" }}>
                            <div className={`flex items-center justify-center gap-3 transition-transform duration-200 ${spread ? "flex-row" : "flex-col"}`} style={{ width: "100%" }}>
                              <div className="transition-transform duration-200" style={{ width: "100%", maxWidth: spread ? `${Math.round(350 * zoom / 82)}px` : `${Math.round(500 * zoom / 82)}px` }}>{renderInteriorPage(page)}</div>
                              {spread && page < pageCount && <div className="transition-transform duration-200" style={{ width: "100%", maxWidth: `${Math.round(350 * zoom / 82)}px` }}>{renderInteriorPage(page + 1)}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 border-t border-[#d8d1c3] bg-[#f8f5ed] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setPageNumber(1)} disabled={page === 1} className="grid h-8 w-8 place-items-center rounded-lg text-[#687064] hover:bg-[#ece8dd] disabled:opacity-30" aria-label="First page"><ChevronLeft size={15} /><ChevronLeft className="-ml-3" size={15} /></button>
                              <button type="button" onClick={() => setPageNumber(page - (spread ? 2 : 1))} disabled={page === 1} className="grid h-8 w-8 place-items-center rounded-lg text-[#687064] hover:bg-[#ece8dd] disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={16} /></button>
                              <form className="flex items-center gap-1.5" onSubmit={(event) => { event.preventDefault(); setPageNumber(Number(jumpValue) || 1); }}>
                                <input aria-label="Jump to page" inputMode="numeric" value={jumpValue} onChange={(event) => setJumpValue(event.target.value.replace(/[^\d]/g, ""))} onBlur={() => setPageNumber(Number(jumpValue) || page)} className="h-8 w-12 rounded-lg border border-[#d9d4c8] bg-[#fffdf8] text-center text-[11px] tabular-nums outline-none focus:border-[#597c67]" />
                                <span className="text-[10px] text-[#858477]">of {pageCount}</span>
                              </form>
                              <button type="button" onClick={() => setPageNumber(page + (spread ? 2 : 1))} disabled={page >= pageCount} className="grid h-8 w-8 place-items-center rounded-lg text-[#687064] hover:bg-[#ece8dd] disabled:opacity-30" aria-label="Next page"><ChevronRight size={16} /></button>
                              <button type="button" onClick={() => setPageNumber(pageCount)} disabled={page === pageCount} className="grid h-8 w-8 place-items-center rounded-lg text-[#687064] hover:bg-[#ece8dd] disabled:opacity-30" aria-label="Last page"><ChevronRight size={15} /><ChevronRight className="-ml-3" size={15} /></button>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10px] text-[#858477]">{LINE_STYLES.find(([value]) => value === draft.settings.lineStyle)?.[1]} · {draft.settings.trimSize === "custom" ? `${draft.settings.customWidth} × ${draft.settings.customHeight} in` : draft.settings.trimSize}</span>
                              <button type="button" onClick={() => void fetchFile("interior", "open")} disabled={!hasInterior || busy === "file:interior"} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#315a51] px-3 text-[10px] font-semibold text-[#fbf8ef] hover:bg-[#26483f] disabled:cursor-not-allowed disabled:opacity-45">{busy === "file:interior" ? <LoaderCircle size={12} className="animate-spin" /> : <Maximize2 size={12} />} Open PDF</button>
                            </div>
                          </div>
                        </>
                      )}
                      {!hasInterior && !remoteSvgUrl && (
                        <div className="flex items-center justify-center gap-2 border-t border-[#d8d1c3] bg-[#f8f5ed] px-4 py-2.5 text-[10px] text-[#807b6f]">
                          <CircleHelp size={13} /> Preview reflects the current settings. Generate files to open the printable PDF and SVG proof.
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "cover" && (
                    <div className="flex min-h-[640px] flex-col">
                      <div className="flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-10" style={{ backgroundImage: "radial-gradient(#d6d0c3 0.7px, transparent 0.7px)", backgroundSize: "14px 14px" }}>
                        <div className="relative w-full max-w-[330px] overflow-hidden rounded-[3px_12px_12px_3px] border border-black/10 shadow-[20px_24px_48px_rgba(43,40,31,.24),inset_5px_0_8px_rgba(0,0,0,.08)]" style={{ aspectRatio: "2 / 3", backgroundColor: draft.coverDesign.background, color: draft.coverDesign.accent }}>
                          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[10px] bg-gradient-to-r from-black/20 via-white/30 to-transparent" />
                          <svg className="h-full w-full" viewBox="0 0 1200 1800" role="img" aria-label={`Front cover design preview for ${draft.title || "untitled notebook"}`} dangerouslySetInnerHTML={{ __html: coverSvg(draft).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "") }} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 border-t border-[#d8d1c3] bg-[#f8f5ed] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0"><p className="text-[11px] font-semibold text-[#4a5046]">{draft.coverDesign.style.charAt(0).toUpperCase() + draft.coverDesign.style.slice(1)} direction</p><p className="mt-0.5 text-[10px] text-[#858477]">A front-cover design preview, not the full wrap file.</p></div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void fetchFile("cover", "open")} disabled={!hasCover || busy === "file:cover"} className={secondaryButton}>{busy === "file:cover" ? <LoaderCircle size={14} className="animate-spin" /> : <Maximize2 size={14} />} Open cover PDF</button>
                          <button type="button" onClick={() => void exportCoverPng()} disabled={busy === "png"} className={primaryButton}>{busy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export PNG</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "validation" && (
                    <div className="flex min-h-[640px] flex-col items-center justify-center px-6 py-10 text-center">
                      <div className={`grid h-16 w-16 place-items-center rounded-[22px] ${validationSummary ? validationPassed ? "bg-[#dce9da] text-[#4c714f]" : "bg-[#efe5d0] text-[#8a7042]" : "bg-[#e4e0d5] text-[#778070]"}`}>
                        {validationSummary ? validationPassed ? <Check size={27} /> : <CircleHelp size={27} /> : <ShieldCheck size={27} />}
                      </div>
                      <p className="mt-5 text-[9px] font-bold uppercase tracking-[.2em] text-[#927958]">Validation report</p>
                      <h3 className="mt-2 font-serif text-2xl">{validationSummary ? validationPassed ? "Looking in order." : "One more careful pass." : "The proof is waiting."}</h3>
                      <p className="mt-2 max-w-sm text-[12px] leading-5 text-[#79796d]">{validationSummary ? String(validationSummary.summary || validationSummary.message || "Review the detailed checks on the left and confirm the generated files manually.") : "Run the project validator to see available checks for this notebook."}</p>
                      {validationSummary && (
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <span className="rounded-full border border-[#dcd6c9] bg-[#f8f5ed] px-3 py-1.5 text-[10px] text-[#6a6d61]">{validationItems.length} reported {validationItems.length === 1 ? "item" : "items"}</span>
                          {manualVerification && <span className="rounded-full border border-[#e6c7aa] bg-[#fff6ea] px-3 py-1.5 text-[10px] text-[#825a36]">Manual verification required</span>}
                        </div>
                      )}
                    </div>
                  )}
                </section>}
              </div>

              {tab === "interior" && hasInterior && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#d7ddcf] bg-[#edf2e9] px-4 py-3.5 text-[11px] text-[#50624f]">
                  <span className="flex items-center gap-2"><Check size={15} />Generated interior file is available. Review the PDF in the target print service’s preview tool.</span>
                  <button type="button" onClick={() => void fetchFile("interior")} disabled={busy === "file:interior"} className="inline-flex items-center gap-1.5 font-semibold hover:underline disabled:opacity-50"><Download size={14} /> Download interior</button>
                </div>
              )}
              {tab === "cover" && hasCover && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#d7ddcf] bg-[#edf2e9] px-4 py-3.5 text-[11px] text-[#50624f]">
                  <span className="flex items-center gap-2"><Check size={15} />Generated cover file is available. Check printer specifications and preview the actual file before use.</span>
                  <button type="button" onClick={() => void fetchFile("cover")} disabled={busy === "file:cover"} className="inline-flex items-center gap-1.5 font-semibold hover:underline disabled:opacity-50"><Download size={14} /> Download cover</button>
                </div>
              )}
              <div className="flex items-start gap-2.5 rounded-xl border border-[#e2dac8] bg-[#f7f2e7] px-4 py-3 text-[10px] leading-5 text-[#777366]">
                <CircleHelp size={14} className="mt-0.5 shrink-0 text-[#9b8058]" />
                <p>File generation and validation results come from the publishing service. A successful check is not a substitute for reviewing the exported PDFs against the requirements of the selected print provider.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
