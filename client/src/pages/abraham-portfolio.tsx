import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

const PORTFOLIO_PATH = "/abraham-tahbat";

type PortfolioProfile = {
  name: string;
  eyebrow: string;
  headline: string;
  summary: string;
  bio: string;
  location: string;
  email: string;
  portraitUrl: string;
  cvUrl: string;
  socialLinks: Array<{ label: string; url: string }>;
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

const fallbackProfile: PortfolioProfile = {
  name: "Abraham Felix Tahbat",
  eyebrow: "Full-Stack AI SaaS Developer · Product Architect · Lawyer",
  headline: "I turn ambitious ideas into useful digital products.",
  summary: "A product-minded engineer and digital transformation consultant building scalable SaaS platforms, AI-powered tools, marketplaces, and business systems.",
  bio: "I am Abraham Felix Tahbat, a full-stack developer with 14+ years of web development experience, building professionally since 2012.",
  location: "Nigeria · Working globally",
  email: "tremendouslymax@gmail.com",
  portraitUrl: "/api/portfolio-assets/portrait",
  cvUrl: "/api/portfolio-assets/cv",
  socialLinks: [],
  skills: [],
  services: [],
};

function isInternalLink(url: string) {
  return url.startsWith("/");
}

function ProjectImage({ project, className = "" }: { project: PortfolioProject; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      <img
        src={project.imageUrl}
        alt={`${project.title} project preview`}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/70 via-transparent to-cyan-300/10" />
    </div>
  );
}

function PublicHeader({ profile }: { profile: PortfolioProfile }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href={PORTFOLIO_PATH} className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">AT / portfolio</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Build with purpose</div>
          </div>
        </Link>
        <nav className={`${open ? "absolute left-4 right-4 top-[74px] flex" : "hidden"} flex-col gap-1 rounded-2xl border border-white/10 bg-slate-900 p-2 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0`}>
          <a href={`${PORTFOLIO_PATH}#work`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Work</a>
          <a href={`${PORTFOLIO_PATH}#about`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">About</a>
          <a href={`${PORTFOLIO_PATH}#contact`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Contact</a>
          <a href={profile.cvUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 md:mt-0">
            <Download className="h-4 w-4" /> View CV
          </a>
        </nav>
        <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)} className="rounded-xl border border-white/10 p-2 text-slate-300 md:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}

function SocialLinks({ links }: { links: PortfolioProfile["socialLinks"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-200/40 hover:text-cyan-100">
          {link.label.toLowerCase().includes("linkedin") ? <Linkedin className="h-3.5 w-3.5" /> : link.label.toLowerCase().includes("github") ? <Github className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
          {link.label}
        </a>
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <Link href={`${PORTFOLIO_PATH}/${project.slug}`} className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/40 hover:bg-white/[0.07]">
      <ProjectImage project={project} className="aspect-[16/10]" />
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">{project.category}</p>
            <h3 className="text-xl font-bold tracking-tight text-white">{project.title}</h3>
          </div>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
        </div>
        <p className="min-h-[3.5rem] text-sm leading-6 text-slate-400">{project.summary}</p>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500">
          <span>{project.year}</span>
          <span className="flex items-center gap-1 font-semibold text-slate-300">View case study <ChevronRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </Link>
  );
}

function LoadingState() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Loading portfolio…</div>;
}

function PortfolioHome({ profile, projects }: { profile: PortfolioProfile; projects: PortfolioProject[] }) {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <PublicHeader profile={profile} />
      <main>
        <section className="relative isolate overflow-hidden px-5 pb-20 pt-36 sm:pb-28 lg:px-8 lg:pt-48">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_5%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_10%_45%,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
                <span className="h-px w-10 bg-cyan-300" /> {profile.eyebrow}
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-7xl lg:text-[6.6rem]">{profile.headline}</h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">{profile.summary}</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="#work" className="rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200">Explore selected work</a>
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-white transition hover:border-cyan-200/50 hover:bg-white/5"><Mail className="h-4 w-4" /> Start a conversation</a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-200" /> {profile.location}</span>
                <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-cyan-200" /> 14+ years building</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:justify-self-end">
              <div className="absolute -inset-5 rounded-[3rem] border border-cyan-200/10 bg-cyan-300/5 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-900 p-3 shadow-2xl shadow-cyan-950/40">
                <img src={profile.portraitUrl} alt={profile.name} className="aspect-[0.9] w-full rounded-[2rem] object-cover object-top" />
                <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/15 bg-slate-950/80 p-4 backdrop-blur-xl">
                  <p className="text-sm font-bold text-white">{profile.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Product-minded engineering from idea to launch.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="scroll-mt-24 border-t border-white/10 px-5 py-20 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Selected work</p>
                <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Products with a point of view.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-500">{projects.length} projects across SaaS, AI, legal technology, marketplaces, education, and creator tools.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((project) => <ProjectCard key={project.slug} project={project} />)}
            </div>
            {rest.length > 0 && (
              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((project) => <ProjectCard key={project.slug} project={project} />)}
              </div>
            )}
          </div>
        </section>

        <section id="about" className="scroll-mt-24 border-t border-white/10 bg-white/[0.025] px-5 py-20 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">A little context</p>
              <h2 className="max-w-md text-4xl font-black tracking-[-0.04em] sm:text-5xl">Technical depth, business awareness.</h2>
              <div className="mt-8"><SocialLinks links={profile.socialLinks} /></div>
            </div>
            <div>
              <p className="text-lg leading-8 text-slate-300">{profile.bio}</p>
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Capabilities</h3>
                  <div className="flex flex-wrap gap-2">{profile.skills.map((skill) => <span key={skill} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">{skill}</span>)}</div>
                </div>
                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Ways I help</h3>
                  <ul className="space-y-3">{profile.services.map((service) => <li key={service} className="flex gap-2 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />{service}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </section>

         <section id="cv" className="scroll-mt-24 border-t border-white/10 px-5 py-20 sm:py-28 lg:px-8">
           <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
             <div>
               <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">For recruiters</p>
               <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">See the experience behind the work.</h2>
               <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Review Abraham’s current CV directly on this page, or open the PDF in a new tab to save and share it.</p>
               <div className="mt-7 flex flex-wrap gap-3">
                 <a href={profile.cvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"><FileText className="h-4 w-4" /> Open full CV</a>
                 <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-200/50 hover:bg-white/5">Discuss a role</a>
               </div>
             </div>
             <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-cyan-950/20">
               <iframe src={profile.cvUrl} title={`${profile.name} CV`} className="h-[560px] w-full rounded-[1.5rem] bg-white sm:h-[700px]" />
             </div>
           </div>
         </section>

         <section id="contact" className="scroll-mt-24 px-5 py-20 sm:py-28 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/10 to-blue-500/5 p-8 sm:p-12 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Have a product in mind?</p>
              <h2 className="max-w-2xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">Let’s make the next useful thing.</h2>
              <p className="mt-4 max-w-xl text-slate-400">Tell me what you are building, what is getting in the way, and where you want to go next.</p>
            </div>
            <a href={`mailto:${profile.email}`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-100"><Mail className="h-4 w-4" /> {profile.email}</a>
          </div>
        </section>
      </main>
       <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-slate-600 lg:px-8">© {new Date().getFullYear()} {profile.name}. Product, technology, and transformation.</footer>
    </div>
  );
}

function PortfolioDetail({ profile, project }: { profile: PortfolioProfile; project: PortfolioProject }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:pt-40 lg:px-8">
        <Link href={`${PORTFOLIO_PATH}#work`} className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> Back to selected work</Link>
        <div className="max-w-4xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">{project.category} · {project.year}</p>
          <h1 className="text-5xl font-black tracking-[-0.055em] sm:text-7xl">{project.title}</h1>
          <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-400">{project.summary}</p>
        </div>
        <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/10">
          <ProjectImage project={project} className="aspect-[16/7]" />
        </div>
        <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-lg leading-8 text-slate-300">{project.description}</p>
            <h2 className="mt-12 text-2xl font-bold">What this work focused on</h2>
            <ul className="mt-5 space-y-4">{project.outcomes.map((outcome) => <li key={outcome} className="flex gap-3 text-slate-300"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cyan-200" />{outcome}</li>)}</ul>
          </div>
          <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">My role</p>
            <p className="mt-3 text-sm leading-6 text-white">{project.role}</p>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Technologies & craft</p>
            <div className="mt-4 flex flex-wrap gap-2">{project.technologies.map((technology) => <span key={technology} className="rounded-full bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">{technology}</span>)}</div>
            {project.liveUrl && (
              isInternalLink(project.liveUrl)
                ? <Link href={project.liveUrl} className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Visit live experience <ArrowUpRight className="h-4 w-4" /></Link>
                : <a href={project.liveUrl} target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Visit live experience <ArrowUpRight className="h-4 w-4" /></a>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function AbrahamPortfolio() {
  const [canonicalDetailMatch, canonicalParams] = useRoute<{ slug: string }>(`${PORTFOLIO_PATH}/:slug`);
  const [legacyDetailMatch, legacyParams] = useRoute<{ slug: string }>("/portfolio/:slug");
  const detailMatch = canonicalDetailMatch || legacyDetailMatch;
  const params = canonicalDetailMatch ? canonicalParams : legacyParams;
  const endpoint = detailMatch && params?.slug ? `/api/abraham-portfolio/${params.slug}` : "/api/abraham-portfolio";
  const { data, isLoading, isError } = useQuery<any>({ queryKey: [endpoint] });

  useEffect(() => {
    document.title = detailMatch && data?.project ? `${data.project.title} · Abraham Tahbat` : "Abraham Tahbat · Product & Software Portfolio";
  }, [data?.project, detailMatch]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-center text-slate-300">This portfolio is temporarily unavailable.</div>;
  const profile = {
    ...fallbackProfile,
    ...(data.profile || {}),
    socialLinks: Array.isArray(data.profile?.socialLinks) ? data.profile.socialLinks : fallbackProfile.socialLinks,
    skills: Array.isArray(data.profile?.skills) ? data.profile.skills : fallbackProfile.skills,
    services: Array.isArray(data.profile?.services) ? data.profile.services : fallbackProfile.services,
  };
  if (detailMatch) return data.project ? <PortfolioDetail profile={profile} project={data.project} /> : null;
  return <PortfolioHome profile={profile} projects={Array.isArray(data.projects) ? data.projects : []} />;
}