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
  "abraham",
  "joseph",
  "samuel",
  "zacchaeus",
  "calming-storm",
  "welcoming-children",
  "lost-sheep",
  "bartimaeus",
]);

function renderBibleSceneSvg(
  scene: string,
  altText: string,
  artMode: "line" | "color",
  theme: EbookDesignTheme,
) {
  const safeScene = BIBLE_SCENE_IDS.has(scene) ? scene : "storybook-cover";
  const isColor = artMode === "color";
  const ink = isColor ? "#29394b" : "#171a20";
  const accent = isColor ? safeColor(theme.accent, "#e1a63e") : "#171a20";
  const skin = isColor ? "#f6c89f" : "#fff";
  const robe = isColor ? "#f1d882" : "#fff";
  const stroke = `stroke="${ink}" stroke-width="${isColor ? 5 : 5.5}" stroke-linecap="round" stroke-linejoin="round"`;
  const colors = new Set<string>();
  const fill = (color: string) => {
    if (!isColor) return "#fff";
    const validColor = safeColor(color, "#fff9e8");
    colors.add(validColor);
    return `url(#volume-${validColor.slice(1)})`;
  };
  const human = (x: number, y: number, scale = 1, robeColor = robe) => `
    <g transform="translate(${x} ${y}) scale(${scale})" ${stroke}>
      <path d="M-24 48Q0 38 24 48L41 107Q1 126-41 107Z" fill="${fill(robeColor)}"/>
      <path d="M-23 55Q-39 58-55 81L-45 91Q-33 78-17 71ZM23 55Q39 58 55 81L45 91Q33 78 17 71Z" fill="${fill(robeColor)}"/>
      <path d="M-48 84l-3 9m99-9 3 9" fill="none"/>
      <circle cx="-50" cy="96" r="7" fill="${fill(skin)}"/><circle cx="50" cy="96" r="7" fill="${fill(skin)}"/>
      <path d="M-19 51L0 68 19 51M-25 105Q0 114 25 105M0 68v38" fill="none"/>
      <path d="M-16 108L-19 132M16 108L19 132" fill="none"/>
      <ellipse cx="-27" cy="135" rx="15" ry="7" fill="${fill(isColor ? "#5b473d" : "#fff")}"/>
      <ellipse cx="27" cy="135" rx="15" ry="7" fill="${fill(isColor ? "#5b473d" : "#fff")}"/>
      <circle cx="-28" cy="20" r="6" fill="${fill(skin)}"/><circle cx="28" cy="20" r="6" fill="${fill(skin)}"/>
      <circle cx="0" cy="20" r="29" fill="${fill(skin)}"/>
      <path d="M-27 12Q-23-19 4-13 25-10 28 10 12-4-5 2-16 10-27 12Z" fill="${fill(isColor ? "#493a31" : "#fff")}"/>
      <ellipse cx="-10" cy="22" rx="3.5" ry="4.6" fill="${ink}" stroke="none"/>
      <ellipse cx="10" cy="22" rx="3.5" ry="4.6" fill="${ink}" stroke="none"/>
      <circle cx="-11" cy="21" r="1.2" fill="#fff" stroke="none"/><circle cx="9" cy="21" r="1.2" fill="#fff" stroke="none"/>
      <path d="M-8 34Q0 42 9 34M-18 15q6-5 12-2m9 0q6-3 12 2M-7 28h14" fill="none"/>
      <circle cx="-19" cy="31" r="4" fill="${fill(isColor ? "#eea69a" : "#fff")}"/><circle cx="19" cy="31" r="4" fill="${fill(isColor ? "#eea69a" : "#fff")}"/>
    </g>`;
  const star = (x: number, y: number, size = 18) => `<path class="storybook-twinkle" d="M${x} ${y-size} L${x+5} ${y-5} ${x+size} ${y} ${x+5} ${y+5} ${x} ${y+size} ${x-5} ${y+5} ${x-size} ${y} ${x-5} ${y-5}Z" fill="${fill(accent)}" ${stroke}/>`;
  const sheep = (x: number, y: number, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})" ${stroke}><path d="M-22 11v25m38-26v27m24-26v25" fill="none"/><circle cx="-12" cy="0" r="24" fill="${fill("#fff")}"/><circle cx="13" cy="-3" r="25" fill="${fill("#fff")}"/><circle cx="35" cy="4" r="17" fill="${fill("#fff")}"/><ellipse cx="49" cy="5" rx="13" ry="15" fill="${fill(skin)}"/><path d="M38-7q2-21 18-5m-8 15q8-5 14 2" fill="none"/><circle cx="51" cy="1" r="2.8" fill="${ink}"/><circle cx="52" cy="0" r="1" fill="#fff" stroke="none"/><path d="M-24-15q4 8 11 2m4-11q3 8 10 3m10-1q4 7 11 2M-4 24q4 7 9 2" fill="none"/></g>`;
  const lion = (x: number, y: number, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})" ${stroke}><ellipse cx="0" cy="39" rx="42" ry="25" fill="${fill(accent)}"/><path d="M-29 52l-5 23m24-22-2 22m26-22 3 22m20-28 8 24" fill="none"/><path d="M-42 41q-18-23-4-48Q-36-35-4-41 27-43 42-20 57 4 39 30 23 52-9 46Z" fill="${fill(accent)}"/><ellipse cx="0" cy="3" rx="25" ry="22" fill="${fill(skin)}"/><circle cx="-9" cy="-2" r="3.3" fill="${ink}"/><circle cx="9" cy="-2" r="3.3" fill="${ink}"/><ellipse cx="0" cy="7" rx="5" ry="4" fill="${fill("#5b473d")}"/><path d="M-8 14q8 9 16 0m-29-22 8-8m18 0 8 8m23 46q23-3 15-20" fill="none"/></g>`;
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
    case "abraham":
      scenery = `<path d="M104 560V355l214-168 215 168v205Z" fill="${fill("#fff0c4")}" ${stroke}/><path d="M104 355h429M251 560V397q69-93 137 0v163" fill="none" ${stroke}/>${Array.from({ length: 12 }, (_, index) => star(105 + (index * 73) % 440, 90 + (index * 47) % 175, 13 + (index % 3) * 4)).join("")}<path d="M76 602h488" fill="none" ${stroke}/>`;
      people = human(320, 395, 0.78);
      break;
    case "joseph":
      scenery = `${hill}<path d="M91 593h455M427 574v-163m-24 41h48m-24 0-42 39m42-39 42 39" fill="none" ${stroke}/>${star(130,176,20)}${star(501,195,20)}<path d="M273 511l47-38 47 38v86h-94Z" fill="${fill("#ffe7a8")}" ${stroke}/><path d="M294 528h52m-52 21h52m-52 21h52" fill="none" ${stroke}/>`;
      people = human(218, 404, 0.8, isColor ? "#a9d9e7" : "#fff") + human(408, 408, 0.72, isColor ? "#efbb68" : "#fff");
      break;
    case "samuel":
      scenery = `<path d="M118 601V274h404v327M118 328h404M167 274v327m306-327v327" fill="none" ${stroke}/><path d="M293 576v-64q27-35 54 0v64m-52-118h52" fill="${fill("#ffe7a8")}" ${stroke}/><path d="M309 447q12-30 24 0m-12-28v27" fill="none" ${stroke}/>${star(321,154,24)}`;
      people = human(231, 383, 0.69) + human(408, 399, 0.75, isColor ? "#c8e5a5" : "#fff");
      break;
    case "zacchaeus":
      scenery = `${hill}<path d="M126 534q48-76 96 0v66h-96Zm186-38q52-87 104 0v104H312Zm159 27q39-61 78 0v77h-78Z" fill="${fill("#d4edc3")}" ${stroke}/><path d="M339 492V198m-45 68q49-93 93 0m-108 61q63-80 128 0m-127 38q66-71 131 0" fill="none" ${stroke}/><path d="M95 604h450" fill="none" ${stroke}/>`;
      people = human(335, 332, 0.58, isColor ? "#f2ce72" : "#fff") + human(223, 431, 0.67) + human(455, 432, 0.67, isColor ? "#c8e5a5" : "#fff");
      break;
    case "calming-storm":
      scenery = `<path d="M42 474q62-73 124 0t124 0 124 0 124 0 106 0v160H42Z" fill="${fill("#8ac8e0")}" ${stroke}/><path d="M48 523q62-65 124 0t124 0 124 0 124 0 100 0M48 574q62-52 124 0t124 0 124 0 124 0 100 0" fill="none" ${stroke}/><path d="M170 430q150 100 300 0l-28 108H202Z" fill="${fill("#e9a86c")}" ${stroke}/><path d="M204 469q112 45 230 0m-218 38q102 38 203 0" fill="none" ${stroke}/><path d="M317 405V231l-117 173Z" fill="${fill("#fff4d6")}" ${stroke}/><path d="M315 210v-62m-26 42h52" fill="none" ${stroke}/>${star(510,151,23)}<path d="M110 230q27-34 54 0m-17-34q29-34 57 1M423 238q26-31 52 0" fill="none" ${stroke}/><path d="M74 254q-13-16 4-30 9-24 36-12 17-26 38-8 27-2 30 22 25-8 34 16-19 20-43 12-20 18-42 7-30 18-57-7Zm318-13q-9-15 7-28 8-22 32-12 17-21 35-5 23-1 27 20 22-7 30 15-16 18-37 11-19 15-38 6-25 14-48-7Z" fill="${fill("#c3d2e6")}" ${stroke}/><path d="M106 297l-12 34m55-29-11 38m43-38-10 30m223-31-12 34m49-37-11 38m48-31-10 32m-342 91 15 16m-8-29 13 13m311 5 12 12m-7-26 14 15" fill="none" ${stroke}/>`;
      people = human(258, 353, 0.68, isColor ? "#e4c7f1" : "#fff") + human(362, 365, 0.66, isColor ? "#d4eaa9" : "#fff");
      break;
    case "welcoming-children":
      scenery = `${hill}<path d="M92 568q55-37 110 0m-84 29q75-40 150 0m194-30q63-39 126 0M90 610h460" fill="none" ${stroke}/>${star(130,175,18)}${star(505,180,18)}<path d="M160 348q160-95 320 0" fill="none" ${stroke}/>`;
      people = human(316, 325, 0.94, isColor ? "#e5b45b" : "#fff") + human(176, 452, 0.58, isColor ? "#c6e4f1" : "#fff") + human(270, 456, 0.56, isColor ? "#e8a8a2" : "#fff") + human(378, 453, 0.57, isColor ? "#c7dda1" : "#fff") + human(465, 458, 0.54, isColor ? "#d7c3ed" : "#fff");
      break;
    case "lost-sheep":
      scenery = `<path d="M50 605Q170 463 300 574Q430 410 590 580V656H50Z" fill="${fill("#b8dc9d")}" ${stroke}/><path d="M58 620q115-85 210-12m126-26q90-90 178-9M88 633h465" fill="none" ${stroke}/>${star(124,164,20)}${star(521,138,25)}<path d="M191 550q-31-45-6-83 22-34 57 3" fill="none" ${stroke}/>`;
      people = human(264, 379, 0.84, isColor ? "#72a9ca" : "#fff") + sheep(404, 518, 0.73);
      break;
    case "bartimaeus":
      scenery = `${hill}<path d="M60 596h520M120 553q165-94 400 0" fill="none" ${stroke}/><path d="M112 520h78m-62-24 48 48m-48 0 48-48" fill="none" ${stroke}/>${star(511,165,23)}<path d="M96 610q18-31 36 0m382 0q18-31 36 0" fill="none" ${stroke}/>`;
      people = human(422, 371, 0.85, isColor ? "#e7c36a" : "#fff") + human(226, 443, 0.72, isColor ? "#b8c8dc" : "#fff") + human(536, 436, 0.58, isColor ? "#c5e2ad" : "#fff");
      break;
    case "storybook-cover":
      scenery = `<path d="M0 425Q120 332 240 427T480 425T640 415V720H0Z" fill="${fill("#8fcf9b")}"/><path d="M0 510Q145 407 290 515T580 500T640 490V720H0Z" fill="${fill("#56ad84")}"/><circle cx="507" cy="149" r="61" fill="${fill("#ffe083")}" ${stroke}/><path d="M78 210q-14-31 25-39 15-43 55-13 44-2 40 37-21 19-120 15m305-24q-9-25 21-29 15-35 48-10 37-1 35 31-20 18-104 8" fill="${fill("#fff")}"/><path d="M84 600q236-59 474 0" fill="none" ${stroke}/>${star(303,128,22)}${star(399,186,15)}`;
      people = human(242, 359, 0.78, isColor ? "#f09d7b" : "#fff") + human(395, 366, 0.78, isColor ? "#82b8d2" : "#fff") + sheep(300, 548, 0.82);
      break;
    default:
      scenery = `<circle cx="320" cy="470" r="170" fill="${fill("#fff0c4")}" ${stroke}/>${star(176,236,22)}${star(466,245,18)}`;
      people = human(244, 382, 0.77) + human(398, 382, 0.77) + sheep(300, 548, 0.86);
  }

  const gradientDefinition = isColor
    ? `<defs><linearGradient id="canvas-wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${safeColor(theme.paper, "#fff9e9")}"/></linearGradient>${Array.from(colors, (color) => {
      const shade = (amount: number) => {
        const channels = color.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16));
        return `#${channels.map((channel) => Math.round(Math.max(0, Math.min(255, channel * (1 - amount)))).toString(16).padStart(2, "0")).join("")}`;
      };
      return `<linearGradient id="volume-${color.slice(1)}" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#ffffff" stop-opacity=".62"/><stop offset=".38" stop-color="${color}"/><stop offset="1" stop-color="${shade(.16)}"/></linearGradient>`;
    }).join("")}</defs>`
    : "";
  const cartoonMotion = isColor
    ? `<style>@keyframes storybook-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes storybook-twinkle{0%,100%{opacity:.78}50%{opacity:1}}.storybook-character{animation:storybook-bob 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.storybook-twinkle{animation:storybook-twinkle 2.2s ease-in-out infinite alternate}@media(prefers-reduced-motion:reduce){.storybook-character,.storybook-twinkle{animation:none}}</style>`
    : "";
  const landscape = safeScene === "creation" || safeScene === "david" || safeScene === "samaritan";
  const gardenCorners = `<g ${stroke}><path d="M47 674q20-45 42-72m-37 36q-16-21-29-12 9 20 29 21m13-25q-3-25 15-27 7 20-15 27m533 52q-20-45-42-72m37 36q16-21 29-12-9 20-29 21m-13-25q3-25-15-27-7 20 15 27" fill="none"/><path d="M50 649q-13-11-22 1 8 13 22-1m539 0q13-11 22 1-8 13-22-1" fill="${fill("#82c18a")}"/><circle cx="67" cy="643" r="8" fill="${fill("#f4bf62")}"/><circle cx="573" cy="643" r="8" fill="${fill("#f4bf62")}"/><circle cx="67" cy="643" r="3" fill="${fill("#fff")}"/><circle cx="573" cy="643" r="3" fill="${fill("#fff")}"/></g>`;
  const title = escapeXml(altText.slice(0, 180));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 720" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet">${gradientDefinition}${cartoonMotion}<title>${title}</title><rect width="640" height="720" fill="${isColor ? "url(#canvas-wash)" : "#fff"}"/><rect x="28" y="28" width="584" height="664" rx="24" fill="none" ${stroke}/>${landscape ? "" : `<path d="M78 615h484" fill="none" ${stroke}/>`}${scenery}<g class="${isColor ? "storybook-character" : ""}">${people}</g>${gardenCorners}</svg>`;
}
