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
const BOOK_AI_BASE_URL = process.env.BOOK_AI_BASE_URL?.trim().replace(/\/+$/, "");
const DEFAULT_BOOK_AI_MODEL = process.env.BOOK_AI_MODEL || (
  BOOK_AI_BASE_URL ? "llama3.3" : process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile"
);
const ART_MOTIFS = new Set<EbookArtMotif>(["botanical", "geometry", "orbit", "waves", "bible-scene"]);
const BIBLE_SCENES = ["creation", "noah", "moses", "david", "daniel", "jonah", "ruth", "esther", "nativity", "feeding", "samaritan", "resurrection", "abraham", "joseph", "samuel", "zacchaeus", "calming-storm", "welcoming-children", "lost-sheep", "bartimaeus"];

export function isBookDesignAIAvailable(config?: {
  provider?: "groq" | "openai-compatible" | "ollama";
  endpointUrl?: string;
}) {
  const provider = config?.provider || (BOOK_AI_BASE_URL ? "openai-compatible" : "groq");
  const endpointUrl = config?.endpointUrl || BOOK_AI_BASE_URL;
  if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (provider === "ollama") return Boolean(endpointUrl);
  return Boolean(endpointUrl && process.env.BOOK_AI_API_KEY);
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

function artBlock(motif: EbookArtMotif, altText: string, brief?: string, scene?: string, artMode: "line" | "color" = "line"): EbookDesignBlock {
  return { id: nanoid(), kind: "art", motif, altText, brief, ...(scene ? { scene } : {}), ...(motif === "bible-scene" ? { artMode } : {}) };
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
    planChapters: Array<{ summary: string; motif: EbookArtMotif; scene?: string; reference?: string }>;
    childrenBibleBook: boolean;
    includeParentNotes: boolean;
  },
): EbookDesignDocument {
  const pages: EbookDesignPage[] = [];
  const primaryMotif = input.planChapters[0]?.motif || "geometry";

  pages.push(createPage("cover", "Front cover", [
    artBlock(
      input.childrenBibleBook ? "bible-scene" : primaryMotif,
      input.childrenBibleBook ? "A welcoming Bible storybook family with friendly animals" : `Decorative ${primaryMotif} cover illustration`,
      "Editable vector cover art",
      input.childrenBibleBook ? "storybook-cover" : undefined,
      input.childrenBibleBook ? "color" : "line",
    ),
    textBlock("eyebrow", "AN ORIGINAL BOOK"),
    textBlock("title", input.title),
    ...(input.subtitle ? [textBlock("subtitle", input.subtitle)] : []),
    textBlock("caption", input.authorName || "Author name"),
  ]));

  pages.push(createPage("title", "Title page", [
    textBlock("title", input.title),
    ...(input.subtitle ? [textBlock("subtitle", input.subtitle)] : []),
    artBlock(
      input.childrenBibleBook ? "bible-scene" : "orbit",
      input.childrenBibleBook ? "Colorful Bible story illustration" : "Small ornamental title-page illustration",
      undefined,
      input.childrenBibleBook ? "storybook-cover" : undefined,
      input.childrenBibleBook ? "color" : "line",
    ),
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
    const motif = input.childrenBibleBook ? "bible-scene" : plan?.motif || (index % 2 ? "waves" : "botanical");
    const scene = BIBLE_SCENES.includes(plan?.scene || "") ? plan!.scene! : BIBLE_SCENES[index % BIBLE_SCENES.length];
    pages.push(createPage("chapter-opening", chapter.title, [
      textBlock("eyebrow", `CHAPTER ${index + 1}`),
      artBlock(
        motif,
        `${motif} illustration for ${chapter.title}`,
        plan?.summary,
        input.childrenBibleBook ? scene : undefined,
      ),
      textBlock("title", chapter.title),
      ...(plan?.summary ? [textBlock("quote", plan.summary.slice(0, 600))] : []),
    ], chapter.id));
    pages.push(createPage("chapter-body", `${chapter.title} — text`, [
      { id: nanoid(), kind: "chapter", chapterId: chapter.id },
    ], chapter.id));
    if (input.childrenBibleBook) {
      pages.push(createPage("parent-guide", `Scripture explorer: ${chapter.title}`, [
        textBlock("eyebrow", `OPEN THE BIBLE · STORY ${index + 1}`),
        textBlock("title", "Scripture explorer"),
        textBlock("heading", plan?.summary ? "Notice the story" : chapter.title),
        textBlock("heading", "Bible passage (verify before use)"),
        textBlock("body", plan?.reference || "Add and verify an appropriate Bible passage reference before publication."),
        textBlock("caption", "This original retelling is not a Bible quotation. Read the cited passage in the translation your family prefers."),
      ], chapter.id));
      if (input.includeParentNotes) {
        pages.push(createPage("parent-guide", `Read and talk: ${chapter.title}`, [
          textBlock("eyebrow", `GROWN-UP AND CHILD · ${chapter.title}`),
          textBlock("heading", "Talk about the story"),
          textBlock("body", "Read the cited Bible passage in the translation your family uses. Invite your child to share what they remember and how the characters may have felt. Check story details against your preferred Bible translation before publishing. Ask: What is one kind or courageous choice in this story?"),
          textBlock("heading", "Coloring invitation"),
          textBlock("body", "Choose colors together and describe one detail you notice in the scene."),
        ], chapter.id));
      }
      pages.push(createPage("parent-guide", `Story questions: ${chapter.title}`, [
        textBlock("eyebrow", "STORY CHECK"),
        textBlock("title", "Can you remember?"),
        { id: nanoid(), kind: "list", items: [
          `What is one important thing that happened in ${chapter.title}?`,
          `Which choice or action helped someone in this story?`,
          "What would you like to ask one of the characters?",
        ] },
      ], chapter.id));
      pages.push(createPage("coloring", `Color guide: ${chapter.title}`, [
        textBlock("eyebrow", `COLOR GUIDE · STORY ${index + 1}`),
        textBlock("title", "A bright example"),
        textBlock("caption", "Notice the colors and details, then make the next page your own."),
        artBlock("bible-scene", `Colored storybook example for ${chapter.title}`, "Bright color example for young artists.", scene, "color"),
      ], chapter.id));
      pages.push(createPage("coloring", `Coloring page: ${chapter.title}`, [
        textBlock("eyebrow", `STORY ${index + 1} · COLORING PAGE`),
        textBlock("title", chapter.title),
        artBlock("bible-scene", `Printable black-line illustration for ${chapter.title}`, "Original vector art for children to color.", scene, "line"),
      ], chapter.id));
      pages.push(createPage("parent-guide", `Family activity: ${chapter.title}`, [
        textBlock("eyebrow", "TRY THIS TOGETHER"),
        textBlock("title", "Story quest"),
        textBlock("body", `Draw your favorite moment from ${chapter.title}. Then choose one kind or courageous action from the story and try a safe, age-appropriate version together with a trusted grown-up.`),
        textBlock("heading", "My answer"),
        textBlock("body", "My favorite part was:\n\n________________________________________________\n\nOne kind thing I can try:\n\n________________________________________________"),
      ], chapter.id));
    }
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
  aiModel?: string;
  aiSettings?: {
    provider?: "groq" | "openai-compatible" | "ollama";
    endpointUrl?: string;
    childAgeBand?: string;
    includeParentNotes?: boolean;
    illustrationStyle?: string;
    generationPrompt?: string;
    toolPrompts?: Record<string, string>;
    toolSettings?: Record<string, { temperature: number; maxTokens: number }>;
  };
  onProgress: BookGenerationProgress;
}): Promise<GeneratedBook> {
  const provider = input.aiSettings?.provider || (BOOK_AI_BASE_URL ? "openai-compatible" : "groq");
  const endpointUrl = input.aiSettings?.endpointUrl || BOOK_AI_BASE_URL;
  const apiKey = provider === "groq"
    ? process.env.GROQ_API_KEY
    : provider === "ollama"
      ? (process.env.BOOK_AI_API_KEY || "ollama")
      : process.env.BOOK_AI_API_KEY;
  const baseURL = provider === "groq" ? GROQ_API_BASE_URL : endpointUrl;
  if (!apiKey || !baseURL) throw new Error("Configure an AI provider endpoint and deployment API key, or use a reachable Ollama-compatible endpoint.");
  const client = new OpenAI({ apiKey, baseURL });
  const model = input.aiModel || DEFAULT_BOOK_AI_MODEL;
  const aiSettings = input.aiSettings || {};
  const childrenBibleBook = input.bookType === "children" && /bible|christian|faith|scripture/i.test(`${input.genre} ${input.prompt}`);
  const studioGuidance = [aiSettings.generationPrompt, aiSettings.toolPrompts?.["complete-book"]].filter(Boolean).join("\n\n");
  const completeBookSettings = aiSettings.toolSettings?.["complete-book"];

  await input.onProgress(4, "Designing the book outline and visual theme");
  const planning = await client.chat.completions.create({
    model,
    temperature: completeBookSettings?.temperature ?? 0.55,
    max_tokens: completeBookSettings?.maxTokens ?? 3600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an experienced book editor and interior designer. Plan an original, useful, reader-ready book from the author's brief. Respect the exact requested chapter count. Never promise bestseller status. Do not invent studies, citations, expert credentials, legal/medical/financial advice, or quotations. Use general, clearly framed explanations where sources are not supplied. Create accessible visual design directions using only a JSON theme and motif names; never output SVG, HTML, or executable code. Respond with JSON only in this shape:
{"title":"...","subtitle":"...","description":"...","theme":{"name":"...","primary":"#RRGGBB","accent":"#RRGGBB","paper":"#RRGGBB","text":"#RRGGBB","headingFont":"serif|sans","bodyFont":"serif|sans"},"chapters":[{"title":"...","summary":"...","reference":"verified user-supplied passage or clearly marked placeholder","motif":"botanical|geometry|orbit|waves|bible-scene","scene":"${BIBLE_SCENES.join("|")}"}]}
${childrenBibleBook ? `For this children's Bible book, use gentle language for ages ${aiSettings.childAgeBand || "6–8"}. Follow only Bible passages specified by the author; never invent or fabricate a Bible reference, and never present invented dialogue as a Bible quotation. If no reference is supplied, set reference to "[Add and verify Bible passage reference]". Give each chapter one matching scene identifier from the listed options. ${aiSettings.includeParentNotes === false ? "Do not include parent-guide material." : "Make the book suitable for a child and a reading adult."}` : ""}
The description must be reader-focused, under 3500 characters. Titles should be clear and not include unsupported claims.
${studioGuidance}`.slice(0, 8000),
      },
      {
        role: "user",
        content: `Author prompt:\n${input.prompt}\n\nBook type: ${input.bookType}\nReader niche: ${input.genre}\nPrint trim size: ${input.trimSize}\nTarget chapter count: exactly ${input.chapterCount}\nIllustration direction: ${aiSettings.illustrationStyle || "clean, accessible, editable vector art"}\n${input.title ? `Use this working title as inspiration: ${input.title}` : ""}`,
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

  const planChapters: Array<{ title: string; summary: string; motif: EbookArtMotif; scene?: string; reference?: string }> = rawChapters.map((item: any, index: number) => ({
    title: String(item.title || `Chapter ${index + 1}`).trim().slice(0, 180),
    summary: String(item.summary || "").trim().slice(0, 600),
    motif: ART_MOTIFS.has(item.motif) ? item.motif as EbookArtMotif : (index % 2 ? "waves" : "geometry") as EbookArtMotif,
    ...(childrenBibleBook && typeof item.reference === "string" ? { reference: item.reference.trim().slice(0, 120) } : {}),
    ...(BIBLE_SCENES.includes(String(item.scene || "")) ? { scene: String(item.scene) } : {}),
  }));
  const title = String(plan.title || input.title || "Untitled book").trim().slice(0, 240);
  const subtitle = String(plan.subtitle || "").trim().slice(0, 300);
  const description = String(plan.description || "").trim().slice(0, 3500);
  const theme = makeTheme(plan.theme);
  const outline: string[] = planChapters.map((chapter) => `${chapter.title}${chapter.summary ? ` — ${chapter.summary}` : ""}`);

  const chapters: GeneratedBook["chapters"] = [];
  for (let index = 0; index < planChapters.length; index += 1) {
    const planned = planChapters[index];
    const percentBefore = 10 + Math.round((index / planChapters.length) * 75);
    await input.onProgress(percentBefore, `Writing chapter ${index + 1} of ${planChapters.length}`);
    const chapterResponse = await client.chat.completions.create({
      model,
      temperature: completeBookSettings?.temperature ?? 0.65,
      max_tokens: completeBookSettings?.maxTokens ?? 2400,
      messages: [
        {
          role: "system",
          content: `${childrenBibleBook
            ? `Write an original, gentle Bible-story retelling of about 130–190 words for children ages ${aiSettings.childAgeBand || "6–8"}. Follow the cited passage described by the author. Never invent a Bible quotation or present invented dialogue as scripture. Avoid frightening graphic detail. ${aiSettings.includeParentNotes === false ? "" : "Finish with one short paragraph clearly labeled “Grown-up note” that suggests checking the passage and asking the child a gentle question."}`
            : `Write a complete, useful first-draft book chapter in 600–800 words. This is part of an original ${input.bookType} book. Use clear section headings, readable paragraphs, and concrete examples. Follow the brief and chapter summary. Avoid repetition of other chapters. Never fabricate research, citations, quotations, expert credentials, or guaranteed results.`}
Do not add markdown code fences. The author will review and edit the draft.
${[aiSettings.generationPrompt, aiSettings.toolPrompts?.chapter].filter(Boolean).join("\n\n")}`.slice(0, 6000),
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
    childrenBibleBook,
    includeParentNotes: aiSettings.includeParentNotes !== false,
  });
  return { title, subtitle, description, outline, chapters, designerDocument };
}
