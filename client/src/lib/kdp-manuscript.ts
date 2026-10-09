export type KdpBookDraft = {
  title: string;
  subtitle?: string | null;
  bookType?: string | null;
  genre?: string | null;
  trimSize?: string | null;
  description?: string | null;
  chapters?: Array<{ title: string; content: string }>;
};

export const KDP_BOOK_TYPES = [
  { value: "nonfiction", label: "Nonfiction guide" },
  { value: "fiction", label: "Fiction" },
  { value: "workbook", label: "Workbook or journal" },
  { value: "children", label: "Children's book" },
  { value: "poetry", label: "Poetry" },
  { value: "memoir", label: "Memoir" },
] as const;

export const KDP_GENRES = [
  "General nonfiction",
  "Business & money",
  "Self-help & personal growth",
  "Health, fitness & wellness",
  "Education & study guides",
  "Technology & computing",
  "Food & cooking",
  "Biography & memoir",
  "Romance",
  "Mystery & thriller",
  "Fantasy & science fiction",
  "Children's books",
  "Poetry",
  "Faith & spirituality",
] as const;

export const KDP_TRIM_SIZES = [
  { value: "6x9", label: "6 × 9 in — common paperback size" },
  { value: "5.5x8.5", label: "5.5 × 8.5 in" },
  { value: "5x8", label: "5 × 8 in" },
  { value: "8.2677x11.6929", label: "A4 portrait — 210 × 297 mm" },
  { value: "8.5x11", label: "8.5 × 11 in — workbook / large format" },
  { value: "8x10", label: "8 × 10 in — workbook / large format" },
  { value: "8x8", label: "8 × 8 in — square format" },
] as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function safeFilePart(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "book";
}

export function downloadKdpManuscript(book: KdpBookDraft, author: string) {
  const chapters = book.chapters || [];
  const title = escapeHtml(book.title.trim() || "Untitled book");
  const subtitle = book.subtitle?.trim() ? escapeHtml(book.subtitle.trim()) : "";
  const authorName = escapeHtml(author.trim() || "Author");
  const [trimWidth, trimHeight] = (book.trimSize || "6x9").split("x");
  const contents = chapters.map((chapter, index) =>
    `<li><a href="#chapter-${index + 1}">${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</a></li>`,
  ).join("\n");
  const chapterMarkup = chapters.map((chapter, index) => {
    const paragraphs = (chapter.content || "")
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
      .join("\n");
    return `<section class="chapter" id="chapter-${index + 1}">
      <h1>${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</h1>
      ${paragraphs || "<p>[Add chapter content before publishing.]</p>"}
    </section>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}${subtitle ? `: ${subtitle}` : ""}</title>
  <style>
    @page { size: ${escapeHtml(trimWidth)}in ${escapeHtml(trimHeight)}in; margin: 0.75in; }
    body { color: #171717; font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.55; }
    .title-page { min-height: 7in; display: flex; flex-direction: column; justify-content: center; text-align: center; page-break-after: always; }
    .title-page h1 { font-size: 28pt; line-height: 1.2; margin-bottom: 0.35em; }
    .title-page .subtitle { font-size: 16pt; }
    .title-page .author { margin-top: 2em; }
    .contents { page-break-after: always; }
    .contents li { margin: 0.5em 0; }
    .chapter { page-break-before: always; }
    .chapter h1 { font-size: 20pt; line-height: 1.25; margin: 0 0 1.2em; page-break-after: avoid; }
    .chapter p { margin: 0 0 0.9em; text-indent: 1.2em; orphans: 2; widows: 2; }
    @media screen { body { max-width: 6in; margin: 2rem auto; padding: 1rem; } }
  </style>
</head>
<body>
  <section class="title-page">
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
    <p class="author">${authorName}</p>
  </section>
  <section class="copyright">
    <p>Copyright © [Year] ${authorName}</p>
    <p>All rights reserved.</p>
  </section>
  ${book.description?.trim() ? `<section><h1>About this book</h1><p>${escapeHtml(book.description.trim()).replace(/\n/g, "<br>")}</p></section>` : ""}
  ${chapters.length ? `<nav class="contents"><h1>Contents</h1><ol>${contents}</ol></nav>` : ""}
  ${chapterMarkup}
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilePart(book.title)}-kdp-manuscript.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
