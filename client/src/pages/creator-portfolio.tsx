import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CirclePlay,
  Globe,
  Lightbulb,
  MapPin,
  PenLine,
  Share2,
  Sparkles,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { SeoHead } from "@/components/SeoHead";

type PortfolioItem = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  url?: string | null;
  category?: string | null;
};

type PortfolioProfile = {
  id: string;
  username?: string | null;
  firstName: string;
  lastName?: string | null;
  profileImageUrl?: string | null;
  bannerImageUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  skills?: string[] | null;
  niche?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  youtubeHandle?: string | null;
  twitterHandle?: string | null;
};

type PortfolioResponse = { profile: PortfolioProfile; items: PortfolioItem[] };

const expertiseIcons = [PenLine, Share2, Lightbulb];

function withSocialUrl(value: string, prefix: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${prefix}${value.replace(/^@/, "")}`;
}

function safeHttpUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function CreatorPortfolio() {
  const { identity = "" } = useParams<{ identity: string }>();
  const { data, isLoading, error } = useQuery<PortfolioResponse>({
    queryKey: ["/api/creator-portfolios", identity],
    enabled: Boolean(identity),
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9f5] text-[#25311d]">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d7ec78] border-t-[#25311d]" />
          Loading portfolio…
        </div>
      </main>
    );
  }

  if (error || !data?.profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9f5] px-5 text-center text-[#25311d]">
        <div className="max-w-md">
          <Briefcase className="mx-auto h-10 w-10 text-[#829344]" />
          <h1 className="mt-5 text-3xl font-semibold">Portfolio not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#697064]">
            This creator page may have moved or is not available yet.
          </p>
          <a href="/influencers" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25311d] px-5 py-3 text-sm font-semibold text-white">
            Browse creators <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </main>
    );
  }

  const { profile, items } = data;
  const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  const coverImage = profile.bannerImageUrl || items.find((item) => item.imageUrl)?.imageUrl;
  const websiteHref = profile.website
    ? safeHttpUrl(/^https?:\/\//i.test(profile.website) ? profile.website : `https://${profile.website}`)
    : undefined;
  const profilePath = `/influencers/${encodeURIComponent(profile.id)}`;
  const socials = [
    { name: "Instagram", value: profile.instagramHandle, prefix: "https://instagram.com/", Icon: SiInstagram },
    { name: "TikTok", value: profile.tiktokHandle, prefix: "https://tiktok.com/@", Icon: SiTiktok },
    { name: "YouTube", value: profile.youtubeHandle, prefix: "https://youtube.com/@", Icon: SiYoutube },
    { name: "X", value: profile.twitterHandle, prefix: "https://x.com/", Icon: SiX },
  ].filter((social) => social.value);

  return (
    <div className="min-h-screen bg-[#f8f9f5] text-[#1b2119]">
      <SeoHead
        title={`${name} | Creator Portfolio`}
        description={profile.bio || `${name}'s creator portfolio on Taskdrip.`}
        keywords={`${name}, creator portfolio, influencer, Taskdrip`}
        ogImage={profile.profileImageUrl || coverImage || undefined}
        canonicalUrl={`${window.location.origin}/creator-portfolio/${encodeURIComponent(profile.username || profile.id)}`}
      />

      <header className="sticky top-0 z-30 border-b border-[#e5e9df] bg-[#f8f9f5]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7ec78] text-sm font-black text-[#26311f]">
                {name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}
              </span>
            )}
            <span className="truncate text-sm font-bold">{name}</span>
          </a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Portfolio navigation">
            <a href="#work" className="text-sm font-medium text-[#62695d] hover:text-[#35451c]">Selected work</a>
            <a href="#about" className="text-sm font-medium text-[#62695d] hover:text-[#35451c]">About</a>
            <a href={profilePath} className="inline-flex items-center gap-2 rounded-full border border-[#d7ddd0] bg-white px-4 py-2.5 text-sm font-semibold text-[#35451c] hover:border-[#829344]">
              Taskdrip profile <ArrowUpRight className="h-4 w-4" />
            </a>
          </nav>
          <a href={profilePath} className="inline-flex items-center gap-1 rounded-full bg-[#25311d] px-4 py-2.5 text-xs font-semibold text-white md:hidden">
            Profile <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main id="home">
        <section className="relative isolate overflow-hidden bg-[#26311f] text-white">
          {coverImage && (
            <img src={coverImage} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#162015]/95 via-[#202b1d]/85 to-[#202b1d]/55" />
          <div className="mx-auto grid min-h-[540px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#e8f2cb]">
                <Sparkles className="h-3.5 w-3.5" /> Creator portfolio
              </p>
              <h1 className="mt-6 max-w-3xl text-[clamp(3rem,8vw,6rem)] font-semibold leading-[0.96] tracking-[-0.06em]">
                {name}
                <span className="mt-3 block font-serif text-[#d7ec78]">Creative work, with purpose.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
                {profile.bio || "Explore my selected work, creative strengths and the projects I’ve contributed to."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  { label: "Content creation", Icon: PenLine },
                  { label: "Social media", Icon: Share2 },
                  { label: "Creative strategy", Icon: Lightbulb },
                ].map(({ label, Icon }) => (
                  <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white">
                    <Icon className="h-3.5 w-3.5 text-[#d7ec78]" /> {label}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#work" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d7ec78] px-5 py-3 text-sm font-bold text-[#25311d] hover:bg-[#e7f5aa]">
                  Explore selected work <ArrowDown className="h-4 w-4" />
                </a>
                <a href={profilePath} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  View Taskdrip profile <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
              {(profile.location || profile.website) && (
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
                  {profile.location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{profile.location}</span>}
                  {websiteHref && <a href={websiteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Globe className="h-4 w-4" />Website</a>}
                </div>
              )}
            </div>
            <div className="mx-auto w-full max-w-[390px]">
              <div className="relative aspect-[0.86] overflow-hidden rounded-[44%_44%_1.5rem_1.5rem] border border-white/25 bg-white/10 shadow-2xl">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#d7ec78]/50 to-[#829344]/15">
                    <span className="text-7xl font-black text-white/80">{name.slice(0, 1)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-white/75">
                <Briefcase className="h-4 w-4 text-[#d7ec78]" />
                {items.length} {items.length === 1 ? "featured project" : "featured projects"}
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#73863a]">Selected work</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Projects and collaborations.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#697064]">A selection of creative work and projects from my portfolio.</p>
          </div>
          {items.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => {
                const itemHref = safeHttpUrl(item.url);
                const videoHref = safeHttpUrl(item.videoUrl);
                return (
                <article key={item.id} className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-[#e5e8e0] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(31,42,24,0.09)]">
                  <div className="relative aspect-[1.55] overflow-hidden bg-gradient-to-br from-[#d7ec78] via-[#dfe7d3] to-[#bfcbb0]">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-[#26311f]">{String(index + 1).padStart(2, "0")}</span>
                    {!item.imageUrl && videoHref ? (
                      <a href={videoHref} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-[#34451e]">
                        <CirclePlay className="h-10 w-10" /> Watch project video
                      </a>
                    ) : !item.imageUrl && <Briefcase className="absolute bottom-4 right-4 h-9 w-9 text-[#536c20]/60" />}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                      {itemHref && <a href={itemHref} target="_blank" rel="noreferrer" aria-label={`Visit ${item.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e4e7df] text-[#3f5120] hover:bg-[#3f5120] hover:text-white"><ArrowUpRight className="h-4 w-4" /></a>}
                    </div>
                    {item.category && <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#71805a]">{item.category}</p>}
                    {item.description && <p className="mt-3 flex-1 text-sm leading-6 text-[#666c61]">{item.description}</p>}
                    {videoHref && item.imageUrl && <a href={videoHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-fit items-center gap-2 text-xs font-bold text-[#536c20] hover:underline"><CirclePlay className="h-4 w-4" /> Watch project video</a>}
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#ccd3c0] bg-white px-6 py-14 text-center">
              <Briefcase className="mx-auto h-9 w-9 text-[#829344]" />
              <h3 className="mt-4 text-lg font-semibold">Work samples are on the way</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#697064]">Visit the Taskdrip profile for current creator information and collaboration options.</p>
              <a href={profilePath} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#536c20] hover:underline">Open creator profile <ArrowRight className="h-4 w-4" /></a>
            </div>
          )}
        </section>

        <section id="about" className="scroll-mt-20 border-y border-[#e5e9df] bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-12">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#73863a]">Expertise</p>
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A thoughtful approach to every brief.</h2>
              {profile.niche && <p className="mt-4 text-sm font-semibold text-[#71805a]">{profile.niche}</p>}
            </div>
            <div>
              <p className="text-base leading-8 text-[#62695d] sm:text-lg">
                {profile.bio || `I’m ${name}. I work with brands and teams to create clear, engaging content and build a consistent presence across digital channels.`}
              </p>
              {skills.length > 0 && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {skills.map((skill, index) => {
                    const Icon = expertiseIcons[index % expertiseIcons.length];
                    return (
                      <div key={`${skill}-${index}`} className="flex items-center gap-3 rounded-xl border border-[#e8ebe4] bg-[#f8f9f5] px-4 py-3 text-sm font-medium text-[#394133]">
                        <Icon className="h-4 w-4 shrink-0 text-[#73863a]" /> {skill}
                      </div>
                    );
                  })}
                </div>
              )}
              {socials.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {socials.map(({ name: label, value, prefix, Icon }) => (
                    <a key={label} href={withSocialUrl(value!, prefix)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#dfe3d9] px-4 py-2.5 text-sm font-semibold text-[#394133] hover:border-[#829344]">
                      <Icon className="h-4 w-4" /> {label} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-[#25311d] p-7 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d5e690]">Let’s collaborate</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Have a project in mind?</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Get in touch through my Taskdrip creator profile to discuss a project or partnership.</p>
            </div>
            <a href={profilePath} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#d7ec78] px-5 py-3 text-sm font-bold text-[#25311d] hover:bg-[#e7f5aa]">
              View creator profile <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e9df] px-5 py-6 text-center text-xs text-[#78816d]">
        {name} · Creator portfolio on <a href="/" className="font-bold text-[#536c20] hover:underline">Taskdrip</a>
      </footer>
    </div>
  );
}