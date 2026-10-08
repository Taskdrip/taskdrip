export type EbookArtMotif = "botanical" | "geometry" | "orbit" | "waves";

export type EbookDesignTheme = {
  name: string;
  primary: string;
  accent: string;
  paper: string;
  text: string;
  headingFont: "serif" | "sans";
  bodyFont: "serif" | "sans";
};

export type EbookDesignBlock =
  | { id: string; kind: "text"; role: "eyebrow" | "title" | "subtitle" | "heading" | "body" | "quote" | "caption"; text: string }
  | { id: string; kind: "list"; items: string[] }
  | { id: string; kind: "art"; motif: EbookArtMotif; altText: string; brief?: string }
  | { id: string; kind: "chapter"; chapterId: string }
  | { id: string; kind: "contents" };

export type EbookDesignPage = {
  id: string;
  kind: "cover" | "title" | "copyright" | "contents" | "chapter-opening" | "chapter-body" | "backmatter";
  title: string;
  chapterId?: string;
  blocks: EbookDesignBlock[];
};

export type EbookDesignDocument = {
  schemaVersion: 1;
  prompt: string;
  theme: EbookDesignTheme;
  pages: EbookDesignPage[];
};

export const DEFAULT_EBOOK_THEME: EbookDesignTheme = {
  name: "Classic editorial",
  primary: "#33245C",
  accent: "#B97840",
  paper: "#FFFCF6",
  text: "#24202A",
  headingFont: "serif",
  bodyFont: "serif",
};

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] || character);
}

export function renderEbookArtSvg(
  motif: EbookArtMotif,
  theme: EbookDesignTheme,
  seed = 0,
  altText = "Decorative vector illustration",
) {
  const primary = safeColor(theme.primary, DEFAULT_EBOOK_THEME.primary);
  const accent = safeColor(theme.accent, DEFAULT_EBOOK_THEME.accent);
  const paper = safeColor(theme.paper, DEFAULT_EBOOK_THEME.paper);
  const title = escapeXml(altText.slice(0, 180));
  let artwork = "";

  if (motif === "botanical") {
    const leaves = Array.from({ length: 9 }, (_, index) => {
      const y = 30 + index * 25;
      const side = (index + seed) % 2 === 0 ? 1 : -1;
      const x = 320 + side * (35 + (index % 3) * 13);
      const leafX = x + side * (48 + (index % 2) * 9);
      return `<path d="M320 ${y + 95} Q${x} ${y + 55} ${leafX} ${y}" fill="none" stroke="${primary}" stroke-width="3" stroke-linecap="round"/><path d="M${x} ${y + 42} Q${leafX + side * 22} ${y + 10} ${leafX} ${y} Q${leafX - side * 18} ${y + 25} ${x} ${y + 42}Z" fill="${index % 2 ? accent : primary}" opacity=".72"/>`;
    }).join("");
    artwork = `<path d="M320 280 C300 210 345 150 320 92 C300 45 322 24 320 0" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>${leaves}`;
  } else if (motif === "waves") {
    artwork = Array.from({ length: 8 }, (_, index) => {
      const y = 36 + index * 31;
      const offset = (index + seed) % 2 ? 28 : -28;
      return `<path d="M0 ${y} C150 ${y + offset} 210 ${y - offset} 320 ${y} S490 ${y + offset} 640 ${y}" fill="none" stroke="${index % 2 ? primary : accent}" stroke-width="${index === 0 ? 5 : 3}" opacity="${0.34 + (index % 3) * 0.16}"/>`;
    }).join("");
  } else if (motif === "orbit") {
    artwork = `<circle cx="320" cy="140" r="88" fill="none" stroke="${primary}" stroke-width="3" opacity=".65"/><circle cx="320" cy="140" r="54" fill="${accent}" opacity=".2"/><circle cx="320" cy="140" r="17" fill="${accent}"/>` +
      Array.from({ length: 6 }, (_, index) => {
        const angle = ((index + seed) * Math.PI) / 3;
        const x = 320 + Math.cos(angle) * 116;
        const y = 140 + Math.sin(angle) * 91;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="8" ry="8" fill="${index % 2 ? primary : accent}"/><path d="M320 140 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${primary}" stroke-width="1.5" opacity=".28"/>`;
      }).join("");
  } else {
    artwork = `<circle cx="320" cy="140" r="104" fill="${primary}" opacity=".08"/>` +
      Array.from({ length: 7 }, (_, index) => {
        const angle = (((index + seed) % 7) * Math.PI) / 3.5;
        const x = 320 + Math.cos(angle) * (38 + (index % 3) * 34);
        const y = 140 + Math.sin(angle) * (38 + (index % 3) * 34);
        const radius = 18 + (index % 3) * 8;
        return `<polygon points="${x.toFixed(1)},${(y - radius).toFixed(1)} ${(x + radius).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + radius).toFixed(1)} ${(x - radius).toFixed(1)},${y.toFixed(1)}" fill="${index % 2 ? primary : accent}" opacity="${0.55 + (index % 2) * 0.2}"/>`;
      }).join("");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet"><title>${title}</title><rect width="640" height="280" rx="20" fill="${paper}"/>${artwork}</svg>`;
}
