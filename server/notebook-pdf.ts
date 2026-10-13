import { deflateSync, inflateSync } from "node:zlib";
import {
  notebookDiaryPageDate,
  notebookIntroPageCount,
  notebookTotalPageCount,
  type NotebookCoverDesign,
  type NotebookIntroPageType,
  type NotebookSettings,
} from "@shared/notebook-studio";

type PdfImage = {
  width: number;
  height: number;
  data: Buffer;
  filter: "FlateDecode" | "DCTDecode";
  colorSpace: "DeviceRGB" | "DeviceGray";
};

const POINTS_PER_INCH = 72;
const BLEED_INCHES = 0.125;

export function notebookTrim(settings: NotebookSettings) {
  if (settings.trimSize === "custom") {
    return { width: Number(settings.customWidth), height: Number(settings.customHeight) };
  }
  const [width, height] = settings.trimSize.split("x").map(Number);
  return { width, height };
}

export function notebookSpineWidth(settings: NotebookSettings) {
  const factor = settings.ink === "color"
    ? 0.002347
    : settings.paper === "cream" ? 0.0025 : 0.002252;
  return notebookTotalPageCount(settings) * factor;
}

function pageLimit(settings: NotebookSettings, width: number, height: number) {
  const largeTrim = width >= 8 && height >= 10;
  if (settings.paper === "cream" && settings.ink === "black") return largeTrim ? 730 : 828;
  return largeTrim ? 780 : 828;
}

export function validateNotebook(
  title: string,
  settings: NotebookSettings,
  files: { interiorExists: boolean; coverExists: boolean },
) {
  const { width, height } = notebookTrim(settings);
  const totalPages = notebookTotalPageCount(settings);
  const introPages = notebookIntroPageCount(settings);
  const items: Array<{ status: "ready" | "warning" | "failed" | "manual"; label: string; message: string }> = [];
  const supportedTrims = new Set(["5x8", "5.5x8.5", "6x9", "8.27x11.69"]);
  const exactTrimSupported = settings.trimSize !== "custom" && supportedTrims.has(settings.trimSize);

  items.push({
    status: title.trim().length >= 2 ? "ready" : "failed",
    label: "Book title",
    message: title.trim().length >= 2 ? "A title is set." : "Enter a title with at least two characters.",
  });

  const minimumPages = settings.binding === "hardcover" ? 75 : 24;
  const maxPages = pageLimit(settings, width, height);
  const validPageCount = Number.isInteger(totalPages)
    && totalPages >= minimumPages
    && totalPages <= maxPages;
  items.push({
    status: validPageCount ? "ready" : "failed",
    label: "Page count",
    message: validPageCount
      ? `${totalPages} total pages (${settings.pageCount} writing${introPages ? ` + ${introPages} introductory` : ""}) is within the ${minimumPages}–${maxPages} page range used for this trim and print selection.`
      : `${settings.binding} books at this trim and print selection allow ${minimumPages}–${maxPages} total pages; the project is set to ${totalPages}.`,
  });

  const dimsValid = Number.isFinite(width) && Number.isFinite(height)
    && width >= 4 && width <= 8.5 && height >= 6 && height <= 11.69;
  items.push({
    status: dimsValid ? exactTrimSupported ? "ready" : "warning" : "failed",
    label: "Trim size",
    message: !dimsValid
      ? "KDP paperback trim dimensions must be 4–8.5 inches wide and 6–11.69 inches high."
      : exactTrimSupported
        ? `${width.toFixed(2)} × ${height.toFixed(2)} inches is a listed KDP trim size.`
        : settings.trimSize === "custom" && Math.abs(width - 8.3) < 0.05 && Math.abs(height - 11.6) < 0.1
          ? "8.3 × 11.6 inches is not an exact KDP trim preset. A4 (8.27 × 11.69 inches) is supported and is the closest option."
          : "This custom trim is within the KDP paperback dimension limits, but it is not a listed KDP preset. Verify it in KDP before upload.",
  });

  const minGutter = totalPages <= 150 ? 0.375
    : totalPages <= 300 ? 0.5
      : totalPages <= 500 ? 0.625
        : totalPages <= 700 ? 0.75 : 0.875;
  const insideMargin = minGutter + 0.05;
  const gutterValid = width - insideMargin - 0.375 >= 2.25;
  items.push({
    status: gutterValid ? "ready" : "failed",
    label: "Margins and gutter",
    message: gutterValid
      ? `The inside margin uses a ${minGutter.toFixed(3)} inch minimum gutter allowance for this page count, with extra writing clearance.`
      : "The selected trim does not leave enough writing area after the required inside gutter.",
  });

  items.push({
    status: settings.binding === "paperback" ? "ready" : "manual",
    label: "Binding",
    message: settings.binding === "paperback"
      ? "Paperback full-wrap cover dimensions can be calculated from KDP's published spine formula."
      : `${settings.binding} is not generated as a paperback wrap. Interior PDF is available; create and check its cover with the selected printer.`,
  });

  const spineWidth = notebookSpineWidth(settings);
  const coverWidth = settings.binding === "paperback" && dimsValid
    ? (2 * width) + spineWidth + (2 * BLEED_INCHES)
    : null;
  const coverHeight = settings.binding === "paperback" && dimsValid
    ? height + (2 * BLEED_INCHES)
    : null;
  if (settings.binding === "paperback") {
    const coverDimensionsSupported = totalPages >= 24 && spineWidth > 0;
    items.push({
      status: coverDimensionsSupported ? "ready" : "failed",
      label: "Cover wrap",
      message: coverDimensionsSupported
        ? `Calculated from KDP's published paperback formula: ${coverWidth!.toFixed(4)} × ${coverHeight!.toFixed(4)} inches; spine ${spineWidth.toFixed(4)} inches, with 0.125 inch cover bleed.`
        : "The cover wrap cannot be calculated until the trim and page count are valid.",
    });
  }

  items.push({
    status: files.interiorExists ? "ready" : "warning",
    label: "Interior PDF",
    message: files.interiorExists ? "The generated interior file is available." : "Generate the interior PDF to complete file checks.",
  });
  if (settings.binding === "paperback") {
    items.push({
      status: files.coverExists ? "ready" : "warning",
      label: "Full-wrap cover PDF",
      message: files.coverExists ? "The generated cover file is available." : "Generate the cover PDF to complete file checks.",
    });
  }
  items.push({
    status: "manual",
    label: "Amazon review",
    message: "These are technical checks only. Review the files in KDP's Print Previewer; Amazon makes the final acceptance decision.",
  });

  const hasFailure = items.some((item) => item.status === "failed");
  const hasWarning = items.some((item) => item.status === "warning");
  const hasManual = items.some((item) => item.status === "manual");
  const status = hasFailure ? "failed" : hasWarning ? "warning" : hasManual ? "manual" : "ready";
  return {
    status,
    checkedAt: new Date().toISOString(),
    pageCount: totalPages,
    writingPageCount: settings.pageCount,
    introPageCount: introPages,
    trimWidth: width,
    trimHeight: height,
    coverWidth,
    coverHeight,
    items,
    disclaimer: "A passing report is not a guarantee of KDP acceptance or publication. Always inspect the final files in KDP's Print Previewer.",
  } as const;
}

function inch(value: number) {
  return value * POINTS_PER_INCH;
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function rgb(color: string) {
  const value = safeColor(color, "#000000").slice(1);
  const components = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  return components.map((component) => component.toFixed(3)).join(" ");
}

function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x20-\xFF]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]/g, " ");
}

function textCommand(text: string, x: number, y: number, size = 9, font = "F1", color = "0.18 0.22 0.26") {
  const safe = pdfText(text).slice(0, 240);
  return safe ? `BT /${font} ${size.toFixed(2)} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET\n` : "";
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, color: string, thickness: number) {
  return `${rgb(color)} RG ${Math.max(0.2, Math.min(3, thickness)).toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function pdfCirclePath(x: number, y: number, radius: number) {
  const k = radius * 0.55228475;
  return `${(x + radius).toFixed(2)} ${y.toFixed(2)} m `
    + `${(x + radius).toFixed(2)} ${(y + k).toFixed(2)} ${(x + k).toFixed(2)} ${(y + radius).toFixed(2)} ${x.toFixed(2)} ${(y + radius).toFixed(2)} c `
    + `${(x - k).toFixed(2)} ${(y + radius).toFixed(2)} ${(x - radius).toFixed(2)} ${(y + k).toFixed(2)} ${(x - radius).toFixed(2)} ${y.toFixed(2)} c `
    + `${(x - radius).toFixed(2)} ${(y - k).toFixed(2)} ${(x - k).toFixed(2)} ${(y - radius).toFixed(2)} ${x.toFixed(2)} ${(y - radius).toFixed(2)} c `
    + `${(x + k).toFixed(2)} ${(y - radius).toFixed(2)} ${(x + radius).toFixed(2)} ${(y - k).toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c`;
}

function addCoverMotif(parts: string[], style: string, accent: string, left: number, bottom: number, width: number, height: number) {
  const cx = left + width / 2;
  const cy = bottom + height * 0.77;
  const radius = Math.min(width * 0.24, height * 0.12);
  const color = rgb(accent);
  parts.push(`${color} RG 1.8 w\n`);
  if (style === "colorful") {
    for (const [x, y, r] of [
      [cx - radius * 0.6, cy, radius * 0.75],
      [cx + radius * 0.6, cy, radius * 0.75],
      [cx, cy + radius * 0.8, radius * 0.75],
    ]) parts.push(`${color} rg ${pdfCirclePath(x, y, r)} f\n`);
  } else if (style === "business" || style === "education") {
    for (let index = 0; index < 5; index++) {
      const lineWidth = width * (0.24 + index * 0.055);
      const y = cy - radius * 0.8 + index * radius * 0.4;
      parts.push(lineCommand(cx - lineWidth / 2, y, cx + lineWidth / 2, y, accent, 3));
    }
  } else if (style === "botanical") {
    parts.push(lineCommand(cx, cy - radius, cx, cy + radius, accent, 2.5));
    for (const direction of [-1, 1]) {
      for (let index = 0; index < 3; index++) {
        const y = cy - radius * 0.45 + index * radius * 0.65;
        const x = cx + direction * radius * 0.7;
        parts.push(`${pdfCirclePath(x, y, radius * 0.24)} S\n`);
        parts.push(lineCommand(cx, y - radius * 0.08, x - direction * radius * 0.2, y + radius * 0.12, accent, 1.1));
      }
    }
  } else if (style === "space") {
    parts.push(`${pdfCirclePath(cx, cy, radius * 0.4)} f\n`);
    parts.push(`${pdfCirclePath(cx, cy, radius * 0.95)} S\n`);
    parts.push(`${pdfCirclePath(cx, cy, radius * 1.3)} S\n`);
    parts.push(`${color} rg ${pdfCirclePath(cx + radius * 0.88, cy + radius * 0.4, radius * 0.08)} f\n`);
  } else if (style === "luxury") {
    parts.push(`${pdfCirclePath(cx, cy, radius)} S\n`);
    parts.push(`${pdfCirclePath(cx, cy, radius * 0.78)} S\n`);
    parts.push(lineCommand(cx - radius * 0.55, cy, cx + radius * 0.55, cy, accent, 1));
    parts.push(lineCommand(cx, cy - radius * 0.55, cx, cy + radius * 0.55, accent, 1));
  } else if (style === "technology") {
    parts.push(`${pdfCirclePath(cx, cy, radius)} S\n`);
    parts.push(`${pdfCirclePath(cx, cy, radius * 0.68)} S\n`);
    parts.push(lineCommand(cx - radius * 1.2, cy, cx + radius * 1.2, cy, accent, 1));
    parts.push(lineCommand(cx, cy - radius * 1.2, cx, cy + radius * 1.2, accent, 1));
    parts.push(`${color} rg ${pdfCirclePath(cx, cy, radius * 0.08)} f\n`);
  } else {
    parts.push(`${pdfCirclePath(cx, cy, radius)} S\n`);
    parts.push(`${pdfCirclePath(cx, cy, radius * 0.7)} S\n`);
    parts.push(lineCommand(cx - radius * 1.2, cy, cx + radius * 1.2, cy, accent, 1));
    parts.push(lineCommand(cx, cy - radius * 1.2, cx, cy + radius * 1.2, accent, 1));
  }
}

function readableTextColor(hex: string) {
  const value = safeColor(hex, "#173b4a").slice(1);
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.reduce((total, component, index) => {
    const linear = component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  return luminance > 0.42 ? "0.10 0.12 0.13" : "1 1 1";
}

function wrapPdfText(value: string, maxLength: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of pdfText(value).split(/\s+/)) {
    if (!word) continue;
    if (line && (line + " " + word).length > maxLength) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function gutterMargin(pageCount: number) {
  return pageCount <= 150 ? 0.375
    : pageCount <= 300 ? 0.5
      : pageCount <= 500 ? 0.625
        : pageCount <= 700 ? 0.75 : 0.875;
}

function buildPdf(objects: Buffer[], root = 1) {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1");
  const chunks: Buffer[] = [header];
  const offsets = [0];
  let byteLength = header.length;
  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "ascii");
    const suffix = Buffer.from("\nendobj\n", "ascii");
    chunks.push(prefix, object, suffix);
    byteLength += prefix.length + object.length + suffix.length;
  });
  const xrefOffset = byteLength;
  const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n"];
  for (let index = 1; index < offsets.length; index++) xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${root} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref.join("") + trailer, "ascii"));
  return Buffer.concat(chunks);
}

function streamObject(data: Buffer | string, dictionary = "") {
  const content = typeof data === "string" ? Buffer.from(data, "latin1") : data;
  return Buffer.concat([
    Buffer.from(`<< /Length ${content.length}${dictionary} >>\nstream\n`, "ascii"),
    content,
    Buffer.from("\nendstream", "ascii"),
  ]);
}

function fixedPageText(
  settings: NotebookSettings,
  title: string,
  pageNumber: number,
  width: number,
  height: number,
  xLeft: number,
  xRight: number,
  yTop: number,
  yBottom: number,
) {
  const parts: string[] = [];
  let pageContentTop = yTop;
  const isDiary = settings.lineStyle === "diary";
  if (!isDiary && pageNumber === 1 && settings.ownershipPage) {
    parts.push(textCommand(title, inch(xLeft), inch(height - 1.35), 17, "F2", "0.12 0.24 0.29"));
    parts.push(textCommand("This journal belongs to", inch(xLeft), inch(height - 2.5), 10));
    parts.push(lineCommand(inch(xLeft), inch(height - 2.72), inch(xRight), inch(height - 2.72), settings.lineColor, settings.lineThickness));
    parts.push(textCommand(settings.authorName || "Write your name here", inch(xLeft), inch(height - 3.1), 9, "F1", "0.36 0.39 0.41"));
    parts.push(lineCommand(inch(xLeft), inch(height - 3.32), inch(xRight), inch(height - 3.32), settings.lineColor, settings.lineThickness));
    pageContentTop = Math.max(yTop, height - 3.85);
  }
  if (isDiary) {
    const isoDate = notebookDiaryPageDate(settings.diaryStartMonth, pageNumber);
    if (isoDate) {
      const date = new Date(`${isoDate}T12:00:00.000Z`);
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);
      const fullDate = new Intl.DateTimeFormat("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
      }).format(date);
      parts.push(textCommand(weekday, inch(xLeft), inch(height - 0.66), 8, "F2", "0.32 0.36 0.40"));
      parts.push(textCommand(fullDate, inch(xLeft), inch(height - 1.02), 15, "F2", "0.12 0.24 0.29"));
      parts.push(lineCommand(inch(xLeft), inch(height - 1.16), inch(xRight), inch(height - 1.16), settings.lineColor, settings.lineThickness));
      pageContentTop = Math.min(pageContentTop, height - 1.3);
    }
  }
  if (settings.headerText) {
    parts.push(textCommand(settings.headerText, inch(xLeft), inch(height - 0.42), 8, "F2"));
    if (!isDiary) pageContentTop = Math.max(pageContentTop, height - 0.58);
  }
  if (!isDiary && (settings.showDateField || settings.showSubjectField)) {
    const rowY = height - 0.72;
    let x = xLeft;
    if (settings.showDateField) {
      parts.push(textCommand("Date", inch(x), inch(rowY), 7, "F2", "0.32 0.36 0.40"));
      x += Math.min(1.8, (xRight - xLeft) * 0.32);
      parts.push(lineCommand(inch(x), inch(rowY - 0.04), inch(Math.min(xRight, x + 0.95)), inch(rowY - 0.04), settings.lineColor, settings.lineThickness));
      x += 1.15;
    }
    if (settings.showSubjectField) {
      parts.push(textCommand("Subject", inch(x), inch(rowY), 7, "F2", "0.32 0.36 0.40"));
      x += 0.48;
      parts.push(lineCommand(inch(x), inch(rowY - 0.04), inch(xRight), inch(rowY - 0.04), settings.lineColor, settings.lineThickness));
    }
    pageContentTop = Math.max(pageContentTop, rowY - 0.25);
  }

  if (settings.footerText) {
    parts.push(textCommand(settings.footerText, inch(xLeft), inch(0.3), 7, "F1", "0.42 0.45 0.48"));
  }
  if (settings.showPageNumbers) {
    parts.push(textCommand(String(pageNumber), inch(xRight - 0.1), inch(0.3), 7, "F1", "0.42 0.45 0.48"));
  }

  const lineBottom = Math.max(yBottom, 0.67);
  const availableHeight = pageContentTop - lineBottom;
  const style = settings.lineStyle;
  if (style === "graph") {
    const spacing = Math.max(0.16, Math.min(0.6, settings.lineSpacing));
    for (let x = xLeft; x <= xRight + 0.001; x += spacing) {
      parts.push(lineCommand(inch(x), inch(lineBottom), inch(x), inch(pageContentTop), settings.lineColor, settings.lineThickness * 0.65));
    }
    for (let y = lineBottom; y <= pageContentTop + 0.001; y += spacing) {
      parts.push(lineCommand(inch(xLeft), inch(y), inch(xRight), inch(y), settings.lineColor, settings.lineThickness * 0.65));
    }
  } else if (style === "dot") {
    const spacing = Math.max(0.16, Math.min(0.6, settings.lineSpacing));
    const dotSize = Math.max(0.45, settings.lineThickness);
    parts.push(`${rgb(settings.lineColor)} rg\n`);
    for (let x = xLeft; x <= xRight; x += spacing) {
      for (let y = lineBottom; y <= pageContentTop; y += spacing) {
        parts.push(`${inch(x).toFixed(2)} ${inch(y).toFixed(2)} ${dotSize.toFixed(2)} ${dotSize.toFixed(2)} re f\n`);
      }
    }
  } else if (style === "lined-journal") {
    const spacing = Math.max(0.16, Math.min(0.75, settings.lineSpacing));
    for (let y = pageContentTop - spacing; y >= lineBottom; y -= spacing) {
      parts.push(lineCommand(inch(xLeft), inch(y), inch(xRight), inch(y), settings.lineColor, settings.lineThickness));
    }
  } else {
    const spacingForStyle = style === "wide" ? Math.max(settings.lineSpacing, 0.38)
      : style === "college" ? Math.min(settings.lineSpacing, 0.3)
        : settings.lineSpacing;
    const spacing = Math.max(0.2, Math.min(0.75, spacingForStyle));
    let lineIndex = 0;
    for (let y = pageContentTop - spacing; y >= lineBottom && lineIndex < 70; y -= spacing) {
      parts.push(lineCommand(inch(xLeft), inch(y), inch(xRight), inch(y), settings.lineColor, settings.lineThickness));
      if (style === "business" && lineIndex % 4 === 0) {
        parts.push(lineCommand(inch(xLeft), inch(y - spacing * 0.13), inch(xRight), inch(y - spacing * 0.13), settings.lineColor, settings.lineThickness * 0.5));
      }
      lineIndex += 1;
    }
  }
  return parts.join("");
}

function introText(parts: string[], text: string, x: number, y: number, size = 8, bold = false, color = "0.20 0.26 0.24") {
  parts.push(textCommand(text, inch(x), inch(y), size, bold ? "F2" : "F1", color));
}

function introRule(parts: string[], x1: number, y1: number, x2: number, y2: number, color: string, thickness = 0.6) {
  parts.push(lineCommand(inch(x1), inch(y1), inch(x2), inch(y2), color, thickness));
}

function introBox(parts: string[], x: number, y: number, width: number, height: number, color: string, thickness = 0.6) {
  parts.push(`${rgb(color)} RG ${thickness.toFixed(2)} w ${inch(x).toFixed(2)} ${inch(y).toFixed(2)} ${inch(width).toFixed(2)} ${inch(height).toFixed(2)} re S\n`);
}

function introPolygon(
  parts: string[],
  points: Array<[number, number]>,
  x: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
) {
  if (points.length < 3) return;
  const [first, ...rest] = points;
  const path = [
    `${inch(x + first[0] * width).toFixed(2)} ${inch(top - first[1] * height).toFixed(2)} m`,
    ...rest.map(([px, py]) => `${inch(x + px * width).toFixed(2)} ${inch(top - py * height).toFixed(2)} l`),
    "h",
  ].join(" ");
  parts.push(`${rgb(fill)} rg ${rgb(stroke)} RG 0.5 w ${path} B\n`);
}

function introHeading(parts: string[], title: string, subtitle: string, x: number, top: number, right: number, accent: string) {
  introText(parts, title, x, top - 0.28, 16, true, "0.16 0.24 0.22");
  introText(parts, subtitle, x, top - 0.49, 7, false, "0.40 0.43 0.40");
  introRule(parts, x, top - 0.62, right, top - 0.62, accent, 0.8);
}

function notebookIntroPage(
  type: NotebookIntroPageType,
  settings: NotebookSettings,
  width: number,
  height: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
) {
  const parts: string[] = [];
  const x = left;
  const pageWidth = right - left;
  const accent = settings.ink === "color" ? settings.lineColor : "#64716b";
  const pale = settings.ink === "color" ? "#e8efeb" : "#eeeeeb";
  const textColor = settings.ink === "color" ? "0.20 0.31 0.28" : "0.20 0.22 0.21";
  const contentTop = top - 0.76;
  const contentHeight = contentTop - bottom - 0.1;

  if (type === "world-map") {
    introHeading(parts, "WORLD MAP", "Explore the continents and oceans. Add labels or notes.", x, top, right, accent);
    const mapX = x + 0.03;
    const mapTop = contentTop - 0.05;
    const mapW = pageWidth - 0.06;
    const mapH = contentHeight * 0.66;
    const mapBottom = mapTop - mapH;
    for (let index = 1; index < 6; index++) {
      const gx = mapX + mapW * index / 6;
      introRule(parts, gx, mapBottom, gx, mapTop, pale, 0.5);
    }
    for (let index = 1; index < 4; index++) {
      const gy = mapBottom + mapH * index / 4;
      introRule(parts, mapX, gy, mapX + mapW, gy, pale, 0.5);
    }
    const continents: Array<Array<[number, number]>> = [
      [[0.05, .20], [.09, .10], [.20, .08], [.26, .16], [.24, .25], [.18, .31], [.16, .42], [.11, .39], [.09, .30]],
      [[.25, .43], [.33, .42], [.37, .51], [.35, .64], [.32, .78], [.29, .92], [.26, .83], [.25, .67], [.22, .55]],
      [[.45, .22], [.49, .16], [.53, .20], [.54, .26], [.51, .31], [.47, .29]],
      [[.46, .34], [.53, .31], [.58, .38], [.57, .53], [.53, .66], [.49, .62], [.46, .50], [.44, .41]],
      [[.54, .15], [.64, .10], [.76, .13], [.90, .18], [.94, .26], [.87, .32], [.79, .29], [.75, .37], [.67, .32], [.59, .30], [.55, .24]],
      [[.77, .63], [.82, .60], [.88, .64], [.90, .72], [.86, .79], [.80, .76], [.77, .69]],
      [[.26, .94], [.38, .91], [.51, .93], [.65, .91], [.76, .94], [.69, .97], [.42, .97]],
    ];
    continents.forEach((shape) => introPolygon(parts, shape, mapX, mapTop, mapW, mapH, settings.ink === "color" ? "#d7e3dc" : "#e2e2de", accent));
    introText(parts, "NORTH AMERICA", mapX, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "SOUTH AMERICA", mapX + mapW * .20, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "EUROPE", mapX + mapW * .43, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "AFRICA", mapX + mapW * .57, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "ASIA", mapX + mapW * .69, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "AUSTRALIA", mapX + mapW * .80, mapBottom - 0.19, 5.5, true, textColor);
    introText(parts, "Ocean or place to remember:", x, bottom + 0.45, 7, true, textColor);
    introRule(parts, x + 1.55, bottom + 0.43, right, bottom + 0.43, accent, 0.5);
  } else if (type === "continents") {
    introHeading(parts, "THE CONTINENTS", "Seven regions to explore — add a country or a fact to each.", x, top, right, accent);
    const names = ["ASIA", "AFRICA", "NORTH AMERICA", "SOUTH AMERICA", "ANTARCTICA", "EUROPE", "AUSTRALIA"];
    const cols = 2;
    const gap = 0.13;
    const cardW = (pageWidth - gap) / cols;
    const cardH = Math.min(1.3, (contentHeight - 0.12) / 4);
    names.forEach((name, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = x + col * (cardW + gap);
      const cardTop = contentTop - row * (cardH + 0.13);
      introBox(parts, cardX, cardTop - cardH, cardW, cardH, pale, 0.65);
      introText(parts, name, cardX + 0.1, cardTop - 0.2, 7, true, textColor);
      introText(parts, "Country / fact:", cardX + 0.1, cardTop - 0.43, 6, false, textColor);
      introRule(parts, cardX + 0.1, cardTop - 0.57, cardX + cardW - 0.1, cardTop - 0.57, accent, 0.45);
      introRule(parts, cardX + 0.1, cardTop - 0.82, cardX + cardW - 0.1, cardTop - 0.82, accent, 0.45);
    });
  } else if (type === "planets") {
    introHeading(parts, "OUR SOLAR SYSTEM", "The eight planets, shown in order from the Sun.", x, top, right, accent);
    const centerX = x + pageWidth * 0.5;
    const centerY = contentTop - contentHeight * 0.43;
    const orbitRadiusMax = Math.min(pageWidth * 0.41, contentHeight * 0.35);
    const planets = ["MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE"];
    const colors = settings.ink === "color"
      ? ["#bd9060", "#d9b879", "#5c94a4", "#bd715d", "#ba8f65", "#d3bd7e", "#81aeb0", "#587da4"]
      : ["#999999", "#858585", "#707070", "#9b9b9b", "#686868", "#8a8a8a", "#777777", "#5e5e5e"];
    planets.forEach((name, index) => {
      const radius = orbitRadiusMax * (0.18 + index * 0.105);
      parts.push(`${rgb(pale)} RG 0.55 w ${pdfCirclePath(inch(centerX), inch(centerY), inch(radius))} S\n`);
      const angle = -Math.PI / 2 + index * 0.9;
      const planetX = centerX + Math.cos(angle) * radius;
      const planetY = centerY + Math.sin(angle) * radius;
      parts.push(`${rgb(colors[index])} rg ${inch(planetX - 0.045).toFixed(2)} ${inch(planetY - 0.045).toFixed(2)} ${inch(0.09).toFixed(2)} ${inch(0.09).toFixed(2)} re f\n`);
      introText(parts, name, x + (index % 2) * pageWidth * 0.53, contentTop - contentHeight * 0.79 - Math.floor(index / 2) * 0.2, 6, true, textColor);
      introRule(parts, x + 0.84 + (index % 2) * pageWidth * 0.53, contentTop - contentHeight * 0.79 - Math.floor(index / 2) * 0.2 - 0.02, x + pageWidth * (index % 2 ? 0.97 : 0.48), contentTop - contentHeight * 0.79 - Math.floor(index / 2) * 0.2 - 0.02, accent, 0.4);
    });
    parts.push(`${rgb(settings.ink === "color" ? "#e5b45a" : "#777777")} rg ${inch(centerX - 0.1).toFixed(2)} ${inch(centerY - 0.1).toFixed(2)} ${inch(0.2).toFixed(2)} ${inch(0.2).toFixed(2)} re f\n`);
  } else if (type === "world-presidents") {
    introHeading(parts, "WORLD LEADERS TRACKER", "Record the source and date checked; offices and officeholders can change.", x, top, right, accent);
    const tableTop = contentTop - 0.06;
    const rowH = Math.min(0.73, (contentHeight - 0.3) / 6);
    const columns = [x, x + pageWidth * 0.33, x + pageWidth * 0.69, right];
    ["COUNTRY / REGION", "PRESIDENT / LEADER", "SOURCE · DATE"].forEach((label, index) => {
      introText(parts, label, columns[index] + 0.04, tableTop - 0.18, 5.4, true, textColor);
    });
    introRule(parts, x, tableTop - 0.25, right, tableTop - 0.25, accent, 0.8);
    for (let row = 0; row < 6; row++) {
      const y = tableTop - 0.25 - rowH * (row + 1);
      introRule(parts, x, y, right, y, pale, 0.6);
    }
    [columns[1], columns[2]].forEach((columnX) => introRule(parts, columnX, tableTop, columnX, tableTop - 0.25 - rowH * 6, pale, 0.5));
    introText(parts, "Check a current, reliable source before filling this page.", x, bottom + 0.12, 6, false, "0.40 0.43 0.40");
  } else if (type === "current-affairs") {
    introHeading(parts, "CURRENT AFFAIRS", "Capture what happened, where, and how you verified it.", x, top, right, accent);
    const cardGap = 0.14;
    const cardH = (contentHeight - cardGap * 2) / 3;
    for (let card = 0; card < 3; card++) {
      const cardTop = contentTop - card * (cardH + cardGap);
      const cardBottom = cardTop - cardH;
      introBox(parts, x, cardBottom, pageWidth, cardH, pale, 0.6);
      introText(parts, `${String(card + 1).padStart(2, "0")}  HEADLINE`, x + 0.1, cardTop - 0.2, 6.5, true, textColor);
      introRule(parts, x + 0.78, cardTop - 0.21, right - 0.1, cardTop - 0.21, accent, 0.45);
      introText(parts, "DATE", x + 0.1, cardTop - 0.4, 5.5, true, textColor);
      introRule(parts, x + 0.45, cardTop - 0.41, x + 1.2, cardTop - 0.41, accent, 0.45);
      introText(parts, "PLACE", x + 1.32, cardTop - 0.4, 5.5, true, textColor);
      introRule(parts, x + 1.72, cardTop - 0.41, right - 0.1, cardTop - 0.41, accent, 0.45);
      introText(parts, "SOURCE", x + 0.1, cardTop - 0.59, 5.5, true, textColor);
      introRule(parts, x + 0.58, cardTop - 0.6, right - 0.1, cardTop - 0.6, accent, 0.45);
      introText(parts, "Why it matters:", x + 0.1, cardBottom + 0.12, 5.5, false, textColor);
    }
  } else if (type === "calendar-2027") {
    introHeading(parts, "2027 YEAR CALENDAR", "All twelve months · Monday to Sunday", x, top, right, accent);
    const gridTop = contentTop - 0.02;
    const cols = 4;
    const rows = 3;
    const gapX = 0.1;
    const gapY = 0.11;
    const moduleW = (pageWidth - gapX * (cols - 1)) / cols;
    const moduleH = (contentHeight - gapY * (rows - 1)) / rows;
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    for (let month = 0; month < 12; month++) {
      const col = month % cols;
      const row = Math.floor(month / cols);
      const mx = x + col * (moduleW + gapX);
      const mt = gridTop - row * (moduleH + gapY);
      introBox(parts, mx, mt - moduleH, moduleW, moduleH, pale, 0.5);
      introText(parts, monthNames[month], mx + 0.06, mt - 0.16, 7, true, textColor);
      const cellW = (moduleW - 0.12) / 7;
      const dayTop = mt - 0.3;
      const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
      weekLabels.forEach((day, index) => introText(parts, day, mx + 0.06 + index * cellW + 0.01, dayTop, 5.1, true, "0.42 0.44 0.42"));
      const firstDay = new Date(Date.UTC(2027, month, 1)).getUTCDay();
      const offset = (firstDay + 6) % 7;
      const daysInMonth = new Date(Date.UTC(2027, month + 1, 0)).getUTCDate();
      const cellH = Math.min(0.14, (moduleH - 0.42) / 6);
      for (let day = 1; day <= daysInMonth; day++) {
        const slot = offset + day - 1;
        const dayX = mx + 0.06 + (slot % 7) * cellW + 0.01;
        const dayY = dayTop - 0.12 - Math.floor(slot / 7) * cellH;
        introText(parts, String(day), dayX, dayY, 5.1, false, textColor);
      }
    }
  }
  return parts.join("");
}

export function createNotebookInteriorPdf(title: string, settings: NotebookSettings) {
  const trim = notebookTrim(settings);
  const pageWidth = trim.width + (settings.bleed ? BLEED_INCHES : 0);
  const pageHeight = trim.height + (settings.bleed ? BLEED_INCHES * 2 : 0);
  const introCount = settings.introPages?.length || 0;
  const totalPages = settings.pageCount + introCount;
  const gutter = gutterMargin(totalPages);
  const outer = 0.375;
  const top = 0.55;
  const bottom = 0.55;
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.alloc(0),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "ascii"),
  ];
  const pageObjectNumbers: number[] = [];
  for (let page = 1; page <= totalPages; page++) {
    const isOdd = page % 2 === 1;
    const inside = gutter + 0.05;
    const left = isOdd ? inside : outer;
    const right = isOdd ? outer : inside;
    const xLeft = left;
    const xRight = pageWidth - right;
    const yTop = pageHeight - top;
    const introType = settings.introPages?.[page - 1];
    const content = introType
      ? notebookIntroPage(introType, settings, pageWidth, pageHeight, xLeft, xRight, yTop, bottom)
      : fixedPageText(
        settings,
        title,
        page - introCount,
        pageWidth,
        pageHeight,
        xLeft,
        xRight,
        yTop,
        bottom,
      );
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    objects.push(Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${inch(pageWidth).toFixed(2)} ${inch(pageHeight).toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      "ascii",
    ));
    objects.push(streamObject(content));
  }
  objects[1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${totalPages} >>`,
    "ascii",
  );
  return buildPdf(objects);
}

function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character] || character);
}

function coverStyleColors(design: NotebookCoverDesign) {
  return {
    background: safeColor(design.background, "#173b4a"),
    accent: safeColor(design.accent, "#d8a85c"),
  };
}

function coverArtwork(settings: NotebookSettings, design: NotebookCoverDesign) {
  const width = 600;
  const height = 840;
  const { background, accent } = coverStyleColors(design);
  const motif = design.style === "botanical"
    ? `<path d="M70 180 C180 90 250 190 270 320 M220 225 C150 190 120 160 112 122 M246 272 C320 245 360 195 368 146 M208 250 C162 270 130 304 120 347" fill="none" stroke="${accent}" stroke-width="5"/><circle cx="108" cy="118" r="18" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="373" cy="141" r="20" fill="none" stroke="${accent}" stroke-width="4"/>`
    : design.style === "technology" || design.style === "space"
      ? `<circle cx="300" cy="245" r="98" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="300" cy="245" r="138" fill="none" stroke="${accent}" stroke-width="1" opacity=".65"/><path d="M105 245 H495 M300 52 V438" stroke="${accent}" stroke-width="1" opacity=".5"/><circle cx="300" cy="245" r="9" fill="${accent}"/>`
      : design.style === "colorful"
        ? `<path d="M60 170 L300 80 L540 170 L480 290 L120 290 Z" fill="${accent}" opacity=".7"/><circle cx="300" cy="240" r="95" fill="none" stroke="${accent}" stroke-width="5"/><path d="M105 345 L495 115" stroke="${accent}" stroke-width="3" opacity=".6"/>`
        : `<rect x="93" y="96" width="414" height="340" rx="12" fill="none" stroke="${accent}" stroke-width="2"/><path d="M123 126 H477 M123 406 H477" stroke="${accent}" stroke-width="1" opacity=".6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="600" height="840" fill="${background}"/><rect x="18" y="18" width="564" height="804" rx="4" fill="none" stroke="${accent}" stroke-width="2"/><g opacity=".92">${motif}</g></svg>`;
}

export function createNotebookCoverSvg(title: string, settings: NotebookSettings, design: NotebookCoverDesign) {
  const { width, height } = notebookTrim(settings);
  const { background, accent } = coverStyleColors(design);
  const safeTitle = xmlEscape(title);
  const subtitle = xmlEscape(settings.subtitle);
  const author = xmlEscape(settings.authorName);
  const series = xmlEscape(settings.seriesName);
  const back = xmlEscape(design.backDescription);
  const style = design.style || "minimal";
  const motif = coverArtwork(settings, design).replace(/^<svg[^>]*>|<\/svg>$/g, "");
  const imageUrl = /^\/uploads\/[A-Za-z0-9_-]{16,80}\.(?:png|jpe?g)$/i.test(design.frontImageUrl || "")
    ? xmlEscape(design.frontImageUrl) : "";
  const fontFamily = style === "education" ? "Georgia,serif" : "Arial,sans-serif";
  const imageMarkup = imageUrl
    ? `<image href="${imageUrl}" x="56" y="300" width="${width * 150 - 112}" height="${height * 150 * 0.38}" preserveAspectRatio="xMidYMid slice" opacity=".88"/>`
    : motif;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * 150)}" height="${Math.round(height * 150)}" viewBox="0 0 600 840"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${background}"/></linearGradient></defs><rect width="600" height="840" fill="url(#paper)"/><rect x="20" y="20" width="560" height="800" fill="none" stroke="${accent}" stroke-width="2"/><g>${motif}</g><rect x="52" y="280" width="496" height="310" rx="8" fill="${background}" opacity=".7"/>${imageMarkup}<text x="300" y="635" fill="#ffffff" text-anchor="middle" font-family="${fontFamily}" font-size="36" font-weight="700">${safeTitle.slice(0, 70)}</text>${subtitle ? `<text x="300" y="682" fill="${accent}" text-anchor="middle" font-family="${fontFamily}" font-size="20">${subtitle.slice(0, 90)}</text>` : ""}${author ? `<text x="300" y="760" fill="#ffffff" text-anchor="middle" font-family="${fontFamily}" font-size="16">${author.slice(0, 70)}</text>` : ""}${series ? `<text x="300" y="110" fill="${accent}" text-anchor="middle" font-family="${fontFamily}" font-size="13" letter-spacing="2">${series.slice(0, 60)}</text>` : ""}${back ? `<text x="70" y="785" fill="${accent}" font-family="${fontFamily}" font-size="10">${back.slice(0, 55)}</text>` : ""}</svg>`;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer: Buffer): PdfImage | null {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  let interlace = 1;
  const idat: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (length > 32 * 1024 * 1024 || offset + 12 + length > buffer.length) return null;
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || width * height > 20_000_000 || bitDepth !== 8 || interlace !== 0
    || ![2, 6].includes(colorType)) return null;
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat), { maxOutputLength: height * (stride + 1) });
  if (inflated.length !== height * (stride + 1)) return null;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (stride + 1)];
    const row = inflated.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const value = row[x];
      const left = x >= channels ? raw[y * stride + x - channels] : 0;
      const above = y > 0 ? raw[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? raw[(y - 1) * stride + x - channels] : 0;
      const filtered = filter === 0 ? value
        : filter === 1 ? value + left
          : filter === 2 ? value + above
            : filter === 3 ? value + Math.floor((left + above) / 2)
              : filter === 4 ? value + paeth(left, above, upperLeft)
                : NaN;
      if (!Number.isFinite(filtered)) return null;
      raw[y * stride + x] = filtered & 0xff;
    }
  }
  const rgbData = Buffer.alloc(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const source = pixel * channels;
    const target = pixel * 3;
    const alpha = channels === 4 ? raw[source + 3] / 255 : 1;
    for (let c = 0; c < 3; c++) rgbData[target + c] = Math.round(raw[source + c] * alpha + 255 * (1 - alpha));
  }
  return { width, height, data: deflateSync(rgbData), filter: "FlateDecode", colorSpace: "DeviceRGB" };
}

function decodeJpeg(buffer: Buffer): PdfImage | null {
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset++;
    if (offset >= buffer.length) return null;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (segmentLength < 8) return null;
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      const components = buffer[offset + 7];
      const colorSpace = components === 1 ? "DeviceGray" : components === 3 ? "DeviceRGB" : null;
      if (!width || !height || width * height > 20_000_000 || !colorSpace) return null;
      return {
        width,
        height,
        data: buffer,
        filter: "DCTDecode",
        colorSpace,
      };
    }
    offset += segmentLength;
  }
  return null;
}

function readUploadedImage(raw: Buffer | null): PdfImage | null {
  if (!raw) return null;
  try { return decodePng(raw) || decodeJpeg(raw); } catch { return null; }
}

export function createNotebookCoverPdf(
  title: string,
  settings: NotebookSettings,
  design: NotebookCoverDesign,
  uploadedCoverBytes: Buffer | null = null,
) {
  if (settings.binding !== "paperback") throw new Error("A KDP paperback wrap is only generated for paperback projects.");
  const trim = notebookTrim(settings);
  const spine = notebookSpineWidth(settings);
  const pageWidth = (trim.width * 2) + spine + (2 * BLEED_INCHES);
  const pageHeight = trim.height + (2 * BLEED_INCHES);
  const left = BLEED_INCHES;
  const spineX = left + trim.width;
  const frontX = spineX + spine;
  const topY = BLEED_INCHES + trim.height;
  const { background, accent } = coverStyleColors(design);
  const titleColor = readableTextColor(background);
  const parts: string[] = [
    `${rgb(background)} rg 0 0 ${inch(pageWidth).toFixed(2)} ${inch(pageHeight).toFixed(2)} re f\n`,
    `${rgb(accent)} RG 1.2 w ${inch(left + 0.22).toFixed(2)} ${inch(0.22).toFixed(2)} ${inch(trim.width - 0.44).toFixed(2)} ${inch(trim.height - 0.44).toFixed(2)} re S\n`,
    `${rgb(accent)} RG 1.2 w ${inch(frontX + 0.22).toFixed(2)} ${inch(0.22).toFixed(2)} ${inch(trim.width - 0.44).toFixed(2)} ${inch(trim.height - 0.44).toFixed(2)} re S\n`,
    `${rgb(background)} rg ${inch(spineX).toFixed(2)} 0 ${inch(spine).toFixed(2)} ${inch(pageHeight).toFixed(2)} re f\n`,
  ];
  const frontBottom = BLEED_INCHES;
  const motifTop = frontBottom + trim.height * 0.62;
  const hasFrontImage = Boolean(uploadedCoverBytes);
  if (!hasFrontImage) addCoverMotif(parts, design.style, accent, frontX, frontBottom, trim.width, trim.height);
  if (settings.seriesName) {
    parts.push(textCommand(settings.seriesName, inch(frontX + 0.4), inch(topY - 0.72), 9, "F2", rgb(accent)));
  }
  if (design.description) {
    parts.push(textCommand(design.description, inch(frontX + 0.4), inch(topY - 1.0), 7, "F1", rgb(accent)));
  }
  if (design.backDescription) {
    const words = String(design.backDescription).slice(0, 800).split(/\s+/);
    let line = "";
    let y = inch(topY - 1.05);
    for (const word of words) {
      if ((line + " " + word).length > 42) {
        parts.push(textCommand(line, inch(left + 0.4), y, 9, "F1", "0.10 0.12 0.14"));
        y -= 15;
        line = word;
      } else line = line ? `${line} ${word}` : word;
      if (y < inch(1.55)) break;
    }
    if (line && y >= inch(1.55)) parts.push(textCommand(line, inch(left + 0.4), y, 9, "F1", "0.10 0.12 0.14"));
  }
  // A clear reservation keeps the area used for KDP's barcode free of copy.
  parts.push(`${rgb(background)} rg ${inch(left + trim.width - 2.2).toFixed(2)} ${inch(0.35).toFixed(2)} ${inch(1.85).toFixed(2)} ${inch(1.15).toFixed(2)} re f\n`);
  const image = readUploadedImage(uploadedCoverBytes);
  const imageObjectNumber = image ? 5 : 0;
  if (image) {
    const panelW = trim.width - 0.8;
    const panelH = trim.height * 0.22;
    const scale = Math.min(panelW / image.width, panelH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const drawX = frontX + (trim.width - drawW) / 2;
    const drawY = motifTop + (trim.height * 0.22 - drawH) / 2;
    parts.push(`q ${inch(drawW).toFixed(2)} 0 0 ${inch(drawH).toFixed(2)} ${inch(drawX).toFixed(2)} ${inch(drawY).toFixed(2)} cm /Im0 Do Q\n`);
  }
  const coverTitle = wrapPdfText(title, Math.max(18, Math.floor(trim.width * 7.5)), 2);
  const titleY = inch(frontBottom + trim.height * (hasFrontImage ? 0.5 : 0.51));
  coverTitle.forEach((line, index) => {
    parts.push(textCommand(line, inch(frontX + 0.4), titleY - (index * 25), 20, "F2", titleColor));
  });
  if (settings.subtitle) {
    parts.push(textCommand(settings.subtitle, inch(frontX + 0.4), titleY - coverTitle.length * 25 - 3, 11, "F1", rgb(accent)));
  }
  if (settings.authorName) {
    parts.push(textCommand(settings.authorName, inch(frontX + 0.4), inch(frontBottom + 0.68), 10, "F1", titleColor));
  }
  parts.push(`${rgb(accent)} RG 1.4 w ${inch(frontX + 0.4).toFixed(2)} ${inch(frontBottom + trim.height * 0.44).toFixed(2)} m ${inch(frontX + trim.width - 0.4).toFixed(2)} ${inch(frontBottom + trim.height * 0.44).toFixed(2)} l S\n`);
  if (notebookTotalPageCount(settings) >= 80 && spine >= 0.25) {
    const spineTitle = pdfText(title).slice(0, 40);
    parts.push(`q 0 1 -1 0 ${inch(spineX + spine * 0.72).toFixed(2)} ${inch(topY - 0.55).toFixed(2)} cm\n`);
    parts.push(textCommand(spineTitle, 0, 0, 7, "F2", "1 1 1"));
    parts.push("Q\n");
  }
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [6 0 R] /Count 1 >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "ascii"),
  ];
  if (image) objects.push(streamObject(image.data, `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter /${image.filter}`));
  const imageResources = image ? ` /XObject << /Im0 ${imageObjectNumber} 0 R >>` : "";
  objects.push(Buffer.from(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${inch(pageWidth).toFixed(2)} ${inch(pageHeight).toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${imageResources} >> /Contents ${image ? 7 : 6} 0 R >>`,
    "ascii",
  ));
  objects.push(streamObject(parts.join("")));
  return buildPdf(objects);
}
