import { useState, type ReactNode } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Info } from "lucide-react";
import { currentNotebookDiaryStartMonth } from "@shared/notebook-studio";

type NotebookKdpListingGuideProps = {
  title: string;
  settings: {
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
    lineStyle: string;
    diaryStartMonth: string;
  };
};

function formatTrim(settings: NotebookKdpListingGuideProps["settings"]) {
  if (settings.trimSize === "custom") {
    return `${settings.customWidth} × ${settings.customHeight} in (custom)`;
  }

  const dimensions: Record<string, string> = {
    "6x9": "6 × 9 in",
    "5.5x8.5": "5.5 × 8.5 in",
    "5x8": "5 × 8 in",
    "8.27x11.69": "8.27 × 11.69 in (A4)",
  };
  return dimensions[settings.trimSize] || settings.trimSize;
}

function formatDiaryDateRange(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return "the selected start month through December 31, 2027";
  const startDate = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(startDate.getTime())) {
    return "the selected start month through December 31, 2027";
  }
  const start = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startDate);
  return `${start} through December 31, 2027`;
}

function AnswerCard({
  label,
  answer,
  guidance,
  id,
  copied,
  onCopy,
  requiresDecision = false,
  copyable = true,
}: {
  label: string;
  answer: string;
  guidance?: string;
  id: string;
  copied: string;
  onCopy: (id: string, value: string) => void;
  requiresDecision?: boolean;
  copyable?: boolean;
}) {
  const status = copied === id ? "Copied" : copied === `error:${id}` ? "Select and copy" : "";

  return (
    <article className="rounded-xl border border-[#e5dfd2] bg-[#fffdf8] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#41483e]">{label}</p>
        {requiresDecision ? (
          <span className="rounded-full bg-[#f6eddb] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#8b6940]">
            Confirm in KDP
          </span>
        ) : copyable ? (
          <button
            type="button"
            onClick={() => onCopy(id, answer)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#ded8ca] bg-white px-2.5 text-[10px] font-semibold text-[#4a584c] hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75947e]"
            aria-label={`Copy ${label}`}
          >
            {status === "Copied" ? <Check size={12} /> : <Copy size={12} />}
            {status || "Copy"}
          </button>
        ) : <span className="rounded-full bg-[#f2efe7] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#77796d]">Instruction</span>}
      </div>
      <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[11px] leading-[1.65] text-[#55594f] selection:bg-[#dfe8dc]">{answer}</pre>
      {status === "Select and copy" && (
        <p role="status" className="mt-1 text-[10px] text-[#8b6940]">
          Clipboard access was unavailable. Select the answer text and copy it manually.
        </p>
      )}
      {guidance && <p className="mt-2 border-t border-[#eee9de] pt-2 text-[10px] leading-[1.6] text-[#858477]">{guidance}</p>}
    </article>
  );
}

function GuideSection({
  number,
  title,
  intro,
  children,
}: {
  number: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-[#ded8ca] bg-[#faf7ef] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e6ede3] text-[11px] font-bold text-[#456e5a]">{number}</span>
        <div>
          <h3 className="text-[14px] font-semibold text-[#41483e]">{title}</h3>
          <p className="mt-1 text-[10px] leading-[1.65] text-[#858477]">{intro}</p>
        </div>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-2">{children}</div>
    </section>
  );
}

export default function NotebookKdpListingGuide({ title, settings }: NotebookKdpListingGuideProps) {
  const [copied, setCopied] = useState("");
  const bookTitle = title.trim();
  const author = settings.authorName.trim();
  const subtitle = settings.subtitle.trim();
  const isDiary = settings.lineStyle === "diary";
  const startMonth = settings.diaryStartMonth || currentNotebookDiaryStartMonth();
  const dateRange = formatDiaryDateRange(startMonth);
  const trim = formatTrim(settings);
  const pageCount = Math.max(0, Number(settings.pageCount) || 0);
  const pagesAreHardcoverEligible = pageCount >= 75 && pageCount <= 550;
  const trimIsKnownHardcoverSize = settings.trimSize === "6x9" || settings.trimSize === "5.5x8.5";
  const paper = settings.paper === "cream" ? "cream" : "white";
  const ink = settings.ink === "color" ? "color" : "black";

  const description = [
    `${bookTitle ? `${bookTitle} is` : "This journal is"} a ${isDiary ? "dated daily diary" : "lined journal"} made for everyday writing.`,
    isDiary
      ? `Its daily pages cover ${dateRange}. Each page prints the day and date with space for notes, plans, and reflections.`
      : "Its undated ruled pages provide a simple place for notes, lists, plans, and personal reflections.",
    "",
    `Inside: ${pageCount} interior pages, ${trim} trim size, and ${paper} paper with ${ink} ink.`,
    "",
    "Use this journal for personal writing, daily notes, and the ideas you want to keep in one place.",
  ].join("\n");

  const keywords = isDiary
    ? [
        "dated daily diary with lined pages",
        "daily diary for plans and notes",
        "journal with dates for everyday writing",
        "dated pages for notes and reflections",
        "daily writing diary 2026 to 2027",
        `${trim.replaceAll(" in", "")} dated diary`,
        "year-round diary with daily pages",
      ]
    : [
        "lined journal for daily writing",
        "notebook for notes and lists",
        "personal journal for reflections",
        "undated writing notebook",
        "everyday lined notes journal",
        `${trim.replaceAll(" in", "")} lined notebook`,
        `${paper} paper writing journal`,
      ];

  async function copyAnswer(id: string, value: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopied(id);
    } catch {
      setCopied(`error:${id}`);
    }
  }

  const cardProps = { copied, onCopy: copyAnswer };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d7ddcf] bg-[#edf2e9] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info size={17} className="mt-0.5 shrink-0 text-[#4c714f]" />
          <div>
            <h2 className="text-[13px] font-semibold text-[#3f5d43]">Copy-ready Amazon KDP hardcover listing</h2>
            <p className="mt-1 text-[10px] leading-[1.7] text-[#5d6d59]">
              Answers below update live from this notebook’s title and print settings. Copy each answer into KDP. Account, legal-rights, marketplace, and pricing decisions are marked for your confirmation; this page does not submit or publish anything to Amazon.
            </p>
          </div>
        </div>
        {settings.binding !== "hardcover" && (
          <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-[#e6c7aa] bg-[#fff7ec] p-3 text-[10px] leading-[1.6] text-[#825a36]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            This guide is for a KDP hardcover. The current notebook is set to {settings.binding || "another binding"}; change Binding to Hardcover in the Interior section before matching these print specifications.
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className={`rounded-xl border p-3 ${pagesAreHardcoverEligible ? "border-[#d7ddcf] bg-[#edf2e9]" : "border-[#e6c7aa] bg-[#fff7ec]"}`}>
          <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#858477]">Hardcover page count</p>
          <p className="mt-1 text-[12px] font-semibold text-[#41483e]">{pageCount} pages · KDP range 75–550</p>
          <p className="mt-1 text-[9px] leading-[1.5] text-[#77796d]">{pagesAreHardcoverEligible ? "Within KDP’s general hardcover page-count range." : "Adjust the interior to 75–550 pages before uploading."}</p>
        </div>
        <div className={`rounded-xl border p-3 ${trimIsKnownHardcoverSize ? "border-[#d7ddcf] bg-[#edf2e9]" : "border-[#e6c7aa] bg-[#fff7ec]"}`}>
          <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#858477]">Selected trim size</p>
          <p className="mt-1 text-[12px] font-semibold text-[#41483e]">{trim}</p>
          <p className="mt-1 text-[9px] leading-[1.5] text-[#77796d]">{trimIsKnownHardcoverSize ? "This size is commonly supported for KDP hardcover; confirm it appears in your live KDP print-options menu." : "This studio size is not verified as a KDP hardcover trim. Check KDP’s available sizes before uploading."}</p>
        </div>
        <div className="rounded-xl border border-[#ded8ca] bg-[#fffdf8] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#858477]">Interior settings</p>
          <p className="mt-1 text-[12px] font-semibold capitalize text-[#41483e]">{ink} ink · {paper} paper</p>
          <p className="mt-1 text-[9px] leading-[1.5] text-[#77796d]">Match these choices to KDP’s print options and the final PDF.</p>
        </div>
      </div>

      <GuideSection
        number="1"
        title="Hardcover Details"
        intro="Complete Book Details in KDP first. Use consistent wording across the title page, cover, interior, and Amazon listing. KDP’s fields and category choices can vary by marketplace."
      >
        <AnswerCard label="Language" answer="English" guidance="Choose English only if the interior, cover, and listing metadata are in English." id="language" {...cardProps} />
        <AnswerCard label="Book title" answer={bookTitle || "Enter the final title used on the cover."} guidance="Use the exact title printed on the cover. KDP title metadata should match the book." id="title" {...cardProps} requiresDecision={!bookTitle} />
        <AnswerCard label="Subtitle" answer={subtitle || "Leave this field blank unless a subtitle is printed on the cover."} guidance="Optional. Do not add a promotional phrase here unless it is genuinely the book’s subtitle and also appears on the cover." id="subtitle" {...cardProps} copyable={!!subtitle} />
        <AnswerCard label="Series" answer="Leave the series name and series number fields blank." guidance={settings.seriesName.trim() ? `This notebook currently has “${settings.seriesName.trim()}” in its series setting. KDP says low-content books cannot be placed in a series, so leave KDP’s series fields empty.` : "Do not create or select a series for this low-content journal."} id="series" {...cardProps} copyable={false} />
        <AnswerCard label="Edition number" answer="Leave blank for the first edition. Enter a number only when publishing a genuinely revised edition." guidance="Do not enter “1” simply because this is the first time you are uploading it." id="edition" {...cardProps} copyable={false} />
        <AnswerCard label="Primary author / contributor" answer={author || "Enter the real author or pen name used on the cover."} guidance="Confirm the name before copying. Split it into KDP’s first, middle, last, and suffix boxes as appropriate. Add no contributors unless they actually contributed and agreed to be listed." id="author" copied={copied} onCopy={copyAnswer} requiresDecision={!author} />
        <AnswerCard label="Author name boxes and additional contributors" answer="Prefix: leave blank unless applicable.\nFirst name: enter the author’s real given name.\nMiddle name: enter only if applicable.\nLast name: enter the author’s real family name.\nSuffix: leave blank unless applicable.\nOther contributors: leave blank unless a real contributor should be credited." guidance="Do not guess how a person’s name should be split. KDP allows additional contributors, but a standard blank journal usually needs none." id="author-fields" copied={copied} onCopy={copyAnswer} copyable={false} />
        <AnswerCard label="Description (under KDP’s 4,000-character limit)" answer={description} guidance="Copy-ready plain text; review it against the final interior before publishing. Remove any feature that is not actually present." id="description" {...cardProps} />
        <AnswerCard label="Publishing rights" answer="Confirm in KDP: select “I own the copyright and necessary publishing rights” only if you own or have permission for every text, image, and cover element. Select public domain only when the work is genuinely public domain." guidance="This is a legal declaration. The project cannot verify who owns the words, fonts, photos, illustrations, or other assets." id="rights" copied={copied} onCopy={copyAnswer} requiresDecision />
        <AnswerCard label="Primary audience and sexually explicit content" answer="For an ordinary, non-explicit journal: choose the general/non-children’s audience and answer “No” to sexually explicit content — only after checking the cover and every interior page." guidance="If the actual content is intended for children or contains explicit material, choose the truthful audience/content answers instead." id="audience" {...cardProps} requiresDecision />
        <AnswerCard label="Reading age" answer="Leave blank for a general-purpose notebook. Enter a range only if this edition is specifically intended for children." guidance="Do not set a children’s age range solely to try to improve discoverability." id="age" {...cardProps} copyable={false} />
        <AnswerCard label="Primary marketplace" answer="Choose the eligible Amazon marketplace where you expect this hardcover to sell most." guidance="Do not assume Amazon.com from the attached screenshot. Hardcover marketplaces are limited; Amazon.co.jp is not supported. Choose from the marketplace options shown in your KDP account." id="marketplace" copied={copied} onCopy={copyAnswer} requiresDecision />
        <AnswerCard label="Categories" answer="Select up to 3 accurate journal, diary, or notebook categories that are actually offered in your chosen marketplace." guidance="Use KDP’s live category picker; category names change. Do not select unrelated categories or promise a category that is not listed." id="categories" copied={copied} onCopy={copyAnswer} requiresDecision />
        <AnswerCard label="Low-content and large-print checkboxes" answer="Low-content: YES. Large print: NO for a standard ruled journal, unless the interior is intentionally produced in large-print type." guidance="KDP specifically requires the low-content box for journals/notebooks. A wrong selection can lead to rejection." id="checkboxes" {...cardProps} copyable={false} />
          <div className="rounded-xl border border-[#e5dfd2] bg-[#fffdf8] p-3.5 xl:col-span-2">
          <p className="text-[11px] font-semibold text-[#41483e]">Seven keyword suggestions · each under 50 characters</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-[#858477]">Copy only phrases that accurately describe the finished book. KDP allows up to seven keyword boxes; avoid misleading, unrelated, or repetitive terms.</p>
          <div className="mt-3 space-y-2">
            {keywords.map((keyword, index) => (
              <AnswerCard key={`${index}-${keyword}`} label={`Keyword ${index + 1}`} answer={keyword} id={`keyword-${index}`} {...cardProps} />
            ))}
          </div>
        </div>
        <AnswerCard label="Publication and release date" answer="For a first publication, choose the new-book option if shown. If this exact book was previously published, enter its actual original publication date. KDP currently does not offer release-date scheduling for low-content books." guidance="Follow the fields KDP actually presents; it may omit the release-date controls for low-content titles." id="release" {...cardProps} copyable={false} />
        <AnswerCard label="AI-generated content disclosure" answer="Answer based on the actual production process: disclose any AI-generated text, images, or translations used in the book or cover. AI assistance used only to edit or brainstorm creator-written work does not require this disclosure under KDP’s current guidance." guidance="The studio cannot tell whether outside AI tools were used. Make the truthful selection in KDP." id="ai" copied={copied} onCopy={copyAnswer} requiresDecision />
      </GuideSection>

      <GuideSection
        number="2"
        title="Hardcover Content"
        intro="After Details, complete ISBN and print settings, upload the interior and full-wrap cover, and inspect the print preview. Generate the current PDFs from this studio, then verify them against KDP’s own template."
      >
        <AnswerCard label="ISBN choice for a low-content journal" answer="Choose either your own ISBN or publish without an ISBN. KDP does not offer a free KDP ISBN for low-content books." guidance="If using your own ISBN, enter the matching ISBN and imprint exactly as issued and ensure any ISBN printed inside or on the cover matches. KDP handles the barcode rules shown for your chosen ISBN option." id="isbn" {...cardProps} copyable={false} />
        <AnswerCard label="Interior manuscript file" answer="Upload the generated interior PDF after checking every page, page size, margins, line placement, page count, and any bleed. Make sure the final PDF matches the selected KDP trim size and print options." guidance="Return to the Interior preview, choose Generate files, then download/open the Interior PDF. A successful studio validation is not a guarantee that KDP will accept it." id="interior-file" {...cardProps} copyable={false} />
        <AnswerCard label="Hardcover cover file and template" answer="Download the generated cover PDF, then check its full-wrap dimensions and spine against a fresh KDP hardcover cover template made for the final trim size, page count, and print settings. Upload only after the KDP Print Previewer accepts it." guidance="KDP hardcover cover measurements differ from paperback. Do not rely on the front-cover PNG as a print-ready wrap, and do not guess spine width." id="cover-file" {...cardProps} copyable={false} />
        <AnswerCard label="Print options" answer={`Match the studio profile where KDP offers it: ${ink === "color" ? "premium color" : "black ink"} on ${paper} paper, with ${trim} trim. Standard color printing is not available for KDP hardcover.`} guidance="KDP hardcover has only five trim sizes; custom, A4, and pocket formats may not be accepted. The live KDP print-options menu is authoritative. KDP offers black ink on white or cream paper and premium color on white paper." id="print-options" {...cardProps} copyable={false} />
        <AnswerCard label="Hardcover page count" answer={`${pageCount} interior pages${pagesAreHardcoverEligible ? " — within KDP’s 75–550 page range." : " — outside KDP’s 75–550 page range; change the interior before upload."}`} guidance="The cover template and estimated printing cost depend on the final page count." id="page-count" {...cardProps} copyable={false} />
        <AnswerCard label="Proof and final preview" answer="Open every KDP Print Previewer warning, inspect the cover, spine, margins, bleed, and first/last pages, then order and review a physical proof before approving publication." guidance="Screen previews cannot confirm print color, paper feel, binding, or all physical alignment issues." id="proof" {...cardProps} copyable={false} />
      </GuideSection>

      <GuideSection
        number="3"
        title="Hardcover Rights & Pricing"
        intro="Make these choices only after confirming you have the necessary rights and selecting the final marketplace and print setup."
      >
        <AnswerCard label="Territories" answer="Choose worldwide rights only if you control the publishing rights in every territory. Otherwise, select only the territories for which you have the necessary rights." guidance="This is a rights declaration, not a marketing preference. Your license terms determine the correct answer." id="territories" copied={copied} onCopy={copyAnswer} requiresDecision />
        <AnswerCard label="Primary list price" answer="Enter a price in the currency requested by your chosen marketplace. Set it above KDP’s displayed minimum after reviewing the current printing cost and royalty estimate." guidance="There is no safe fixed price to prefill: printing cost changes with page count, ink, trim, and marketplace." id="price" copied={copied} onCopy={copyAnswer} requiresDecision />
        <AnswerCard label="Royalty estimate" answer="Use KDP’s live hardcover calculator. KDP calculates hardcover royalty as (applicable 50% or 60% rate × tax-exclusive list price) − printing cost." guidance="KDP’s rate depends on the marketplace and list-price threshold; use the figures shown in your account rather than an old estimate." id="royalty" {...cardProps} copyable={false} />
        <AnswerCard label="Final submission" answer="Save the listing, confirm every answer and marketplace price, review the KDP Print Previewer, then choose Publish only when the interior, cover, rights, and price are final." guidance="KDP review and publishing are not performed by this studio." id="submit" {...cardProps} copyable={false} />
      </GuideSection>

      <div className="flex flex-col gap-2 rounded-xl border border-[#ded8ca] bg-[#fffdf8] p-3.5 text-[10px] leading-[1.7] text-[#77796d] sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0 text-[#927958]" />KDP rules and available options can change. Check the live form before submitting.</span>
        <a href="https://kdp.amazon.com/en_US/help/topic/GGE5T76TWKA85DJM" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#456e5a] hover:underline">
          KDP low-content rules <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
