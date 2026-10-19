import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Layers3,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

type Resource = {
  title: string;
  category: string;
  format: string;
  image: string;
  count: number;
  description: string;
  kind: string;
};

const categories = [
  { name: "AI tools", count: 42, description: "Useful assistants for everyday work", icon: Sparkles },
  { name: "Software", count: 28, description: "Apps and tools worth knowing", icon: Layers3 },
  { name: "Templates", count: 36, description: "Ready-to-use creative starting points", icon: FileText },
  { name: "Learning", count: 19, description: "Guides to help you get better", icon: BookOpen },
];

const resources: Resource[] = [
  {
    title: "Creator Starter Toolkit",
    category: "Templates",
    format: "ZIP",
    image: "/__mockup/images/free-downloads-hero-creator.jpg",
    count: 1284,
    description: "A practical collection of planning sheets and creative assets to help bring your next idea to life.",
    kind: "Creator essentials",
  },
  {
    title: "AI Writing Assistant Guide",
    category: "AI tools",
    format: "PDF",
    image: "/__mockup/images/free-downloads-hero-tools.jpg",
    count: 876,
    description: "A straightforward guide to choosing the right AI tools for a more focused writing workflow.",
    kind: "Field guide",
  },
  {
    title: "Digital Learning Planner",
    category: "Learning",
    format: "PDF",
    image: "/__mockup/images/free-downloads-hero-learning.jpg",
    count: 642,
    description: "Plan lessons, projects and focused study sessions with a flexible digital-first planner.",
    kind: "Planning resource",
  },
  {
    title: "A Calmer Content Calendar",
    category: "Templates",
    format: "PDF",
    image: "/__mockup/images/free-downloads-hero-creator.jpg",
    count: 519,
    description: "A reusable weekly framework for publishing consistently without turning every day into a scramble.",
    kind: "Content planning",
  },
  {
    title: "Small Team AI Toolkit",
    category: "AI tools",
    format: "ZIP",
    image: "/__mockup/images/free-downloads-hero-tools.jpg",
    count: 391,
    description: "A concise collection of prompts and workflow notes for small teams exploring practical AI.",
    kind: "Team workflow",
  },
  {
    title: "Learn-by-Doing Workbook",
    category: "Learning",
    format: "PDF",
    image: "/__mockup/images/free-downloads-hero-learning.jpg",
    count: 284,
    description: "A hands-on workbook to turn a new digital skill into a small, finishable project.",
    kind: "Workbook",
  },
  {
    title: "Open-source Starter Pack",
    category: "Software",
    format: "Guide",
    image: "/__mockup/images/free-downloads-hero-tools.jpg",
    count: 216,
    description: "A short, considered list of dependable free software for independent creators and teams.",
    kind: "Software guide",
  },
];

const slides = [
  {
    image: "/__mockup/images/free-downloads-hero-creator.jpg",
    label: "01 — MAKE SOMETHING",
    title: "A good idea deserves a head start.",
    caption: "Practical templates and creative tools to move from blank page to first draft.",
  },
  {
    image: "/__mockup/images/free-downloads-hero-tools.jpg",
    label: "02 — WORK A LITTLE SMARTER",
    title: "Find tools that earn their place.",
    caption: "Thoughtful software and AI resources, chosen for real work and real people.",
  },
  {
    image: "/__mockup/images/free-downloads-hero-learning.jpg",
    label: "03 — KEEP LEARNING",
    title: "Make room for the next skill.",
    caption: "Guides and learning material you can put to use today, at your own pace.",
  },
];

export function Refresh() {
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All resources");
  const [format, setFormat] = useState("Any format");
  const [sort, setSort] = useState("Recently added");
  const [mobileNav, setMobileNav] = useState(false);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = resources.filter((item) => {
      const matchesSearch =
        !query ||
        `${item.title} ${item.category} ${item.description} ${item.kind}`.toLowerCase().includes(query);
      const matchesCategory = category === "All resources" || item.category === category;
      const matchesFormat = format === "Any format" || item.format === format;
      return matchesSearch && matchesCategory && matchesFormat;
    });
    return [...filtered].sort((a, b) =>
      sort === "Most downloaded" ? b.count - a.count : resources.indexOf(a) - resources.indexOf(b),
    );
  }, [search, category, format, sort]);

  const goToLibrary = (nextCategory = "All resources") => {
    setCategory(nextCategory);
    document.getElementById("td-library")?.scrollIntoView({ behavior: "smooth" });
  };

  const openResource = (item: Resource) => {
    setSelected(item);
    setDownloadReady(false);
  };

  return (
    <main className="td-refresh">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        .td-refresh { --ink:#182b30; --muted:#617174; --paper:#f5f5ef; --surface:#fffefa; --line:#dfe5df; --pine:#175c51; --pine-dark:#10483f; --mint:#dcebe3; --clay:#d8795b; color:var(--ink); background:var(--paper); min-height:100dvh; font-family:'DM Sans',sans-serif; overflow:hidden; }
        .td-refresh * { box-sizing:border-box; }
        .td-refresh button,.td-refresh input,.td-refresh select { font:inherit; }
        .td-refresh h1,.td-refresh h2,.td-refresh h3 { font-family:'Manrope',sans-serif; letter-spacing:-.045em; }
        .td-shell { max-width:1200px; width:calc(100% - 64px); margin:0 auto; }
        .td-header { min-height:76px; display:flex; justify-content:space-between; align-items:center; gap:24px; border-bottom:1px solid var(--line); }
        .td-brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); font:800 17px 'Manrope',sans-serif; letter-spacing:-.04em; }
        .td-brand-mark { width:32px; height:32px; display:grid; place-items:center; border-radius:10px 10px 10px 3px; background:var(--pine); color:#f6f3e8; font:800 11px 'Manrope',sans-serif; letter-spacing:-.03em; }
        .td-nav { display:flex; align-items:center; gap:clamp(18px,3vw,38px); margin:auto; }
        .td-nav a,.td-login { text-decoration:none; color:#5c6b6d; font-size:12px; font-weight:600; transition:color .18s; }
        .td-nav a:hover,.td-login:hover { color:var(--pine); }
        .td-header-actions { display:flex; align-items:center; gap:18px; }
        .td-register { display:inline-flex; align-items:center; justify-content:center; min-height:39px; padding:0 16px; text-decoration:none; background:var(--pine); color:#fffdf6; border-radius:4px 14px 4px 4px; font-size:11px; font-weight:700; transition:background .18s,transform .18s; }
        .td-register:hover,.td-primary:hover { background:var(--pine-dark); transform:translateY(-1px); }
        .td-menu { display:none; border:1px solid var(--line); background:var(--surface); color:var(--ink); width:38px; height:38px; place-items:center; }
        .td-breadcrumb { height:49px; display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--line); color:#778386; font-size:11px; }
        .td-breadcrumb .td-mark-small { color:var(--pine); font-size:10px; font-weight:800; letter-spacing:.12em; }
        .td-breadcrumb-status { margin-left:auto; display:flex; align-items:center; gap:7px; color:#526c60; font-size:10px; }
        .td-hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(390px,.94fr); gap:56px; align-items:center; padding:64px 0 50px; }
        .td-eyebrow,.td-overline { display:flex; gap:9px; align-items:center; color:var(--pine); font-weight:800; font-size:9px; letter-spacing:.17em; text-transform:uppercase; }
        .td-eyebrow:before { content:''; width:18px; height:1px; background:var(--clay); }
        .td-hero h1 { max-width:580px; margin:17px 0 17px; font-weight:700; font-size:clamp(46px,6.1vw,76px); line-height:.99; }
        .td-hero h1 em { color:var(--pine); font-style:normal; }
        .td-intro { max-width:475px; margin:0; color:var(--muted); font-size:15px; line-height:1.75; }
        .td-hero-search { display:flex; align-items:center; gap:12px; max-width:525px; height:54px; margin-top:26px; padding:0 15px; background:var(--surface); border:1px solid #d5dfd8; border-radius:4px 15px 4px 4px; box-shadow:0 10px 24px #20392e08; }
        .td-hero-search svg { flex:none; color:#728682; }
        .td-hero-search input { flex:1; min-width:0; outline:0; border:0; color:var(--ink); background:transparent; font-size:12px; }
        .td-hero-search input::placeholder { color:#98a3a0; }
        .td-search-hint { flex:none; color:#9aa4a1; font:600 9px 'DM Sans',sans-serif; }
        .td-hero-links { display:flex; align-items:center; flex-wrap:wrap; gap:20px; margin-top:18px; }
        .td-primary,.td-text-action { display:inline-flex; align-items:center; justify-content:center; gap:9px; border:0; cursor:pointer; font-weight:700; text-decoration:none; }
        .td-primary { min-height:43px; padding:0 16px; border-radius:3px 14px 3px 3px; color:#fffdf6; background:var(--pine); font-size:11px; transition:background .18s,transform .18s; }
        .td-text-action { padding:8px 0; color:var(--pine); background:none; font-size:11px; }
        .td-text-action:hover { color:var(--pine-dark); }
        .td-slide { position:relative; min-height:380px; height:clamp(330px,38vw,455px); overflow:hidden; background:#dbe3dc; border-radius:4px 44px 4px 4px; isolation:isolate; }
        .td-slide-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:opacity .45s ease,transform 1.1s ease; }
        .td-slide:hover .td-slide-image { transform:scale(1.025); }
        .td-slide-shade { position:absolute; inset:0; background:linear-gradient(180deg,#101a1a19 0%,transparent 35%,#101b1ad9 100%); }
        .td-slide-content { position:absolute; z-index:1; left:28px; right:28px; bottom:29px; color:#fffdf7; }
        .td-slide-label { color:#e8d9bd; font-size:9px; letter-spacing:.16em; font-weight:800; }
        .td-slide-content h2 { max-width:390px; margin:12px 0 8px; font-size:clamp(25px,3.1vw,37px); line-height:1.1; }
        .td-slide-content p { max-width:380px; margin:0; color:#eff0e9; font-size:12px; line-height:1.6; }
        .td-slide-controls { position:absolute; z-index:2; top:17px; right:17px; display:flex; align-items:center; gap:6px; }
        .td-slide-controls button { display:grid; place-items:center; width:34px; height:34px; border:1px solid #ffffff8c; border-radius:50%; color:#fff; background:#182a2a3d; cursor:pointer; backdrop-filter:blur(5px); transition:background .18s,transform .18s; }
        .td-slide-controls button:hover { background:#fff; color:var(--ink); transform:translateY(-1px); }
        .td-slide-dots { position:absolute; z-index:2; left:28px; top:25px; display:flex; gap:6px; }
        .td-slide-dots button { width:19px; height:3px; padding:0; border:0; background:#ffffff79; cursor:pointer; transition:background .2s,width .2s; }
        .td-slide-dots button[aria-current='true'] { width:31px; background:#fff; }
        .td-curation-note { position:absolute; z-index:1; right:23px; top:23px; display:flex; align-items:center; gap:6px; padding:8px 10px; color:#f6f4ed; background:#19392e9c; border:1px solid #ffffff3b; border-radius:30px; font-size:9px; font-weight:600; backdrop-filter:blur(5px); }
        .td-section { padding:37px 0 0; }
        .td-section-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:19px; }
        .td-overline { color:#ad715b; font-size:9px; }
        .td-section-heading h2 { margin:8px 0 0; font-size:clamp(27px,3vw,36px); line-height:1.1; }
        .td-section-heading p { margin:8px 0 0; color:var(--muted); font-size:12px; line-height:1.6; }
        .td-view-all { display:inline-flex; flex:none; align-items:center; gap:7px; padding:6px 0; border:0; color:var(--pine); background:none; font-size:11px; font-weight:700; cursor:pointer; }
        .td-category-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--line); background:var(--surface); }
        .td-category { position:relative; display:grid; grid-template-columns:43px 1fr; align-items:center; gap:12px; min-height:113px; padding:18px; border:0; border-right:1px solid var(--line); color:var(--ink); text-align:left; background:transparent; cursor:pointer; transition:background .18s; }
        .td-category:last-child { border-right:0; }
        .td-category:hover,.td-category[aria-pressed='true'] { background:#edf3ed; }
        .td-category[aria-pressed='true']:after { content:''; position:absolute; left:18px; right:18px; bottom:0; height:2px; background:var(--pine); }
        .td-category-icon { display:grid; place-items:center; width:42px; height:42px; color:var(--pine); background:#e5eee7; border-radius:4px 14px 4px 4px; }
        .td-category-copy { min-width:0; }
        .td-category-copy strong { display:block; font:700 13px 'Manrope',sans-serif; }
        .td-category-copy small { display:block; margin-top:5px; color:#72807d; font-size:10px; line-height:1.45; }
        .td-category-count { display:block; margin-top:8px; color:#a57762; font-size:9px; font-weight:700; }
        .td-library { padding-top:68px; }
        .td-toolbar { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin:22px 0 19px; }
        .td-toolbar-search { height:43px; display:flex; flex:1; min-width:210px; align-items:center; gap:9px; padding:0 12px; background:var(--surface); border:1px solid var(--line); border-radius:3px 12px 3px 3px; }
        .td-toolbar-search svg { color:#788783; flex:none; }
        .td-toolbar-search input { min-width:0; width:100%; border:0; outline:0; background:transparent; color:var(--ink); font-size:11px; }
        .td-select-wrap { position:relative; display:flex; align-items:center; }
        .td-select-wrap svg { position:absolute; right:12px; pointer-events:none; color:#71807c; }
        .td-select { appearance:none; min-height:43px; min-width:142px; padding:0 33px 0 12px; border:1px solid var(--line); border-radius:3px 12px 3px 3px; outline-color:#77a092; color:#455c58; background:var(--surface); font-size:11px!important; cursor:pointer; }
        .td-filter-label { display:flex; align-items:center; gap:6px; color:#86918e; font-size:10px; font-weight:700; }
        .td-result-line { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 13px; color:#7d8985; font-size:10px; }
        .td-active-filter { display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border:1px solid #d6e2d9; color:var(--pine); background:#edf3ed; border-radius:20px; font-weight:700; }
        .td-reset { border:0; color:#74827e; background:none; text-decoration:underline; cursor:pointer; font-size:10px; }
        .td-resource-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:17px; }
        .td-resource-card { min-width:0; overflow:hidden; background:var(--surface); border:1px solid var(--line); transition:transform .22s,box-shadow .22s; }
        .td-resource-card:hover { transform:translateY(-3px); box-shadow:0 14px 28px #1d39300f; }
        .td-card-image { position:relative; height:190px; overflow:hidden; background:#dfe7df; }
        .td-card-image img { width:100%; height:100%; display:block; object-fit:cover; transition:transform .45s; }
        .td-resource-card:hover .td-card-image img { transform:scale(1.035); }
        .td-format { position:absolute; top:12px; left:12px; padding:6px 8px; color:#314b43; background:#fffef2e8; font-size:9px; font-weight:800; letter-spacing:.08em; }
        .td-card-body { padding:16px 17px 14px; }
        .td-card-meta { display:flex; align-items:center; justify-content:space-between; gap:10px; color:#a17760; font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
        .td-card-meta span:last-child { color:#929c97; font-weight:600; letter-spacing:0; text-transform:none; }
        .td-card-body h3 { margin:10px 0 6px; font-size:17px; line-height:1.27; }
        .td-card-body p { min-height:54px; margin:0; color:#6e7b77; font-size:11px; line-height:1.65; }
        .td-card-bottom { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:15px; padding-top:11px; border-top:1px solid #e8ece7; }
        .td-source { display:flex; align-items:center; gap:6px; color:#667570; font-size:9px; font-weight:600; }
        .td-source-mark { display:grid; place-items:center; width:19px; height:19px; border-radius:6px 6px 6px 2px; color:#f9f6eb; background:var(--pine); font:800 7px 'Manrope',sans-serif; }
        .td-download-count { display:flex; align-items:center; gap:5px; color:#82908a; font-size:9px; }
        .td-card-link { display:flex; width:100%; justify-content:space-between; align-items:center; margin-top:12px; padding:0; border:0; color:var(--pine); background:none; cursor:pointer; text-align:left; font-size:10px; font-weight:700; }
        .td-card-link:hover { color:var(--pine-dark); }
        .td-empty { display:grid; place-items:center; min-height:270px; padding:40px; border:1px dashed #cbd8ce; background:#f9f9f3; text-align:center; }
        .td-empty-icon { display:grid; place-items:center; width:46px; height:46px; margin:0 auto 12px; border-radius:50%; color:var(--pine); background:#e5eee7; }
        .td-empty h3 { margin:0; font-size:18px; }
        .td-empty p { max-width:350px; margin:8px 0 15px; color:var(--muted); font-size:11px; line-height:1.6; }
        .td-principle { display:grid; grid-template-columns:1fr auto; align-items:center; gap:26px; margin:65px 0 56px; padding:30px 34px; color:#f5f2e8; background:#203b35; border-radius:4px 30px 4px 4px; }
        .td-principle-tag { color:#d7c5a6; font-size:9px; letter-spacing:.16em; font-weight:800; text-transform:uppercase; }
        .td-principle h2 { margin:9px 0 7px; font-size:clamp(23px,3vw,32px); }
        .td-principle p { max-width:690px; margin:0; color:#d0dad2; font-size:12px; line-height:1.7; }
        .td-principle-icon { display:grid; place-items:center; width:59px; height:59px; border:1px solid #789187; border-radius:50%; color:#e3d4b9; }
        .td-footer { border-top:1px solid var(--line); }
        .td-footer-inner { display:flex; justify-content:space-between; gap:20px; padding:23px 0 28px; color:#77837f; font-size:10px; }
        .td-footer a { display:flex; align-items:center; gap:6px; color:var(--pine); text-decoration:none; font-weight:700; }
        .td-modal-backdrop { position:fixed; z-index:20; inset:0; display:grid; place-items:center; padding:20px; background:#142621a8; }
        .td-modal { position:relative; display:grid; grid-template-columns:1fr 1fr; width:min(760px,100%); max-height:min(620px,calc(100dvh - 40px)); overflow:auto; background:var(--paper); box-shadow:0 24px 70px #101d1b4d; }
        .td-modal-image { min-height:370px; width:100%; height:100%; object-fit:cover; }
        .td-modal-copy { align-self:center; padding:35px; }
        .td-modal-close { position:absolute; z-index:2; top:12px; right:12px; display:grid; place-items:center; width:36px; height:36px; border:1px solid #dbe1db; background:#fffef2; color:var(--ink); cursor:pointer; }
        .td-modal-copy h2 { margin:11px 0 10px; font-size:30px; line-height:1.1; }
        .td-modal-copy p { color:var(--muted); font-size:12px; line-height:1.7; }
        .td-modal-note { display:flex; gap:8px; align-items:flex-start; margin:20px 0; padding:11px; color:#4e6e5c; background:#e7efe7; font-size:10px; line-height:1.5; }
        .td-ready { display:flex; align-items:center; gap:7px; margin-top:11px; color:var(--pine); font-size:10px; font-weight:700; }
        @media(max-width:900px) {
          .td-hero { grid-template-columns:1fr 0.9fr; gap:30px; padding-top:48px; }
          .td-slide { min-height:330px; }
          .td-category { grid-template-columns:36px 1fr; gap:9px; padding:14px; }
          .td-category-icon { width:36px; height:36px; }
          .td-resource-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:650px) {
          .td-shell { width:calc(100% - 36px); }
          .td-header { min-height:65px; flex-wrap:wrap; gap:10px; }
          .td-menu { display:grid; }
          .td-header-actions { gap:10px; }
          .td-nav { display:none; order:4; width:100%; align-items:stretch; flex-direction:column; gap:0; padding:4px 0 12px; border-top:1px solid var(--line); }
          .td-nav.is-open { display:flex; }
          .td-nav a { padding:11px 2px; }
          .td-login { display:none; }
          .td-register { min-height:35px; padding:0 12px; font-size:10px; }
          .td-breadcrumb { height:44px; font-size:10px; }
          .td-breadcrumb-status { font-size:0; }
          .td-breadcrumb-status svg { width:15px; height:15px; }
          .td-hero { grid-template-columns:1fr; gap:28px; padding:41px 0 32px; }
          .td-hero h1 { max-width:500px; font-size:clamp(46px,12vw,66px); }
          .td-intro { font-size:13px; }
          .td-hero-search { height:51px; margin-top:20px; }
          .td-search-hint { display:none; }
          .td-slide { min-height:310px; height:72vw; max-height:390px; }
          .td-slide-content { left:20px; right:20px; bottom:22px; }
          .td-slide-dots { left:20px; top:24px; }
          .td-curation-note { right:15px; top:17px; }
          .td-section { padding-top:28px; }
          .td-section-heading { align-items:flex-start; }
          .td-section-heading h2 { font-size:28px; }
          .td-category-strip { grid-template-columns:1fr 1fr; }
          .td-category { min-height:100px; border-bottom:1px solid var(--line); }
          .td-category:nth-child(2) { border-right:0; }
          .td-category:nth-child(n+3) { border-bottom:0; }
          .td-library { padding-top:48px; }
          .td-toolbar { display:grid; grid-template-columns:1fr 1fr; }
          .td-toolbar-search { grid-column:1 / -1; }
          .td-select-wrap,.td-select { width:100%; }
          .td-filter-label { grid-column:1 / -1; }
          .td-resource-grid { grid-template-columns:1fr; gap:13px; }
          .td-card-image { height:205px; }
          .td-card-body p { min-height:0; }
          .td-principle { grid-template-columns:1fr; gap:16px; margin:45px 0 39px; padding:23px; }
          .td-principle-icon { width:44px; height:44px; }
          .td-footer-inner { flex-direction:column; padding:19px 0 24px; }
          .td-modal { grid-template-columns:1fr; }
          .td-modal-image { height:190px; min-height:0; }
          .td-modal-copy { padding:24px; }
          .td-modal-copy h2 { font-size:25px; }
        }
        @media(prefers-reduced-motion:reduce) {
          .td-refresh *, .td-refresh *:before, .td-refresh *:after { scroll-behavior:auto!important; animation-duration:.01ms!important; transition-duration:.01ms!important; }
        }
      `}</style>

      <header className="td-shell td-header">
        <a className="td-brand" href="#top" aria-label="Taskdrip home">
          <span className="td-brand-mark">TD</span>Taskdrip
        </a>
        <nav className={`td-nav${mobileNav ? " is-open" : ""}`} aria-label="Main navigation">
          <a href="#top" onClick={() => setMobileNav(false)}>Home</a>
          <a href="#td-library" onClick={() => setMobileNav(false)}>Free downloads</a>
          <a href="#td-categories" onClick={() => setMobileNav(false)}>Categories <ChevronDown size={12} /></a>
          <a href="#td-community" onClick={() => setMobileNav(false)}>Request a resource</a>
        </nav>
        <div className="td-header-actions">
          <a className="td-login" href="#td-community">Log in</a>
          <a className="td-register" href="#td-community">Join Taskdrip</a>
          <button className="td-menu" type="button" aria-label={mobileNav ? "Close navigation" : "Open navigation"} onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      <div className="td-shell td-breadcrumb" id="top">
        <span className="td-mark-small">TD</span><span>/</span><span>Resource library</span>
        <span className="td-breadcrumb-status"><ShieldCheck size={14} /> Permission-led resources</span>
      </div>

      <div className="td-shell">
        <section className="td-hero" aria-label="Taskdrip resource library">
          <div>
            <div className="td-eyebrow">The Taskdrip resource library</div>
            <h1>Useful things.<br /><em>Ready when you are.</em></h1>
            <p className="td-intro">Find free software, AI tools, templates and learning resources chosen to help Nigerian creators and small teams do their next bit of good work.</p>
            <label className="td-hero-search">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && goToLibrary()} placeholder="Search tools, templates and guides" aria-label="Search resources" />
              <span className="td-search-hint">Try “planner”</span>
            </label>
            <div className="td-hero-links">
              <button className="td-primary" type="button" onClick={() => goToLibrary()}>Explore the library <ArrowRight size={15} /></button>
              <button className="td-text-action" type="button" onClick={() => document.getElementById("td-categories")?.scrollIntoView({ behavior: "smooth" })}>Browse categories <ArrowDownAZ size={14} /></button>
            </div>
          </div>

          <div className="td-slide" aria-roledescription="carousel" aria-label="Featured resource categories">
            {slides.map((item, index) => (
              <img
                key={item.image}
                className="td-slide-image"
                src={item.image}
                alt={item.title}
                style={{ opacity: slide === index ? 1 : 0, zIndex: slide === index ? 0 : -1 }}
              />
            ))}
            <div className="td-slide-shade" />
            <span className="td-curation-note"><ShieldCheck size={13} /> Selected for usefulness</span>
            <div className="td-slide-dots" aria-label="Choose featured slide">
              {slides.map((item, index) => (
                <button key={item.label} type="button" aria-label={`Show slide ${index + 1}`} aria-current={slide === index} onClick={() => setSlide(index)} />
              ))}
            </div>
            <div className="td-slide-controls">
              <button type="button" aria-label="Previous featured slide" onClick={() => setSlide((slide + slides.length - 1) % slides.length)}><ArrowLeft size={15} /></button>
              <button type="button" aria-label="Next featured slide" onClick={() => setSlide((slide + 1) % slides.length)}><ArrowRight size={15} /></button>
            </div>
            <div className="td-slide-content" key={slides[slide].label}>
              <span className="td-slide-label">{slides[slide].label}</span>
              <h2>{slides[slide].title}</h2>
              <p>{slides[slide].caption}</p>
            </div>
          </div>
        </section>

        <section className="td-section" id="td-categories">
          <div className="td-section-heading">
            <div><span className="td-overline">Start with what you need</span><h2>Browse by category</h2><p>A few good places to begin.</p></div>
            <button className="td-view-all" type="button" onClick={() => goToLibrary()}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="td-category-strip">
            {categories.map(({ name, count, description, icon: Icon }) => (
              <button className="td-category" key={name} type="button" aria-pressed={category === name} onClick={() => goToLibrary(name)}>
                <span className="td-category-icon"><Icon size={19} strokeWidth={1.7} /></span>
                <span className="td-category-copy"><strong>{name}</strong><small>{description}</small><span className="td-category-count">{count} resources</span></span>
              </button>
            ))}
          </div>
        </section>

        <section className="td-section td-library" id="td-library">
          <div className="td-section-heading">
            <div><span className="td-overline">The library</span><h2>Find your next useful thing</h2><p>Practical resources, gathered in one considered place.</p></div>
            <button className="td-view-all" type="button" onClick={() => { setCategory("All resources"); setFormat("Any format"); setSearch(""); }}>Reset collection <ArrowRight size={14} /></button>
          </div>
          <div className="td-toolbar">
            <label className="td-toolbar-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection" aria-label="Search the collection" /></label>
            <span className="td-filter-label"><Filter size={14} /> Refine</span>
            <label className="td-select-wrap">
              <select className="td-select" value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Filter by format">
                <option>Any format</option><option>PDF</option><option>ZIP</option><option>Guide</option>
              </select><ChevronDown size={14} />
            </label>
            <label className="td-select-wrap">
              <select className="td-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort resources">
                <option>Recently added</option><option>Most downloaded</option>
              </select><ChevronDown size={14} />
            </label>
          </div>
          <div className="td-result-line">
            <span>{visibleResources.length} {visibleResources.length === 1 ? "resource" : "resources"} to explore</span>
            <span>{category !== "All resources" ? <span className="td-active-filter">{category}<button className="td-reset" type="button" onClick={() => setCategory("All resources")}>×</button></span> : "Curated for immediate use"}</span>
          </div>
          {visibleResources.length ? (
            <div className="td-resource-grid">
              {visibleResources.map((item) => (
                <article className="td-resource-card" key={item.title}>
                  <div className="td-card-image"><img src={item.image} alt="" /><span className="td-format">{item.format}</span></div>
                  <div className="td-card-body">
                    <div className="td-card-meta"><span>{item.category}</span><span>{item.kind}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="td-card-bottom">
                      <span className="td-source"><span className="td-source-mark">TD</span>Taskdrip library</span>
                      <span className="td-download-count"><Download size={12} /> {item.count.toLocaleString()}</span>
                    </div>
                    <button className="td-card-link" type="button" onClick={() => openResource(item)}>View resource details <ArrowUpRight size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="td-empty">
              <div><span className="td-empty-icon"><Search size={20} /></span><h3>Nothing in this shelf yet.</h3><p>Try another search or clear a filter to see more of the library.</p><button className="td-primary" type="button" onClick={() => { setSearch(""); setCategory("All resources"); setFormat("Any format"); }}>Clear filters</button></div>
            </div>
          )}
        </section>

        <section className="td-principle" id="td-community">
          <div>
            <span className="td-principle-tag">A library with a point of view</span>
            <h2>Useful first. Noise, never.</h2>
            <p>Every resource here is selected for a clear purpose and shared with permission. Have something practical to recommend? Tell us what would help your work.</p>
          </div>
          <a className="td-primary" href="mailto:hello@taskdrip.com">Suggest a resource <ArrowUpRight size={14} /></a>
        </section>
      </div>

      <footer className="td-footer">
        <div className="td-shell td-footer-inner"><span>Taskdrip resource library · Useful things, shared with permission.</span><a href="#top">Back to top <ArrowUpRight size={13} /></a></div>
      </footer>

      {selected && (
        <div className="td-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="td-modal" role="dialog" aria-modal="true" aria-labelledby="td-modal-title">
            <button className="td-modal-close" type="button" aria-label="Close resource details" onClick={() => setSelected(null)}><X size={17} /></button>
            <img className="td-modal-image" src={selected.image} alt="" />
            <div className="td-modal-copy">
              <span className="td-overline">{selected.category} · {selected.format}</span>
              <h2 id="td-modal-title">{selected.title}</h2>
              <p>{selected.description}</p>
              <div className="td-modal-note"><ShieldCheck size={15} /> Shared as a practical resource for creators and small teams.</div>
              <button className="td-primary" type="button" onClick={() => setDownloadReady(true)}>{downloadReady ? "Resource ready" : "Get this resource"} {downloadReady ? <Check size={14} /> : <Download size={14} />}</button>
              {downloadReady && <span className="td-ready"><Check size={13} /> Demo state: resource selected and ready.</span>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
