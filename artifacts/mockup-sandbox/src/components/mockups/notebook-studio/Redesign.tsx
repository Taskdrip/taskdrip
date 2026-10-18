import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  FileCheck2,
  FileText,
  FolderOpen,
  Layers3,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Project = {
  name: string;
  subtitle: string;
  author: string;
  series: string;
  pages: number;
  trim: string;
  style: string;
  status: string;
  accent: string;
  paper: string;
  header: string;
  footer: string;
  showPageNumbers: boolean;
  showDate: boolean;
  lineSpacing: number;
};

const initialProjects: Project[] = [
  {
    name: "Notebook journal",
    subtitle: "A year of clear thinking",
    author: "Mara Ellison",
    series: "FIELD NOTES · VOL. 01",
    pages: 160,
    trim: "8.27 × 11.69 in",
    style: "Lined journal",
    status: "Needs review",
    accent: "#355a4e",
    paper: "#fbf8ef",
    header: "A thought worth keeping",
    footer: "Make room for the important things.",
    showPageNumbers: true,
    showDate: true,
    lineSpacing: 0.28,
  },
  {
    name: "Morning pages",
    subtitle: "A small daily practice",
    author: "Mara Ellison",
    series: "FIELD NOTES · VOL. 02",
    pages: 120,
    trim: "6 × 9 in",
    style: "Wide ruled",
    status: "Draft",
    accent: "#a35d45",
    paper: "#f7f0e5",
    header: "Begin where you are",
    footer: "One page at a time.",
    showPageNumbers: true,
    showDate: false,
    lineSpacing: 0.34,
  },
  {
    name: "The 2027 planner",
    subtitle: "A year, with intention",
    author: "Taskdrip Studio",
    series: "THE YEARBOOK · 2027",
    pages: 192,
    trim: "8.27 × 11.69 in",
    style: "Daily planner",
    status: "Ready to print",
    accent: "#77684b",
    paper: "#f8f4e9",
    header: "Make the year yours",
    footer: "A little progress, every day.",
    showPageNumbers: true,
    showDate: true,
    lineSpacing: 0.3,
  },
];

const templates = [
  { name: "Lined journal", detail: "Quiet ruled pages · 160 pages", style: "Lined journal", accent: "#355a4e" },
  { name: "Daily planner", detail: "Dated pages · 2027 edition", style: "Daily planner", accent: "#77684b" },
  { name: "Morning pages", detail: "Wide rule · 120 pages", style: "Wide ruled", accent: "#a35d45" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d9d4c7",
  borderRadius: 9,
  background: "#fffdf8",
  padding: "10px 12px",
  color: "#303a33",
  font: "500 13px/1.3 'DM Sans', sans-serif",
  outline: "none",
};

export default function Redesign() {
  const [projects, setProjects] = useState(initialProjects);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"projects" | "templates">("projects");
  const [tab, setTab] = useState<"interior" | "cover" | "details">("interior");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(18);
  const [zoom, setZoom] = useState(84);
  const [spread, setSpread] = useState(false);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [checksRun, setChecksRun] = useState(false);

  const project = projects[activeIndex] || projects[0];
  const filteredProjects = useMemo(
    () => projects.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search],
  );

  const update = (key: keyof Project, value: string | number | boolean) => {
    setProjects((items) => items.map((item, index) => index === activeIndex ? { ...item, [key]: value } : item));
    setSaved(false);
    setChecksRun(false);
  };
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };
  const createProject = () => {
    const next: Project = { ...initialProjects[0], name: "Untitled notebook", status: "Draft" };
    setProjects((items) => [next, ...items]);
    setActiveIndex(0);
    setView("projects");
    setSaved(false);
    setTab("interior");
    flash("A new notebook draft is ready.");
  };
  const applyTemplate = (template: typeof templates[number]) => {
    update("style", template.style);
    update("accent", template.accent);
    setView("projects");
    setTab("interior");
    flash(`${template.name} settings applied to this project.`);
  };
  const saveDraft = () => {
    setSaved(true);
    flash("Draft saved in this preview.");
  };

  return (
    <div className="studio">
      <style>{`
        .studio { --pine:#28483f; --pine2:#385d51; --ink:#28352e; --muted:#7f8175; --paper:#f4f1e8; --line:#e3dfd3; --panel:#fbfaf6; --orange:#c67655; min-height:100dvh; background:#f1eee5; color:var(--ink); font-family:'DM Sans',sans-serif; }
        .studio * { box-sizing:border-box; }
        .studio button,.studio input,.studio select { font:inherit; }
        .studio button { cursor:pointer; }
        .topbar { height:66px; background:var(--pine); color:#f4f1e7; display:flex; align-items:center; justify-content:space-between; padding:0 28px; border-bottom:1px solid rgba(255,255,255,.11); }
        .brand { display:flex; align-items:center; gap:12px; min-width:0; }
        .brand-mark { width:34px;height:34px;border:1px solid rgba(244,241,231,.35);border-radius:11px;display:grid;place-items:center;color:#e5d4aa; }
        .brand-label { font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:#bdc9bd;font-weight:700; }
        .brand-name { font:600 16px/1.1 'Playfair Display',serif; margin-top:3px; }
        .top-actions { display:flex;align-items:center;gap:9px; }
        .top-meta { display:flex;align-items:center;gap:7px;color:#d3ddd3;font-size:11px;padding:0 12px; }
        .top-btn { border:1px solid rgba(255,255,255,.23);background:rgba(255,255,255,.07);color:#f7f3e8;border-radius:9px;padding:9px 13px;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;transition:background .18s,transform .18s; }
        .top-btn:hover { background:rgba(255,255,255,.15);transform:translateY(-1px); }
        .top-btn.light { background:#eee6d3;color:#31473c;border-color:#eee6d3; }
        .crumbs { height:42px; padding:0 29px; display:flex;align-items:center;gap:8px;color:#818277;font-size:11px; }
        .crumb-link { border:0;background:none;padding:0;color:#69796c;display:inline-flex;gap:7px;align-items:center;font-size:11px; }
        .layout { display:grid;grid-template-columns:248px minmax(0,1fr);gap:20px;max-width:1600px;margin:0 auto;padding:0 22px 32px; }
        .rail { border:1px solid #e0dccf;border-radius:15px;background:#f7f5ee;min-height:calc(100dvh - 126px);padding:15px 12px;display:flex;flex-direction:column; }
        .rail-head { padding:4px 7px 13px;display:flex;align-items:center;justify-content:space-between; }
        .rail-label { color:#858579;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700; }
        .icon-plain { width:31px;height:31px;display:grid;place-items:center;border:0;background:transparent;color:#74786d;border-radius:8px; }
        .icon-plain:hover { background:#ebe8dd;color:var(--pine); }
        .rail-search { height:35px;display:flex;align-items:center;gap:8px;background:#fffdf8;border:1px solid #e2ded2;border-radius:9px;padding:0 10px;color:#919084;margin:0 3px 13px; }
        .rail-search input { min-width:0;width:100%;border:0;outline:0;background:transparent;color:#39443c;font-size:12px; }
        .rail-tabs { display:flex;padding:3px;background:#ece9df;border-radius:9px;margin:0 3px 14px; }
        .rail-tabs button { flex:1;border:0;background:transparent;border-radius:7px;padding:7px 5px;color:#75766c;font-size:11px;font-weight:600; }
        .rail-tabs button.active { background:#fffdf8;color:#355247;box-shadow:0 1px 3px #4441; }
        .rail-list { display:grid;gap:5px; }
        .project-item { position:relative;width:100%;border:1px solid transparent;background:transparent;border-radius:10px;text-align:left;padding:10px 9px;display:flex;align-items:center;gap:10px;color:var(--ink);transition:background .18s,border .18s; }
        .project-item:hover { background:#f0eee6; }
        .project-item.active { background:#eeeee5;border-color:#dcdfd2; }
        .project-thumb { flex:0 0 33px;height:42px;border-radius:4px 7px 7px 4px;background:#e6e1d2;box-shadow:inset 4px 0 rgba(38,62,52,.14);display:grid;place-items:center;color:#496356; }
        .project-item:nth-child(2) .project-thumb { background:#efe2d7;color:#a05c43; }
        .project-item:nth-child(3) .project-thumb { background:#e3e2d4;color:#77684b; }
        .project-copy { min-width:0;flex:1; }
        .project-title { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;color:#35423a; }
        .project-sub { margin-top:4px;color:#8b8b7f;font-size:10px; }
        .status-dot { width:6px;height:6px;display:inline-block;border-radius:50%;background:#c9845d;margin-right:5px;vertical-align:1px; }
        .status-dot.ready { background:#65836a; }
        .status-dot.draft { background:#c4a45c; }
        .rail-divider { height:1px;background:#e4e0d5;margin:17px 5px 13px; }
        .rail-section-title { padding:0 8px 8px;display:flex;justify-content:space-between;align-items:center;color:#858579;font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:700; }
        .template-row { display:flex;align-items:center;gap:9px;padding:8px;border-radius:8px;color:#586057;font-size:11px; }
        .template-row:hover { background:#eeece4; }
        .template-swatch { width:21px;height:27px;border-radius:3px;background:#e7e2d4;border-left:3px solid #355a4e;box-shadow:0 1px 2px #35301b1c; }
        .rail-bottom { margin-top:auto;padding:14px 8px 2px;border-top:1px solid #e5e1d6;display:flex;gap:8px;align-items:flex-start;color:#8b8a7e;font-size:10px;line-height:1.5; }
        .workspace { min-width:0; }
        .project-header { background:#fbfaf6;border:1px solid #e2ded2;border-radius:15px;padding:19px 22px 0;box-shadow:0 2px 10px rgba(50,47,34,.025); }
        .header-overline { display:flex;align-items:center;gap:10px;color:#858579;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase; }
        .review-pill { display:inline-flex;align-items:center;gap:6px;background:#f2ead8;color:#896d3d;border:1px solid #e8dec8;border-radius:20px;padding:5px 9px;font-size:9px;letter-spacing:.08em; }
        .saved-note { display:flex;align-items:center;gap:5px;letter-spacing:0;text-transform:none;color:#8d8b7f;font-size:10px;font-weight:500; }
        .saved-note.unsaved { color:#aa6c4e; }
        .title-row { display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-top:10px; }
        .title-row h1 { font:600 clamp(24px,2.2vw,32px)/1.15 'Playfair Display',serif;letter-spacing:-.025em;margin:0;color:#2e3a32; }
        .project-subtitle { margin-top:5px;color:#77796f;font-size:12px; }
        .metadata { display:flex;flex-wrap:wrap;gap:15px;margin-top:12px;color:#89897e;font-size:10px; }
        .metadata span { display:inline-flex;align-items:center;gap:5px; }
        .header-controls { display:flex;align-items:center;gap:8px;padding:17px 0 14px; }
        .action { display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:9px;padding:9px 13px;min-height:37px;border:1px solid #d9d6cb;background:#fffdf8;color:#4d574e;font-size:11px;font-weight:700;transition:transform .18s,background .18s,border .18s; }
        .action:hover { transform:translateY(-1px);background:#f3f0e7;border-color:#c7c5b8; }
        .action.primary { background:var(--pine);border-color:var(--pine);color:#f8f5eb; }
        .action.primary:hover { background:#34584d; }
        .action.subtle { border-color:transparent;background:transparent;color:#787b70; }
        .action .count { font-size:9px;color:inherit;opacity:.74; }
        .menu-wrap { position:relative;margin-left:auto; }
        .menu-pop { position:absolute;right:0;top:43px;width:190px;padding:5px;background:#fffdf8;border:1px solid #ded9cb;border-radius:10px;box-shadow:0 12px 32px #37332126;z-index:5; }
        .menu-pop button { display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;background:none;border-radius:7px;text-align:left;color:#536056;font-size:11px; }
        .menu-pop button:hover { background:#f1eee5; }
        .tabs { display:flex;gap:23px;border-top:1px solid #e9e5db;margin-top:2px; }
        .tabs button { position:relative;border:0;background:transparent;padding:13px 3px 12px;color:#838378;font-size:11px;font-weight:600; }
        .tabs button.active { color:#315447; }
        .tabs button.active:after { content:"";height:2px;position:absolute;bottom:0;left:0;right:0;background:#486d5b;border-radius:2px; }
        .main-grid { display:grid;grid-template-columns:minmax(310px, .78fr) minmax(440px,1.22fr);gap:16px;margin-top:16px;align-items:stretch; }
        .settings-panel,.proof-panel { border:1px solid #dfdccf;border-radius:14px;background:#faf9f4;overflow:hidden; }
        .panel-heading { display:flex;align-items:center;justify-content:space-between;padding:15px 17px 13px;border-bottom:1px solid #e9e6dc; }
        .panel-title { font:600 16px/1.2 'Playfair Display',serif;color:#344239; }
        .panel-kicker { margin-top:4px;color:#89897e;font-size:10px; }
        .panel-content { padding:16px 17px 20px; }
        .section-label { display:flex;align-items:center;gap:7px;color:#59685d;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 11px; }
        .field { display:block;margin-bottom:14px; }
        .field-label { display:flex;justify-content:space-between;align-items:baseline;margin:0 0 6px;color:#555f56;font-size:11px;font-weight:600; }
        .field-hint { color:#96958a;font-size:9px;font-weight:400; }
        .field-row { display:grid;grid-template-columns:1fr 1fr;gap:11px; }
        .control-select { appearance:none;background:#fffdf8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2379796d' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 11px center;padding-right:30px!important; }
        .setting-line { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #eeece4;color:#515d53;font-size:11px; }
        .switch { width:34px;height:19px;border:0;border-radius:12px;background:#d9d7cc;padding:2px;transition:background .2s; }
        .switch span { display:block;width:15px;height:15px;background:#fffdf8;border-radius:50%;box-shadow:0 1px 2px #0002;transition:transform .2s; }
        .switch.on { background:#547664; }
        .switch.on span { transform:translateX(15px); }
        .spacing-wrap { padding-top:2px; }
        .range-head { display:flex;align-items:center;justify-content:space-between;color:#60685e;font-size:11px;font-weight:600;margin-bottom:9px; }
        .range-head output { color:#7e8377;font-variant-numeric:tabular-nums;font-weight:500; }
        .studio input[type=range] { accent-color:#496b58;width:100%;height:4px; }
        .line-sample { height:48px;border:1px solid #dfdacf;border-radius:8px;background-color:#fffdf8;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(var(--line-gap) - 1px),#c9d1c5 calc(var(--line-gap) - 1px),#c9d1c5 var(--line-gap));margin-top:9px; }
        .palette { display:flex;gap:8px;align-items:center;margin:9px 0 2px; }
        .palette button { width:22px;height:22px;border-radius:50%;border:2px solid #faf9f4;outline:1px solid transparent; }
        .palette button.selected { outline-color:#54665b; }
        .proof-panel { background:#eeece3; }
        .proof-head { min-height:58px;padding:10px 14px 10px 17px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#faf9f4;border-bottom:1px solid #e1ded3; }
        .proof-heading { display:flex;align-items:center;gap:9px; }
        .proof-heading strong { display:block;color:#445247;font-size:12px; }
        .proof-heading small { display:block;margin-top:3px;color:#929186;font-size:9px; }
        .proof-controls { display:flex;align-items:center;gap:4px; }
        .proof-controls button { width:29px;height:29px;border:0;border-radius:7px;background:transparent;color:#73786e;display:grid;place-items:center; }
        .proof-controls button:hover { background:#eeece3;color:#355849; }
        .proof-controls .proof-divider { width:1px;height:20px;background:#e0ddd3;margin:0 5px; }
        .proof-workspace { min-height:525px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px 25px 20px;background-color:#eeece3;background-image:radial-gradient(#c8c3b5 0.7px,transparent .7px);background-size:13px 13px; }
        .paper-shadow { filter:drop-shadow(0 10px 18px rgba(53,48,36,.16));transition:transform .2s; }
        .page-sheet { width:min(340px,34vw);min-width:260px;aspect-ratio:.72;background:var(--paper-color);border:1px solid #d8d3c6;position:relative;padding:29px 29px 25px 34px;overflow:hidden;color:#39463d; }
        .page-sheet:before { content:"";position:absolute;top:0;bottom:0;left:20px;width:1px;background:#dfcbbd;opacity:.8; }
        .page-sheet.cover { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:33px;text-align:center;background:var(--paper-color); }
        .cover-frame { position:absolute;inset:17px;border:1px solid color-mix(in srgb,var(--accent-color) 40%,transparent); }
        .cover-kicker { position:absolute;top:31px;font-size:8px;letter-spacing:.22em;color:var(--accent-color); }
        .cover-motif { width:54px;height:54px;margin:0 auto 25px;border:1px solid color-mix(in srgb,var(--accent-color) 65%,transparent);border-radius:50%;display:grid;place-items:center;color:var(--accent-color); }
        .cover-title { font:600 clamp(22px,2.3vw,31px)/1.12 'Playfair Display',serif;color:var(--accent-color);max-width:245px; }
        .cover-sub { margin-top:11px;font:italic 12px/1.4 'Playfair Display',serif;color:color-mix(in srgb,var(--accent-color) 78%,#fff); }
        .cover-author { position:absolute;bottom:33px;color:var(--accent-color);font-size:8px;letter-spacing:.17em;text-transform:uppercase; }
        .page-title { text-align:center;font:italic 25px/1.2 'Playfair Display',serif;color:#34473d;margin:0 0 4px; }
        .page-subtitle { text-align:center;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#788276;margin-bottom:18px; }
        .page-headline { font:600 11px/1.4 'Playfair Display',serif;color:#45584c;border-bottom:1px solid #b8c4b7;padding-bottom:7px;margin:0 0 8px; }
        .date-row { display:flex;align-items:center;gap:7px;color:#83877a;font-size:8px;margin:0 0 11px; }
        .date-rule { flex:1;border-bottom:1px solid #c9cec2;height:8px; }
        .page-lines { height:calc(100% - 124px);min-height:190px;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(var(--page-gap) - 1px),#c8d0c5 calc(var(--page-gap) - 1px),#c8d0c5 var(--page-gap));opacity:.9; }
        .page-footer { position:absolute;bottom:16px;left:34px;right:29px;display:flex;justify-content:space-between;align-items:center;color:#898b7e;font-size:8px; }
        .page-number { border-top:1px solid #c7c8ba;padding-top:5px;min-width:18px;text-align:center;font:italic 11px 'Playfair Display',serif;color:#687469; }
        .spread-pages { display:flex;align-items:center;gap:0; }
        .spread-pages .page-sheet { width:min(260px,24vw);min-width:210px; }
        .spread-pages .page-sheet + .page-sheet { border-left:0; }
        .proof-caption { width:100%;display:flex;align-items:center;justify-content:space-between;margin-top:17px;color:#7f8176;font-size:10px; }
        .page-stepper { display:flex;align-items:center;gap:9px; }
        .page-stepper button { border:1px solid #d6d2c7;background:#f9f7f0;color:#667065;border-radius:7px;width:26px;height:25px;display:grid;place-items:center; }
        .page-stepper button:hover { background:#fffdf8;color:#355849; }
        .page-stepper input { width:40px;height:25px;border:1px solid #d6d2c7;border-radius:6px;background:#fffdf8;color:#455248;text-align:center;font-size:10px; }
        .proof-status { margin-top:15px;padding:11px 14px;border-radius:10px;border:1px solid #dbe1d3;background:#f0f3eb;display:flex;align-items:center;gap:9px;color:#58705d;font-size:10px; }
        .proof-status strong { color:#465c4c; }
        .bottom-note { display:flex;align-items:center;gap:8px;margin:12px 2px 0;color:#89897f;font-size:9px; }
        .details-grid { display:grid;grid-template-columns:1fr 1fr;gap:0 18px; }
        .template-panel { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px; }
        .template-card { border:1px solid #e0dccf;border-radius:10px;background:#fffdf8;padding:12px;text-align:left;color:#344239;transition:transform .18s,border .18s; }
        .template-card:hover { transform:translateY(-2px);border-color:#aebbaa; }
        .template-art { height:90px;border-radius:6px;background:#f2efe4;display:grid;place-items:center;margin-bottom:11px;position:relative;overflow:hidden; }
        .mini-page { width:48px;height:66px;background:#fbf8ef;box-shadow:0 3px 8px #39342122;padding:12px 7px;border-left:3px solid var(--tpl-color); }
        .mini-page:after { content:"";display:block;height:35px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 7px,#cbd2c6 7px,#cbd2c6 8px); }
        .template-card b { font-size:11px; }
        .template-card small { display:block;color:#858579;margin-top:4px;font-size:9px;line-height:1.4; }
        .toast { position:fixed;right:24px;bottom:22px;z-index:10;background:#2f5146;color:#f6f3e9;border-radius:10px;padding:12px 15px;box-shadow:0 8px 25px #263c3038;font-size:11px;display:flex;gap:9px;align-items:center;animation:rise .2s ease-out; }
        @keyframes rise { from {opacity:0;transform:translateY(6px)} to {opacity:1;transform:translateY(0)} }
        @media (max-width:1050px) { .layout{grid-template-columns:210px minmax(0,1fr);gap:13px;padding:0 14px 24px}.main-grid{grid-template-columns:minmax(270px,.8fr) minmax(380px,1.2fr);gap:11px}.page-sheet{min-width:230px}.panel-content{padding:14px}.header-controls{flex-wrap:wrap}.metadata{gap:10px} }
        @media (max-width:780px) { .topbar{height:58px;padding:0 15px}.top-meta{display:none}.crumbs{padding:0 16px}.layout{display:flex;flex-direction:column;padding:0 11px 20px}.rail{min-height:0;padding:10px;border-radius:12px}.rail-head{padding-bottom:7px}.rail-search{margin-bottom:8px}.rail-tabs{margin-bottom:8px}.rail-list{display:flex;overflow-x:auto;padding-bottom:2px}.project-item{flex:0 0 190px}.rail-divider,.rail-section-title,.template-row,.rail-bottom{display:none}.project-header{padding:15px 15px 0}.title-row h1{font-size:25px}.header-controls{gap:6px;padding:13px 0}.action{padding:8px 10px}.tabs{gap:18px}.main-grid{display:flex;flex-direction:column}.proof-panel{order:0}.settings-panel{order:1}.proof-workspace{min-height:450px;padding:20px 12px}.page-sheet{width:min(340px,75vw);min-width:0}.spread-pages .page-sheet{width:43vw;min-width:0;padding:23px 20px 20px 26px}.spread-pages .page-title{font-size:18px}.spread-pages .page-subtitle{font-size:7px}.spread-pages .page-footer{left:26px;right:20px}.spread-pages .page-sheet:before{left:15px}.proof-caption{font-size:9px}.proof-head{padding:9px 11px}.details-grid{grid-template-columns:1fr}.template-panel{grid-template-columns:1fr}.template-art{height:64px}.project-subtitle{font-size:11px}.header-overline{font-size:9px} }
        @media (max-width:430px) { .top-actions .top-btn:first-of-type{display:none}.brand-name{font-size:14px}.title-row{display:block}.title-row .review-pill{margin-top:9px}.header-controls .action{font-size:10px}.header-controls{gap:4px}.header-controls .menu-wrap{margin-left:0}.proof-controls{gap:0}.proof-controls .proof-divider{margin:0 2px}.proof-workspace{min-height:410px}.page-sheet{width:78vw}.spread-pages .page-sheet{width:44vw;min-width:0;padding:20px 15px 18px 21px}.spread-pages .page-sheet:before{left:13px}.spread-pages .page-footer{left:21px;right:15px} }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><BookOpen size={18} strokeWidth={1.6} /></div>
          <div><div className="brand-label">Taskdrip · Creator Studio</div><div className="brand-name">Notebook publishing</div></div>
        </div>
        <div className="top-actions">
          <div className="top-meta"><span className="status-dot ready" />Local workspace · {projects.length} projects</div>
          <button className="top-btn" onClick={() => { setView("projects"); setSearch(""); }}><FolderOpen size={14} />Project shelf</button>
          <button className="top-btn light" onClick={createProject}><Plus size={14} />New notebook</button>
        </div>
      </header>

      <div className="crumbs">
        <button className="crumb-link" onClick={() => flash("Creator Studio home is outside this preview.")}><ArrowLeft size={13} />Creator Studio</button>
        <ChevronRight size={12} />
        <span>Notebook projects</span>
        <ChevronRight size={12} />
        <span style={{ color: "#4f6154" }}>{project.name}</span>
      </div>

      <div className="layout">
        <aside className="rail">
          <div className="rail-head"><span className="rail-label">{view === "projects" ? "Project shelf" : "Templates"}</span><button className="icon-plain" title="Create new notebook" onClick={createProject}><Plus size={16} /></button></div>
          {view === "projects" ? (
            <>
              <label className="rail-search"><Search size={14} /><input aria-label="Search projects" placeholder="Find a project" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <div className="rail-tabs">
                <button className="active" onClick={() => setView("projects")}>Projects <span style={{ opacity: .65 }}>({projects.length})</span></button>
                <button onClick={() => setView("templates")}>Templates</button>
              </div>
              <div className="rail-list">
                {filteredProjects.map((item) => {
                  const index = projects.indexOf(item);
                  return <button className={`project-item ${activeIndex === index ? "active" : ""}`} key={`${item.name}-${index}`} onClick={() => { setActiveIndex(index); setPage(1); setSaved(true); setChecksRun(false); }}>
                    <div className="project-thumb"><BookOpen size={16} strokeWidth={1.5} /></div>
                    <div className="project-copy"><div className="project-title">{item.name}</div><div className="project-sub"><i className={`status-dot ${item.status === "Ready to print" ? "ready" : item.status === "Draft" ? "draft" : ""}`} />{item.status}</div></div>
                    {activeIndex === index && <ChevronRight size={14} color="#768477" />}
                  </button>;
                })}
                {filteredProjects.length === 0 && <div style={{ padding: "18px 9px", color: "#88887c", fontSize: 11 }}>No projects match that search.</div>}
              </div>
              <div className="rail-divider" />
              <div className="rail-section-title"><span>Recent templates</span><button className="icon-plain" onClick={() => setView("templates")} title="Browse templates"><ArrowRight size={13} /></button></div>
              {templates.slice(0, 2).map((template) => <button className="template-row" key={template.name} onClick={() => applyTemplate(template)}><span className="template-swatch" style={{ borderLeftColor: template.accent }} /><span>{template.name}</span></button>)}
              <div className="rail-bottom"><CircleHelp size={14} /><span>Proofs update as you edit. Review the exported PDFs before sending a project to print.</span></div>
            </>
          ) : (
            <>
              <div className="rail-tabs"><button onClick={() => setView("projects")}>Projects <span style={{ opacity: .65 }}>({projects.length})</span></button><button className="active" onClick={() => setView("templates")}>Templates</button></div>
              <div className="rail-list">
                {templates.map((template) => <button className="template-row" key={template.name} onClick={() => applyTemplate(template)}><span className="template-swatch" style={{ borderLeftColor: template.accent }} /><span>{template.name}</span></button>)}
              </div>
              <div className="rail-bottom"><CircleHelp size={14} /><span>Choose a starting layout, then tailor this project to its print specs.</span></div>
            </>
          )}
        </aside>

        <main className="workspace">
          <section className="project-header">
            <div className="header-overline">
              <span className="review-pill"><span className={`status-dot ${project.status === "Ready to print" ? "ready" : ""}`} />{project.status}</span>
              <span className={`saved-note ${saved ? "" : "unsaved"}`}>{saved ? <><Check size={12} />Saved just now</> : <>● Unsaved changes</>}</span>
            </div>
            <div className="title-row">
              <div>
                <h1>{project.name}</h1>
                <div className="project-subtitle">{project.subtitle}</div>
                <div className="metadata"><span><FileText size={12} />{project.pages} total pages</span><span>{project.trim} trim</span><span><Printer size={12} />Paperback · black ink</span></div>
              </div>
            </div>
            <div className="header-controls">
              <button className="action" onClick={saveDraft}><Check size={14} />Save draft</button>
              <button className="action" onClick={() => { setChecksRun(true); flash("Proof check complete · review the notes below."); }}><ShieldCheck size={14} />Validate</button>
              <button className="action primary" onClick={() => flash("Print files are not generated in this local preview.")}><ArrowDownToLine size={14} />Generate files</button>
              <div className="menu-wrap">
                <button className="action subtle" onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={16} />More <ChevronDown size={12} /></button>
                {moreOpen && <div className="menu-pop">
                  <button onClick={() => { setProjects((items) => [{ ...project, name: `${project.name} copy`, status: "Draft" }, ...items]); setActiveIndex(0); setMoreOpen(false); setSaved(false); flash("A local copy has been added to the shelf."); }}><Copy size={14} />Duplicate project</button>
                  <button onClick={() => { setTab("details"); setMoreOpen(false); }}><Settings2 size={14} />Project settings</button>
                  <button onClick={() => { setTab("cover"); setMoreOpen(false); }}><Layers3 size={14} />Edit cover design</button>
                </div>}
              </div>
            </div>
            <nav className="tabs" aria-label="Project editor sections">
              {(["interior", "cover", "details"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "interior" ? "Interior" : item === "cover" ? "Cover design" : "Project details"}</button>)}
            </nav>
          </section>

          {tab === "interior" ? (
            <div className="main-grid">
              <section className="settings-panel">
                <div className="panel-heading"><div><div className="panel-title">Interior settings</div><div className="panel-kicker">Set the page, then review the live proof.</div></div><button className="icon-plain" title="Interior settings"><Settings2 size={16} /></button></div>
                <div className="panel-content">
                  <p className="section-label"><FileText size={13} />Page structure</p>
                  <label className="field"><span className="field-label">Interior layout <span className="field-hint">Applied to all writing pages</span></span>
                    <select className="control-select" style={inputStyle} value={project.style} onChange={(event) => update("style", event.target.value)}>
                      <option>Lined journal</option><option>Wide ruled</option><option>College ruled</option><option>Dot grid</option><option>Daily planner</option><option>Meeting notes</option>
                    </select>
                  </label>
                  <div className="field-row">
                    <label className="field"><span className="field-label">Page count</span><input style={inputStyle} type="number" min={24} max={500} value={project.pages} onChange={(event) => update("pages", Number(event.target.value))} /></label>
                    <label className="field"><span className="field-label">Trim size</span><select className="control-select" style={inputStyle} value={project.trim} onChange={(event) => update("trim", event.target.value)}><option>8.27 × 11.69 in</option><option>6 × 9 in</option><option>5.5 × 8.5 in</option><option>5 × 8 in</option></select></label>
                  </div>
                  <div className="setting-line"><span>Show a date field</span><button className={`switch ${project.showDate ? "on" : ""}`} role="switch" aria-checked={project.showDate} onClick={() => update("showDate", !project.showDate)}><span /></button></div>
                  <div className="setting-line"><span>Print page numbers</span><button className={`switch ${project.showPageNumbers ? "on" : ""}`} role="switch" aria-checked={project.showPageNumbers} onClick={() => update("showPageNumbers", !project.showPageNumbers)}><span /></button></div>
                  <div style={{ paddingTop: 15 }}>
                    <div className="range-head"><span>Rule spacing</span><output>{Number(project.lineSpacing).toFixed(2)} in</output></div>
                    <div className="spacing-wrap"><input aria-label="Rule spacing" type="range" min="0.22" max="0.42" step="0.01" value={project.lineSpacing} onChange={(event) => update("lineSpacing", Number(event.target.value))} /><div className="line-sample" style={{ "--line-gap": `${Math.max(10, Number(project.lineSpacing) * 48)}px` } as CSSProperties} /></div>
                  </div>
                  <label className="field" style={{ marginTop: 16, marginBottom: 0 }}><span className="field-label">Running header <span className="field-hint">Optional</span></span><input style={inputStyle} value={project.header} onChange={(event) => update("header", event.target.value)} /></label>
                </div>
              </section>

              <section className="proof-panel">
                <div className="proof-head">
                  <div className="proof-heading"><div style={{ width: 30, height: 30, borderRadius: 9, background: "#e8ece3", color: "#57705f", display: "grid", placeItems: "center" }}><FileCheck2 size={15} /></div><div><strong>Live print proof</strong><small>Interior · {project.trim} · actual proportions</small></div></div>
                  <div className="proof-controls">
                    <button title="Zoom out" onClick={() => setZoom((value) => Math.max(60, value - 8))}><ZoomOut size={15} /></button><button title="Zoom in" onClick={() => setZoom((value) => Math.min(110, value + 8))}><ZoomIn size={15} /></button><span className="proof-divider" /><button title="Toggle spread view" onClick={() => setSpread((value) => !value)} style={{ color: spread ? "#355849" : undefined }}><BookOpen size={15} /></button>
                  </div>
                </div>
                <div className="proof-workspace">
                  <div className={spread ? "spread-pages" : "paper-shadow"} style={{ transform: `scale(${zoom / 84})`, transformOrigin: "center center" }}>
                    <ProofPage project={project} page={page} />
                    {spread && <ProofPage project={project} page={Math.min(project.pages, page + 1)} />}
                  </div>
                  <div className="proof-caption">
                    <span>Proof view · {spread ? "two-page spread" : "single page"} · {zoom}%</span>
                    <div className="page-stepper"><button title="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={14} /></button><input aria-label="Current page" type="number" min="1" max={project.pages} value={page} onChange={(event) => setPage(Math.min(project.pages, Math.max(1, Number(event.target.value) || 1)))} /><span>of {project.pages}</span><button title="Next page" onClick={() => setPage((value) => Math.min(project.pages, value + 1))}><ChevronRight size={14} /></button></div>
                  </div>
                </div>
                <div style={{ padding: "0 14px 14px" }}>
                  <div className="proof-status"><Check size={14} /><span><strong>{checksRun ? "Proof check complete." : "Proof is updating live."}</strong> {checksRun ? "No blocking layout issues in this sample." : "Review line spacing and page count before saving."}</span></div>
                </div>
              </section>
            </div>
          ) : tab === "cover" ? (
            <div className="main-grid">
              <section className="settings-panel">
                <div className="panel-heading"><div><div className="panel-title">Cover design</div><div className="panel-kicker">Tune the jacket while keeping the proof in view.</div></div><Sparkles size={16} color="#9b8156" /></div>
                <div className="panel-content">
                  <p className="section-label"><Layers3 size={13} />Cover palette</p>
                  <div className="field-row">
                    <label className="field"><span className="field-label">Cover paper</span><select style={inputStyle} className="control-select" value={project.paper} onChange={(event) => update("paper", event.target.value)}><option value="#fbf8ef">Warm ivory</option><option value="#f7f0e5">Natural cream</option><option value="#e9eee5">Sage stock</option><option value="#f0e5da">Blush linen</option></select></label>
                    <div className="field"><span className="field-label">Ink color</span><div className="palette">{["#355a4e", "#a35d45", "#77684b", "#526b83", "#6d6177"].map((color) => <button key={color} className={project.accent === color ? "selected" : ""} style={{ background: color }} aria-label={`Use ${color} ink`} onClick={() => update("accent", color)} />)}</div></div>
                  </div>
                  <label className="field"><span className="field-label">Cover title</span><input style={inputStyle} value={project.name} onChange={(event) => update("name", event.target.value)} /></label>
                  <label className="field"><span className="field-label">Subtitle</span><input style={inputStyle} value={project.subtitle} onChange={(event) => update("subtitle", event.target.value)} /></label>
                  <label className="field"><span className="field-label">Series line</span><input style={inputStyle} value={project.series} onChange={(event) => update("series", event.target.value)} /></label>
                  <label className="field"><span className="field-label">Cover author</span><input style={inputStyle} value={project.author} onChange={(event) => update("author", event.target.value)} /></label>
                  <p className="bottom-note"><CircleHelp size={13} />Use the proof at right to check the balance of your cover typography.</p>
                </div>
              </section>
              <section className="proof-panel">
                <div className="proof-head"><div className="proof-heading"><div style={{ width: 30, height: 30, borderRadius: 9, background: "#e8ece3", color: "#57705f", display: "grid", placeItems: "center" }}><Layers3 size={15} /></div><div><strong>Cover proof</strong><small>Front cover · typography preview</small></div></div><span style={{ color: "#7c8176", fontSize: 10 }}>Updates as you edit</span></div>
                <div className="proof-workspace" style={{ minHeight: 525 }}><div className="paper-shadow" style={{ transform: `scale(${zoom / 84})` }}><CoverProof project={project} /></div><div className="proof-caption"><span>Front cover · {project.trim}</span><div className="proof-controls"><button title="Zoom out" onClick={() => setZoom((value) => Math.max(60, value - 8))}><ZoomOut size={15} /></button><span style={{ fontSize: 10 }}>{zoom}%</span><button title="Zoom in" onClick={() => setZoom((value) => Math.min(110, value + 8))}><ZoomIn size={15} /></button></div></div></div>
                <div style={{ padding: "0 14px 14px" }}><div className="proof-status"><Check size={14} /><span><strong>Cover proof is live.</strong> Type, color and paper tone reflect your current edits.</span></div></div>
              </section>
            </div>
          ) : (
            <div className="main-grid">
              <section className="settings-panel">
                <div className="panel-heading"><div><div className="panel-title">Project details</div><div className="panel-kicker">Identity and print specifications.</div></div><Settings2 size={16} color="#718072" /></div>
                <div className="panel-content">
                  <div className="details-grid">
                    <label className="field"><span className="field-label">Project title</span><input style={inputStyle} value={project.name} onChange={(event) => update("name", event.target.value)} /></label>
                    <label className="field"><span className="field-label">Subtitle</span><input style={inputStyle} value={project.subtitle} onChange={(event) => update("subtitle", event.target.value)} /></label>
                    <label className="field"><span className="field-label">Author name</span><input style={inputStyle} value={project.author} onChange={(event) => update("author", event.target.value)} /></label>
                    <label className="field"><span className="field-label">Series</span><input style={inputStyle} value={project.series} onChange={(event) => update("series", event.target.value)} /></label>
                    <label className="field"><span className="field-label">Interior pages</span><input style={inputStyle} type="number" min={24} value={project.pages} onChange={(event) => update("pages", Number(event.target.value))} /></label>
                    <label className="field"><span className="field-label">Trim size</span><select style={inputStyle} className="control-select" value={project.trim} onChange={(event) => update("trim", event.target.value)}><option>8.27 × 11.69 in</option><option>6 × 9 in</option><option>5.5 × 8.5 in</option><option>5 × 8 in</option></select></label>
                  </div>
                  <div className="setting-line"><span>Paperback binding</span><span style={{ color: "#87877b" }}>Perfect bound</span></div>
                  <div className="setting-line"><span>Interior ink</span><span style={{ color: "#87877b" }}>Black &amp; white</span></div>
                  <div className="setting-line"><span>Bleed</span><span style={{ color: "#87877b" }}>No bleed</span></div>
                </div>
              </section>
              <section className="proof-panel">
                <div className="proof-head"><div className="proof-heading"><div style={{ width: 30, height: 30, borderRadius: 9, background: "#e8ece3", color: "#57705f", display: "grid", placeItems: "center" }}><BookOpen size={15} /></div><div><strong>Project templates</strong><small>Use a starting point for this notebook</small></div></div></div>
                <div className="template-panel">{templates.map((template) => <button className="template-card" key={template.name} onClick={() => applyTemplate(template)}><div className="template-art" style={{ "--tpl-color": template.accent } as CSSProperties}><div className="mini-page" /></div><b>{template.name}</b><small>{template.detail}</small></button>)}</div>
                <div style={{ padding: "0 16px 15px" }}><div className="proof-status"><CircleHelp size={14} /><span><strong>Template changes stay local.</strong> Apply one to update the selected project's page layout.</span></div></div>
              </section>
            </div>
          )}
          <div className="bottom-note"><ShieldCheck size={13} />A proof is a review aid. Always check generated print PDFs against the selected provider's requirements.</div>
        </main>
      </div>
      {notice && <div className="toast"><Check size={15} />{notice}</div>}
    </div>
  );
}

function ProofPage({ project, page }: { project: Project; page: number }) {
  return <div className="page-sheet" style={{ "--paper-color": project.paper, "--accent-color": project.accent, "--page-gap": `${Math.max(15, project.lineSpacing * 54)}px` } as CSSProperties}>
    <h2 className="page-title">{page === 1 ? "A page for you" : project.style === "Daily planner" ? "January" : "Notes"}</h2>
    <div className="page-subtitle">{page === 1 ? "a place to begin" : `${project.series.replace(" · ", " / ")}`}</div>
    <div className="page-headline">{project.header || " "} </div>
    {project.showDate && <div className="date-row"><span>Date</span><span className="date-rule" /></div>}
    <div className="page-lines" />
    <div className="page-footer"><span>{project.footer}</span>{project.showPageNumbers && <span className="page-number">{page}</span>}</div>
  </div>;
}

function CoverProof({ project }: { project: Project }) {
  return <div className="page-sheet cover" style={{ "--paper-color": project.paper, "--accent-color": project.accent } as CSSProperties}>
    <div className="cover-frame" />
    <div className="cover-kicker">{project.series}</div>
    <div className="cover-motif"><BookOpen size={22} strokeWidth={1.2} /></div>
    <div className="cover-title">{project.name}</div>
    <div className="cover-sub">{project.subtitle}</div>
    <div className="cover-author">{project.author}</div>
  </div>;
}
