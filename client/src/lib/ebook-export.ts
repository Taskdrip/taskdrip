import { strToU8, zipSync } from "fflate";
import { renderEbookArtSvg, type EbookDesignBlock, type EbookDesignDocument, type EbookDesignPage } from "@shared/ebook-design";

export type EbookExportFormat = "pdf" | "epub" | "docx" | "html" | "cover-png";
export type EbookExportBook = {
  id?: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  trimSize?: string | null;
  chapters: Array<{ id: string; title: string; content: string }>;
  designerDocument: EbookDesignDocument | null;
};

function safeFilePart(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "book";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

function escapeXml(value: string) {
  return escapeHtml(value);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizedDocument(book: EbookExportBook): EbookDesignDocument {
  if (book.designerDocument?.pages?.length) return book.designerDocument;
  return {
    schemaVersion: 1,
    prompt: "",
    theme: {
      name: "Classic editorial",
      primary: "#33245C",
      accent: "#B97840",
      paper: "#FFFCF6",
      text: "#24202A",
      headingFont: "serif",
      bodyFont: "serif",
    },
    pages: [
      { id: "title", kind: "title", title: "Title page", blocks: [{ id: "title-text", kind: "text", role: "title", text: book.title }] },
      ...book.chapters.map((chapter, index) => ({
        id: `chapter-${index + 1}`,
        kind: "chapter-body" as const,
        title: chapter.title,
        chapterId: chapter.id,
        blocks: [{ id: `chapter-content-${index + 1}`, kind: "chapter" as const, chapterId: chapter.id }],
      })),
    ],
  };
}

function paragraphs(content: string) {
  return content.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
}

function chapterMarkup(chapter: EbookExportBook["chapters"][number], className = "") {
  const body = paragraphs(chapter.content).map((paragraph) => {
    const heading = paragraph.match(/^#{1,3}\s+(.+)$/);
    return heading
      ? `<h2>${escapeHtml(heading[1])}</h2>`
      : `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return `<section class="chapter ${className}" id="chapter-${escapeHtml(chapter.id)}"><h1>${escapeHtml(chapter.title)}</h1>${body}</section>`;
}

function renderHtmlBlock(
  block: EbookDesignBlock,
  book: EbookExportBook,
  document: EbookDesignDocument,
  artPath: (block: Extract<EbookDesignBlock, { kind: "art" }>) => string,
) {
  if (block.kind === "text") {
    const tag = block.role === "title" ? "h1" : block.role === "heading" ? "h2" : "p";
    return `<${tag} class="role-${block.role}">${escapeHtml(block.text).replace(/\n/g, "<br>")}</${tag}>`;
  }
  if (block.kind === "list") return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  if (block.kind === "art") {
    return `<figure><img src="${artPath(block)}" alt="${escapeHtml(block.altText)}">${block.brief ? `<figcaption>${escapeHtml(block.brief)}</figcaption>` : ""}</figure>`;
  }
  if (block.kind === "contents") {
    return `<ol class="contents">${book.chapters.map((chapter) => `<li><a href="#chapter-${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</a></li>`).join("")}</ol>`;
  }
  const chapter = book.chapters.find((item) => item.id === block.chapterId);
  return chapter ? chapterMarkup(chapter) : "";
}

function renderPagesHtml(book: EbookExportBook, document: EbookDesignDocument, artPath: (block: Extract<EbookDesignBlock, { kind: "art" }>) => string) {
  const pages = document.pages.map((page, pageIndex) => {
    const chapter = page.chapterId ? book.chapters.find((item) => item.id === page.chapterId) : null;
    const blocks = page.blocks.map((block) => renderHtmlBlock(block, book, document, artPath)).join("");
    const pageChapterIds = new Set(page.blocks.filter((block) => block.kind === "chapter").map((block) => block.chapterId));
    const missingChapter = chapter && !pageChapterIds.has(chapter.id) && page.kind === "chapter-body"
      ? chapterMarkup(chapter)
      : "";
    return `<section class="book-page kind-${page.kind}" id="page-${escapeHtml(page.id)}" style="page-break-before:${pageIndex ? "always" : "auto"}">${blocks}${missingChapter}</section>`;
  }).join("");
  const renderedChapterIds = new Set(document.pages.flatMap((page) => [
    ...page.blocks.filter((block) => block.kind === "chapter").map((block) => block.kind === "chapter" ? block.chapterId : ""),
    ...(page.kind === "chapter-body" && page.chapterId ? [page.chapterId] : []),
  ]));
  const omittedChapters = book.chapters.filter((chapter) => !renderedChapterIds.has(chapter.id))
    .map((chapter) => chapterMarkup(chapter)).join("");
  return pages + omittedChapters;
}

function htmlStyles(document: EbookDesignDocument, trimSize: string) {
  const [rawWidth, rawHeight] = trimSize.split("x");
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  const size = [width, height].every((value) => Number.isFinite(value) && value >= 4 && value <= 12)
    ? `${width}in ${height}in`
    : "6in 9in";
  const theme = document.theme;
  const headingFont = theme.headingFont === "sans" ? "Arial, sans-serif" : 'Georgia, "Times New Roman", serif';
  const bodyFont = theme.bodyFont === "sans" ? "Arial, sans-serif" : 'Georgia, "Times New Roman", serif';
  return `@page{size:${size};margin:.7in .65in .7in .8in}
    *{box-sizing:border-box}body{margin:0;color:${theme.text};background:${theme.paper};font:11pt/1.65 ${bodyFont}}
    .book-page,.chapter{break-before:page;page-break-before:always}.book-page:first-child{break-before:auto;page-break-before:auto}
    h1,h2{font-family:${headingFont};color:${theme.primary};line-height:1.2;break-after:avoid}
    h1{font-size:24pt;margin:0 0 1.2em}.role-title{font-size:30pt;text-align:center;margin-top:30%}
    .role-subtitle{text-align:center;font-size:15pt}.role-eyebrow{text-transform:uppercase;letter-spacing:.15em;color:${theme.accent}}
    figure{text-align:center;margin:1.5em 0}figure img{max-width:100%;max-height:3in}figcaption{font-size:9pt;color:#666}
    p{orphans:2;widows:2}li{margin:.35em 0}.contents{line-height:2}.chapter p{text-indent:1em;margin:.7em 0}
    .kind-cover{text-align:center}.kind-cover .role-title{margin-top:20%}
    @media screen{body{max-width:7in;margin:2rem auto;padding:1rem 1.3rem;box-shadow:0 8px 35px #0002}.book-page{margin-bottom:3rem}}`;
}

function colorRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return [45, 39, 53];
  return [0, 2, 4].map((index) => parseInt(match[1].slice(index, index + 2), 16)) as [number, number, number];
}

function drawVectorArt(doc: any, motif: string, x: number, y: number, width: number, height: number, primary: string, accent: string, paper: string) {
  const p = colorRgb(primary);
  const a = colorRgb(accent);
  doc.setFillColor(...colorRgb(paper));
  doc.roundedRect(x, y, width, height, 0.08, 0.08, "F");
  doc.setDrawColor(...p);
  doc.setLineWidth(0.012);
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (motif === "orbit") {
    doc.setDrawColor(...a);
    doc.ellipse(cx, cy, width * 0.28, height * 0.32, "S");
    doc.setDrawColor(...p);
    doc.ellipse(cx, cy, width * 0.18, height * 0.2, "S");
    doc.setFillColor(...a);
    doc.circle(cx, cy, Math.min(width, height) * 0.045, "F");
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const px = cx + Math.cos(angle) * width * 0.29;
      const py = cy + Math.sin(angle) * height * 0.33;
      doc.line(cx, cy, px, py);
      doc.setFillColor(...(i % 2 ? p : a));
      doc.circle(px, py, Math.min(width, height) * 0.025, "F");
    }
  } else if (motif === "botanical") {
    doc.setDrawColor(...a);
    doc.line(cx, y + height * 0.9, cx, y + height * 0.1);
    for (let i = 0; i < 7; i++) {
      const py = y + height * (0.2 + i * 0.1);
      const side = i % 2 ? -1 : 1;
      const px = cx + side * width * 0.17;
      doc.setDrawColor(...(i % 2 ? a : p));
      doc.line(cx, py + height * 0.08, px, py);
      doc.ellipse(px, py, width * 0.045, height * 0.025, "S");
    }
  } else if (motif === "waves") {
    for (let row = 0; row < 7; row++) {
      const points = 24;
      let lastX = x;
      let lastY = y + height * (0.15 + row * 0.11);
      doc.setDrawColor(...(row % 2 ? p : a));
      for (let i = 1; i <= points; i++) {
        const nextX = x + width * (i / points);
        const nextY = y + height * (0.15 + row * 0.11) + Math.sin((i / points) * Math.PI * 2 + row) * height * 0.035;
        doc.line(lastX, lastY, nextX, nextY);
        lastX = nextX;
        lastY = nextY;
      }
    }
  } else {
    doc.setDrawColor(...a);
    for (let ring = 1; ring <= 4; ring++) doc.ellipse(cx, cy, width * ring * 0.095, height * ring * 0.095, "S");
    doc.setDrawColor(...p);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const px = cx + Math.cos(angle) * width * 0.35;
      const py = cy + Math.sin(angle) * height * 0.35;
      doc.line(cx, cy, px, py);
      doc.rect(px - 0.035, py - 0.035, 0.07, 0.07, "S");
    }
  }
}

function coverSvg(book: EbookExportBook, document: EbookDesignDocument, author: string) {
  const theme = document.theme;
  const title = escapeXml(book.title || "Untitled book");
  const subtitle = escapeXml(book.subtitle || "");
  const motif = document.pages.flatMap((page) => page.blocks).find((block) => block.kind === "art");
  const art = motif?.kind === "art" ? renderEbookArtSvg(motif.motif, theme, 1, motif.altText) : "";
  const artContents = art.replace(/^[\s\S]*?<rect[^>]*\/>/, "").replace(/<\/svg>\s*$/, "");
  const safeTitle = title.replace(/(.{1,24})(?:\s|$)/g, "$1\n").split("\n").filter(Boolean).slice(0, 4);
  const titleMarkup = safeTitle.map((line, index) => `<tspan x="600" dy="${index ? 92 : 0}">${line}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1800" role="img" aria-label="Book cover for ${title}">
    <rect width="1200" height="1800" fill="${theme.primary}"/>
    <rect x="72" y="72" width="1056" height="1656" rx="20" fill="${theme.paper}"/>
    <svg x="220" y="230" width="760" height="330" viewBox="0 0 640 280">${artContents}</svg>
    <text x="600" y="830" text-anchor="middle" fill="${theme.primary}" font-family="Georgia,serif" font-size="70" font-weight="600">${titleMarkup}</text>
    ${subtitle ? `<text x="600" y="1190" text-anchor="middle" fill="${theme.text}" font-family="Arial,sans-serif" font-size="36">${subtitle}</text>` : ""}
    <text x="600" y="1550" text-anchor="middle" fill="${theme.accent}" font-family="Arial,sans-serif" font-size="28">${escapeXml(author || "Author")}</text>
  </svg>`;
}

async function coverPng(svg: string) {
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the cover artwork."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1800;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the cover image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the cover PNG.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function buildEpubArchive(book: EbookExportBook, author: string) {
  const document = normalizedDocument(book);
  const imageBlocks = document.pages.flatMap((page) => page.blocks)
    .filter((block): block is Extract<EbookDesignBlock, { kind: "art" }> => block.kind === "art");
  const images = imageBlocks.map((block) => [block.id, `images/${safeFilePart(block.id)}.svg`] as const);
  const imagePath = (block: Extract<EbookDesignBlock, { kind: "art" }>) =>
    images.find(([id]) => id === block.id)?.[1] || "images/cover.svg";
  const content = renderPagesHtml(book, document, imagePath);
  const chapterLinks = book.chapters.map((chapter) =>
    `<li><a href="book.xhtml#chapter-${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</a></li>`,
  ).join("");
  const cover = coverSvg(book, document, author);
  const coverImage = "images/cover.svg";
  const uid = `urn:uuid:${escapeXml(book.id || safeFilePart(book.title))}`;
  const nav = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title><meta charset="utf-8"/></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol><li><a href="book.xhtml">Book</a></li>${chapterLinks}</ol></nav></body></html>`;
  const xhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><title>${escapeHtml(book.title)}</title><meta charset="utf-8"/><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><section class="cover"><img src="${coverImage}" alt="Cover: ${escapeHtml(book.title)}"/><h1>${escapeHtml(book.title)}</h1>${book.subtitle ? `<p>${escapeHtml(book.subtitle)}</p>` : ""}<p class="author">${escapeHtml(author || "Author")}</p></section>${content}</body></html>`;
  const manifestImages = images.map(([id, href]) =>
    `<item id="image-${safeFilePart(id)}" href="${href}" media-type="image/svg+xml"/>`,
  ).join("");
  const spine = `<itemref idref="book"/>`;
  const opf = `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${uid}</dc:identifier><dc:title>${escapeHtml(book.title)}</dc:title><dc:creator>${escapeHtml(author || "Author")}</dc:creator><dc:language>en</dc:language>${book.description ? `<dc:description>${escapeHtml(book.description)}</dc:description>` : ""}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta><meta name="cover" content="cover-image"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="book" href="book.xhtml" media-type="application/xhtml+xml"/><item id="css" href="styles.css" media-type="text/css"/><item id="cover-image" href="${coverImage}" media-type="image/svg+xml" properties="cover-image"/>${manifestImages}</manifest><spine>${spine}</spine></package>`;
  const styles = htmlStyles(document, "6x9").replace(/@page\{[^}]+\}/, "") +
    ` .cover{break-before:avoid;text-align:center}.cover img{width:100%;max-height:75vh;object-fit:contain}.author{text-align:center}`;
  const files: Record<string, any> = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8('<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/nav.xhtml": strToU8(nav),
    "OEBPS/book.xhtml": strToU8(xhtml),
    "OEBPS/styles.css": strToU8(styles),
    [`OEBPS/${coverImage}`]: strToU8(cover),
  };
  for (const block of imageBlocks) {
    files[`OEBPS/${imagePath(block)}`] = strToU8(renderEbookArtSvg(block.motif, document.theme, 1, block.altText));
  }
  return zipSync(files);
}

async function createPdf(book: EbookExportBook, author: string) {
  const { jsPDF } = await import("jspdf");
  const document = normalizedDocument(book);
  const [rawWidth, rawHeight] = (book.trimSize || "6x9").split("x").map(Number);
  const pageWidth = [rawWidth, rawHeight].every((value) => Number.isFinite(value) && value >= 4 && value <= 12) ? rawWidth : 6;
  const pageHeight = [rawWidth, rawHeight].every((value) => Number.isFinite(value) && value >= 4 && value <= 12) ? rawHeight : 9;
  const pdf = new jsPDF({ unit: "in", format: [pageWidth, pageHeight], orientation: "portrait" });
  const margin = 0.68;
  const textWidth = pageWidth - margin * 2;
  let cursorY = margin;
  let firstPage = true;
  const nextPage = () => {
    pdf.addPage([pageWidth, pageHeight], "portrait");
    cursorY = margin;
  };
  const addText = (text: string, size: number, options: { color?: string; bold?: boolean; italic?: boolean; center?: boolean; indent?: boolean } = {}) => {
    const clean = text.trim();
    if (!clean) return;
    pdf.setFont(document.theme.bodyFont === "sans" ? "helvetica" : "times", options.bold ? "bold" : options.italic ? "italic" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...colorRgb(options.color || document.theme.text));
    const width = textWidth - (options.indent ? 0.18 : 0);
    const lines = pdf.splitTextToSize(clean, width);
    const lineHeight = (size / 72) * 1.4;
    for (const line of lines) {
      if (cursorY + lineHeight > pageHeight - margin) nextPage();
      pdf.text(line, options.center ? pageWidth / 2 : margin + (options.indent ? 0.18 : 0), cursorY, options.center ? { align: "center" } : {});
      cursorY += lineHeight;
    }
    cursorY += size / 72 * 0.45;
  };

  const designedPages = document.pages.filter((page) => page.kind !== "cover");
  const pages = designedPages.length ? designedPages : normalizedDocument({ ...book, designerDocument: null }).pages;
  const renderedChapterIds = new Set<string>();
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    if (!firstPage) nextPage();
    firstPage = false;
    const chapter = page.chapterId ? book.chapters.find((item) => item.id === page.chapterId) : null;
    let pageHasChapterText = false;
    for (const block of page.blocks) {
      if (block.kind === "text") {
        const size = block.role === "title" ? 24 : block.role === "heading" ? 17 : block.role === "quote" ? 13 : block.role === "eyebrow" ? 8 : block.role === "caption" ? 9 : 11;
        if (block.role === "title" && page.kind === "cover") cursorY = pageHeight * 0.52;
        addText(block.text, size, {
          color: block.role === "title" || block.role === "heading" ? document.theme.primary : block.role === "eyebrow" || block.role === "caption" ? document.theme.accent : document.theme.text,
          bold: block.role === "title" || block.role === "heading" || block.role === "eyebrow",
          italic: block.role === "quote",
          center: page.kind === "cover" || page.kind === "title",
        });
      } else if (block.kind === "list") {
        block.items.forEach((item) => addText(`•  ${item}`, 11));
      } else if (block.kind === "art") {
        const artHeight = page.kind === "cover" ? 2.2 : 1.35;
        const artWidth = Math.min(textWidth, pageWidth * 0.76);
        const artX = (pageWidth - artWidth) / 2;
        drawVectorArt(pdf, block.motif, artX, cursorY, artWidth, artHeight, document.theme.primary, document.theme.accent, document.theme.paper);
        cursorY += artHeight + 0.18;
        if (block.brief) addText(block.brief, 8, { color: document.theme.accent, center: true });
      } else if (block.kind === "contents") {
        book.chapters.forEach((item, index) => addText(`${String(index + 1).padStart(2, "0")}   ${item.title}`, 11));
      } else {
        const contentChapter = book.chapters.find((item) => item.id === block.chapterId);
        if (contentChapter) {
          renderedChapterIds.add(contentChapter.id);
          pageHasChapterText = true;
          addText(contentChapter.title, 18, { color: document.theme.primary, bold: true });
          for (const paragraph of paragraphs(contentChapter.content)) {
            const heading = paragraph.match(/^#{1,3}\s+(.+)$/);
            addText(heading ? heading[1] : paragraph, heading ? 14 : 11, { bold: !!heading, color: heading ? document.theme.primary : document.theme.text, indent: !heading });
          }
        }
      }
    }
    if (chapter && page.kind === "chapter-body" && !pageHasChapterText) {
      renderedChapterIds.add(chapter.id);
      addText(chapter.title, 18, { color: document.theme.primary, bold: true });
      for (const paragraph of paragraphs(chapter.content)) {
        const heading = paragraph.match(/^#{1,3}\s+(.+)$/);
        addText(heading ? heading[1] : paragraph, heading ? 14 : 11, { bold: !!heading, indent: !heading });
      }
    }
    if (cursorY <= margin + 0.05 && page.title) addText(page.title, 12, { color: document.theme.primary, bold: true });
    cursorY = Math.max(cursorY, pageHeight - margin - 0.15);
  }
  for (const chapter of book.chapters.filter((item) => !renderedChapterIds.has(item.id))) {
    nextPage();
    addText(chapter.title, 18, { color: document.theme.primary, bold: true });
    for (const paragraph of paragraphs(chapter.content)) {
      const heading = paragraph.match(/^#{1,3}\s+(.+)$/);
      addText(heading ? heading[1] : paragraph, heading ? 14 : 11, { bold: !!heading, indent: !heading });
    }
  }
  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setFontSize(8);
    pdf.setTextColor(...colorRgb(document.theme.accent));
    pdf.text(author || book.title || "Author", margin, pageHeight - 0.28);
    pdf.text(String(pageNumber), pageWidth - margin, pageHeight - 0.28, { align: "right" });
  }
  return pdf.output("blob") as Blob;
}

async function createDocx(book: EbookExportBook, author: string) {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph } = await import("docx");
  const [width, height] = (book.trimSize || "6x9").split("x").map(Number);
  const pageWidth = Number.isFinite(width) ? Math.round(width * 1440) : 8640;
  const pageHeight = Number.isFinite(height) ? Math.round(height * 1440) : 12960;
  const children: any[] = [
    new Paragraph({ text: book.title || "Untitled book", heading: HeadingLevel.TITLE }),
    ...(book.subtitle ? [new Paragraph({ text: book.subtitle, alignment: AlignmentType.CENTER })] : []),
    new Paragraph({ text: author || "Author" }),
    new Paragraph({ text: "" }),
    ...(book.description ? [new Paragraph({ text: book.description })] : []),
  ];
  for (const chapter of book.chapters) {
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    for (const paragraph of paragraphs(chapter.content)) {
      const heading = paragraph.match(/^#{1,3}\s+(.+)$/);
      children.push(new Paragraph({
        text: heading ? heading[1] : paragraph,
        ...(heading ? { heading: HeadingLevel.HEADING_2 } : { indent: { firstLine: 360 } }),
        spacing: { after: 180 },
      }));
    }
  }
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: pageWidth, height: pageHeight }, margin: { top: 1008, bottom: 1008, left: 1080, right: 936 } } },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

export async function exportEbook(book: EbookExportBook, author: string, format: EbookExportFormat) {
  const document = normalizedDocument(book);
  const filename = safeFilePart(book.title);
  const styles = htmlStyles(document, book.trimSize || "6x9");
  if (format === "cover-png") {
    downloadBlob(await coverPng(coverSvg(book, document, author)), `${filename}-front-cover.png`);
    return;
  }
  if (format === "pdf") {
    downloadBlob(await createPdf(book, author), `${filename}-interior.pdf`);
    return;
  }
  if (format === "epub") {
    const archive = buildEpubArchive(book, author);
    downloadBlob(new Blob([archive], { type: "application/epub+zip" }), `${filename}.epub`);
    return;
  }
  if (format === "docx") {
    downloadBlob(await createDocx(book, author), `${filename}.docx`);
    return;
  }
  const content = renderPagesHtml(book, document, (block) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderEbookArtSvg(block.motif, document.theme, 1, block.altText))}`,
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(book.title)}</title><style>${styles}</style></head><body>${content}</body></html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${filename}.html`);
}
