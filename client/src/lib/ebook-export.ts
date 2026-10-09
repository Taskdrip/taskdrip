import { strToU8, zipSync } from "fflate";
import { renderEbookArtSvg, type EbookDesignBlock, type EbookDesignDocument, type EbookDesignPage } from "@shared/ebook-design";

export type EbookExportFormat = "pdf" | "epub" | "docx" | "html" | "cover-png" | "kdp-cover-pdf";
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
    const isBibleArt = block.motif === "bible-scene";
    const isReference = isBibleArt && block.altText.startsWith("Small colored reference example");
    const artClass = isBibleArt ? ` art-mode-${block.artMode || "line"}` : "";
    return `<figure class="ebook-art${artClass}${isReference ? " art-reference" : ""}"><img src="${artPath(block)}" alt="${escapeHtml(block.altText)}">${isReference ? "<figcaption>COLOR EXAMPLE</figcaption>" : block.brief ? `<figcaption>${escapeHtml(block.brief)}</figcaption>` : ""}</figure>`;
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
  return `@page{size:${size};margin:.6in .6in .65in}
    *{box-sizing:border-box}body{margin:0;color:${theme.text};background:${theme.paper};font:11pt/1.62 ${bodyFont};-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .book-page,.chapter{break-before:page;page-break-before:always}.book-page:first-child{break-before:auto;page-break-before:auto}
    .book-page{position:relative;margin:0;padding:.16in .2in .2in;border:1.2pt solid ${theme.accent};border-top:7pt solid ${theme.primary};border-radius:16pt;background:linear-gradient(165deg,#fff 0%,${theme.paper} 100%);break-inside:avoid}
    .book-page:before{content:"";position:absolute;right:.14in;top:.14in;width:.18in;height:.18in;border-radius:50%;background:${theme.accent};opacity:.72}
    h1,h2{font-family:${headingFont};color:${theme.primary};line-height:1.16;break-after:avoid}
    h1{font-size:24pt;margin:0 0 .55em}.role-title{font-family:"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif;font-weight:900;font-size:32pt;letter-spacing:-.035em;line-height:1.04;text-align:center;color:${theme.primary};text-shadow:1.4pt 1.6pt 0 ${theme.accent}}
    .role-subtitle{text-align:center;font-size:15pt;font-weight:700;color:${theme.text}}
    .role-eyebrow{display:inline-block;margin:.1em 0 .7em;padding:.32em .72em;border-radius:99px;background:${theme.primary};color:#fff;font:bold 8.5pt/1.2 ${headingFont};letter-spacing:.12em;text-transform:uppercase}
    .role-heading{display:inline-block;margin:.7em 0 .35em;color:${theme.primary};font-size:15pt;font-weight:800}
    .role-caption{text-align:center;color:#53616c;font-size:9.5pt;font-weight:600}
    figure{text-align:center;margin:1em 0}figure img{max-width:100%;max-height:3.2in;object-fit:contain}
    .ebook-art img{display:block;margin:auto}.art-mode-color img{filter:drop-shadow(0 3px 3px #28374624)}
    figcaption{font-size:8pt;color:#5c6670;line-height:1.25}
    p{orphans:2;widows:2}.role-body{font-size:11pt;line-height:1.72}.role-body+ .role-heading{margin-top:1em}
    li{margin:.42em 0;padding-left:.2em}li::marker{color:${theme.accent};font-size:1.1em}
    ul{padding-left:1.25em}.contents{line-height:1.8;padding-left:1.45em}.contents a{color:${theme.primary};text-decoration:none}
    .chapter h1{padding-bottom:.3em;border-bottom:2pt solid ${theme.accent}}
    .chapter p{text-indent:0;margin:.78em 0}.chapter p:first-of-type:first-letter{float:left;margin:.06em .12em 0 0;color:${theme.primary};font:bold 2.7em/0.86 ${headingFont}}
    .kind-cover{text-align:center;background:linear-gradient(160deg,#fff6c7 0%,#d8f5f0 50%,#fff 100%);border:4pt solid ${theme.accent};border-top:12pt solid ${theme.primary};padding:.28in}
    .kind-cover figure{margin:.2em auto .65em}.kind-cover figure img{width:100%;max-height:5in;object-fit:contain}
    .kind-cover .role-title{font-size:39pt;margin:.12em auto}.kind-cover .role-eyebrow{background:${theme.accent};color:#2c3b49}
    .kind-title{text-align:center}.kind-title figure img{max-height:4.6in}
    .kind-chapter-opening{text-align:center}.kind-chapter-opening figure img{max-height:4.25in}
    .kind-parent-guide .ebook-art img{max-height:1.35in}
    .kind-coloring{position:relative;display:flex;min-height:9.2in;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;overflow:visible}
    .kind-coloring h1{font-size:19pt;margin:.12em 0 .22em}.kind-coloring .role-eyebrow{font-size:8pt;margin:.05em 0}
    .kind-coloring .role-caption{max-width:82%;align-self:flex-start;text-align:left;font-size:8.5pt;margin:.08em 0 .25em}
    .kind-coloring figure.art-mode-line{display:flex;flex:1;width:100%;align-items:center;justify-content:center;margin:.16em 0 0}
    .kind-coloring figure.art-mode-line img{width:auto;height:7.1in;max-width:100%;max-height:7.1in;object-fit:contain}
    .kind-coloring figure.art-mode-color:not(.art-reference){display:flex;flex:1;width:100%;align-items:center;justify-content:center;margin:.3em 0}
    .kind-coloring figure.art-mode-color:not(.art-reference) img{width:auto;height:7in;max-width:100%;max-height:7in;object-fit:contain}
    .kind-coloring figure.art-reference{position:absolute;z-index:2;top:1.05in;right:.1in;width:1.45in;margin:0;padding:.06in;border:1.7pt solid ${theme.primary};border-radius:7pt;background:#fff;box-shadow:0 2pt 5pt #26374635}
    .kind-coloring figure.art-reference img{width:100%;height:1.45in;max-height:none;object-fit:contain}.kind-coloring figure.art-reference figcaption{margin-top:.03in;color:${theme.primary};font-weight:900;letter-spacing:.08em}
    @media screen{body{max-width:7in;margin:2rem auto;padding:1rem 1.3rem;box-shadow:0 8px 35px #0002}.book-page{margin-bottom:3rem}.kind-coloring figure.art-reference{top:5.6rem;right:.25rem;width:1.2in}.kind-coloring figure.art-reference img{height:1.1in}}`;
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
  const art = motif?.kind === "art" ? renderEbookArtSvg(motif.motif, theme, 1, motif.altText, motif.scene, motif.artMode) : "";
  const artContents = art.replace(/^[\s\S]*?<rect[^>]*\/>/, "").replace(/<\/svg>\s*$/, "");
  const artViewBox = motif?.kind === "art" && motif.motif === "bible-scene" ? "0 0 640 720" : "0 0 640 280";
  const artY = motif?.kind === "art" && motif.motif === "bible-scene" ? 170 : 230;
  const artHeight = motif?.kind === "art" && motif.motif === "bible-scene" ? 620 : 330;
  const safeTitle = title.replace(/(.{1,24})(?:\s|$)/g, "$1\n").split("\n").filter(Boolean).slice(0, 4);
  const titleMarkup = safeTitle.map((line, index) => `<tspan x="600" dy="${index ? 92 : 0}">${line}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1800" role="img" aria-label="Book cover for ${title}">
    <rect width="1200" height="1800" fill="${theme.primary}"/>
    <rect x="72" y="72" width="1056" height="1656" rx="20" fill="${theme.paper}"/>
    <svg x="220" y="${artY}" width="760" height="${artHeight}" viewBox="${artViewBox}">${artContents}</svg>
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
    const canvas = window.document.createElement("canvas");
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
    files[`OEBPS/${imagePath(block)}`] = strToU8(renderEbookArtSvg(block.motif, document.theme, 1, block.altText, block.scene, block.artMode));
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
        const isColoringPage = page.kind === "coloring";
        const artHeight = isColoringPage ? 7.05 : page.kind === "cover" ? 3.4 : 1.35;
        const artWidth = Math.min(textWidth, isColoringPage ? 6.1 : pageWidth * 0.76);
        const artX = (pageWidth - artWidth) / 2;
        if (block.motif === "bible-scene") {
          const svg = renderEbookArtSvg(block.motif, document.theme, 1, block.altText, block.scene, block.artMode);
          const imageData = await svgToPngDataUrl(svg, Math.round(artWidth * 300), Math.round(artHeight * 300));
          pdf.addImage(imageData, "PNG", artX, cursorY, artWidth, artHeight, undefined, "FAST");
        } else {
          drawVectorArt(pdf, block.motif, artX, cursorY, artWidth, artHeight, document.theme.primary, document.theme.accent, document.theme.paper);
        }
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

async function createKdpPaperbackCoverPdf(book: EbookExportBook, author: string) {
  const document = normalizedDocument(book);
  const { jsPDF } = await import("jspdf");
  const [rawWidth, rawHeight] = (book.trimSize || "6x9").split("x").map(Number);
  const trimWidth = [rawWidth, rawHeight].every((value) => Number.isFinite(value) && value >= 4 && value <= 12) ? rawWidth : 6;
  const trimHeight = [rawWidth, rawHeight].every((value) => Number.isFinite(value) && value >= 4 && value <= 12) ? rawHeight : 9;
  const bleed = 0.125;
  const interiorPageCount = Math.max(24, document.pages.filter((page) => page.kind !== "cover").length);
  // KDP's black-ink, white-paper paperback spine factor.
  const spineWidth = interiorPageCount * 0.002252;
  const coverWidth = bleed * 2 + trimWidth * 2 + spineWidth;
  const coverHeight = bleed * 2 + trimHeight;
  const backX = bleed;
  const spineX = backX + trimWidth;
  const frontX = spineX + spineWidth;
  const panelY = bleed;
  const pdf = new jsPDF({ unit: "in", format: [coverWidth, coverHeight], orientation: "landscape", compress: true });

  pdf.setFillColor(...colorRgb(document.theme.paper));
  pdf.rect(0, 0, coverWidth, coverHeight, "F");
  pdf.setFillColor(...colorRgb(document.theme.primary));
  pdf.rect(spineX, 0, spineWidth, coverHeight, "F");
  pdf.setDrawColor(...colorRgb(document.theme.accent));
  pdf.setLineWidth(0.018);
  pdf.rect(backX + 0.22, panelY + 0.22, trimWidth - 0.44, trimHeight - 0.44);
  pdf.rect(frontX + 0.22, panelY + 0.22, trimWidth - 0.44, trimHeight - 0.44);

  const artBlock = document.pages
    .find((page) => page.kind === "cover")
    ?.blocks.find((block) => block.kind === "art");
  if (artBlock?.kind === "art") {
    const artSvg = renderEbookArtSvg(artBlock.motif, document.theme, 1, artBlock.altText, artBlock.scene, artBlock.artMode);
    const artWidth = Math.min(trimWidth - 1.15, (trimHeight - 3.1) * 640 / 720);
    const artHeight = artWidth * 720 / 640;
    const artData = await svgToPngDataUrl(artSvg, Math.round(artWidth * 300), Math.round(artHeight * 300));
    pdf.addImage(artData, "PNG", frontX + (trimWidth - artWidth) / 2, panelY + 1.75, artWidth, artHeight, undefined, "FAST");
  }

  pdf.setFont("times", "bold");
  pdf.setFontSize(Math.min(31, trimWidth * 4));
  pdf.setTextColor(...colorRgb(document.theme.primary));
  const titleLines = pdf.splitTextToSize(book.title || "Untitled book", trimWidth - 0.8).slice(0, 3);
  pdf.text(titleLines, frontX + trimWidth / 2, panelY + 0.75, { align: "center" });
  const subtitle = String(book.subtitle || "").trim();
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(...colorRgb(document.theme.text));
    pdf.text(pdf.splitTextToSize(subtitle, trimWidth - 0.9).slice(0, 2), frontX + trimWidth / 2, panelY + trimHeight - 1.45, { align: "center" });
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...colorRgb(document.theme.accent));
  pdf.text(author || "Author", frontX + trimWidth / 2, panelY + trimHeight - 0.55, { align: "center" });

  pdf.setFont("times", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(...colorRgb(document.theme.primary));
  pdf.text("Inside this book", backX + 0.5, panelY + 0.82);
  pdf.setFont("times", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...colorRgb(document.theme.text));
  const backCopy = String(book.description || "Read twelve Bible stories together, talk about their meaning, and color original storybook illustrations.").trim().slice(0, 1200);
  const backLines = pdf.splitTextToSize(backCopy, trimWidth - 1).slice(0, Math.max(8, Math.floor((trimHeight - 3) * 5)));
  pdf.text(backLines, backX + 0.5, panelY + 1.25);
  const barcodeX = backX + trimWidth - 2.18;
  const barcodeY = panelY + trimHeight - 1.45;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(barcodeX, barcodeY, 2, 1.2, "F");

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
  if (format === "kdp-cover-pdf") {
    downloadBlob(await createKdpPaperbackCoverPdf(book, author), `${filename}-paperback-full-wrap-cover.pdf`);
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
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderEbookArtSvg(block.motif, document.theme, 1, block.altText, block.scene, block.artMode))}`,
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(book.title)}</title><style>${styles}</style></head><body>${content}</body></html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${filename}.html`);
}

async function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the coloring illustration for print.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
