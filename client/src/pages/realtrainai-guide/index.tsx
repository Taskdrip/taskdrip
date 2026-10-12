import React, { useState, type ReactNode } from "react";
import { SeoHead } from "@/components/SeoHead";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const REGISTER_URL = "https://www.realtrainai.com/?ref=97BDA1E0";
const INVITE_CODE = "97BDA1E0";
const GUIDE_URL = "https://t.me/taskdrip";
const ARTICLE_URL = "https://taskdrip.online/realtrainai-ai-training-guide";

const articleStructuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "RealTrainAI Guide: AI Trainer Jobs, Pay & How to Apply",
  description: "An independent, practical guide to AI training work, RealTrainAI's application process, reported pay, project matching, location limits and safety.",
  author: { "@type": "Organization", name: "Taskdrip" },
  publisher: { "@type": "Organization", name: "Taskdrip", url: "https://taskdrip.online" },
  mainEntityOfPage: ARTICLE_URL,
  datePublished: "2026-10-12",
  dateModified: "2026-10-12",
};

const toc = [
  ["the-work", "What AI training work really is"],
  ["tasks", "The work behind the model"],
  ["roles", "Generalist or specialist?"],
  ["realtrainai", "How RealTrainAI works"],
  ["pay", "Rates, bonuses & the math"],
  ["location", "Remote does not mean everywhere"],
  ["quality", "Quality, privacy & red flags"],
  ["apply", "A stronger application"],
  ["first-project", "From acceptance to first payment"],
  ["tradeoffs", "The honest pros and cons"],
  ["skills", "Skills that travel with you"],
  ["faq", "Frequently asked questions"],
];

const Anchor = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="rt-link" href={href}>{children}</a>
);

function ApplyButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={REGISTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`rt-apply ${className}`}
    >
      Apply to RealTrainAI <ArrowUpRight size={17} aria-hidden="true" />
    </a>
  );
}

export default function RealTrainAIGuide() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyInviteCode() {
    try {
      let copiedToClipboard = false;
      if (navigator.clipboard?.writeText) {
        try {
        await navigator.clipboard.writeText(INVITE_CODE);
          copiedToClipboard = true;
        } catch {
          // Try the selection-based fallback below if clipboard permissions are denied.
        }
      }
      if (!copiedToClipboard) {
        const codeField = document.createElement("textarea");
        codeField.value = INVITE_CODE;
        codeField.setAttribute("readonly", "");
        codeField.setAttribute("aria-hidden", "true");
        codeField.style.position = "fixed";
        codeField.style.opacity = "0";
        document.body.appendChild(codeField);
        let copied = false;
        try {
          codeField.select();
          copied = document.execCommand("copy");
        } finally {
          document.body.removeChild(codeField);
        }
        if (!copied) throw new Error("Clipboard copy failed");
      }
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => {
        setCopied(false);
        setCopyFailed(false);
      }, 2200);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 3600);
    }
  }

  return (
    <div className="rt-page min-h-[100dvh]">
      <SeoHead
        title="RealTrainAI Guide: AI Trainer Jobs, Pay & How to Apply | Taskdrip"
        description="A practical, independent guide to RealTrainAI: the work, application, matching uncertainty, pay claims, location caveats and ways to protect your time and data."
        keywords="AI trainer jobs, AI training jobs, remote AI training work, AI data annotation, RealTrainAI"
        ogType="article"
        canonicalUrl={ARTICLE_URL}
        jsonLd={articleStructuredData}
      />
      <style>{`
        .rt-page{--paper:#f5f2e9;--paper2:#fbf9f3;--ink:#202b28;--muted:#68736c;--line:#d9ddd3;--forest:#24463b;--moss:#c4d7a1;--orange:#c55d37;color:var(--ink);background:var(--paper);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .rt-page *{box-sizing:border-box}
        .rt-serif{font-family:Georgia,"Times New Roman",serif;letter-spacing:-.035em}
        .rt-link{color:#315849;text-decoration-color:#a1b6a6;text-decoration-thickness:1px;text-underline-offset:3px}
        .rt-link:hover{color:#a64d30;text-decoration-color:currentColor}
        .rt-apply{display:inline-flex;align-items:center;justify-content:center;gap:.7rem;background:#c55d37;color:#fff;border:1px solid #a6492a;border-radius:999px;padding:.95rem 1.35rem;font-size:.9rem;font-weight:700;text-decoration:none;transition:transform .18s ease,background .18s ease}
        .rt-apply:hover{background:#a94e30;transform:translateY(-2px)}
        .rt-apply:focus-visible,.rt-page a:focus-visible,.rt-page button:focus-visible{outline:3px solid #77935e;outline-offset:4px}
        .rt-prose{font-size:1.06rem;line-height:1.84;color:#3f4a44}
        .rt-prose p{margin:0 0 1.25rem}
        .rt-prose h2{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,4.2vw,3.15rem);line-height:1.08;letter-spacing:-.04em;color:#202b28;margin:0 0 1.25rem}
        .rt-prose h3{font-family:Georgia,"Times New Roman",serif;font-size:1.55rem;line-height:1.18;letter-spacing:-.025em;color:#26352e;margin:2.4rem 0 .7rem}
        .rt-prose strong{color:#27372f;font-weight:700}
        .rt-prose ul,.rt-prose ol{padding-left:1.35rem;margin:0 0 1.4rem}
        .rt-prose li{padding-left:.25rem;margin:.45rem 0}
        .rt-prose li::marker{color:#a75a38}
        .rt-kicker{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:#667b61}
        .rt-card{border:1px solid #d8ddd2;background:#fbfaf5}
        .rt-section{scroll-margin-top:2rem}
        .rt-grain{background-image:radial-gradient(#687a6412 .7px,transparent .7px);background-size:7px 7px}
        @media(max-width:640px){.rt-prose{font-size:1rem;line-height:1.77}.rt-prose h3{margin-top:1.9rem}}
        @media(prefers-reduced-motion:reduce){.rt-apply{transition:none}}
      `}</style>

      <header className="relative overflow-hidden bg-[#24463b] text-[#f5f2e9]">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
            <defs>
              <pattern id="rt-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M50 0H0V50" fill="none" stroke="#d3dfc8" strokeWidth="1" opacity=".25" />
                <circle cx="0" cy="0" r="2" fill="#d3dfc8" opacity=".7" />
              </pattern>
            </defs>
            <rect width="1440" height="720" fill="url(#rt-grid)" />
            <path d="M740 610C910 450 925 295 1110 210s245-2 330-150" fill="none" stroke="#d3dfc8" strokeWidth="1.5" opacity=".55" />
            <path d="M760 690C945 505 1000 387 1180 320s230 18 310-100" fill="none" stroke="#d3dfc8" strokeWidth="1.5" opacity=".34" />
            <circle cx="1108" cy="210" r="10" fill="#d37a52" />
            <circle cx="1108" cy="210" r="26" fill="none" stroke="#d37a52" opacity=".55" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24 lg:px-12">
          <nav className="flex items-center justify-between border-b border-white/20 pb-4" aria-label="Article navigation">
            <a href="#top" className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#f5f2e9] no-underline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d9be] font-serif text-lg">T</span>
              TASKDRIP <span className="hidden font-normal text-[#c6d2c1] sm:inline"> / FIELD GUIDE</span>
            </a>
            <a href="#contents" className="inline-flex items-center gap-2 text-xs font-semibold text-[#e2e9d9] no-underline hover:text-white">
              Read the guide <ArrowDown size={14} aria-hidden="true" />
            </a>
          </nav>

          <div id="top" className="grid gap-12 pt-14 md:grid-cols-[1.2fr_.8fr] md:items-end md:pt-20">
            <div className="max-w-3xl">
              <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#c5d49e]">
                <span className="h-px w-8 bg-[#c5d49e]" /> Work, examined / field notes
              </p>
              <h1 className="rt-serif max-w-3xl text-[clamp(3.3rem,8vw,7.5rem)] leading-[.91] text-[#f5f2e9]">
                The human work<br /><em className="font-normal text-[#c5d49e]">behind AI.</em>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#e0e6dc] sm:text-xl">
                A practical, unsentimental guide to AI trainer jobs—and what to know before applying to RealTrainAI.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ApplyButton />
                <a href="#the-work" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-[#f5f2e9] no-underline hover:bg-white/10">
                  Start reading <ArrowDown size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[430px] md:mb-1">
              <div className="rt-grain relative aspect-[1.02] overflow-hidden rounded-[48%_48%_8px_8px] border border-[#dbe3d0]/40 bg-[#d7dfc9] p-5 text-[#24463b] sm:p-8">
                <svg viewBox="0 0 440 420" role="img" aria-labelledby="hero-illustration-title" className="h-full w-full">
                  <title id="hero-illustration-title">A visual map of a person evaluating an AI response</title>
                  <rect x="10" y="10" width="420" height="400" rx="16" fill="#e9eadb" />
                  <path d="M30 102H408M30 302H408" stroke="#bac7af" strokeWidth="1" />
                  <text x="35" y="72" fontSize="13" fill="#617666" letterSpacing="2">HUMAN REVIEW / 01</text>
                  <rect x="45" y="130" width="150" height="125" rx="4" fill="#24463b" />
                  <path d="M63 160h93M63 180h73M63 200h82M63 220h54" stroke="#d8e1ce" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="274" cy="183" r="47" fill="#c55d37" />
                  <path d="M255 185l13 13 27-31" fill="none" stroke="#fff2dd" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M194 193h26" stroke="#7d9178" strokeWidth="2" strokeDasharray="4 5" />
                  <path d="M327 184h48m-12-12 12 12-12 12" fill="none" stroke="#24463b" strokeWidth="2" />
                  <rect x="52" y="325" width="102" height="44" rx="22" fill="#c4d7a1" />
                  <text x="72" y="352" fontSize="12" fill="#24463b" fontWeight="700">CONTEXT</text>
                  <rect x="167" y="325" width="96" height="44" rx="22" fill="#fffaf0" />
                  <text x="192" y="352" fontSize="12" fill="#24463b" fontWeight="700">JUDGMENT</text>
                  <rect x="276" y="325" width="107" height="44" rx="22" fill="#dce6d1" />
                  <text x="301" y="352" fontSize="12" fill="#24463b" fontWeight="700">FEEDBACK</text>
                  <circle cx="366" cy="82" r="5" fill="#c55d37" />
                  <circle cx="388" cy="82" r="5" fill="#b4c493" />
                  <circle cx="410" cy="82" r="5" fill="#24463b" />
                </svg>
              </div>
              <p className="mt-3 text-right text-xs text-[#d0dbcb]">The loop is human judgment, not magic.</p>
            </div>
          </div>
          <div className="mt-14 grid gap-5 border-t border-white/20 pt-5 text-xs leading-relaxed text-[#d7e0d4] sm:grid-cols-3">
            <p><span className="block font-bold uppercase tracking-widest text-[#c5d49e]">Independent guide</span>Taskdrip is not RealTrainAI and has no official partnership to represent.</p>
            <p><span className="block font-bold uppercase tracking-widest text-[#c5d49e]">Reality check</span>Applying is not acceptance; acceptance is not a promise of a project.</p>
            <p><span className="block font-bold uppercase tracking-widest text-[#c5d49e]">Updated for readers</span>Verify live requirements, locations and terms with the official company.</p>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[240px_minmax(0,760px)] lg:gap-20 lg:px-12 lg:py-20">
          <aside id="contents" className="lg:sticky lg:top-6 lg:h-fit" aria-label="Table of contents">
            <div className="border-l-2 border-[#bdc9b5] pl-5">
              <p className="rt-kicker mb-4">In this field guide</p>
              <ol className="space-y-2.5 text-sm">
                {toc.map(([id, label], index) => (
                  <li key={id}>
                    <a href={`#${id}`} className="group flex items-start gap-2 text-[#637067] no-underline hover:text-[#a64d30]">
                      <span className="mt-0.5 font-mono text-[10px] text-[#9aab93]">{String(index + 1).padStart(2, "0")}</span>
                      <span>{label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-8 hidden rounded-2xl border border-[#d8ddd2] bg-[#fbfaf5] p-4 lg:block">
              <p className="text-xs font-bold uppercase tracking-wider text-[#657564]">Need a human?</p>
              <p className="my-2 text-sm leading-relaxed text-[#667168]">For Taskdrip guidance, our Telegram is open. It is not RealTrainAI support.</p>
              <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#315849] underline underline-offset-4">
                Taskdrip guidance <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </aside>

          <article className="rt-prose min-w-0">
            <div className="mb-12 border-b border-[#d9ddd3] pb-7">
              <p className="rt-kicker mb-4">A note before you begin</p>
              <p className="text-[1.15rem] leading-relaxed text-[#334139]">
                AI systems are built from more than code. People test answers, label examples, write prompts, catch confident mistakes and explain what “good” looks like in context. That work has created new forms of <strong>remote AI training work</strong>—but the job title can conceal very different tasks, terms and levels of uncertainty.
              </p>
              <p>
                This is an independent informational guide by Taskdrip about a separate opportunity offered by RealTrainAI. We are not the RealTrainAI site, do not control its application or projects, and cannot promise that anyone will be approved, matched, paid or eligible. Taskdrip may receive referral credit if you join through our link. The company itself decides review, eligibility, matching and payments. Read the <a className="rt-link" href="https://www.realtrainai.com/" target="_blank" rel="noopener noreferrer">official RealTrainAI site</a> for current terms before sharing information or accepting work.
              </p>
            </div>

            <section id="the-work" className="rt-section">
              <p className="rt-kicker mb-3">01 / Why the work exists</p>
              <h2>What AI training work really is</h2>
              <p>
                A model can produce fluent language and still be wrong, unsafe, incomplete or wildly unhelpful. Training teams need people to compare possible answers, identify errors, test edge cases, add context and turn expert judgment into feedback a system can learn from. This is one reason searches for <strong>AI trainer jobs</strong> have grown: there is human work between a model’s output and a product that people can rely on.
              </p>
              <p>
                The phrase “training an AI” can sound like you will be building a neural network. In many contractor projects, that is not what happens. You may instead be given a task interface, a rubric and a queue of examples. You assess whether a response follows instructions, write a better prompt, tag content, or explain why an answer is misleading. The work can be cognitively demanding precisely because the interface looks simple: a rating is only useful when it is consistent, defensible and grounded in the task rules.
              </p>
              <p>
                RealTrainAI is one platform describing opportunities to contribute to AI training. The details below reflect information the company’s site reported when this guide was prepared. Recruitment pages can change; treat every figure as a claim to re-check directly, not as a personal earnings forecast. For a quick comparison of the main trade-offs, jump to <Anchor href="#tradeoffs">the honest pros and cons</Anchor>; for its particular process, see <Anchor href="#realtrainai">how RealTrainAI says matching works</Anchor>.
              </p>
            </section>

            <figure className="my-12 overflow-hidden rounded-2xl border border-[#d9ddd3] bg-[#e8eadc] p-5 sm:p-8">
              <svg viewBox="0 0 760 210" role="img" aria-labelledby="workflow-title" className="w-full">
                <title id="workflow-title">A four-stage human feedback loop: model output, human review, structured feedback, improved system</title>
                <path d="M92 92H662" stroke="#9baa91" strokeWidth="2" strokeDasharray="5 7" />
                {[
                  { x: 98, n: "01", label: "MODEL OUTPUT", sub: "A response to assess" },
                  { x: 285, n: "02", label: "HUMAN REVIEW", sub: "Context & judgment" },
                  { x: 475, n: "03", label: "STRUCTURED FEEDBACK", sub: "Ratings, labels, notes" },
                  { x: 660, n: "04", label: "ITERATION", sub: "A better next version" },
                ].map((item, i) => (
                  <g key={item.n}>
                    <circle cx={item.x} cy="92" r="31" fill={i === 1 ? "#c55d37" : "#24463b"} />
                    <text x={item.x} y="97" textAnchor="middle" fontSize="13" fill="#fff9ed" fontWeight="700">{item.n}</text>
                    <text x={item.x} y="151" textAnchor="middle" fontSize="11" fill="#24463b" fontWeight="700" letterSpacing="1">{item.label}</text>
                    <text x={item.x} y="173" textAnchor="middle" fontSize="11" fill="#66756a">{item.sub}</text>
                  </g>
                ))}
              </svg>
              <figcaption className="mt-2 text-center text-xs text-[#69756b]">A simplified feedback loop. Individual assignments vary; a contractor may only handle one step.</figcaption>
            </figure>

            <section id="tasks" className="rt-section">
              <p className="rt-kicker mb-3">02 / In the task queue</p>
              <h2>The work behind the model</h2>
              <p>
                RealTrainAI describes work that can include rating model outputs, writing prompts, identifying errors, red-teaming, annotation and applying domain expertise. A project may use one of these methods or combine several. Do not assume every person gets every task: actual work depends on the project, its requirements and whether the platform matches you to it.
              </p>
              <h3>Rating and comparing responses</h3>
              <p>
                You might see a user question and two candidate answers, then choose which is more useful against a rubric. “Sounds polished” is not the same as “is correct.” A good evaluator checks the requested task, factual accuracy, completeness, clarity, safety and whether the response invents evidence. If the rubric asks for a concise answer, an elegant essay can still be the weaker response. Where guidelines permit, your written rationale should name observable differences rather than announce a preference.
              </p>
              <h3>Prompt writing and rewriting</h3>
              <p>
                Prompt work can mean composing realistic instructions that reveal how a model handles ambiguity, or revising a prompt so the desired task is testable. Useful prompts are specific without smuggling in the answer. They may include audience, constraints, source material and success criteria. The point is not to trick a system with arbitrary wordplay; it is to create a meaningful situation where its strengths or limitations become visible.
              </p>
              <h3>Error identification and red-teaming</h3>
              <p>
                Error review looks for failures: unsupported claims, contradictions, missed instructions, faulty calculations, broken code or inappropriate tone. Red-teaming is a more deliberate attempt to find weaknesses, including unsafe or manipulative responses. It should happen only within the assignment’s written scope. Never probe real systems, accounts or data beyond the authorized environment, and do not try to extract confidential information. Responsible testing documents a reproducible issue without causing harm.
              </p>
              <h3>Annotation and specialist judgment</h3>
              <p>
                Annotation attaches structured labels to examples: a topic, sentiment, intent, entity, quality rating or error category. It is not “just clicking.” Ambiguous examples need careful reference to instructions, and inconsistent labels can make a dataset less useful. A specialist task may ask a clinician to assess clinical reasoning, a lawyer to inspect legal analysis, or an engineer to review a code answer. Only claim expertise you can demonstrate, and do not treat a general annotation task as professional advice for a real client.
              </p>
            </section>

            <section id="roles" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">03 / Find your lane</p>
              <h2>Generalist or specialist?</h2>
              <p>
                RealTrainAI says applicants may apply based on relevant expertise or credentials, or as generalists with no prior experience required. That distinction matters: an entry route without an experience requirement is not a promise of easy work, immediate acceptance or immediate paid assignments. It means the stated entry criteria can be broader; project fit still depends on review and available demand.
              </p>
              <div className="my-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#d8ddd2] bg-[#e9eadf] p-6">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[.15em] text-[#708365]">Generalist / starting point</p>
                  <h3 className="!mt-0">Careful judgment beats a fancy title.</h3>
                  <p className="!mb-0 text-[.96rem]">A generalist may review everyday language, follow task instructions, compare answers, identify basic inaccuracies or label content. Strong reading comprehension, patience and clear reasoning are practical assets. You do not need to pretend to be an expert; the assignment should fit the qualifications it requests.</p>
                </div>
                <div className="rounded-2xl border border-[#d8ddd2] bg-[#f5e8dd] p-6">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[.15em] text-[#a4583a]">Specialist / domain route</p>
                  <h3 className="!mt-0">Make expertise legible.</h3>
                  <p className="!mb-0 text-[.96rem]">A specialist may be matched to work involving coding, science, finance, medicine, law or another domain. Relevant degrees, professional training, portfolio examples and years of practice can help a reviewer understand your fit. They do not guarantee a project, a faster review or a particular hourly rate.</p>
                </div>
              </div>
              <p>
                Credentials are useful signals, not substitutes for calibrated work. If you list a degree, describe it accurately; if you have practical experience without a formal credential, explain what you have done and what kinds of evaluation you are qualified to perform. Be explicit about boundaries: a person who has studied accounting is not automatically qualified to review specialist tax advice, and a programmer who knows one stack may not be equipped to certify all code.
              </p>
              <p>
                Think about your working style as well as your CV. Some people enjoy close reading and consistent classification. Others prefer open-ended research or collaborative projects. AI training work can involve both, but contractors may not choose the exact queue, timing or continuity. If you need guaranteed weekly hours, a fixed manager, benefits or a stable salary, compare this opportunity with conventional employment before committing. The <Anchor href="#skills">transferable skills section</Anchor> explains what you can still take away if a project is brief.
              </p>
            </section>

            <section id="realtrainai" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">04 / The platform, plainly</p>
              <h2>How RealTrainAI works</h2>
              <p>
                Based on the company’s public description, the route begins with an application and review. The application is described as taking about 10 minutes, and the company says it reviews applications by a human within 48 hours. Those are company-reported expectations, not a service-level guarantee. A busy period, missing information or a change in process can affect your experience. Confirm the current steps on its site and use only the official application link.
              </p>
              <p>
                Review and matching are separate stages. Being verified or accepted does not necessarily mean work is ready for you. The company says most verified applicants are matched within one to four weeks, and that specialized PhD applicants may match faster. These are reported typical timeframes, not a promise to any individual. Matching is not guaranteed; project supply, subject fit, location and timing may all matter. If there is no suitable project, you could wait longer or receive no match.
              </p>
              <div className="my-8 rounded-2xl border-l-4 border-[#c55d37] bg-[#f0e7d8] p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-3">
                  <Clock3 className="shrink-0 text-[#a84f32]" size={20} aria-hidden="true" />
                  <p className="!mb-0 font-bold text-[#39473e]">Four steps, with realistic expectations.</p>
                </div>
                <ol className="grid gap-3 pl-0 sm:grid-cols-2">
                  <li className="list-none rounded-xl bg-white/65 p-4"><strong>01 · Apply</strong><br />About 10 minutes, according to the company; describe your background truthfully.</li>
                  <li className="list-none rounded-xl bg-white/65 p-4"><strong>02 · Review</strong><br />RealTrainAI reports human review within 48 hours; that is not a guaranteed deadline.</li>
                  <li className="list-none rounded-xl bg-white/65 p-4"><strong>03 · Match</strong><br />Most verified applicants reportedly match in 1–4 weeks; matching is not guaranteed.</li>
                  <li className="list-none rounded-xl bg-white/65 p-4"><strong>04 · Paid work</strong><br />After 10+ paid hours, a background-based qualification bonus may be available.</li>
                </ol>
              </div>
              <p>
                Before applying, read the privacy notice and terms that appear in the live flow. Understand what information you are asked to provide, how the platform communicates decisions and where official help is available. Keep your application truthful and use a contact address you control. Do not send identity documents, bank credentials or private material through a channel you cannot verify as official.
              </p>
            </section>

            <section id="pay" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">05 / Numbers with context</p>
              <h2>Rates, bonuses and the math</h2>
              <p>
                The RealTrainAI site cites an industry-reported range of <strong>$15–$200+ per hour</strong>, referencing Business Insider and Yahoo Finance. That is a broad reported range, not a rate card or a forecast of what you will earn on this platform. The company notes that actual pay depends on project type and matching availability. A high-end figure may describe specialized work in the wider market; it should not be assumed to be a typical starting rate, a guaranteed offer, or available in every country.
              </p>
              <p>
                Ask the practical questions before accepting a project: Is compensation hourly, per task or tied to an approved output? What counts as paid time? Is training or qualification work paid? How are corrections handled? What is the expected volume, and how often can work be available? When does payment become eligible, what method is used, and what fees or conversion steps may apply? The answers should be in the current project terms. A headline hourly figure means little if task volume is sporadic or the rate applies only to a narrow specialty.
              </p>
              <p>
                The company also describes a possible one-time qualification bonus after 10 or more hours of paid matched work. Its stated maximums vary by background: up to $20 for generalists, $100 for STEM bachelor’s, $300 for specialized backgrounds, and $700 for top-tier PhD/MD/JD applicants. These are <strong>maximum amounts, not guaranteed bonuses</strong>. The site says eligibility is background-dependent; confirm the current qualification, calculation, timing and terms with RealTrainAI. Do not count the bonus as income until the official terms say you qualify and it is actually awarded.
              </p>
              <p>
                To estimate a realistic return, use a conservative worksheet rather than multiplying the top advertised rate by a full-time week. Start with the written rate offered to you, the number of hours the project actually makes available, the time needed to read instructions and revise, and any unpaid gaps between tasks. Then account for payment fees, currency conversion, local taxes and your own equipment or connectivity costs. If the assignment is paid by task, track how long a representative task takes before judging the effective hourly amount.
              </p>
              <p>
                Contractor-style work can be financially lumpy. One month may include a useful project, another may have little or no available work. No employer-style salary, benefits, fixed shifts or minimum weekly hours are implied by the reported range. Keep a record of accepted project terms, completed work, approval status and payment confirmations. If something differs from the agreement, pause before continuing and ask the company through its verified support channel.
              </p>
            </section>

            <figure className="my-12 overflow-hidden rounded-2xl border border-[#d9ddd3] bg-[#e9e9dd] p-5 sm:p-8">
              <svg viewBox="0 0 760 190" role="img" aria-labelledby="pay-range-title" className="w-full">
                <title id="pay-range-title">The broad industry-reported AI training pay range is not a personal rate guarantee</title>
                <text x="24" y="30" fontSize="11" fill="#657564" fontWeight="700" letterSpacing="2">A BROAD INDUSTRY-REPORTED RANGE</text>
                <path d="M64 88H690" stroke="#b7c0ae" strokeWidth="3" />
                <path d="M64 88H690" stroke="#8ea27f" strokeWidth="3" strokeDasharray="4 8" />
                <circle cx="82" cy="88" r="18" fill="#24463b" />
                <circle cx="671" cy="88" r="18" fill="#c55d37" />
                <text x="45" y="134" fontSize="20" fill="#24463b" fontWeight="700">$15/hr</text>
                <text x="602" y="134" fontSize="20" fill="#a94e30" fontWeight="700">$200+/hr</text>
                <text x="278" y="77" fontSize="13" fill="#526658" fontWeight="700">REPORTED RANGE</text>
                <text x="154" y="165" fontSize="12" fill="#69756b">Actual rate depends on assignment, availability and your written project terms.</text>
              </svg>
              <figcaption className="mt-2 text-center text-xs text-[#69756b]">Illustrative range graphic based on RealTrainAI’s published industry-reported figures—not a pay scale or earnings promise.</figcaption>
            </figure>

            <section id="location" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">06 / The border question</p>
              <h2>Remote does not mean everywhere</h2>
              <p>
                “Remote” tells you where work may happen, not whether every person in every country can apply, access every project or receive money through the same route. Availability, payment methods, tax treatment, legal status and project access vary by location and can change. Some clients may impose language, residency, time-zone, data-handling or regulatory requirements. An application page loading in your browser does not prove that your country is eligible for every task.
              </p>
              <p>
                Confirm eligible locations directly on the official site before applying. If you are invited to a project, check that the terms support your country and the payment method you can lawfully use. Look into local rules for independent contractors, income reporting and work authorization; this guide is not tax or legal advice. A payment provider’s availability can differ from a platform’s availability, so verify both ends rather than assuming an account can receive funds.
              </p>
              <p>
                Be cautious of social posts that say “anyone worldwide can earn” or give one person’s location as proof. Access can differ between the application, a particular client’s project and the payout rail. It can also change between the date a post is shared and the date you apply. If official information is unclear, ask RealTrainAI before sharing sensitive records or planning around expected income. Do not pay a recruiter to “unlock” a country or project.
              </p>
            </section>

            <figure className="my-12 overflow-hidden rounded-2xl border border-[#d9ddd3] bg-[#e8eadc] p-5 sm:p-8">
              <svg viewBox="0 0 760 230" role="img" aria-labelledby="location-title" className="w-full">
                <title id="location-title">Four checks affect whether remote AI training work is accessible: location, project access, payments and local rules</title>
                <path d="M380 110L130 48M380 110L630 48M380 110L130 184M380 110L630 184" stroke="#aab89f" strokeWidth="2" strokeDasharray="5 7" />
                <rect x="268" y="72" width="224" height="76" rx="38" fill="#24463b" />
                <text x="380" y="104" textAnchor="middle" fontSize="12" fill="#d8e4cd" fontWeight="700" letterSpacing="1">REMOTE WORK</text>
                <text x="380" y="126" textAnchor="middle" fontSize="17" fill="#fffaf0" fontWeight="700">≠ everywhere</text>
                <rect x="38" y="24" width="184" height="48" rx="24" fill="#fbfaf5" stroke="#cad2c3" />
                <text x="130" y="54" textAnchor="middle" fontSize="13" fill="#344a3d" fontWeight="700">Country eligibility</text>
                <rect x="538" y="24" width="184" height="48" rx="24" fill="#fbfaf5" stroke="#cad2c3" />
                <text x="630" y="54" textAnchor="middle" fontSize="13" fill="#344a3d" fontWeight="700">Project requirements</text>
                <rect x="38" y="160" width="184" height="48" rx="24" fill="#fbfaf5" stroke="#cad2c3" />
                <text x="130" y="190" textAnchor="middle" fontSize="13" fill="#344a3d" fontWeight="700">Payment methods</text>
                <rect x="538" y="160" width="184" height="48" rx="24" fill="#fbfaf5" stroke="#cad2c3" />
                <text x="630" y="190" textAnchor="middle" fontSize="13" fill="#344a3d" fontWeight="700">Local rules</text>
              </svg>
              <figcaption className="mt-2 text-center text-xs text-[#69756b]">Check all four directly before planning around an opportunity. This diagram does not establish eligibility in any country.</figcaption>
            </figure>

            <section id="quality" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">07 / Do good work safely</p>
              <h2>Quality, privacy and red flags</h2>
              <p>
                Quality is the product. A careful reviewer follows the exact rubric, uses reference material when provided, and resists filling gaps with intuition. Read the entire prompt before scoring. Separate factual correctness from style, and distinguish a genuine refusal from a failure to answer. If a task asks you to choose between outputs, judge them against the specified goal—not your favorite writing voice. When the instructions leave room for interpretation, apply the stated standard consistently and document uncertainty where the tool allows it.
              </p>
              <p>
                Speed usually improves with familiarity, but racing through a queue can create contradictory labels and missed details. Calibrate on examples, check whether a task has a gold-standard or review process, and slow down when confidence is low. If the interface offers a way to flag an ambiguous item, use it rather than guessing. A high-quality annotation is not necessarily the longest explanation; it is the smallest clear rationale that makes your judgment auditable.
              </p>
              <div className="my-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["Protect private data", "Do not paste client prompts, confidential examples, account credentials or personal records into public AI tools or messaging apps."],
                  ["Stay inside the scope", "Use only approved systems and materials. Do not test external products or contact real people as part of a task unless the written brief explicitly authorizes it."],
                  ["Be accurate about expertise", "Do not present a general opinion as medical, legal, financial or technical certification. Escalate tasks beyond your competence."],
                  ["Keep a work trail", "Save permitted copies of project terms, deadlines and payment records. Do not download or retain confidential task data against the rules."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-[#d9ddd3] bg-[#fbfaf5] p-4">
                    <p className="mb-1 text-sm font-bold text-[#35443b]">{title}</p>
                    <p className="!mb-0 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <p>
                Use a separate, strong password and enable available account security protections. Verify that messages and links come from the official company domain before logging in. Be skeptical of anyone asking you to pay an application, training, verification or “priority matching” fee through an unofficial channel. Never share a one-time password or give remote control of your device to a stranger. If a request feels inconsistent with the platform’s written process, stop and contact the company using a known official route.
              </p>
              <p>
                For sensitive subjects, take care of your own attention as well as data. Red-team or content-review tasks can expose workers to disturbing material. Check the project description, available content warnings and opt-out procedures before accepting. If repeated exposure affects you, use the project’s escalation route and step away where permitted. A professional workflow should make expectations clear; you should not need to endure unbounded harm to demonstrate commitment.
              </p>
              <div className="flex gap-3 rounded-2xl bg-[#e3eadb] p-5 text-[.96rem]">
                <ShieldCheck className="mt-1 shrink-0 text-[#42624d]" size={21} aria-hidden="true" />
                <p className="!mb-0"><strong>Privacy rule of thumb:</strong> treat every unpublished task example as confidential. If you are unsure whether a detail can be shared in a portfolio or public post, assume it cannot until the written terms say otherwise.</p>
              </div>
            </section>

            <section id="apply" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">08 / Before you click submit</p>
              <h2>A stronger application, without the theatre</h2>
              <p>
                The public application is described as taking about 10 minutes, but a short form still deserves preparation. You do not need a glossy personal brand or a claim that you are “passionate about AI.” You do need a truthful, readable account of what you can evaluate and why your judgment is dependable. Keep a concise CV or experience summary nearby, confirm your contact details, and make sure dates and qualifications line up.
              </p>
              <ol>
                <li><strong>Choose the right route.</strong> If you are applying as a generalist, present communication, reading comprehension, consistency and comfort with detailed instructions. If you have a specialty, name the discipline and the work that demonstrates it.</li>
                <li><strong>Describe proof, not adjectives.</strong> Instead of “excellent attention to detail,” mention reviewing documentation, testing code, editing technical copy, checking research or managing a labeling workflow—only if true.</li>
                <li><strong>Set honest boundaries.</strong> State language proficiency, credentials and availability accurately. Do not pad years of experience or claim tools you have not used.</li>
                <li><strong>Check your location and payout assumptions.</strong> Verify eligibility, identity requirements and supported payment methods through official sources before relying on the opportunity.</li>
                <li><strong>Read the consent and data terms.</strong> Understand which personal information is requested and how to reach the company if your situation changes.</li>
              </ol>
              <div className="my-9 rounded-2xl bg-[#24463b] p-6 text-[#f5f2e9] sm:p-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[.17em] text-[#c5d49e]">Apply through the official route</p>
                <p className="mb-5 text-sm leading-relaxed text-[#dce5d8]">The link below includes Taskdrip’s referral identifier. If you prefer not to use a referral link, visit RealTrainAI directly and review the current application terms there.</p>
                <ApplyButton className="bg-[#c55d37] hover:bg-[#a94e30]" />
              </div>
            </section>

            <section id="first-project" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">09 / From approval to payment</p>
              <h2>From acceptance to the first payment</h2>
              <p>
                If the company verifies your profile, the next step may still be waiting for a suitable assignment. Keep expectations realistic and your other work plans moving. The site says most verified applicants are matched within one to four weeks, with specialized PhD applicants potentially matching faster. This is a reported pattern, not a countdown. You may match sooner, later or not at all, depending on project demand and fit.
              </p>
              <p>
                When a project arrives, read its scope before accepting: deliverables, rate, deadlines, expected hours, evaluation rules, confidentiality, revision expectations and payment process. Confirm what counts as a completed task. If those terms are not clear, ask before doing a large volume of work. Take the onboarding seriously; a qualification task may measure whether you can apply the instructions consistently. Do not assume that passing it automatically leads to a stream of paid tasks.
              </p>
              <p>
                For the first assignment, work slowly enough to understand the rubric. Keep permitted notes on recurring edge cases, not copies of confidential examples. Track time honestly and use the platform’s required submission method. Review your work before finalizing it, especially when tasks involve names, numbers, code or high-impact claims. If an instruction changes, record the updated guidance and ask which version applies to work already in progress.
              </p>
              <p>
                A qualification bonus may be available only after 10 or more hours of paid matched work, according to the company’s description. The one-time maximum depends on background—up to $20 generalist, $100 STEM bachelor’s, $300 specialized, or $700 top-tier PhD/MD/JD—and is not guaranteed. Confirm whether a particular assignment counts toward the threshold, how the background tier is assessed and when any approved bonus is paid. Do not perform extra unpaid work based on a verbal promise or an assumption that you will qualify.
              </p>
              <p>
                Before work begins, check how to see task status and payment status separately. A submitted task may need review before it becomes payable; a displayed balance may have a processing period. Confirm payout method and minimums, if any, along with transfer fees, exchange rates and local reporting obligations. After the first payment, reconcile it against your records. If the amount, timing or task decision differs from the written agreement, ask the platform for clarification and keep the conversation professional and documented.
              </p>
            </section>

            <section id="tradeoffs" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">10 / No gloss</p>
              <h2>The honest pros and cons</h2>
              <p>
                The appealing part of AI training work is also its central tension: you can contribute practical human judgment to systems that affect real users, often from a remote setup. For the right person, that can make close reading and careful reasoning feel consequential. If a suitable project is available and the terms work for you, a short contract can add paid experience with evaluation, annotation or quality review.
              </p>
              <p>
                Yet “remote” should not be confused with predictable. The work may be project-based, the matching process uncertain and the hours variable. Some tasks are repetitive; some require deep expertise; some may ask for emotionally difficult review. You may have limited control over when new work appears. The broad industry-reported rate range says little about your own rate, and the company’s matching estimate says nothing about guaranteed hours.
              </p>
              <h3>Potential fit</h3>
              <ul>
                <li>You enjoy reading carefully, comparing evidence and explaining a judgment.</li>
                <li>You can work independently, follow evolving instructions and manage your schedule.</li>
                <li>You are comfortable treating the opportunity as conditional project work, not dependable base income.</li>
                <li>You can protect sensitive material and stay within the assignment’s scope.</li>
              </ul>
              <h3>Reasons to pause</h3>
              <ul>
                <li>You need guaranteed weekly hours, benefits, a fixed wage or a predictable start date.</li>
                <li>You would need to borrow money, leave stable work or pay a fee to access the possibility.</li>
                <li>The available payment method, legal status or country rules are unclear or unsuitable.</li>
                <li>The work’s content, privacy expectations or evaluation criteria do not feel safe or transparent.</li>
              </ul>
            </section>

            <section id="skills" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">11 / Useful beyond a platform</p>
              <h2>Skills that travel with you</h2>
              <p>
                Even a short project can strengthen skills that are useful outside one platform, provided you describe them honestly and do not reveal confidential material. Annotation builds classification discipline. Evaluation sharpens evidence-based writing. Prompt work develops task design and requirements thinking. Red-teaming can teach risk identification when performed within a controlled, authorized brief. Domain review can make specialist knowledge easier to communicate to non-specialists.
              </p>
              <p>
                Keep a private, permitted work log: project category, general skill practiced, tools used, approximate dates and measurable outcomes you are allowed to share. Never copy task content or client names into a public portfolio unless the terms explicitly allow it. On a CV, phrase the experience by the work performed—such as “evaluated AI-generated responses against quality rubrics” or “applied structured labels to text examples”—rather than claiming you trained a model’s architecture if you did not.
              </p>
              <p>
                Also compare adjacent routes. Other platforms and employers may offer AI data annotation, search evaluation, transcription, model quality analysis, user research or conventional data operations. Their terms and eligibility are different; do your own checks and watch for application-fee scams. If a stable role is your priority, look for positions with explicit employment status, wage, hours and benefits rather than inferring them from a “remote AI training work” headline.
              </p>
            </section>

            <section className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">A transparent invitation</p>
              <h2>Take the next step with eyes open</h2>
              <p>
                If the kind of work sounds compatible with your skills and the uncertainty fits your situation, you can review the official application. The link below uses Taskdrip’s invite code, <strong>{INVITE_CODE}</strong>. Taskdrip may receive referral credit if you join through it; this does not change the company’s review, eligibility, matching or payment decisions. The offer, terms and availability are set by RealTrainAI, not Taskdrip.
              </p>
              <div className="my-7 flex flex-col gap-4 rounded-2xl border border-[#d3dace] bg-[#fbfaf5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[.15em] text-[#718067]">Taskdrip invite code</p>
                  <p className="mb-0 font-mono text-xl font-semibold tracking-[.12em] text-[#294437]">{INVITE_CODE}</p>
                </div>
                <button
                  type="button"
                  onClick={copyInviteCode}
                  aria-label={copied ? "Invite code copied" : "Copy Taskdrip invite code"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#aab8a5] bg-[#f5f2e9] px-5 text-sm font-bold text-[#315849] transition hover:bg-[#e7ecdf]"
                >
                  {copied ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
              <p role="status" aria-live="polite" className="min-h-6 text-sm text-[#667168]">
                {copied ? "Invite code copied to your clipboard." : copyFailed ? "Copy is unavailable here. Select the code above to copy it." : ""}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <ApplyButton />
                <a href="https://www.realtrainai.com/" target="_blank" rel="noopener noreferrer" className="rt-link inline-flex items-center gap-1 text-sm font-semibold">
                  Visit the official site without this link <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
              <p className="mt-5 text-sm">
                Looking for help with Taskdrip rather than the separate RealTrainAI application? <a className="rt-link" href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Message Taskdrip guidance on Telegram</a>. We cannot make decisions for RealTrainAI or see its application status.
              </p>
            </section>

            <section id="faq" className="rt-section mt-16 border-t border-[#d9ddd3] pt-12">
              <p className="rt-kicker mb-3">Reader questions</p>
              <h2>Frequently asked questions</h2>
              <h3>Does RealTrainAI require prior experience?</h3>
              <p>
                The site says applicants can apply based on expertise and credentials or as generalists with no experience required. That describes the routes it offers, not guaranteed acceptance or work. A generalist still needs to meet the current application requirements, and project access depends on fit and availability.
              </p>
              <h3>How long does application review take?</h3>
              <p>
                RealTrainAI says a human reviews applications within 48 hours. This is the company’s stated expectation, not a guaranteed deadline. Check your inbox and official application account, and contact the company through its verified channel if you need an update.
              </p>
              <h3>How soon will I get matched to a project?</h3>
              <p>
                The company reports that most verified applicants are matched within one to four weeks and that specialized PhD applicants may match faster. Matching is not guaranteed, so you may wait longer or never receive a project. Treat this as an estimate, not a start date.
              </p>
              <h3>How much can I earn per hour?</h3>
              <p>
                RealTrainAI cites an industry-reported $15–$200+ hourly range based on Business Insider and Yahoo Finance. It says actual pay depends on project type and matching availability. The range is not a guaranteed offer or prediction of your earnings. Confirm the rate, paid-time rules, task volume and payout conditions in your own project terms.
              </p>
              <h3>Is the qualification bonus guaranteed?</h3>
              <p>
                No. The site describes a possible one-time, background-dependent qualification bonus after 10 or more hours of paid matched work. Maximums range up to $20 for generalists, $100 for STEM bachelor’s, $300 for specialized backgrounds and $700 for top-tier PhD/MD/JD applicants. They are maximums, not guaranteed awards; verify current eligibility and conditions with RealTrainAI.
              </p>
              <h3>Can I apply from any country?</h3>
              <p>
                Do not assume so. Location eligibility, project access, payment methods, tax requirements and legal status vary. Check current eligible locations and payout support directly with RealTrainAI before sharing sensitive information or relying on expected earnings.
              </p>
              <h3>Is Taskdrip officially partnered with RealTrainAI?</h3>
              <p>
                This is an independent Taskdrip guide, not an official RealTrainAI page or a claim of partnership. Taskdrip may receive referral credit if a reader joins through the provided link. The company alone decides application review, eligibility, project matching and payment.
              </p>
              <h3>What does the referral link do?</h3>
              <p>
                The registration link includes the referral identifier 97BDA1E0. RealTrainAI’s site says a referred friend can yield a $20 referral reward after that friend is matched. This reward is conditional on the company’s referral terms and the friend being matched; it is not an immediate or guaranteed payment. Confirm current rules on the official site.
              </p>
              <h3>Where do I ask for help?</h3>
              <p>
                For application, account, eligibility or payment questions, contact RealTrainAI through its official site. For questions about this Taskdrip guide, <a className="rt-link" href={GUIDE_URL} target="_blank" rel="noopener noreferrer">contact Taskdrip on Telegram</a>. We cannot access or alter RealTrainAI applications.
              </p>
            </section>

            <footer className="mt-16 border-t border-[#d9ddd3] pt-7 text-sm leading-relaxed text-[#667168]">
              <p className="mb-3"><strong>Editorial and referral disclosure.</strong> This independent guide is published by Taskdrip and is not the RealTrainAI website. Taskdrip may receive referral credit if you register through our referral URL. RealTrainAI controls review, eligibility, matching, project terms and payment decisions.</p>
              <p className="mb-3">Company-specific details, including the stated review and matching estimates, pay range, bonus maximums and referral reward, are summaries of information displayed on RealTrainAI’s website when researched. Terms and availability can change. Confirm current terms, eligible locations and payment options directly with the company. This article is informational and is not financial, legal or tax advice.</p>
              <p className="mb-0 flex items-center gap-2"><Sparkles size={14} aria-hidden="true" className="text-[#a75a38]" /> Made for thoughtful applicants, not shortcuts.</p>
            </footer>
          </article>
        </div>
      </main>

      <div className="border-t border-[#d9ddd3] bg-[#e8eadf]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.17em] text-[#718067]">Your call, with context</p>
            <p className="mb-0 text-sm text-[#4f5c53]">Check the current rules, then decide if project-based AI work fits.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ApplyButton />
            <a href="#top" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#9eae9e] px-4 text-sm font-semibold text-[#315849] no-underline hover:bg-white/50">
              Back to top <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
