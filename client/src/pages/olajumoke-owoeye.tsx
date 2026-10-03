import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlay,
  Download,
  Mail,
  Menu,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { SiTiktok, SiWhatsapp } from "react-icons/si";
import { SeoHead } from "@/components/SeoHead";

const PORTFOLIO_URL = "https://taskdrip.online/olajumoke-owoeye";
const CV_URL = "/portfolio/olajumoke-owoeye-cv.pdf";
const EMAIL = "owoeyeolajumokeoluwatosin@gmail.com";
const WHATSAPP = "2348101126365";

const projects = [
  {
    number: "01",
    name: "Breedskool Galaxy",
    type: "Learning · Creator economy",
    role: "Content developer · Social media manager",
    date: "2020 — Present",
    description:
      "Developing content and managing social channels for an online learning community, with creative support for projects delivered to its clients.",
    url: "https://breedskool.com",
    image: "/portfolio/projects/breedskool-learning.jpg",
    initials: "BG",
  },
  {
    number: "02",
    name: "The Industry Miner",
    type: "Entrepreneurship · Education",
    role: "Content & social media",
    date: "Project work",
    description:
      "A training and mentoring platform helping entrepreneurs access the skills, tools and support to grow in the marketplace.",
    url: "https://theindustryminer.com/",
    image: "/portfolio/projects/industry-miner.jpg",
    initials: "IM",
  },
  {
    number: "03",
    name: "Taskdrip",
    type: "Influencer marketing · Marketplace",
    role: "Content creator · Social media manager",
    date: "Project work",
    description:
      "Creating content for a marketplace that connects brands with creators and influencers for targeted campaigns.",
    url: "https://taskdrip.online/",
    image: "/portfolio/projects/taskdrip-creators.jpg",
    initials: "TD",
  },
  {
    number: "04",
    name: "Beagvs Marine",
    type: "Marine · Logistics · Marketplace",
    role: "Social media manager · Content creator",
    date: "2025 — Present",
    description:
      "Supporting content and social media for a shipping and logistics platform with marketplace services.",
    url: "https://beagvsmarine.com/",
    image: "/portfolio/projects/beagvs-marine.jpg",
    initials: "BM",
  },
  {
    number: "05",
    name: "Proprenty",
    type: "Property management · Real estate",
    role: "Web management · Social media team",
    date: "Current",
    description:
      "Part of the web management and social media team for a property platform connecting landlords, tenants, managers and maintenance professionals.",
    url: "https://proprenty.online/",
    image: "/portfolio/projects/proprenty.jpg",
    initials: "PR",
  },
  {
    number: "06",
    name: "Hernique’s Touch Makeover",
    type: "Beauty · TikTok",
    role: "Social media manager",
    date: "TikTok",
    description:
      "Managing social media content for the makeover brand.",
    url: "https://www.tiktok.com/@muainibadan1",
    image: "/portfolio/projects/hernique-touch-makeover.jpg",
    initials: "HT",
  },
  {
    number: "07",
    name: "Hernique’s Kiddies Wears",
    type: "Children’s fashion · TikTok",
    role: "Social media manager",
    date: "TikTok",
    description:
      "Managing social content for a children’s clothing brand.",
    url: "https://www.tiktok.com/@herniquekiddieswears1",
    image: "/portfolio/projects/hernique-kiddies-wears.jpg",
    initials: "HK",
  },
];

const services = [
  "Content creation",
  "Social media management",
  "Marketing strategy",
  "Website & web content",
  "Other",
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d9ded2] bg-white px-4 py-3 text-sm text-[#1b2119] outline-none transition placeholder:text-[#90968b] focus:border-[#6c8127] focus:ring-2 focus:ring-[#d7ec78]/50";

type Inquiry = {
  name: string;
  service: string;
  budget: string;
  projectBrief: string;
};

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-[#e5e8e0] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#b9c58d] hover:shadow-[0_18px_50px_rgba(31,42,24,0.09)]">
      <div className="relative flex min-h-[184px] items-end justify-between overflow-hidden bg-[#25311d] p-5 sm:p-6">
        <img
          src={project.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#182116]/45 via-[#182116]/20 to-[#182116]/75" />
        <span className="relative z-10 max-w-[70%] text-xs font-bold uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          {project.type}
        </span>
        <span className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/85 text-lg font-black tracking-tight text-[#20261c] shadow-sm backdrop-blur-sm">
          {project.initials}
        </span>
        <span className="absolute left-6 top-5 text-[11px] font-bold tracking-[0.2em] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
          {project.number}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-[#1b2119]">{project.name}</h3>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Visit ${project.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e4e7df] text-[#3f5120] transition hover:border-[#3f5120] hover:bg-[#3f5120] hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#71805a]">{project.role}</p>
        <p className="mt-4 flex-1 text-sm leading-6 text-[#666c61]">{project.description}</p>
        <div className="mt-5 border-t border-[#edf0e9] pt-4 text-xs font-medium text-[#7b8177]">{project.date}</div>
      </div>
    </article>
  );
}

export default function OlajumokeOwoeyePortfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    service: "",
    budget: "",
    projectBrief: "",
    website: "",
  });

  const whatsappUrl = useMemo(() => {
    if (!inquiry) return `https://wa.me/${WHATSAPP}`;
    const message = [
      "Hi Olajumoke, I just sent an enquiry through your portfolio.",
      `Name: ${inquiry.name}`,
      `Service: ${inquiry.service}`,
      `Budget: ${inquiry.budget}`,
      `Project brief: ${inquiry.projectBrief}`,
    ].join("\n");
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
  }, [inquiry]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setFormError("");
    setIsSending(true);
    try {
      const response = await fetch("/api/portfolio/olajumoke-owoeye/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Your message could not be sent. Please try again.");
      setInquiry({
        name: form.name.trim(),
        service: form.service,
        budget: form.budget.trim(),
        projectBrief: form.projectBrief.trim(),
      });
      setForm({ name: "", email: "", service: "", budget: "", projectBrief: "", website: "" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f5] font-sans text-[#1b2119]">
      <SeoHead
        title="Olajumoke Owoeye | Content Creator & Social Media Manager"
        description="Explore the work of Olajumoke Owoeye, a content creator, social media manager and marketing professional based in Ibadan, Nigeria."
        keywords="Olajumoke Owoeye, content creator, social media manager, marketing strategist, Ibadan"
        ogImage="/portfolio/olajumoke-owoeye.jpg"
        canonicalUrl={PORTFOLIO_URL}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Olajumoke Owoeye",
          jobTitle: "Content Creator and Social Media Manager",
          email: EMAIL,
          telephone: "+2348101126365",
          image: `${window.location.origin}/portfolio/olajumoke-owoeye.jpg`,
          url: PORTFOLIO_URL,
          address: { "@type": "PostalAddress", addressLocality: "Ibadan", addressCountry: "NG" },
        }}
      />

      <div className="bg-[#25311d] px-4 py-2 text-center text-[11px] font-semibold tracking-[0.12em] text-[#e8f2cb] sm:text-xs">
        CONTENT, COMMUNITY & CAMPAIGNS — MADE WITH INTENTION
      </div>

      <header className="relative z-20 border-b border-[#e8ebe4] bg-[#f8f9f5]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Olajumoke Owoeye home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7ec78] text-sm font-black text-[#26311f]">OO</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight">Olajumoke Owoeye</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#78816d]">Creative portfolio</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a className="text-sm font-medium text-[#62695d] transition hover:text-[#35451c]" href="#work">Selected work</a>
            <a className="text-sm font-medium text-[#62695d] transition hover:text-[#35451c]" href="#about">About</a>
            <a className="text-sm font-medium text-[#62695d] transition hover:text-[#35451c]" href="#experience">Experience</a>
            <a className="rounded-full bg-[#25311d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3b4b29]" href="#contact">Let’s talk <ArrowRight className="ml-1 inline h-4 w-4" /></a>
          </nav>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe3d9] md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 border-t border-[#e8ebe4] bg-[#f8f9f5] px-5 py-3 md:hidden" aria-label="Mobile navigation">
            {[["Selected work", "#work"], ["About", "#about"], ["Experience", "#experience"], ["Contact", "#contact"]].map(([label, href]) => (
              <a key={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-[#eef1e8]" href={href}>{label}</a>
            ))}
          </nav>
        )}
      </header>

      <main id="home">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-20">
          <div className="order-2 lg:order-1">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dfe5d2] bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#52662d]">
              <Sparkles className="h-3.5 w-3.5" /> Content creator · Social media manager
            </div>
            <h1 className="max-w-3xl text-[clamp(3.1rem,9vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-[#1b2119]">
              Olajumoke
              <span className="mt-1 block font-serif font-normal italic tracking-[-0.055em] text-[#728438]">Owoeye.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#62695d] sm:text-xl sm:leading-9">
              I help brands find their voice, create thoughtful content, and build a more consistent presence across social media.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#work" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25311d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3b4b29]">
                Explore my work <ArrowDown className="h-4 w-4" />
              </a>
              <a href={CV_URL} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d7ddd0] bg-white px-6 py-3 text-sm font-semibold text-[#26311f] transition hover:border-[#829344]">
                <Download className="h-4 w-4" /> Download my CV
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#697064]">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#7e9a30]" /> Ibadan, Nigeria</span>
              <a className="inline-flex items-center gap-2 transition hover:text-[#35451c]" href={`mailto:${EMAIL}`}><Mail className="h-4 w-4" /> Email me</a>
              <a className="inline-flex items-center gap-2 transition hover:text-[#35451c]" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer"><SiWhatsapp className="h-4 w-4" /> WhatsApp</a>
            </div>
          </div>
          <div className="order-1 relative mx-auto w-full max-w-[520px] lg:order-2">
            <div className="absolute -right-3 top-10 h-32 w-32 rounded-full bg-[#e8edcf] sm:-right-5 sm:h-44 sm:w-44" />
            <div className="absolute -bottom-5 -left-4 h-32 w-32 rounded-full border border-[#cbd3b7] sm:-left-8 sm:h-44 sm:w-44" />
            <div className="relative aspect-[0.92] overflow-hidden rounded-[44%_44%_1.5rem_1.5rem] bg-[#e7e8df]">
              <img
                src="/portfolio/olajumoke-owoeye.jpg"
                alt="Portrait of Olajumoke Owoeye"
                className="h-full w-full object-cover object-center"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#10120e]/35 to-transparent" />
            </div>
            <div className="absolute -bottom-5 right-1 max-w-[240px] rounded-2xl border border-[#e6e9e1] bg-white p-4 shadow-[0_16px_44px_rgba(31,42,24,0.1)] sm:bottom-6 sm:-right-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#78816d]">A little about my work</p>
              <p className="mt-1.5 text-sm font-semibold leading-5 text-[#283122]">Clear ideas. Human stories. Consistent presence.</p>
            </div>
          </div>
        </section>

        <div className="border-y border-[#e5e9df] bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-6 sm:px-8 lg:px-12">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#83897d]">Experience across</span>
            <span className="text-sm font-semibold text-[#4d5742]">Education</span>
            <span className="text-sm font-semibold text-[#4d5742]">Creator platforms</span>
            <span className="text-sm font-semibold text-[#4d5742]">Property</span>
            <span className="text-sm font-semibold text-[#4d5742]">Marine & logistics</span>
            <span className="text-sm font-semibold text-[#4d5742]">Beauty & fashion</span>
          </div>
        </div>

        <section id="work" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.19em] text-[#73863a]">Selected work</p>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Different brands. One thoughtful approach.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#697064]">A selection of the teams, platforms and businesses I’ve supported with content and social media.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => <ProjectCard key={project.number} project={project} />)}
          </div>
        </section>

        <section id="about" className="scroll-mt-20 bg-[#25311d] text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12 lg:py-24">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.19em] text-[#d5e690]">A little about me</p>
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Good content starts with listening.</h2>
            </div>
            <div>
              <p className="text-base leading-8 text-[#e0e4d9] sm:text-lg">
                I’m Olajumoke Owoeye, a content creator, social media manager and marketing professional based in Ibadan. My background in Mass Communication and customer-facing roles has shaped a practical, people-first way of working.
              </p>
              <p className="mt-5 text-base leading-8 text-[#e0e4d9] sm:text-lg">
                From planning social content to supporting web updates and project communications, I enjoy helping teams turn what they do into stories their audience can understand.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Social media planning", "Content development", "Brand voice & messaging", "Community engagement", "Marketing research", "Web content support"].map((skill) => (
                  <div key={skill} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-[#f0f2eb]">
                    <Check className="h-4 w-4 text-[#d5e690]" /> {skill}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-20 mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-12 lg:py-28">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.19em] text-[#73863a]">Experience & education</p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Built on communication and service.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#697064]">
              A combination of content, marketing and customer-facing work—with remote creative projects alongside in-person roles.
            </p>
            <a href={CV_URL} download className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#3b4d22] hover:underline">
              View full CV <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="space-y-0">
            {[
              { role: "Content Developer & Social Media Manager", company: "Breedskool Galaxy · Remote", date: "2020 — Present", detail: "Developing content, managing social channels and supporting work for Breedskool clients." },
              { role: "Receptionist / Front Desk Officer", company: "Westgate Hotel", date: "Jun 2023 — Present", detail: "Welcoming visitors, responding to enquiries and supporting smooth front desk communication." },
              { role: "Front Desk / Customer Service Officer", company: "Best Drivers Services", date: "Dec 2022 — May 2023", detail: "Supporting clients, front desk operations and customer issue resolution." },
              { role: "Sales & Marketing Officer", company: "Nigerian Breweries Plc", date: "2020 — 2021", detail: "Conducting market research and building relationships with clients and stakeholders." },
            ].map((job, index) => (
              <article key={job.company} className="relative grid gap-2 border-t border-[#e3e7dd] py-5 sm:grid-cols-[1fr_auto] sm:gap-5 sm:py-6">
                <div>
                  <p className="text-base font-semibold text-[#26311f]">{job.role}</p>
                  <p className="mt-1 text-sm font-medium text-[#71805a]">{job.company}</p>
                  <p className="mt-2 text-sm leading-6 text-[#70766b]">{job.detail}</p>
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-[#81877d] sm:pt-1">{job.date}</span>
                {index === 3 && <div className="absolute -bottom-px inset-x-0 border-b border-[#e3e7dd]" />}
              </article>
            ))}
            <div className="mt-7 grid gap-5 rounded-2xl bg-white p-5 ring-1 ring-[#e5e9df] sm:grid-cols-2 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#74815d]">Higher National Diploma</p>
                <p className="mt-2 text-sm font-semibold text-[#26311f]">Mass Communication</p>
                <p className="mt-1 text-xs text-[#747a6f]">Adeseun Ogundoyin Polytechnic · 2021</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#74815d]">National Diploma</p>
                <p className="mt-2 text-sm font-semibold text-[#26311f]">Mass Communication</p>
                <p className="mt-1 text-xs text-[#747a6f]">The Polytechnic, Ibadan · 2017</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 border-t border-[#e5e9df] bg-[#edf0e7]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-24">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.19em] text-[#73863a]">Start a conversation</p>
              <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Have a project in mind?</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#697064]">Tell me what you’re working on, what kind of support you need, and the budget you have in mind.</p>
              <div className="mt-8 space-y-3">
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 text-sm font-medium text-[#38452b] hover:underline"><Mail className="h-4 w-4" /> {EMAIL}</a>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm font-medium text-[#38452b] hover:underline"><SiWhatsapp className="h-4 w-4" /> +234 810 112 6365</a>
              </div>
              <a href={CV_URL} download className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#d2d9c6] bg-[#f8f9f5] px-5 py-3 text-sm font-semibold text-[#35451c] transition hover:border-[#849348]">
                <Download className="h-4 w-4" /> Download CV
              </a>
            </div>

            <div className="rounded-[1.5rem] border border-[#e1e5da] bg-white p-5 shadow-[0_12px_40px_rgba(31,42,24,0.045)] sm:p-8">
              {inquiry ? (
                <div id="form-success" className="flex min-h-[440px] flex-col justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f1d2] text-[#536c20]"><Check className="h-7 w-7" /></div>
                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#73863a]">Message sent</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1b2119]">Thank you, {inquiry.name.split(" ")[0]}.</h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#697064]">
                    Your {inquiry.service.toLowerCase()} enquiry is on its way. I’ll review your brief and get back to you. If you’d like, continue the conversation on WhatsApp with your project details ready to send.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-7 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-[#25311d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3b4b29]"
                  >
                    <SiWhatsapp className="h-4 w-4" /> Continue on WhatsApp <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <button type="button" className="mt-5 w-fit text-sm font-semibold text-[#65714d] hover:underline" onClick={() => setInquiry(null)}>
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold tracking-tight">Tell me about your project</h3>
                    <p className="mt-1 text-sm text-[#777d72]">I’ll reply to the email address you provide.</p>
                  </div>
                  <form onSubmit={submitInquiry} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-[#394133]">Your name
                        <input className={inputClass} autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Name" />
                      </label>
                      <label className="block text-sm font-semibold text-[#394133]">Email address
                        <input className={inputClass} type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-[#394133]">What do you need?
                        <span className="relative block">
                          <select className={`${inputClass} appearance-none pr-10`} required value={form.service} onChange={(event) => updateField("service", event.target.value)}>
                            <option value="" disabled>Select a service</option>
                            {services.map((service) => <option key={service} value={service}>{service}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68715d]" />
                        </span>
                      </label>
                      <label className="block text-sm font-semibold text-[#394133]">Project budget
                        <input className={inputClass} required maxLength={80} value={form.budget} onChange={(event) => updateField("budget", event.target.value)} placeholder="e.g. ₦150,000 – ₦300,000" />
                      </label>
                    </div>
                    <label className="block text-sm font-semibold text-[#394133]">Project brief
                      <textarea className={`${inputClass} min-h-[130px] resize-y`} required minLength={20} maxLength={2500} value={form.projectBrief} onChange={(event) => updateField("projectBrief", event.target.value)} placeholder="What are you looking to create or improve?" />
                    </label>
                    <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                      <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} /></label>
                    </div>
                    {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
                    <div className="flex flex-col items-start justify-between gap-4 pt-1 sm:flex-row sm:items-center">
                      <p className="max-w-xs text-xs leading-5 text-[#878d81]">Your details are only used to respond to this project enquiry.</p>
                      <button disabled={isSending} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25311d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3b4b29] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                        {isSending ? "Sending…" : "Send enquiry"} {isSending ? <CirclePlay className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#25311d] px-5 py-7 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#e5e9dc]">Olajumoke Owoeye <span className="text-[#aab49a]">· Content & social media</span></p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#c5cbbb]">
            <a className="inline-flex items-center gap-2 hover:text-white" href="https://www.tiktok.com/@muainibadan1" target="_blank" rel="noreferrer"><SiTiktok className="h-3.5 w-3.5" /> Hernique’s Touch</a>
            <a className="inline-flex items-center gap-2 hover:text-white" href="https://www.tiktok.com/@herniquekiddieswears1" target="_blank" rel="noreferrer"><SiTiktok className="h-3.5 w-3.5" /> Kiddies Wear</a>
            <a className="inline-flex items-center gap-2 hover:text-white" href={`mailto:${EMAIL}`}><Mail className="h-3.5 w-3.5" /> Email</a>
          </div>
          <a className="text-xs text-[#aab49a] hover:text-white" href={PORTFOLIO_URL}>Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}