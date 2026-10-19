const palettes: Array<[string, string, string, string]> = [
  ["#17152b", "#443777", "#b5a3ff", "#ffd29a"],
  ["#172a32", "#287082", "#92e1dd", "#f3cb87"],
  ["#322033", "#874c70", "#f0a9bd", "#ffd292"],
  ["#1c2940", "#375d91", "#9bc7ff", "#f5d48a"],
  ["#28271c", "#68633b", "#d5d08d", "#f2b789"],
];

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}

function titleLines(title: string) {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 20) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  if (lines.length > 2) lines.splice(1, lines.length - 1, `${lines[1].slice(0, 17)}…`);
  return lines.length ? lines : ["Free resource"];
}

function iconMarkup(kind: string, accent: string, light: string) {
  if (kind === "video") {
    return `<rect x="642" y="141" width="156" height="124" rx="28" fill="${accent}" fill-opacity=".2" stroke="${light}" stroke-opacity=".8" stroke-width="3"/><path d="m704 175 48 28-48 28z" fill="${light}"/><path d="M660 286h120" stroke="${accent}" stroke-width="8" stroke-linecap="round"/><circle cx="679" cy="286" r="5" fill="${light}"/><circle cx="709" cy="286" r="5" fill="${light}"/><circle cx="739" cy="286" r="5" fill="${light}"/>`;
  }
  if (kind === "design") {
    return `<path d="M720 133c-48 0-84 35-84 79 0 41 32 70 66 70h18c12 0 18-13 10-22l-8-9c-7-8-2-21 9-21h22c23 0 41-18 41-41 0-31-32-56-74-56Z" fill="${accent}" fill-opacity=".24" stroke="${light}" stroke-opacity=".82" stroke-width="3"/><circle cx="674" cy="197" r="8" fill="${light}"/><circle cx="705" cy="171" r="8" fill="${accent}"/><circle cx="744" cy="173" r="8" fill="${light}"/><circle cx="770" cy="201" r="8" fill="${accent}"/>`;
  }
  if (kind === "type") {
    return `<rect x="638" y="134" width="168" height="142" rx="25" fill="${accent}" fill-opacity=".2" stroke="${light}" stroke-opacity=".8" stroke-width="3"/><text x="722" y="229" text-anchor="middle" fill="${light}" font-family="Georgia,serif" font-size="63" font-weight="700">Aa</text>`;
  }
  if (kind === "planner") {
    return `<rect x="650" y="133" width="144" height="150" rx="24" fill="${accent}" fill-opacity=".2" stroke="${light}" stroke-opacity=".8" stroke-width="3"/><path d="m674 177 8 8 15-17m-23 51 8 8 15-17m-23 50 8 8 15-17" fill="none" stroke="${light}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M727 181h43m-43 42h43m-43 42h43" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (kind === "photo") {
    return `<rect x="640" y="137" width="164" height="138" rx="25" fill="${accent}" fill-opacity=".2" stroke="${light}" stroke-opacity=".8" stroke-width="3"/><circle cx="758" cy="174" r="12" fill="${light}"/><path d="m657 253 42-48 27 29 22-22 41 41z" fill="${accent}" stroke="${light}" stroke-opacity=".55" stroke-width="3"/>`;
  }
  if (kind === "ai") {
    return `<path d="M721 128 739 184l57 18-57 18-18 57-18-57-57-18 57-18z" fill="${accent}" fill-opacity=".4" stroke="${light}" stroke-opacity=".86" stroke-width="3"/><path d="m786 113 9 25 25 9-25 9-9 25-9-25-25-9 25-9z" fill="${light}"/><circle cx="653" cy="269" r="8" fill="${accent}"/>`;
  }
  return `<rect x="650" y="134" width="144" height="150" rx="24" fill="${accent}" fill-opacity=".2" stroke="${light}" stroke-opacity=".8" stroke-width="3"/><path d="M681 174h82M681 202h82M681 230h55m-55 26h68" stroke="${light}" stroke-width="6" stroke-linecap="round" opacity=".82"/><path d="M748 134v25h46" fill="${accent}" fill-opacity=".4" stroke="${light}" stroke-opacity=".8" stroke-width="3"/>`;
}

function illustrationKind(slug: string) {
  if (/video|shotcut|obs-|resolve|vlc|audacity/.test(slug)) return "video";
  if (/font|typography/.test(slug)) return "type";
  if (/productivity|planner|task/.test(slug)) return "planner";
  if (/photo|image|design|inkscape|canva|penpot|krita|gimp/.test(slug)) return "design";
  if (/pexels|media|stock/.test(slug)) return "photo";
  if (/ai|chatgpt|gemini|claude|notebooklm/.test(slug)) return "ai";
  return "document";
}

export function getFreeDownloadArtwork(title: string, format: string, slug: string) {
  const [background, foreground, accent, highlight] = palettes[hash(slug) % palettes.length];
  const wrappedTitle = titleLines(title);
  const lines = wrappedTitle.map((line, index) =>
    `<tspan x="62" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`,
  ).join("");
  const titleSize = Math.max(34, 48 - Math.max(0, ...wrappedTitle.map(line => line.length - 13)));
  const label = escapeXml((format || "FREE DIGITAL RESOURCE").toUpperCase());
  const safeSlug = hash(slug).toString(36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 460">
    <defs><linearGradient id="bg${safeSlug}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${foreground}"/></linearGradient><pattern id="grid${safeSlug}" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0v36" fill="none" stroke="#fff" stroke-opacity=".055"/></pattern><radialGradient id="glow${safeSlug}"><stop stop-color="${accent}" stop-opacity=".52"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
    <rect width="880" height="460" fill="url(#bg${safeSlug})"/><rect width="880" height="460" fill="url(#grid${safeSlug})"/>
    <circle cx="780" cy="62" r="206" fill="url(#glow${safeSlug})"/><circle cx="845" cy="392" r="149" fill="url(#glow${safeSlug})" opacity=".48"/>
    <path d="M535-20c72 49 111 126 116 221M557 12c48 42 72 96 77 161" fill="none" stroke="${highlight}" stroke-opacity=".15" stroke-width="2"/>
    <rect x="58" y="47" width="224" height="31" rx="15" fill="#fff" fill-opacity=".12"/>
    <circle cx="76" cy="62.5" r="4" fill="${highlight}"/><text x="90" y="67" fill="#fff" fill-opacity=".88" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">TASKDRIP · TOOL SPOTLIGHT</text>
    <text x="62" y="${wrappedTitle.length > 1 ? 193 : 226}" fill="#fff" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="-1">${lines}</text>
    <text x="64" y="354" fill="${highlight}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2">${label}</text>
    <path d="M64 382h90" stroke="${highlight}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <circle cx="722" cy="208" r="126" fill="#fff" fill-opacity=".055" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>
    <circle cx="722" cy="208" r="96" fill="#fff" fill-opacity=".045"/>
    ${iconMarkup(illustrationKind(slug), accent, highlight)}
    <circle cx="814" cy="95" r="8" fill="${highlight}"/><circle cx="626" cy="326" r="5" fill="${accent}"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
