import OpenAI from "openai";
import { nanoid } from "nanoid";
import {
  DEFAULT_EBOOK_THEME,
  type EbookArtMotif,
  type EbookDesignBlock,
  type EbookDesignDocument,
  type EbookDesignPage,
  type EbookDesignTheme,
} from "@shared/ebook-design";

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const ART_MOTIFS = new Set<EbookArtMotif>(["botanical", "geometry", "orbit", "waves"]);

export function isBookDesignAIAvailable() {
  return Boolean(process.env.GROQ_API_KEY);
}

export type GeneratedBook = {
  title: string;
  subtitle: string;
  description: string;
  outline: string[];
  chapters: Array<{ id: string; title: string; content: string }>;
  designerDocument: EbookDesignDocument;
};

export type BookGenerationProgress = (percent: number, message: string) => Promise<void>;

function themeColor(value: unknown, fallback: string) {
  const color = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function parseModelJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The book model returned invalid structured output. Try again.");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function createPage(kind: EbookDesignPage["kind"], title: string, blocks: EbookDesignBlock[], chapterId?: string): EbookDesignPage {
  return { id: nanoid(), kind, title, chapterId, blocks };
}

function textBlock(role: Extract<EbookDesignBlock, { kind: "text" }>["role"], text: string): EbookDesignBlock {
  return { id: nanoid(), kind: "text", role, text };
}

function artBlock(motif: EbookArtMotif, altText: string, brief?: string): EbookDesignBlock {
  return { id: nanoid(), kind: "art", motif, altText, brief };
}

function makeTheme(raw: any): EbookDesignTheme {
  const headingFont = raw?.headingFont === "sans" ? "sans" : "serif";
  const bodyFont = raw?.bodyFont === "sans" ? "sans" : "serif";
  return {
    name: String(raw?.name || "Classic editorial").slice(0, 60),
    primary: themeColor(raw?.primary, DEFAULT_EBOOK_THEME.primary),
    accent: themeColor(raw?.accent, DEFAULT_EBOOK_THEME.accent),
    paper: themeColor(raw?.paper, DEFAULT_EBOOK_THEME.paper),
    text: themeColor(raw?.text, DEFAULT_EBOOK_THEME.text),
    headingFont,
    bodyFont,
  };
}

function buildDesignerDocument(
  input: {
    prompt: string;
    title: string;
    subtitle: string;
    description: string;
    authorName: string;
    theme: EbookDesignTheme;
    chapters: GeneratedBook["chapters"];
    planChapters: Array<{ summary: string; motif: EbookArtMotif }>;
  },
): EbookDesignDocument {
  const pages: EbookDesignPage[] = [];
  const primaryMotif = input.planChapters[0]?.motif || "geometry";

  pages.push(createPage("cover", "Front cover", [
    artBlock(primaryMotif, `Decorative ${primaryMotif} cover illustration`, "Editable vector cover art"),
    textBlock("eyebrow", "AN ORIGINAL BOOK"),
    textBlock("title", input.title),
    ...(input.subtitle ? [textBlock("subtitle", input.subtitle)] : []),
    textBlock("caption", input.authorName || "Author name"),
  ]));

  pages.push(createPage("title", "Title page", [
    textBlock("title", input.title),
    ...(input.subtitle ? [textBlock("subtitle", input.subtitle)] : []),
    artBlock("orbit", "Small ornamental title-page illustration"),
    textBlock("caption", input.authorName || "Author name"),
  ]));

  pages.push(createPage("copyright", "Copyright", [
    textBlock("heading", "Copyright"),
    textBlock("body", `Copyright © ${new Date().getFullYear()} ${input.authorName || "[Author name]"}\nAll rights reserved.\n\nAdd publisher, edition, permissions, and ISBN details here before publication.`),
  ]));

  pages.push(createPage("contents", "Contents", [
    textBlock("heading", "Contents"),
    { id: nanoid(), kind: "contents" },
  ]));

  input.chapters.forEach((chapter, index) => {
    const plan = input.planChapters[index];
    const motif = plan?.motif || (index % 2 ? "waves" : "botanical");
    pages.push(createPage("chapter-opening", chapter.title, [
      textBlock("eyebrow", `CHAPTER ${index + 1}`),
      artBlock(motif, `${motif} illustration for ${chapter.title}`, plan?.summary),
      textBlock("title", chapter.title),
      ...(plan?.summary ? [textBlock("quote", plan.summary.slice(0, 600))] : []),
    ], chapter.id));
    pages.push(createPage("chapter-body", `${chapter.title} — text`, [
      { id: nanoid(), kind: "chapter", chapterId: chapter.id },
    ], chapter.id));
  });

  pages.push(createPage("backmatter", "About the author", [
    artBlock("botanical", "Decorative author-page illustration"),
    textBlock("heading", "About the author"),
    textBlock("body", "Add a short, accurate author biography here."),
    textBlock("heading", "More from the author"),
    textBlock("body", "Add your website, newsletter, and other titles here."),
  ]));

  return {
    schemaVersion: 1,
    prompt: input.prompt.slice(0, 5000),
    theme: input.theme,
    pages,
  };
}

export async function generateCompleteBook(input: {
  prompt: string;
  title?: string;
  bookType: string;
  genre: string;
  trimSize: string;
  authorName: string;
  chapterCount: number;
  onProgress: BookGenerationProgress;
}): Promise<GeneratedBook> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured in Replit Secrets.");
  const client = new OpenAI({ apiKey, baseURL: GROQ_API_BASE_URL });

  await input.onProgress(4, "Designing the book outline and visual theme");
  const planning = await client.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    temperature: 0.55,
    max_tokens: 3600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an experienced book editor and interior designer. Plan an original, useful, reader-ready book from the author's brief. Respect the exact requested chapter count. Never promise bestseller status. Do not invent studies, citations, expert credentials, legal/medical/financial advice, or quotations. Use general, clearly framed explanations where sources are not supplied. Create accessible visual design directions using only a JSON theme and motif names; never output SVG, HTML, or executable code. Respond with JSON only in this shape:
{"title":"...","subtitle":"...","description":"...","theme":{"name":"...","primary":"#RRGGBB","accent":"#RRGGBB","paper":"#RRGGBB","text":"#RRGGBB","headingFont":"serif|sans","bodyFont":"serif|sans"},"chapters":[{"title":"...","summary":"...","motif":"botanical|geometry|orbit|waves"}]}
The description must be reader-focused, under 3500 characters. Titles should be clear and not include unsupported claims.`,
      },
      {
        role: "user",
        content: `Author prompt:\n${input.prompt}\n\nBook type: ${input.bookType}\nReader niche: ${input.genre}\nPrint trim size: ${input.trimSize}\nTarget chapter count: exactly ${input.chapterCount}\n${input.title ? `Use this working title as inspiration: ${input.title}` : ""}`,
      },
    ],
  });

  const plan = parseModelJson(planning.choices[0]?.message?.content || "{}");
  const rawChapters = Array.isArray(plan.chapters) ? plan.chapters.slice(0, input.chapterCount) : [];
  if (rawChapters.length < Math.min(4, input.chapterCount)) {
    throw new Error("The book model returned too few chapters. Try generating again with a more specific prompt.");
  }

  while (rawChapters.length < input.chapterCount) {
    const index = rawChapters.length;
    rawChapters.push({
      title: `Chapter ${index + 1}: ${input.genre}`,
      summary: `A practical continuation of the book's central idea: ${input.prompt.slice(0, 160)}`,
      motif: index % 2 ? "waves" : "geometry",
    });
  }

  const planChapters = rawChapters.map((item: any, index: number) => ({
    title: String(item.title || `Chapter ${index + 1}`).trim().slice(0, 180),
    summary: String(item.summary || "").trim().slice(0, 600),
    motif: ART_MOTIFS.has(item.motif) ? item.motif as EbookArtMotif : (index % 2 ? "waves" : "geometry") as EbookArtMotif,
  }));
  const title = String(plan.title || input.title || "Untitled book").trim().slice(0, 240);
  const subtitle = String(plan.subtitle || "").trim().slice(0, 300);
  const description = String(plan.description || "").trim().slice(0, 3500);
  const theme = makeTheme(plan.theme);
  const outline = planChapters.map((chapter) => `${chapter.title}${chapter.summary ? ` — ${chapter.summary}` : ""}`);

  const chapters: GeneratedBook["chapters"] = [];
  for (let index = 0; index < planChapters.length; index += 1) {
    const planned = planChapters[index];
    const percentBefore = 10 + Math.round((index / planChapters.length) * 75);
    await input.onProgress(percentBefore, `Writing chapter ${index + 1} of ${planChapters.length}`);
    const chapterResponse = await client.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0.65,
      max_tokens: 2400,
      messages: [
        {
          role: "system",
          content: `Write a complete, useful first-draft book chapter in 600–800 words. This is part of an original ${input.bookType} book. Use clear section headings, readable paragraphs, and concrete examples. Follow the brief and chapter summary. Avoid repetition of other chapters. Never fabricate research, citations, quotations, expert credentials, or guaranteed results. Do not add markdown code fences. The author will review and edit the draft.`,
        },
        {
          role: "user",
          content: `Book idea: ${input.prompt}\nReader niche: ${input.genre}\nFull outline:\n${outline.map((line, i) => `${i + 1}. ${line}`).join("\n")}\n\nWrite chapter ${index + 1}: ${planned.title}\nPurpose: ${planned.summary}`,
        },
      ],
    });
    const content = chapterResponse.choices[0]?.message?.content?.trim();
    if (!content || content.length < 450) {
      throw new Error(`The model returned an incomplete draft for chapter ${index + 1}. The earlier manuscript was left unchanged.`);
    }
    chapters.push({ id: nanoid(), title: planned.title, content });
  }

  await input.onProgress(92, "Building editable page designs and vector illustrations");
  const designerDocument = buildDesignerDocument({
    prompt: input.prompt,
    title,
    subtitle,
    description,
    authorName: input.authorName,
    theme,
    chapters,
    planChapters,
  });
  return { title, subtitle, description, outline, chapters, designerDocument };
}
