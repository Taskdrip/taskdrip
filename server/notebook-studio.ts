import type { Express, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import multer from "multer";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { creatorNotebookProjects } from "@shared/schema";
import {
  DEFAULT_NOTEBOOK_COVER,
  DEFAULT_NOTEBOOK_SETTINGS,
  normalizeNotebookLineSpacing,
  NOTEBOOK_INTRO_PAGE_OPTIONS,
  NOTEBOOK_OUTRO_PAGE_OPTIONS,
  DEFAULT_NOTEBOOK_PAGE_COPY,
  NOTEBOOK_2027_PLANNER_PAGE_COUNT,
  notebookPageArtKey,
  notebookPrintArtPixels,
  currentNotebookDiaryStartMonth,
  notebookDiaryPageCount,
  notebookTotalPageCount,
  type NotebookIntroPageType,
  type NotebookOutroPageType,
  type NotebookPageArtGroup,
  type NotebookCoverDesign,
  type NotebookSettings,
} from "@shared/notebook-studio";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import {
  createNotebookCoverPdf,
  createNotebookCoverSvg,
  createNotebookInteriorPdf,
  createPlanner2027PagePreview,
  inspectNotebookPageImage,
  prependPlanner2027Pages,
  validateNotebook,
} from "./notebook-pdf";

const PROJECT_FILES_DIR = path.resolve(process.cwd(), ".private-notebook-files");
const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const TASKDRIP_2027_PLANNER_PDF = path.resolve(process.cwd(), "attached_assets/taskdrip_2027_Notebook_Journal_1792270834126.pdf");
const pageArtUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});
const ADMIN_ROLES = new Set(["admin", "store_manager", "moderator", "content_editor"]);
const BINDINGS = new Set(["paperback", "hardcover", "spiral"]);
const INKS = new Set(["black", "color"]);
const PAPERS = new Set(["white", "cream"]);
const LINE_STYLES = new Set([
  "classic", "wide", "college", "minimalist", "lined-journal", "business", "daily", "diary", "meeting",
  "study", "dot", "graph", "premium", "custom",
]);
const COVER_STYLES = new Set([
  "minimal", "botanical", "geometric", "technology", "business", "space",
  "education", "luxury", "colorful",
]);
const TRIM_PRESETS = new Set([
  "5x8", "5.5x8.5", "6x9", "8.27x11.69",
]);

function isPublishingAdmin(user: any) {
  return user?.userType === "admin" || ADMIN_ROLES.has(user?.role);
}

function requirePublishingAdmin(req: any, res: Response, next: any) {
  if (!req.isAuthenticated?.() || !req.user?.id) {
    return res.status(401).json({ message: "Sign in to use Notebook Studio." });
  }
  if (!isPublishingAdmin(req.user)) {
    return res.status(403).json({ message: "Publishing admin access required." });
  }
  next();
}

function cleanText(value: unknown, max: number, fallback = "") {
  return String(value ?? fallback).replace(/\u0000/g, "").trim().slice(0, max);
}

const NOTEBOOK_PAGE_ART_KEYS = new Set([
  ...NOTEBOOK_INTRO_PAGE_OPTIONS.map((page) => notebookPageArtKey("intro", page.value)),
  ...NOTEBOOK_OUTRO_PAGE_OPTIONS.map((page) => notebookPageArtKey("outro", page.value)),
]);

function normalizePageCopy(input: unknown, previous: NotebookSettings["pageCopy"]) {
  if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) {
    throw Object.assign(new Error("Page copy must be an object."), { statusCode: 400 });
  }
  const source = input as Record<string, any> | undefined;
  return Object.fromEntries(Object.entries(DEFAULT_NOTEBOOK_PAGE_COPY).map(([key, defaults]) => {
    const value = source?.[key];
    const saved = previous?.[key] || defaults;
    if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw Object.assign(new Error(`Copy for ${key} must be an object.`), { statusCode: 400 });
    }
    const prompts = value?.prompts ?? saved.prompts ?? defaults.prompts;
    if (!Array.isArray(prompts) || prompts.length > 8) {
      throw Object.assign(new Error(`Prompts for ${key} must be a list of up to eight lines.`), { statusCode: 400 });
    }
    return [key, {
      title: cleanText(value?.title ?? saved.title ?? defaults.title, 100),
      subtitle: cleanText(value?.subtitle ?? saved.subtitle ?? defaults.subtitle, 300),
      prompts: prompts.map((prompt: unknown) => cleanText(prompt, 120)).filter(Boolean),
    }];
  }));
}

function normalizePageArtwork(input: unknown, previous: NotebookSettings["pageArtwork"]) {
  if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) {
    throw Object.assign(new Error("Page artwork references must be an object."), { statusCode: 400 });
  }
  const source = input as Record<string, unknown> | undefined;
  const artwork: Record<string, string> = {};
  for (const [key, rawFilename] of Object.entries(source ?? previous ?? {})) {
    if (!NOTEBOOK_PAGE_ART_KEYS.has(key)) continue;
    const filename = cleanText(rawFilename, 100);
    if (!new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(?:png|jpe?g)$`, "i").test(filename)) {
      throw Object.assign(new Error(`The uploaded image reference for ${key} is invalid.`), { statusCode: 400 });
    }
    artwork[key] = filename;
  }
  return artwork;
}

function normalizeReferenceEntries<T>(
  value: unknown,
  fields: Record<keyof T, number>,
  label: string,
  limit: number,
): T[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw Object.assign(new Error(`${label} must be a list of up to ${limit} entries.`), { statusCode: 400 });
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw Object.assign(new Error(`${label} entry ${index + 1} must be an object.`), { statusCode: 400 });
    }
    const cleaned = Object.fromEntries(
      Object.entries(fields as Record<string, number>).map(([key, max]) => [key, cleanText((entry as Record<string, unknown>)[key], max)]),
    ) as T;
    for (const key of ["date", "checkedDate"]) {
      const date = (cleaned as Record<string, string>)[key];
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw Object.assign(new Error(`${label} dates must use YYYY-MM-DD format.`), { statusCode: 400 });
      }
    }
    return cleaned;
  }).filter((entry) => Object.values(entry as Record<string, string>).some(Boolean));
}

function normalizeSettings(input: unknown, previous: NotebookSettings = DEFAULT_NOTEBOOK_SETTINGS): NotebookSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Notebook settings must be an object."), { statusCode: 400 });
  }
  const raw = input as Record<string, any>;
  const settings = { ...previous };
  settings.use2027PlannerPdf = raw.use2027PlannerPdf === undefined
    ? Boolean(previous.use2027PlannerPdf)
    : raw.use2027PlannerPdf === true;
  settings.pageCopy = normalizePageCopy(raw.pageCopy, previous.pageCopy || DEFAULT_NOTEBOOK_PAGE_COPY);
  settings.pageArtwork = normalizePageArtwork(raw.pageArtwork, previous.pageArtwork || {});
  settings.lineSpacing = normalizeNotebookLineSpacing(raw.lineSpacing ?? previous.lineSpacing);
  if (raw.subtitle !== undefined) settings.subtitle = cleanText(raw.subtitle, 300);
  if (raw.authorName !== undefined) settings.authorName = cleanText(raw.authorName, 160);
  if (raw.seriesName !== undefined) settings.seriesName = cleanText(raw.seriesName, 160);
  if (raw.pageCount !== undefined) {
    const pages = Number(raw.pageCount);
    if (!Number.isInteger(pages) || pages < 1 || pages > 828) {
      throw Object.assign(new Error("Choose a whole-number page count from 1 to 828. KDP restrictions are shown in validation."), { statusCode: 400 });
    }
    settings.pageCount = pages;
  }
  if (raw.trimSize !== undefined) {
    const trim = String(raw.trimSize);
    if (trim !== "custom" && !TRIM_PRESETS.has(trim)) {
      throw Object.assign(new Error("Choose a listed trim size or use the custom size option."), { statusCode: 400 });
    }
    settings.trimSize = trim;
  }
  for (const key of ["customWidth", "customHeight"] as const) {
    if (raw[key] !== undefined) {
      const value = Number(raw[key]);
      if (!Number.isFinite(value) || value < 4 || value > 11.69) {
        throw Object.assign(new Error("Custom trim dimensions must be between 4 and 11.69 inches."), { statusCode: 400 });
      }
      settings[key] = value;
    }
  }
  if (raw.binding !== undefined) {
    if (!BINDINGS.has(String(raw.binding))) throw Object.assign(new Error("Choose paperback, hardcover, or spiral binding."), { statusCode: 400 });
    settings.binding = raw.binding;
  }
  if (raw.ink !== undefined) {
    if (!INKS.has(String(raw.ink))) throw Object.assign(new Error("Choose black or premium color interior ink."), { statusCode: 400 });
    settings.ink = raw.ink;
  }
  if (raw.paper !== undefined) {
    if (!PAPERS.has(String(raw.paper))) throw Object.assign(new Error("Choose white or cream paper."), { statusCode: 400 });
    settings.paper = raw.paper;
  }
  if (settings.ink === "color" && settings.paper === "cream") {
    throw Object.assign(new Error("Color interiors use white paper. Choose white paper or switch the ink to black."), { statusCode: 400 });
  }
  if (raw.bleed !== undefined) settings.bleed = raw.bleed === true;
  if (raw.lineStyle !== undefined) {
    if (!LINE_STYLES.has(String(raw.lineStyle))) throw Object.assign(new Error("Choose a supported notebook interior style."), { statusCode: 400 });
    settings.lineStyle = raw.lineStyle;
  }
  if (raw.introPages !== undefined) {
    if (!Array.isArray(raw.introPages)) {
      throw Object.assign(new Error("Choose introductory page designs from the available list."), { statusCode: 400 });
    }
    const allowedIntroPages = new Set<string>(NOTEBOOK_INTRO_PAGE_OPTIONS.map((option) => option.value));
    const requested = raw.introPages.map(String);
    if (requested.some((page) => !allowedIntroPages.has(page)) || new Set(requested).size !== requested.length) {
      throw Object.assign(new Error("One or more introductory page designs are not supported."), { statusCode: 400 });
    }
    settings.introPages = requested as NotebookSettings["introPages"];
  }
  if (raw.outroPages !== undefined) {
    if (!Array.isArray(raw.outroPages)) {
      throw Object.assign(new Error("Choose closing page designs from the available list."), { statusCode: 400 });
    }
    const allowedOutroPages = new Set<string>(NOTEBOOK_OUTRO_PAGE_OPTIONS.map((option) => option.value));
    const requested = raw.outroPages.map(String);
    if (requested.some((page) => !allowedOutroPages.has(page)) || new Set(requested).size !== requested.length) {
      throw Object.assign(new Error("One or more closing page designs are not supported."), { statusCode: 400 });
    }
    settings.outroPages = requested as NotebookSettings["outroPages"];
  }
  for (const key of ["frontBlankPageCount", "backBlankPageCount"] as const) {
    if (raw[key] !== undefined) {
      const count = Number(raw[key]);
      if (!Number.isInteger(count) || count < 0 || count > 12) {
        throw Object.assign(new Error("Choose between 0 and 12 blank pages for each end of the notebook."), { statusCode: 400 });
      }
      settings[key] = count;
    }
  }
  if (raw.worldLeaderEntries !== undefined) {
    settings.worldLeaderEntries = normalizeReferenceEntries<NotebookSettings["worldLeaderEntries"][number]>(
      raw.worldLeaderEntries,
      { country: 100, leader: 120, office: 100, checkedDate: 10, source: 240 },
      "World leader references",
      8,
    );
  }
  if (raw.currentAffairsEntries !== undefined) {
    settings.currentAffairsEntries = normalizeReferenceEntries<NotebookSettings["currentAffairsEntries"][number]>(
      raw.currentAffairsEntries,
      { headline: 180, date: 10, location: 100, source: 240, whyItMatters: 220 },
      "Current affairs references",
      4,
    );
  }
  if (raw.diaryStartMonth !== undefined) {
    const startMonth = String(raw.diaryStartMonth);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !notebookDiaryPageCount(startMonth)) {
      throw Object.assign(new Error("Choose a diary start month on or before December 2027."), { statusCode: 400 });
    }
    settings.diaryStartMonth = startMonth;
  } else if (settings.lineStyle === "diary" && !settings.diaryStartMonth) {
    settings.diaryStartMonth = currentNotebookDiaryStartMonth();
  }
  if (settings.lineStyle === "diary") {
    const diaryPages = notebookDiaryPageCount(settings.diaryStartMonth);
    if (!diaryPages || diaryPages > 828) {
      throw Object.assign(new Error("The dated diary must contain between 1 and 828 pages."), { statusCode: 400 });
    }
    settings.pageCount = diaryPages;
    settings.ownershipPage = false;
  }
  if (raw.lineSpacing !== undefined) {
    const value = Number(raw.lineSpacing);
    if (!Number.isFinite(value) || value < 0.16 || value > 0.75) {
      throw Object.assign(new Error("Line spacing must be between 0.16 and 0.75 inches."), { statusCode: 400 });
    }
    settings.lineSpacing = value;
  }
  if (raw.lineThickness !== undefined) {
    const value = Number(raw.lineThickness);
    if (!Number.isFinite(value) || value < 0.2 || value > 3) {
      throw Object.assign(new Error("Line thickness must be between 0.2 and 3 points."), { statusCode: 400 });
    }
    settings.lineThickness = value;
  }
  if (raw.lineColor !== undefined) {
    if (!/^#[0-9a-f]{6}$/i.test(String(raw.lineColor))) throw Object.assign(new Error("Use a valid six-digit line color."), { statusCode: 400 });
    settings.lineColor = String(raw.lineColor);
  }
  for (const key of ["showPageNumbers", "ownershipPage", "showDateField", "showSubjectField"] as const) {
    if (raw[key] !== undefined) settings[key] = raw[key] === true;
  }
  if (raw.headerText !== undefined) settings.headerText = cleanText(raw.headerText, 100);
  if (raw.footerText !== undefined) settings.footerText = cleanText(raw.footerText, 100);
  return settings;
}

async function uploadedCoverExists(url: string) {
  if (!url) return true;
  const match = url.match(/^\/uploads\/([A-Za-z0-9_-]{16,80}\.(?:png|jpe?g))$/i);
  if (!match) return false;
  const fullPath = path.resolve(PUBLIC_UPLOADS_DIR, match[1]);
  if (!fullPath.startsWith(`${PUBLIC_UPLOADS_DIR}${path.sep}`)) return false;
  try {
    const bytes = await readFile(fullPath);
    const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return (match[1].toLowerCase().endsWith(".png") && isPng)
      || (/\.(?:jpe?g)$/i.test(match[1]) && isJpeg);
  } catch {
    return false;
  }
}

async function normalizeCover(input: unknown, previous: NotebookCoverDesign = DEFAULT_NOTEBOOK_COVER): Promise<NotebookCoverDesign> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Cover design must be an object."), { statusCode: 400 });
  }
  const raw = input as Record<string, any>;
  const cover = { ...previous };
  if (raw.style !== undefined) {
    if (!COVER_STYLES.has(String(raw.style))) throw Object.assign(new Error("Choose a supported cover theme."), { statusCode: 400 });
    cover.style = raw.style;
  }
  for (const key of ["background", "accent"] as const) {
    if (raw[key] !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(String(raw[key]))) throw Object.assign(new Error("Cover colors must use valid six-digit hex values."), { statusCode: 400 });
      cover[key] = String(raw[key]);
    }
  }
  if (raw.description !== undefined) cover.description = cleanText(raw.description, 600);
  if (raw.backDescription !== undefined) cover.backDescription = cleanText(raw.backDescription, 1200);
  if (raw.frontImageUrl !== undefined) {
    const url = cleanText(raw.frontImageUrl, 240);
    if (url && !await uploadedCoverExists(url)) {
      throw Object.assign(new Error("Upload a valid PNG or JPEG cover image using the cover editor."), { statusCode: 400 });
    }
    cover.frontImageUrl = url;
  }
  return cover;
}

function safeTitleFileName(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75) || "notebook";
}

function projectDirectory(id: string) {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) throw Object.assign(new Error("Invalid project id."), { statusCode: 400 });
  return path.join(PROJECT_FILES_DIR, id);
}

function filePath(id: string, kind: "interior" | "cover") {
  return path.join(projectDirectory(id), `${kind}.pdf`);
}

function pageArtDirectory(id: string) {
  return path.join(projectDirectory(id), "page-art");
}

function pageArtPath(id: string, key: string, filename: string) {
  if (!NOTEBOOK_PAGE_ART_KEYS.has(key) || !new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(?:png|jpe?g)$`, "i").test(filename)) {
    throw Object.assign(new Error("Invalid notebook page artwork reference."), { statusCode: 400 });
  }
  const directory = pageArtDirectory(id);
  const target = path.resolve(directory, filename);
  if (!target.startsWith(`${directory}${path.sep}`)) {
    throw Object.assign(new Error("Invalid notebook page artwork path."), { statusCode: 400 });
  }
  return target;
}

function serialize(row: any) {
  return {
    ...row,
    generatedInteriorKey: row.interiorFileKey || null,
    generatedCoverKey: row.coverFileKey || null,
    previewFileKey: row.previewFileKey || null,
  };
}

async function getOwnedProject(id: string, ownerId: string) {
  const [project] = await db.select().from(creatorNotebookProjects)
    .where(and(eq(creatorNotebookProjects.id, id), eq(creatorNotebookProjects.ownerId, ownerId)))
    .limit(1);
  return project;
}

async function exists(file: string) {
  try {
    const info = await stat(file);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function readTaskdrip2027PlannerPdf() {
  try {
    return await readFile(TASKDRIP_2027_PLANNER_PDF);
  } catch {
    throw Object.assign(new Error("The supplied 2027 planner PDF is unavailable in this app build."), { statusCode: 503 });
  }
}

function report(project: any, files?: { interiorExists: boolean; coverExists: boolean; plannerPdfAvailable?: boolean }) {
  return validateNotebook(
    project.title,
    project.settings as NotebookSettings,
    files || { interiorExists: Boolean(project.interiorFileKey), coverExists: Boolean(project.coverFileKey) },
  );
}

async function sendProjectFile(res: Response, file: string, title: string, extension: string, inline = false) {
  if (!await exists(file)) return res.status(404).json({ message: "Generate this file before downloading it." });
  res.setHeader("Content-Type", extension === "pdf" ? "application/pdf" : extension === "svg" ? "image/svg+xml; charset=utf-8" : "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeTitleFileName(title)}.${extension}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(file);
}

export function registerNotebookStudioRoutes(app: Express) {
  const base = "/api/admin/creator-studio/notebooks";

  app.get(base, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const projects = await db.select().from(creatorNotebookProjects)
        .where(eq(creatorNotebookProjects.ownerId, req.user.id))
        .orderBy(desc(creatorNotebookProjects.updatedAt));
      res.json(projects.map(serialize));
    } catch (error) {
      console.error("[notebook-studio] Could not list projects:", error);
      res.status(500).json({ message: "Could not load notebook projects." });
    }
  });

  app.post(base, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const title = cleanText(req.body?.title, 240, "Untitled notebook") || "Untitled notebook";
      const [project] = await db.insert(creatorNotebookProjects).values({
        ownerId: req.user.id,
        title,
        settings: normalizeSettings({
          ...DEFAULT_NOTEBOOK_SETTINGS,
          ...req.body?.settings,
          authorName: cleanText(`${req.user.firstName || ""} ${req.user.lastName || ""}`, 160),
        }),
        coverDesign: await normalizeCover(req.body?.coverDesign || DEFAULT_NOTEBOOK_COVER),
      }).returning();
      res.status(201).json(serialize(project));
    } catch (error) {
      if ((error as any)?.statusCode) return res.status((error as any).statusCode).json({ message: (error as any).message });
      console.error("[notebook-studio] Could not create project:", error);
      res.status(500).json({ message: "Could not create a notebook project." });
    }
  });

  app.get(`${base}/:id`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      res.json(serialize(project));
    } catch (error) {
      console.error("[notebook-studio] Could not load project:", error);
      res.status(500).json({ message: "Could not load this notebook project." });
    }
  });

  app.patch(`${base}/:id`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const previous = await getOwnedProject(req.params.id, req.user.id);
      if (!previous) return res.status(404).json({ message: "Notebook project not found." });
      const changes: Record<string, any> = { updatedAt: new Date(), status: "editing" };
      if (req.body?.title !== undefined) {
        const title = cleanText(req.body.title, 240);
        if (title.length < 2) return res.status(400).json({ message: "Notebook title must contain at least two characters." });
        changes.title = title;
      }
      if (req.body?.settings !== undefined) changes.settings = normalizeSettings(req.body.settings, previous.settings);
      if (req.body?.coverDesign !== undefined) changes.coverDesign = await normalizeCover(req.body.coverDesign, previous.coverDesign);
      if (req.body?.settings !== undefined || req.body?.coverDesign !== undefined || req.body?.title !== undefined) {
        changes.validation = null;
        changes.generationStatus = "stale";
      }
      const [updated] = await db.update(creatorNotebookProjects).set(changes)
        .where(and(eq(creatorNotebookProjects.id, previous.id), eq(creatorNotebookProjects.ownerId, req.user.id)))
        .returning();
      res.json(serialize(updated));
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Could not save project:", error);
      res.status(500).json({ message: "Could not save this notebook project." });
    }
  });

  app.post(`${base}/:id/page-art/:group/:type`, isAuthenticated, requirePublishingAdmin, (req: any, res, next) => {
    pageArtUpload.single("image")(req, res, (error) => {
      if (error) return res.status(400).json({ message: error.message || "The image could not be uploaded." });
      next();
    });
  }, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const group = String(req.params.group);
      const type = String(req.params.type);
      const validType = group === "intro"
        ? NOTEBOOK_INTRO_PAGE_OPTIONS.some((page) => page.value === type)
        : group === "outro" && NOTEBOOK_OUTRO_PAGE_OPTIONS.some((page) => page.value === type);
      if (!validType) return res.status(400).json({ message: "Choose a valid intro or outro page." });
      if (!req.file?.buffer) return res.status(400).json({ message: "Choose a PNG or JPEG image to upload." });
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const pages = group === "intro" ? settings.introPages : settings.outroPages;
      if (!pages.includes(type as NotebookIntroPageType & NotebookOutroPageType)) {
        return res.status(409).json({ message: "Select this page in the notebook settings before uploading its artwork." });
      }
      const key = notebookPageArtKey(group as NotebookPageArtGroup, type as NotebookIntroPageType & NotebookOutroPageType);
      const imageInfo = inspectNotebookPageImage(req.file.buffer);
      if (!imageInfo) {
        return res.status(400).json({ message: "This image is not supported. Upload a non-interlaced RGB/RGBA PNG or JPEG under 20 megapixels." });
      }
      const recommended = notebookPrintArtPixels(settings, 300);
      if (imageInfo.width < recommended.width || imageInfo.height < recommended.height) {
        return res.status(400).json({
          message: `This image is too small for print. Upload at least ${recommended.width} × ${recommended.height} pixels (300 DPI) for this notebook.`,
        });
      }
      const expectedRatio = recommended.width / recommended.height;
      const imageRatio = imageInfo.width / imageInfo.height;
      if (Math.abs(imageRatio / expectedRatio - 1) > 0.015) {
        return res.status(400).json({
          message: `Match the notebook page shape before uploading. Recommended canvas: ${recommended.width} × ${recommended.height} pixels.`,
        });
      }

      const filename = `${key}.${imageInfo.format === "jpeg" ? "jpg" : "png"}`;
      const target = pageArtPath(project.id, key, filename);
      await mkdir(pageArtDirectory(project.id), { recursive: true });
      const temporary = `${target}.${nanoid(8)}.tmp`;
      await writeFile(temporary, req.file.buffer, { mode: 0o600 });
      await rename(temporary, target);
      const previousFilename = settings.pageArtwork[key];
      if (previousFilename && previousFilename !== filename) {
        await rm(pageArtPath(project.id, key, previousFilename), { force: true }).catch(() => {});
      }
      const nextSettings = normalizeSettings({
        ...settings,
        pageArtwork: { ...settings.pageArtwork, [key]: filename },
      }, settings);
      const [updated] = await db.update(creatorNotebookProjects).set({
        settings: nextSettings,
        status: "editing",
        generationStatus: "stale",
        validation: null,
        updatedAt: new Date(),
      }).where(and(eq(creatorNotebookProjects.id, project.id), eq(creatorNotebookProjects.ownerId, req.user.id))).returning();
      res.json({ project: serialize(updated), image: imageInfo, recommended });
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Could not upload page artwork:", error);
      res.status(500).json({ message: "Could not save page artwork." });
    }
  });

  app.get(`${base}/:id/files/page-art/:key`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const key = String(req.params.key);
      const filename = settings.pageArtwork[key];
      if (!filename) return res.status(404).json({ message: "No replacement artwork is saved for this page." });
      const file = pageArtPath(project.id, key, filename);
      const imageInfo = inspectNotebookPageImage(await readFile(file));
      if (!imageInfo) return res.status(404).json({ message: "Saved page artwork is no longer available." });
      res.setHeader("Content-Type", imageInfo.format === "png" ? "image/png" : "image/jpeg");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(file);
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Could not serve page artwork:", error);
      res.status(500).json({ message: "Could not load page artwork." });
    }
  });

  app.get(`${base}/:id/files/planner-2027/page/:page`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      if (!settings.use2027PlannerPdf) return res.status(404).json({ message: "The imported 2027 planner is not enabled." });
      const sourcePdf = await readTaskdrip2027PlannerPdf();
      const previewPdf = await createPlanner2027PagePreview(sourcePdf, Number(req.params.page), settings);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=\"taskdrip-2027-planner-page.pdf\"");
      res.setHeader("Cache-Control", "private, no-store");
      res.send(previewPdf);
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Could not render imported planner preview:", error);
      res.status(500).json({ message: "Could not preview the imported 2027 planner page." });
    }
  });

  app.delete(`${base}/:id/page-art/:group/:type`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const group = String(req.params.group);
      const type = String(req.params.type);
      const validType = group === "intro"
        ? NOTEBOOK_INTRO_PAGE_OPTIONS.some((page) => page.value === type)
        : group === "outro" && NOTEBOOK_OUTRO_PAGE_OPTIONS.some((page) => page.value === type);
      if (!validType) return res.status(400).json({ message: "Choose a valid intro or outro page." });
      const key = notebookPageArtKey(group as NotebookPageArtGroup, type as NotebookIntroPageType & NotebookOutroPageType);
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const filename = settings.pageArtwork[key];
      const nextArtwork = { ...settings.pageArtwork };
      delete nextArtwork[key];
      const nextSettings = { ...settings, pageArtwork: nextArtwork };
      const [updated] = await db.update(creatorNotebookProjects).set({
        settings: nextSettings,
        status: "editing",
        generationStatus: "stale",
        validation: null,
        updatedAt: new Date(),
      }).where(and(eq(creatorNotebookProjects.id, project.id), eq(creatorNotebookProjects.ownerId, req.user.id))).returning();
      if (filename) await rm(pageArtPath(project.id, key, filename), { force: true }).catch(() => {});
      res.json({ project: serialize(updated) });
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Could not reset page artwork:", error);
      res.status(500).json({ message: "Could not restore the designed page." });
    }
  });

  app.post(`${base}/:id/duplicate`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const source = await getOwnedProject(req.params.id, req.user.id);
      if (!source) return res.status(404).json({ message: "Notebook project not found." });
      const [copy] = await db.insert(creatorNotebookProjects).values({
        ownerId: req.user.id,
        title: `${source.title} — Copy`.slice(0, 240),
        settings: source.settings,
        coverDesign: source.coverDesign,
        status: "draft",
        generationStatus: "idle",
      }).returning();
      const sourceSettings = normalizeSettings(source.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const copiedArtwork: Record<string, string> = {};
      for (const [key, filename] of Object.entries(sourceSettings.pageArtwork)) {
        try {
          const from = pageArtPath(source.id, key, filename);
          const to = pageArtPath(copy.id, key, filename);
          await mkdir(pageArtDirectory(copy.id), { recursive: true });
          await copyFile(from, to);
          copiedArtwork[key] = filename;
        } catch {
          // A missing optional art file should not prevent duplicating the notebook.
        }
      }
      if (Object.keys(copiedArtwork).length !== Object.keys(sourceSettings.pageArtwork).length) {
        const settings = { ...sourceSettings, pageArtwork: copiedArtwork };
        const [withArt] = await db.update(creatorNotebookProjects).set({ settings })
          .where(eq(creatorNotebookProjects.id, copy.id)).returning();
        res.status(201).json(serialize(withArt || { ...copy, settings }));
        return;
      }
      res.status(201).json(serialize(copy));
    } catch (error) {
      console.error("[notebook-studio] Could not duplicate project:", error);
      res.status(500).json({ message: "Could not duplicate this notebook project." });
    }
  });

  app.delete(`${base}/:id`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      await db.delete(creatorNotebookProjects)
        .where(and(eq(creatorNotebookProjects.id, project.id), eq(creatorNotebookProjects.ownerId, req.user.id)));
      await rm(projectDirectory(project.id), { recursive: true, force: true }).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      console.error("[notebook-studio] Could not delete project:", error);
      res.status(500).json({ message: "Could not delete this notebook project." });
    }
  });

  app.post(`${base}/:id/validate`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const [interiorExists, coverExists] = await Promise.all([
        exists(filePath(project.id, "interior")),
        exists(filePath(project.id, "cover")),
      ]);
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const plannerPdfAvailable = !settings.use2027PlannerPdf || await exists(TASKDRIP_2027_PLANNER_PDF);
      const validation = validateNotebook(project.title, settings, { interiorExists, coverExists, plannerPdfAvailable });
      await db.update(creatorNotebookProjects).set({ validation, updatedAt: new Date() })
        .where(and(eq(creatorNotebookProjects.id, project.id), eq(creatorNotebookProjects.ownerId, req.user.id)));
      res.json({ validation });
    } catch (error) {
      console.error("[notebook-studio] Could not validate project:", error);
      res.status(500).json({ message: "Could not run notebook validation." });
    }
  });

  app.post(`${base}/:id/generate`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      const settings = normalizeSettings(project.settings, DEFAULT_NOTEBOOK_SETTINGS);
      const plannerPdfAvailable = !settings.use2027PlannerPdf || await exists(TASKDRIP_2027_PLANNER_PDF);
      const previousReport = validateNotebook(project.title, settings, {
        interiorExists: false,
        coverExists: false,
        plannerPdfAvailable,
      });
      const fatalIssues = previousReport.items.filter((item) => item.status === "failed");
      if (fatalIssues.length) {
        await db.update(creatorNotebookProjects).set({
          validation: previousReport,
          generationStatus: "failed",
          updatedAt: new Date(),
        }).where(eq(creatorNotebookProjects.id, project.id));
        return res.status(400).json({
          message: fatalIssues.map((item) => item.message).join(" "),
          project: serialize({ ...project, validation: previousReport }),
          validation: previousReport,
        });
      }

      await mkdir(projectDirectory(project.id), { recursive: true });
      const requestedKind = ["interior", "cover"].includes(String(req.body?.kind)) ? String(req.body.kind) : "all";
      let interiorKey = project.interiorFileKey;
      let coverKey = project.coverFileKey;

      if (requestedKind === "all" || requestedKind === "interior") {
        const pageArtwork: Record<string, Buffer> = {};
        for (const [key, filename] of Object.entries(settings.pageArtwork || {})) {
          pageArtwork[key] = await readFile(pageArtPath(project.id, key, filename));
        }
        const generatedInterior = createNotebookInteriorPdf(project.title, settings, pageArtwork);
        const interiorBytes = settings.use2027PlannerPdf
          ? await prependPlanner2027Pages(generatedInterior, await readTaskdrip2027PlannerPdf(), settings)
          : generatedInterior;
        const interiorPath = filePath(project.id, "interior");
        const temporary = `${interiorPath}.${nanoid(8)}.tmp`;
        await writeFile(temporary, interiorBytes, { mode: 0o600 });
        await rename(temporary, interiorPath);
        if (!interiorBytes.subarray(0, 8).toString("latin1").startsWith("%PDF-1.")
          || !interiorBytes.includes(Buffer.from(`/Count ${notebookTotalPageCount(settings)}`, "ascii"))
          || !interiorBytes.toString("latin1").endsWith("%%EOF\n")) {
          throw new Error("Interior PDF validation failed; no download was marked ready.");
        }
        interiorKey = `${project.id}/interior.pdf`;
      }

      if (requestedKind === "all" || requestedKind === "cover") {
        if (settings.binding === "paperback" && notebookTotalPageCount(settings) >= 24) {
          const coverImagePath = project.coverDesign?.frontImageUrl
            ? path.resolve(PUBLIC_UPLOADS_DIR, path.basename(project.coverDesign.frontImageUrl))
            : "";
          const coverImageBytes = coverImagePath && coverImagePath.startsWith(`${PUBLIC_UPLOADS_DIR}${path.sep}`)
            ? await readFile(coverImagePath).catch(() => null)
            : null;
          const coverBytes = createNotebookCoverPdf(project.title, settings, project.coverDesign, coverImageBytes);
          const coverPath = filePath(project.id, "cover");
          const temporary = `${coverPath}.${nanoid(8)}.tmp`;
          await writeFile(temporary, coverBytes, { mode: 0o600 });
          await rename(temporary, coverPath);
          if (!coverBytes.subarray(0, 8).toString("latin1").startsWith("%PDF-1.")
            || !coverBytes.toString("latin1").endsWith("%%EOF\n")) {
            throw new Error("Cover PDF validation failed; no download was marked ready.");
          }
          coverKey = `${project.id}/cover.pdf`;
        } else if (requestedKind === "cover") {
          return res.status(409).json({
            message: "A paperback full-wrap cover is available only for paperback projects with at least 24 pages. Interior remains available for other bindings.",
          });
        }
      }

      const provisional = { ...project, settings, interiorFileKey: interiorKey, coverFileKey: coverKey };
      const [interiorExists, coverExists] = await Promise.all([
        exists(filePath(project.id, "interior")),
        exists(filePath(project.id, "cover")),
      ]);
      const validation = validateNotebook(project.title, settings, { interiorExists, coverExists, plannerPdfAvailable });
      const [updated] = await db.update(creatorNotebookProjects).set({
        settings,
        interiorFileKey: interiorKey,
        coverFileKey: coverKey,
        previewFileKey: `${project.id}/preview.svg`,
        validation,
        generationStatus: "complete",
        status: validation.status === "ready" ? "ready" : "needs_review",
        lastGeneratedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(creatorNotebookProjects.id, project.id), eq(creatorNotebookProjects.ownerId, req.user.id))).returning();
      res.json({ project: serialize(updated || provisional), validation });
    } catch (error: any) {
      if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error("[notebook-studio] Generation failed:", error);
      await db.update(creatorNotebookProjects).set({
        generationStatus: "failed",
        updatedAt: new Date(),
      }).where(eq(creatorNotebookProjects.id, req.params.id)).catch(() => {});
      res.status(500).json({ message: error?.message || "Could not generate notebook files. Your saved settings are unchanged." });
    }
  });

  app.get(`${base}/:id/files/interior`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    const project = await getOwnedProject(req.params.id, req.user.id).catch(() => null);
    if (!project) return res.status(404).json({ message: "Notebook project not found." });
    return sendProjectFile(res, filePath(project.id, "interior"), `${safeTitleFileName(project.title)}-interior`, "pdf");
  });

  app.get(`${base}/:id/files/cover`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    const project = await getOwnedProject(req.params.id, req.user.id).catch(() => null);
    if (!project) return res.status(404).json({ message: "Notebook project not found." });
    return sendProjectFile(res, filePath(project.id, "cover"), `${safeTitleFileName(project.title)}-full-wrap-cover`, "pdf");
  });

  app.get(`${base}/:id/files/preview.svg`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    try {
      const project = await getOwnedProject(req.params.id, req.user.id);
      if (!project) return res.status(404).json({ message: "Notebook project not found." });
      res.type("image/svg+xml").set("Cache-Control", "private, no-store")
        .send(createNotebookCoverSvg(project.title, project.settings, project.coverDesign));
    } catch (error) {
      console.error("[notebook-studio] Could not create cover preview:", error);
      res.status(500).json({ message: "Could not create the cover preview." });
    }
  });

  app.get(`${base}/:id/files/config`, isAuthenticated, requirePublishingAdmin, async (req: any, res) => {
    const project = await getOwnedProject(req.params.id, req.user.id).catch(() => null);
    if (!project) return res.status(404).json({ message: "Notebook project not found." });
    const config = JSON.stringify({
      schemaVersion: 1,
      title: project.title,
      settings: project.settings,
      coverDesign: project.coverDesign,
      validation: project.validation,
    }, null, 2);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitleFileName(project.title)}-project.json"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(config);
  });
}
