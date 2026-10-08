import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Palette,
  Save,
  Sparkles,
  Type,
} from "lucide-react";
import {
  renderEbookArtSvg,
  type EbookArtMotif,
  type EbookDesignBlock,
  type EbookDesignDocument,
  type EbookDesignPage,
  type EbookDesignTheme,
} from "@shared/ebook-design";

type Book = {
  id: string;
  title: string;
  subtitle?: string | null;
  bookType: string;
  genre: string;
  trimSize: string;
  idea?: string | null;
  description?: string | null;
};

type Chapter = { id: string; title: string; content: string };
type Generation = {
  generationJobId?: string | null;
  generationStatus: string;
  generationProgress: number;
  generationMessage?: string | null;
  generationError?: string | null;
};

export type EbookBookDesignerProps = {
  book: Book;
  chapters: Chapter[];
  document: EbookDesignDocument | null;
  authorName: string;
  generation: Generation;
  isSaving: boolean;
  exportBusy: string | null;
  onGenerate: (options: { prompt: string; chapterCount: number; replaceExisting: boolean }) => void;
  onSave: () => void;
  onDocumentChange: (doc: EbookDesignDocument) => void;
  onChapterChange: (chapterId: string, content: string) => void;
  onExport: (format: "pdf" | "epub" | "docx" | "html") => void;
};

const motifs: EbookArtMotif[] = ["botanical", "geometry", "orbit", "waves"];
const formats = ["pdf", "epub", "docx", "html"] as const;
const fontChoices = [
  { value: "serif", label: "Editorial serif" },
  { value: "sans", label: "Modern sans" },
] as const;

function isTextBlock(block: EbookDesignBlock): block is Extract<EbookDesignBlock, { kind: "text" }> {
  return block.kind === "text";
}

function updatePage(
  doc: EbookDesignDocument,
  pageId: string,
  transform: (page: EbookDesignPage) => EbookDesignPage,
): EbookDesignDocument {
  return { ...doc, pages: doc.pages.map((page) => page.id === pageId ? transform(page) : page) };
}

function safeProgress(progress: number) {
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
}

export default function EbookBookDesigner({
  book,
  chapters,
  document,
  authorName,
  generation,
  isSaving,
  exportBusy,
  onGenerate,
  onSave,
  onDocumentChange,
  onChapterChange,
  onExport,
}: EbookBookDesignerProps) {
  const [prompt, setPrompt] = useState(document?.prompt || book.idea || book.description || "");
  const [chapterCount, setChapterCount] = useState<4 | 6 | 8>(6);
  const [selectedPageId, setSelectedPageId] = useState(document?.pages[0]?.id || "");
  const [mobilePanel, setMobilePanel] = useState<"pages" | "preview" | "design">("preview");
  const pages = document?.pages || [];
  const selectedPage = pages.find((page) => page.id === selectedPageId) || pages[0];
  const activePageId = selectedPage?.id || "";
  const hasContent = chapters.some((chapter) => chapter.content.trim()) || pages.length > 0;
  const progress = safeProgress(generation.generationProgress);
  const isGenerating = ["queued", "pending", "running", "processing", "generating"].includes(
    generation.generationStatus.toLowerCase(),
  );

  const artSources = useMemo(() => {
    if (!document) return new Map<string, string>();
    return new Map(document.pages.flatMap((page, pageIndex) =>
      page.blocks.flatMap((block, blockIndex) => block.kind === "art"
        ? [[block.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderEbookArtSvg(block.motif, document.theme, pageIndex + blockIndex, block.altText))}]] as [string, string][]]
        : []),
    ));
  }, [document]);

  const changeDocument = (next: EbookDesignDocument) => onDocumentChange(next);
  const changeTheme = <K extends keyof EbookDesignTheme>(key: K, value: EbookDesignTheme[K]) => {
    if (document) changeDocument({ ...document, theme: { ...document.theme, [key]: value } });
  };
  const changePage = (transform: (page: EbookDesignPage) => EbookDesignPage) => {
    if (document && activePageId) changeDocument(updatePage(document, activePageId, transform));
  };
  const changeBlock = (blockId: string, transform: (block: EbookDesignBlock) => EbookDesignBlock) => {
    changePage((page) => ({ ...page, blocks: page.blocks.map((block) => block.id === blockId ? transform(block) : block) }));
  };
  const movePage = (direction: -1 | 1) => {
    if (!document || !selectedPage) return;
    const currentIndex = document.pages.findIndex((page) => page.id === selectedPage.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= document.pages.length) return;
    const nextPages = [...document.pages];
    [nextPages[currentIndex], nextPages[targetIndex]] = [nextPages[targetIndex], nextPages[currentIndex]];
    changeDocument({ ...document, pages: nextPages });
  };
  const generate = () => {
    if (!prompt.trim() || isGenerating) return;
    const replaceExisting = hasContent
      ? window.confirm("Replace the existing manuscript and designed pages? This cannot be undone.")
      : false;
    if (hasContent && !replaceExisting) return;
    onGenerate({ prompt: prompt.trim(), chapterCount, replaceExisting });
  };

  const fontFamily = (font: "serif" | "sans") => font === "serif"
    ? '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif'
    : 'ui-sans-serif, system-ui, sans-serif';

  return (
    <section
      className="ebook-designer min-h-[100dvh] bg-[#f2efe9] text-[#26231f]"
      style={{
        "--studio-ink": "#28251f",
        "--studio-muted": "#77736c",
        "--studio-line": "#ded9cf",
        "--studio-paper": "#fffdf8",
        "--studio-forest": "#34564b",
      } as React.CSSProperties}
      aria-label="Ebook book designer"
    >
      <style>{`
        .ebook-designer { font-family: ui-sans-serif, system-ui, sans-serif; }
        .ebook-designer * { box-sizing: border-box; }
        .ebook-scrollbar { scrollbar-width: thin; scrollbar-color: #c8c1b5 transparent; }
        .ebook-page-shadow { box-shadow: 0 16px 55px rgba(47, 41, 31, .12), 0 2px 8px rgba(47, 41, 31, .08); }
        .ebook-focus:focus-visible { outline: 3px solid #aa7c46; outline-offset: 2px; }
        .ebook-designer input[type="color"] { padding: 3px; }
        @media (prefers-reduced-motion: no-preference) {
          .ebook-designer .ebook-appear { animation: ebook-rise .35s ease-out both; }
          @keyframes ebook-rise { from { opacity: .5; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        }
      `}</style>

      <header className="border-b border-[#ded9cf] bg-[#faf8f3]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#34564b] text-[#fbf8ef]">
              <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#817b70]">Creator Studio / Book design</p>
              <h1 className="truncate text-lg font-semibold tracking-[-.03em] text-[#28251f] sm:text-xl">{book.title || "Untitled book"}</h1>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="mr-auto hidden text-xs text-[#79756d] sm:inline">{book.trimSize} trim · {authorName || "Author"}</span>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="ebook-focus inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d6d0c5] bg-[#fffdf8] px-4 text-sm font-semibold text-[#39372f] hover:bg-white disabled:cursor-wait disabled:opacity-60 sm:flex-none"
            >
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <div className="relative flex-1 sm:flex-none">
              <label className="sr-only" htmlFor="ebook-export">Export manuscript</label>
              <select
                id="ebook-export"
                value=""
                onChange={(event) => {
                  const format = event.target.value as typeof formats[number];
                  if (format) onExport(format);
                }}
                disabled={!document || !!exportBusy}
                className="ebook-focus h-10 w-full appearance-none rounded-xl bg-[#34564b] pl-4 pr-10 text-sm font-semibold text-white hover:bg-[#29473d] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[170px]"
              >
                <option value="" disabled>{exportBusy ? "Preparing…" : "Export book"}</option>
                {formats.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}
              </select>
              {exportBusy ? <LoaderCircle className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-white" aria-hidden="true" /> : <Download className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-white" aria-hidden="true" />}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(300px,.88fr)_minmax(430px,1.4fr)_minmax(265px,.72fr)]">
          <section className="rounded-[20px] border border-[#ded9cf] bg-[#faf8f3] p-4 sm:p-5" aria-labelledby="generate-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#927550]">01 / Manuscript</p>
                <h2 id="generate-heading" className="mt-1 text-[17px] font-semibold tracking-[-.025em]">Start with your direction</h2>
              </div>
              <Sparkles className="mt-1 h-[18px] w-[18px] text-[#a27a47]" aria-hidden="true" />
            </div>
            <label htmlFor="book-prompt" className="mb-1.5 mt-4 block text-xs font-semibold text-[#59554d]">Book prompt</label>
            <textarea
              id="book-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={6000}
              placeholder="Describe the book you want to write, its reader, and the ideas it should carry."
              className="ebook-focus min-h-[96px] w-full resize-y rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-3 py-2.5 text-sm leading-6 text-[#302d27] placeholder:text-[#a29b90]"
            />
            <div className="mt-3 flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="chapter-count" className="mb-1.5 block text-xs font-semibold text-[#59554d]">Chapter plan</label>
                <select
                  id="chapter-count"
                  value={chapterCount}
                  onChange={(event) => setChapterCount(Number(event.target.value) as 4 | 6 | 8)}
                  className="ebook-focus h-10 w-full rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-3 text-sm text-[#302d27]"
                >
                  {[4, 6, 8].map((count) => <option key={count} value={count}>{count} chapters</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={!prompt.trim() || isGenerating}
                className="ebook-focus inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#34564b] px-4 text-sm font-semibold text-white hover:bg-[#29473d] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {isGenerating ? "Working" : "Generate"}
              </button>
            </div>
            {isGenerating && (
              <div className="mt-4 rounded-xl border border-[#d7dfd8] bg-[#eef3ed] px-3.5 py-3" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#35574b]">
                  <span>{generation.generationMessage || "Writing your manuscript and laying out the interior…"}</span>
                  <span className="tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d8e1d9]">
                  <div className="h-full rounded-full bg-[#567966] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {!!generation.generationError && (
              <div className="mt-4 flex gap-2.5 rounded-xl border border-[#e8c7be] bg-[#fff5f1] p-3 text-sm text-[#874b3e]" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{generation.generationError}</p>
              </div>
            )}
            {!isGenerating && !!generation.generationMessage && !generation.generationError && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[#587464]" role="status">
                <Check className="h-4 w-4" aria-hidden="true" />{generation.generationMessage}
              </p>
            )}
          </section>

          <section className="rounded-[20px] border border-[#ded9cf] bg-[#faf8f3] p-4 sm:p-5" aria-labelledby="theme-heading">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#927550]">02 / Art direction</p>
                <h2 id="theme-heading" className="mt-1 text-[17px] font-semibold tracking-[-.025em]">Set the visual language</h2>
              </div>
              <Palette className="mt-1 h-[18px] w-[18px] text-[#a27a47]" aria-hidden="true" />
            </div>
            {document ? (
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="theme-name" className="mb-1.5 block text-[11px] font-semibold text-[#686259]">Theme name</label>
                  <input id="theme-name" value={document.theme.name} onChange={(event) => changeTheme("name", event.target.value)} className="ebook-focus h-10 w-full rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-3 text-sm" />
                </div>
                {([
                  ["primary", "Primary"],
                  ["accent", "Accent"],
                  ["paper", "Paper"],
                  ["text", "Text"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`theme-${key}`} className="mb-1.5 block text-[11px] font-semibold text-[#686259]">{label}</label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-2">
                      <input
                        id={`theme-${key}`}
                        type="color"
                        aria-label={`${label} color`}
                        value={document.theme[key]}
                        onChange={(event) => changeTheme(key, event.target.value)}
                        className="h-7 w-8 cursor-pointer rounded-md border-0 bg-transparent"
                      />
                      <span className="text-xs uppercase text-[#716c63]">{document.theme[key]}</span>
                    </div>
                  </div>
                ))}
                <div>
                  <label htmlFor="heading-font" className="mb-1.5 block text-[11px] font-semibold text-[#686259]">Headings</label>
                  <select id="heading-font" value={document.theme.headingFont} onChange={(event) => changeTheme("headingFont", event.target.value as "serif" | "sans")} className="ebook-focus h-10 w-full rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-2 text-xs">
                    {fontChoices.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="body-font" className="mb-1.5 block text-[11px] font-semibold text-[#686259]">Body</label>
                  <select id="body-font" value={document.theme.bodyFont} onChange={(event) => changeTheme("bodyFont", event.target.value as "serif" | "sans")} className="ebook-focus h-10 w-full rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-2 text-xs">
                    {fontChoices.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex min-h-[106px] items-center rounded-xl border border-dashed border-[#d8d1c5] px-4 text-sm text-[#8b857a]">
                Generate a manuscript to tune its colors and typography.
              </div>
            )}
          </section>

          <section className="rounded-[20px] border border-[#ded9cf] bg-[#faf8f3] p-4 sm:p-5" aria-labelledby="book-details-heading">
            <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#927550]">Book details</p>
            <h2 id="book-details-heading" className="mt-1 text-[17px] font-semibold tracking-[-.025em]">Your publication</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ede9df] text-[#696358]"><FileText size={15} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#928b7f]">Format / genre</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#39362f]">{book.bookType} · {book.genre}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ede9df] text-[#696358]"><Type size={15} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#928b7f]">Trim / byline</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#39362f]">{book.trimSize} · {authorName || "Author not set"}</p>
                </div>
              </div>
              <p className="border-t border-[#e8e3da] pt-3 text-xs leading-5 text-[#777168]">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"} · {pages.length} designed {pages.length === 1 ? "page" : "pages"}
              </p>
            </div>
          </section>
        </div>

        <div className="mb-3 grid grid-cols-3 rounded-xl border border-[#ded9cf] bg-[#faf8f3] p-1 sm:hidden" role="tablist" aria-label="Editor panels">
          {(["pages", "preview", "design"] as const).map((panel) => (
            <button
              type="button"
              key={panel}
              role="tab"
              aria-selected={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
              className={`ebook-focus rounded-lg px-2 py-2 text-xs font-semibold capitalize ${mobilePanel === panel ? "bg-[#34564b] text-white" : "text-[#6f695f]"}`}
            >{panel}</button>
          ))}
        </div>

        <div className="grid min-h-[660px] gap-4 lg:grid-cols-[250px_minmax(400px,1fr)_300px]">
          <aside className={`${mobilePanel === "pages" ? "block" : "hidden"} rounded-[20px] border border-[#ded9cf] bg-[#faf8f3] p-4 sm:block`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#927550]">03 / Structure</p>
                <h2 className="mt-1 text-base font-semibold">Designed pages</h2>
              </div>
              <span className="rounded-full bg-[#ede9df] px-2.5 py-1 text-xs font-semibold text-[#686257]">{pages.length}</span>
            </div>
            <div className="mt-4 flex gap-1.5">
              <button type="button" onClick={() => movePage(-1)} disabled={!selectedPage || pages.indexOf(selectedPage) <= 0} className="ebook-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ded9cf] bg-[#fffdf8] text-xs font-medium text-[#615c53] hover:bg-white disabled:opacity-40" aria-label="Move selected page earlier"><ArrowUp size={14} aria-hidden="true" />Move up</button>
              <button type="button" onClick={() => movePage(1)} disabled={!selectedPage || pages.indexOf(selectedPage) >= pages.length - 1} className="ebook-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ded9cf] bg-[#fffdf8] text-xs font-medium text-[#615c53] hover:bg-white disabled:opacity-40" aria-label="Move selected page later"><ArrowDown size={14} aria-hidden="true" />Move down</button>
            </div>
            <div className="ebook-scrollbar mt-3 max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
              {pages.length ? pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => { setSelectedPageId(page.id); setMobilePanel("preview"); }}
                  aria-current={page.id === activePageId ? "page" : undefined}
                  className={`ebook-focus group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${page.id === activePageId ? "border-[#9eaa9f] bg-[#edf2ec]" : "border-transparent hover:border-[#e1dbcf] hover:bg-[#fffdf8]"}`}
                >
                  <span className={`grid h-11 w-9 shrink-0 place-items-center rounded-md border text-[10px] font-semibold ${page.id === activePageId ? "border-[#b8c7ba] bg-[#fffdf8] text-[#34564b]" : "border-[#ded9cf] bg-[#f5f1e8] text-[#938b7d]"}`}>{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#38352f]">{page.title || "Untitled page"}</span>
                    <span className="mt-0.5 block truncate text-[10px] capitalize tracking-wide text-[#8b857a]">{page.kind.replace("-", " ")}</span>
                  </span>
                  {page.id === activePageId && <ChevronRight size={15} className="text-[#567461]" aria-hidden="true" />}
                </button>
              )) : (
                <div className="rounded-xl border border-dashed border-[#d8d1c5] px-3 py-8 text-center">
                  <BookOpen className="mx-auto h-6 w-6 text-[#aaa294]" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-[#686257]">No pages yet</p>
                  <p className="mt-1 text-xs leading-5 text-[#918a7f]">Your designed interior will appear here after generation.</p>
                </div>
              )}
            </div>
          </aside>

          <section className={`${mobilePanel === "preview" ? "block" : "hidden"} flex min-w-0 flex-col rounded-[20px] border border-[#ded9cf] bg-[#e9e5dc] p-3 sm:block sm:p-5`} aria-label="Page preview">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[.19em] text-[#87775f]">Live preview</span>
                {selectedPage && <span className="rounded-md bg-[#f6f3ec] px-2 py-1 text-[10px] font-medium capitalize text-[#777166]">{selectedPage.kind.replace("-", " ")}</span>}
              </div>
              {selectedPage && (
                <div className="flex items-center gap-1.5 text-xs text-[#79746b]">
                  <button type="button" onClick={() => {
                    const index = pages.indexOf(selectedPage);
                    if (index > 0) setSelectedPageId(pages[index - 1].id);
                  }} disabled={pages.indexOf(selectedPage) <= 0} className="ebook-focus grid h-8 w-8 place-items-center rounded-lg bg-[#f8f6f0] hover:bg-white disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
                  <span className="min-w-[66px] text-center tabular-nums">{pages.indexOf(selectedPage) + 1} / {pages.length}</span>
                  <button type="button" onClick={() => {
                    const index = pages.indexOf(selectedPage);
                    if (index < pages.length - 1) setSelectedPageId(pages[index + 1].id);
                  }} disabled={pages.indexOf(selectedPage) >= pages.length - 1} className="ebook-focus grid h-8 w-8 place-items-center rounded-lg bg-[#f8f6f0] hover:bg-white disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
            {selectedPage && document ? (
              <div className="ebook-appear flex flex-1 justify-center overflow-auto px-1 py-2 sm:px-4 sm:py-3">
                <article
                  className="ebook-page-shadow relative flex min-h-[590px] w-full max-w-[430px] shrink-0 flex-col overflow-hidden px-[9%] py-[10%] sm:min-h-[690px]"
                  style={{ backgroundColor: document.theme.paper, color: document.theme.text }}
                  aria-label={`Preview: ${selectedPage.title}`}
                >
                  <div className="absolute left-[9%] right-[9%] top-[6%] h-[2px]" style={{ backgroundColor: document.theme.accent, opacity: .65 }} />
                  {selectedPage.blocks.map((block, index) => {
                    if (block.kind === "text") {
                      const styles: Record<typeof block.role, React.CSSProperties> = {
                        eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: document.theme.accent },
                        title: { fontFamily: fontFamily(document.theme.headingFont), fontSize: "clamp(30px, 5vw, 42px)", lineHeight: 1.08, fontWeight: 500, color: document.theme.primary, letterSpacing: "-.035em" },
                        subtitle: { fontFamily: fontFamily(document.theme.bodyFont), fontSize: 16, lineHeight: 1.5, color: document.theme.text, opacity: .78 },
                        heading: { fontFamily: fontFamily(document.theme.headingFont), fontSize: 24, lineHeight: 1.2, fontWeight: 500, color: document.theme.primary },
                        body: { fontFamily: fontFamily(document.theme.bodyFont), fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" },
                        quote: { fontFamily: fontFamily(document.theme.headingFont), fontSize: 20, lineHeight: 1.55, fontStyle: "italic", borderLeft: `2px solid ${document.theme.accent}`, paddingLeft: 16, color: document.theme.primary },
                        caption: { fontFamily: fontFamily(document.theme.bodyFont), fontSize: 10, lineHeight: 1.5, letterSpacing: ".05em", color: document.theme.text, opacity: .65 },
                      };
                      return <p key={block.id} className={`whitespace-pre-wrap ${block.role === "title" ? "mt-5" : "mt-3"}`} style={styles[block.role]}>{block.text}</p>;
                    }
                    if (block.kind === "art") {
                      return <figure key={block.id} className="my-5">
                        <img className="block w-full rounded-lg" src={artSources.get(block.id)} alt={block.altText} />
                        {!!block.brief && <figcaption className="mt-2 text-center text-[10px] opacity-60">{block.brief}</figcaption>}
                      </figure>;
                    }
                    if (block.kind === "list") {
                      return <ul key={block.id} className="my-4 list-disc space-y-2 pl-5 text-sm leading-7" style={{ fontFamily: fontFamily(document.theme.bodyFont) }}>
                        {block.items.map((item, itemIndex) => <li key={`${block.id}-${itemIndex}`}>{item}</li>)}
                      </ul>;
                    }
                    if (block.kind === "contents") {
                      return <div key={block.id} className="my-4 space-y-2 border-y py-4" style={{ borderColor: `${document.theme.primary}30` }}>
                        {chapters.map((chapter, chapterIndex) => <div key={chapter.id} className="flex items-baseline justify-between gap-3 text-xs" style={{ fontFamily: fontFamily(document.theme.bodyFont) }}><span>{chapter.title}</span><span className="opacity-50">{String(chapterIndex + 1).padStart(2, "0")}</span></div>)}
                      </div>;
                    }
                    const chapter = chapters.find((item) => item.id === block.chapterId);
                    return <div key={block.id} className="my-3 text-sm leading-7" style={{ fontFamily: fontFamily(document.theme.bodyFont) }}>
                      {chapter ? chapter.content.split(/\n+/).filter(Boolean).slice(0, 5).map((paragraph, paragraphIndex) => <p key={`${block.id}-${paragraphIndex}`} className="mb-3">{paragraph}</p>) : <p className="italic opacity-50">Chapter content not found.</p>}
                    </div>;
                  })}
                  {selectedPage.blocks.length === 0 && <p className="m-auto text-sm opacity-50">This page has no content blocks.</p>}
                  <div className="mt-auto pt-10 text-center text-[9px] uppercase tracking-[.2em]" style={{ color: document.theme.accent, opacity: .8 }}>{authorName || book.title}</div>
                </article>
              </div>
            ) : (
              <div className="flex min-h-[570px] flex-1 items-center justify-center px-4">
                <div className="max-w-sm text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f7f4ed] text-[#8b806e]"><ImageIcon size={22} aria-hidden="true" /></div>
                  <h3 className="mt-4 text-lg font-semibold text-[#4c4840]">A quiet page, ready to begin</h3>
                  <p className="mt-2 text-sm leading-6 text-[#79746b]">Describe your book and generate a first manuscript. The page sequence and design will take shape here.</p>
                </div>
              </div>
            )}
          </section>

          <aside className={`${mobilePanel === "design" ? "block" : "hidden"} rounded-[20px] border border-[#ded9cf] bg-[#faf8f3] p-4 sm:block sm:p-5`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#927550]">04 / Page editor</p>
              <h2 className="mt-1 truncate text-base font-semibold">{selectedPage?.title || "Select a page"}</h2>
            </div>
            {selectedPage && document ? (
              <div className="ebook-scrollbar mt-4 max-h-[590px] space-y-4 overflow-y-auto pr-1">
                <div>
                  <label htmlFor="page-title" className="mb-1.5 block text-xs font-semibold text-[#5e594f]">Page label</label>
                  <input
                    id="page-title"
                    value={selectedPage.title}
                    onChange={(event) => changePage((page) => ({ ...page, title: event.target.value }))}
                    className="ebook-focus h-10 w-full rounded-xl border border-[#dcd6cb] bg-[#fffdf8] px-3 text-sm"
                  />
                </div>
                <div className="border-t border-[#e5dfd5] pt-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[.15em] text-[#928b7f]">Content blocks</h3>
                  <div className="mt-3 space-y-4">
                    {selectedPage.blocks.map((block) => (
                      <div key={block.id} className="rounded-xl border border-[#e4ded3] bg-[#fffdf8] p-3">
                        {block.kind === "text" && (
                          <>
                            <label htmlFor={`block-${block.id}`} className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold capitalize text-[#514c43]">
                              <span>{block.role}</span><span className="text-[9px] font-medium uppercase tracking-[.12em] text-[#9b9387]">Text</span>
                            </label>
                            <textarea
                              id={`block-${block.id}`}
                              value={block.text}
                              onChange={(event) => changeBlock(block.id, (current) => isTextBlock(current) ? { ...current, text: event.target.value } : current)}
                              rows={block.role === "body" ? 6 : 3}
                              className="ebook-focus w-full resize-y rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 py-2 text-xs leading-5 text-[#39362f]"
                            />
                          </>
                        )}
                        {block.kind === "list" && (
                          <>
                            <label htmlFor={`block-${block.id}`} className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#514c43]">
                              <span>List items</span><span className="text-[9px] font-medium uppercase tracking-[.12em] text-[#9b9387]">One per line</span>
                            </label>
                            <textarea
                              id={`block-${block.id}`}
                              value={block.items.join("\n")}
                              onChange={(event) => changeBlock(block.id, (current) => current.kind === "list" ? { ...current, items: event.target.value.split("\n") } : current)}
                              rows={Math.max(3, Math.min(8, block.items.length + 1))}
                              className="ebook-focus w-full resize-y rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 py-2 text-xs leading-5 text-[#39362f]"
                            />
                          </>
                        )}
                        {block.kind === "art" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#514c43]">Vector illustration</span>
                              <ImageIcon size={15} className="text-[#827a6e]" aria-hidden="true" />
                            </div>
                            <div>
                              <label htmlFor={`motif-${block.id}`} className="mb-1.5 block text-[11px] font-medium text-[#777065]">Motif</label>
                              <select id={`motif-${block.id}`} value={block.motif} onChange={(event) => changeBlock(block.id, (current) => current.kind === "art" ? { ...current, motif: event.target.value as EbookArtMotif } : current)} className="ebook-focus h-9 w-full rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 text-xs capitalize">
                                {motifs.map((motif) => <option key={motif} value={motif}>{motif}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`alt-${block.id}`} className="mb-1.5 block text-[11px] font-medium text-[#777065]">Illustration description</label>
                              <input id={`alt-${block.id}`} value={block.altText} onChange={(event) => changeBlock(block.id, (current) => current.kind === "art" ? { ...current, altText: event.target.value } : current)} className="ebook-focus h-9 w-full rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 text-xs" />
                            </div>
                            <div>
                              <label htmlFor={`brief-${block.id}`} className="mb-1.5 block text-[11px] font-medium text-[#777065]">Art direction</label>
                              <textarea id={`brief-${block.id}`} value={block.brief || ""} onChange={(event) => changeBlock(block.id, (current) => current.kind === "art" ? { ...current, brief: event.target.value } : current)} rows={2} className="ebook-focus w-full resize-y rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 py-2 text-xs leading-5" />
                            </div>
                          </div>
                        )}
                        {block.kind === "chapter" && (
                          <div>
                            <label htmlFor={`chapter-${block.id}`} className="mb-2 block text-xs font-semibold text-[#514c43]">Referenced chapter</label>
                            <select
                              id={`chapter-${block.id}`}
                              value={block.chapterId}
                              onChange={(event) => changeBlock(block.id, (current) => current.kind === "chapter" ? { ...current, chapterId: event.target.value } : current)}
                              className="ebook-focus h-9 w-full rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 text-xs"
                            >
                              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                              {!chapters.length && <option value={block.chapterId}>No chapters available</option>}
                            </select>
                            {chapters.find((chapter) => chapter.id === block.chapterId) && (
                              <div className="mt-3">
                                <label htmlFor={`chapter-content-${block.id}`} className="mb-1.5 block text-[11px] font-medium text-[#777065]">Chapter manuscript</label>
                                <textarea
                                  id={`chapter-content-${block.id}`}
                                  value={chapters.find((chapter) => chapter.id === block.chapterId)?.content || ""}
                                  onChange={(event) => onChapterChange(block.chapterId, event.target.value)}
                                  rows={7}
                                  className="ebook-focus w-full resize-y rounded-lg border border-[#e2ddd3] bg-[#fcfaf5] px-2.5 py-2 text-xs leading-5"
                                />
                                <p className="mt-1 text-[10px] leading-4 text-[#928b7f]">Edits are applied to the referenced manuscript chapter.</p>
                              </div>
                            )}
                          </div>
                        )}
                        {block.kind === "contents" && (
                          <p className="text-xs leading-5 text-[#686257]">Contents are drawn from the current chapter titles.</p>
                        )}
                      </div>
                    ))}
                    {!selectedPage.blocks.length && <p className="rounded-xl border border-dashed border-[#d8d1c5] p-4 text-xs leading-5 text-[#8a8378]">This page has no editable blocks.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#d8d1c5] p-4 text-sm leading-6 text-[#8a8378]">
                Select a designed page to edit its copy, artwork, and chapter references.
              </div>
            )}
          </aside>
        </div>
      </main>
    </section>
  );
}
