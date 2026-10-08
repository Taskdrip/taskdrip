export type EbookArtMotif = "botanical" | "geometry" | "orbit" | "waves" | "bible-scene";

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
  | { id: string; kind: "art"; motif: EbookArtMotif; altText: string; brief?: string; scene?: string; artMode?: "line" | "color" }
  | { id: string; kind: "chapter"; chapterId: string }
  | { id: string; kind: "contents" };

export type EbookDesignPage = {
  id: string;
  kind: "cover" | "title" | "copyright" | "contents" | "chapter-opening" | "chapter-body" | "parent-guide" | "coloring" | "backmatter";
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
  scene?: string,
  artMode: "line" | "color" = "line",
) {
  const primary = safeColor(theme.primary, DEFAULT_EBOOK_THEME.primary);
  const accent = safeColor(theme.accent, DEFAULT_EBOOK_THEME.accent);
  const paper = safeColor(theme.paper, DEFAULT_EBOOK_THEME.paper);
  const title = escapeXml(altText.slice(0, 180));
  if (motif === "bible-scene") {
    return renderBibleSceneSvg(scene || "storybook-cover", altText, artMode, theme);
  }

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

const BIBLE_SCENE_IDS = new Set([
  "storybook-cover",
  "creation",
  "noah",
  "moses",
  "david",
  "daniel",
  "jonah",
  "ruth",
  "esther",
  "nativity",
  "feeding",
  "samaritan",
  "resurrection",
]);

function renderBibleSceneSvg(
  scene: string,
  altText: string,
  artMode: "line" | "color",
  theme: EbookDesignTheme,
) {
  const safeScene = BIBLE_SCENE_IDS.has(scene) ? scene : "storybook-cover";
  const isColor = artMode === "color";
  const ink = isColor ? safeColor(theme.primary, "#372d70") : "#1d2026";
  const accent = isColor ? safeColor(theme.accent, "#e1a63e") : "#1d2026";
  const skin = isColor ? "#f6c89f" : "#fff";
  const robe = isColor ? "#f1d882" : "#fff";
  const sky = isColor ? "#fff4cb" : "#fff";
  const stroke = `stroke="${ink}" stroke-width="${isColor ? 5 : 5.5}" stroke-linecap="round" stroke-linejoin="round"`;
  const fill = (color: string) => isColor ? color : "#fff";
  const human = (x: number, y: number, scale = 1, robeColor = robe) => `
    <g transform="translate(${x} ${y}) scale(${scale})" ${stroke}>
      <path d="M-26 49 Q0 39 26 49 L37 111 Q0 124-37 111Z" fill="${fill(robeColor)}"/>
      <path d="M-22 60 L-48 85 M22 60 L48 85" fill="none"/>
      <circle cx="0" cy="20" r="29" fill="${fill(skin)}"/>
      <path d="M-27 12 Q-23-19 4-13 Q25-10 28 10 Q12-4-5 2 Q-16 10-27 12Z" fill="${fill(isColor ? "#493a31" : "#fff")}"/>
      <circle cx="-10" cy="22" r="2.5" fill="${ink}" stroke="none"/>
      <circle cx="10" cy="22" r="2.5" fill="${ink}" stroke="none"/>
      <path d="M-8 34 Q0 42 9 34" fill="none"/>
      <path d="M-22 113 L-25 132 M22 113 L25 132 M-36 133 Q-24 139-14 133 M14 133 Q25 139 37 133" fill="none"/>
    </g>`;
  const star = (x: number, y: number, size = 18) => `<path d="M${x} ${y-size} L${x+5} ${y-5} ${x+size} ${y} ${x+5} ${y+5} ${x} ${y+size} ${x-5} ${y+5} ${x-size} ${y} ${x-5} ${y-5}Z" fill="${fill(accent)}" ${stroke}/>`;
  const sheep = (x: number, y: number, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})" ${stroke}><circle cx="-12" cy="0" r="24" fill="${fill("#fff")}"/><circle cx="13" cy="-3" r="25" fill="${fill("#fff")}"/><circle cx="35" cy="4" r="17" fill="${fill("#fff")}"/><ellipse cx="49" cy="5" rx="13" ry="15" fill="${fill(skin)}"/><circle cx="54" cy="1" r="2.5" fill="${ink}"/><path d="M-18 18v16m25-17v17" fill="none"/></g>`;
  const lion = (x: number, y: number, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})" ${stroke}><circle cx="0" cy="0" r="43" fill="${fill(accent)}"/><circle cx="0" cy="1" r="27" fill="${fill(skin)}"/><circle cx="-9" cy="-2" r="3" fill="${ink}"/><circle cx="9" cy="-2" r="3" fill="${ink}"/><path d="M-8 10 Q0 18 8 10 M-27 33l-8 25m64-25 8 25" fill="none"/></g>`;
  const hill = `<path d="M45 575 Q175 423 310 575 Q455 410 595 575 L595 645 L45 645Z" fill="${fill(isColor ? "#d7efc7" : "#fff")}"/>`;
  let scenery = "";
  let people = "";

  switch (safeScene) {
    case "creation":
      scenery = `<circle cx="515" cy="122" r="48" fill="${fill("#ffe083")}" ${stroke}/>${hill}<path d="M80 575 Q150 528 220 575 M423 565 Q487 518 555 570" fill="none" ${stroke}/><path d="M124 566v-85m0 33q-42-18-39-48 34 5 39 34m0-14q37-28 54-1-17 30-54 35" fill="${fill("#b6db8c")}" ${stroke}/><ellipse cx="340" cy="518" rx="77" ry="28" fill="${fill("#d7eeff")}" ${stroke}/><path d="M290 518q22-25 47 0-23 23-47 0m47 0 26-17v34Z" fill="${fill("#ffc45a")}" ${stroke}/>`;
      break;
    case "noah":
      scenery = `<path d="M102 463 Q320 525 538 463 L495 578 Q320 630 145 578Z" fill="${fill("#ffe1a0")}" ${stroke}/><path d="M133 493h374m-350 31h324m-300 29h276" fill="none" ${stroke}/><path d="M236 458V349h165v109M215 349h207l-103-79Z" fill="${fill("#fff0c4")}" ${stroke}/><path d="M245 382h37v42h-37m106-42h37v42h-37" fill="none" ${stroke}/>${star(510,180,25)}<path d="M100 220q60-62 120 0m-120 0q60 45 120 0" fill="none" ${stroke}/>`;
      people = human(323, 344, 0.82);
      break;
    case "moses":
      scenery = `<path d="M60 400q85-90 170 0t170 0 170 0v150q-85 80-170 0t-170 0-170 0Z" fill="${fill("#c7e7ff")}" ${stroke}/><path d="M60 545q85-90 170 0t170 0 170 0M60 590q85-80 170 0t170 0 170 0" fill="none" ${stroke}/><path d="M90 615h460" ${stroke}/>${star(514,168,22)}`;
      people = human(319, 375, 1);
      break;
    case "david":
      scenery = `${hill}<path d="M112 574q70-90 135 0m112-25q88-111 167-5" fill="none" ${stroke}/><path d="M495 548v-75m-15 20h30m-16-1-29 26m29-26 28 26" fill="none" ${stroke}/><path d="M179 470q-46-55-6-96 41-41 84 0-43 38-78 7m58 24q35-55 80-18-27 45-69 40" fill="none" ${stroke}/>${star(505,151,19)}`;
      people = human(260, 391, 0.9);
      break;
    case "daniel":
      scenery = `<path d="M95 270v340m60-340v340m360-340v340m-420-260h420m-420 95h420m-420 95h420" fill="none" ${stroke}/><path d="M236 610h168" ${stroke}/>`;
      people = human(320, 373, 0.84) + lion(186, 509, 0.8) + lion(458, 509, 0.8);
      break;
    case "jonah":
      scenery = `<path d="M48 548q75-40 150 0t150 0 150 0 100 0v100H48Z" fill="${fill("#c7e7ff")}" ${stroke}/><path d="M58 590q75-34 150 0t150 0 150 0 90 0" fill="none" ${stroke}/><path d="M420 370q-30-113 76-140 102-25 112 59-2 95-137 130-37 8-51-49Z" fill="${fill("#d8ecff")}" ${stroke}/><circle cx="537" cy="326" r="5" fill="${ink}"/><path d="M605 309l35-22v57l-35-17M512 443q34-37 67 0" fill="none" ${stroke}/>`;
      people = human(282, 389, 0.78);
      break;
    case "ruth":
      scenery = `<path d="M91 593q85-35 165 0t165 0 137 0" fill="${fill("#f8edc3")}" ${stroke}/><path d="M160 590v-188m17 188V359m18 231V417m210 176V384m19 209V352m19 241V408" fill="none" ${stroke}/><path d="M160 417l-18-23m18 52 19-26m-2-52 20-22m191 42-17-22m17 47 18-24m-1-57 20-20" fill="none" ${stroke}/>`;
      people = human(282, 392, 0.82) + human(388, 419, 0.73, isColor ? "#c8e5a5" : "#fff");
      break;
    case "esther":
      scenery = `<path d="M120 610V256h400v354M120 316h400M170 256v354m300-354v354" fill="none" ${stroke}/><path d="M254 219l21-46 42 34 42-34 21 46v31H254Z" fill="${fill("#ffe083")}" ${stroke}/>${star(321,126,20)}`;
      people = human(278, 354, 0.85) + human(392, 369, 0.83, isColor ? "#c8e5a5" : "#fff");
      break;
    case "nativity":
      scenery = `<path d="M122 500l198-183 199 183v115H122Z" fill="${fill("#fff0c4")}" ${stroke}/><path d="M123 502h396M168 499v-64m304 64v-64M260 602q60-91 120 0" fill="none" ${stroke}/><path d="M275 523q45-43 90 0v42h-90Z" fill="${fill("#ffe6a0")}" ${stroke}/>${star(320,155,38)}<path d="M291 587q29-14 58 0m-41-12v34m24-34v34" fill="none" ${stroke}/>`;
      people = human(225, 423, 0.65) + human(415, 423, 0.65);
      break;
    case "feeding":
      scenery = `<path d="M77 576q73-55 146 0t146 0 146 0 93 0" fill="${fill("#e6f1ff")}" ${stroke}/><path d="M217 550h206l-20 80H237Z" fill="${fill("#fff0c4")}" ${stroke}/><path d="M265 549q28-45 55 0m23 0q26-53 54 0" fill="none" ${stroke}/><path d="M290 506q27-34 54 0m-27-34v58" fill="none" ${stroke}/>${star(118,198,17)}${star(511,205,17)}`;
      people = human(321, 360, 0.74) + human(185, 443, 0.56) + human(455, 443, 0.56);
      break;
    case "samaritan":
      scenery = `${hill}<path d="M115 593h410M160 566q95-60 190 0m-74-143 68-53 68 53" fill="none" ${stroke}/><path d="M433 485q35-51 76-8l16 57h-89Z" fill="${fill("#f1d882")}" ${stroke}/><circle cx="446" cy="550" r="19" fill="${fill("#fff")}" ${stroke}/><circle cx="515" cy="550" r="19" fill="${fill("#fff")}" ${stroke}/><path d="M513 473l31-30" fill="none" ${stroke}/>`;
      people = human(253, 414, 0.75) + human(364, 406, 0.75);
      break;
    case "resurrection":
      scenery = `<path d="M125 596q57-146 129-148h132q81 2 129 148Z" fill="${fill("#e5d8cc")}" ${stroke}/><path d="M257 594V461q3-115 63-115t63 115v133" fill="${fill("#fff")}" ${stroke}/><path d="M363 517q51-60 102-1" fill="none" ${stroke}/><circle cx="324" cy="244" r="72" fill="${fill("#ffeaa1")}" ${stroke}/>${star(175,200,18)}${star(467,200,18)}<path d="M100 600q30-43 60 0m320 0q30-43 60 0" fill="none" ${stroke}/>`;
      people = human(164, 420, 0.62) + human(476, 420, 0.62);
      break;
    default:
      scenery = `<circle cx="320" cy="470" r="170" fill="${fill("#fff0c4")}" ${stroke}/>${star(176,236,22)}${star(466,245,18)}`;
      people = human(244, 382, 0.77) + human(398, 382, 0.77) + sheep(300, 548, 0.86);
  }

  const landscape = safeScene === "creation" || safeScene === "david" || safeScene === "samaritan";
  const title = escapeXml(altText.slice(0, 180));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 720" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet"><title>${title}</title><rect width="640" height="720" fill="${isColor ? safeColor(theme.paper, "#fff9e9") : "#fff"}"/><rect x="28" y="28" width="584" height="664" rx="24" fill="none" ${stroke}/>${landscape ? "" : `<path d="M78 615h484" fill="none" ${stroke}/>`}${scenery}${people}</svg>`;
}
