export type NotebookBinding = "paperback" | "hardcover" | "spiral";
export type NotebookLineStyle =
  | "classic"
  | "wide"
  | "college"
  | "minimalist"
  | "lined-journal"
  | "business"
  | "daily"
  | "diary"
  | "meeting"
  | "study"
  | "dot"
  | "graph"
  | "premium"
  | "custom";

export const NOTEBOOK_INTRO_PAGE_OPTIONS = [
  { value: "welcome", label: "Welcome to your journal", description: "A designed opening page with an encouraging note and space to make this journal yours." },
  { value: "journal-guide", label: "How to use this journal", description: "A practical, illustrated guide for making the most of these pages." },
  { value: "intentions", label: "Intentions & goals", description: "A guided page for choosing priorities and turning them into small steps." },
  { value: "world-map", label: "World map", description: "A labeled study map with continent prompts." },
  { value: "continents", label: "Continents", description: "Seven continent fact cards." },
  { value: "planets", label: "Planets", description: "A solar-system diagram and planet notes." },
  { value: "world-presidents", label: "World presidents", description: "A fill-in tracker for country leaders." },
  { value: "current-affairs", label: "Current affairs", description: "A dated worksheet for headlines and sources." },
  { value: "calendar-2027", label: "2027 calendar", description: "A full-year calendar with all dates." },
] as const;

export type NotebookIntroPageType = typeof NOTEBOOK_INTRO_PAGE_OPTIONS[number]["value"];

export const NOTEBOOK_OUTRO_PAGE_OPTIONS = [
  { value: "year-reflection", label: "Looking back", description: "A thoughtful review of highlights, lessons, and things to carry forward." },
  { value: "future-letter", label: "A note to my future self", description: "A closing letter page with a place to set a date to revisit it." },
  { value: "next-chapter", label: "The next chapter", description: "A forward-looking page for hopes, next steps, and a fresh start." },
] as const;

export type NotebookOutroPageType = typeof NOTEBOOK_OUTRO_PAGE_OPTIONS[number]["value"];

export type NotebookLeaderEntry = {
  country: string;
  leader: string;
  office: string;
  checkedDate: string;
  source: string;
};

export type NotebookCurrentAffairsEntry = {
  headline: string;
  date: string;
  location: string;
  source: string;
  whyItMatters: string;
};

export type NotebookSettings = {
  subtitle: string;
  authorName: string;
  seriesName: string;
  pageCount: number;
  trimSize: string;
  customWidth: number;
  customHeight: number;
  binding: NotebookBinding;
  ink: "black" | "color";
  paper: "white" | "cream";
  bleed: boolean;
  lineStyle: NotebookLineStyle;
  introPages: NotebookIntroPageType[];
  outroPages: NotebookOutroPageType[];
  frontBlankPageCount: number;
  backBlankPageCount: number;
  worldLeaderEntries: NotebookLeaderEntry[];
  currentAffairsEntries: NotebookCurrentAffairsEntry[];
  diaryStartMonth: string;
  lineSpacing: number;
  lineColor: string;
  lineThickness: number;
  showPageNumbers: boolean;
  ownershipPage: boolean;
  showDateField: boolean;
  showSubjectField: boolean;
  headerText: string;
  footerText: string;
};

export type NotebookCoverDesign = {
  style: string;
  background: string;
  accent: string;
  description: string;
  backDescription: string;
  frontImageUrl: string;
};

export type NotebookValidationItem = {
  status: "ready" | "warning" | "failed" | "manual";
  label: string;
  message: string;
};

export type NotebookValidationReport = {
  status: "ready" | "warning" | "failed" | "manual";
  checkedAt: string;
  pageCount: number;
  writingPageCount?: number;
  introPageCount?: number;
  outroPageCount?: number;
  blankPageCount?: number;
  trimWidth: number;
  trimHeight: number;
  coverWidth: number | null;
  coverHeight: number | null;
  items: NotebookValidationItem[];
  disclaimer: string;
};

export const DEFAULT_NOTEBOOK_SETTINGS: NotebookSettings = {
  subtitle: "",
  authorName: "",
  seriesName: "",
  pageCount: 160,
  trimSize: "6x9",
  customWidth: 6,
  customHeight: 9,
  binding: "paperback",
  ink: "black",
  paper: "white",
  bleed: false,
  lineStyle: "classic",
  introPages: [],
  outroPages: [],
  frontBlankPageCount: 0,
  backBlankPageCount: 0,
  worldLeaderEntries: [],
  currentAffairsEntries: [],
  diaryStartMonth: "",
  lineSpacing: 0.32,
  lineColor: "#9db5c8",
  lineThickness: 0.55,
  showPageNumbers: true,
  ownershipPage: false,
  showDateField: false,
  showSubjectField: false,
  headerText: "",
  footerText: "",
};

export function notebookIntroPageCount(settings: Pick<NotebookSettings, "introPages">) {
  return Array.isArray(settings.introPages) ? settings.introPages.length : 0;
}

export function notebookOutroPageCount(settings: Pick<NotebookSettings, "outroPages">) {
  return Array.isArray(settings.outroPages) ? settings.outroPages.length : 0;
}

export function notebookBlankPageCount(settings: Pick<NotebookSettings, "frontBlankPageCount" | "backBlankPageCount">) {
  return Math.max(0, Number(settings.frontBlankPageCount) || 0) + Math.max(0, Number(settings.backBlankPageCount) || 0);
}

export function notebookTotalPageCount(
  settings: Pick<NotebookSettings, "pageCount" | "introPages"> & Partial<Pick<NotebookSettings, "outroPages" | "frontBlankPageCount" | "backBlankPageCount">>,
) {
  return settings.pageCount
    + notebookIntroPageCount(settings)
    + notebookOutroPageCount({ outroPages: settings.outroPages || [] })
    + notebookBlankPageCount({
      frontBlankPageCount: settings.frontBlankPageCount || 0,
      backBlankPageCount: settings.backBlankPageCount || 0,
    });
}

const NOTEBOOK_DIARY_LAST_DAY = Date.UTC(2027, 11, 31);

export function currentNotebookDiaryStartMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function notebookDiaryPageCount(startMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(startMonth);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return 0;
  const firstDay = Date.UTC(year, month - 1, 1);
  if (firstDay > NOTEBOOK_DIARY_LAST_DAY) return 0;
  return Math.floor((NOTEBOOK_DIARY_LAST_DAY - firstDay) / 86_400_000) + 1;
}

export function notebookDiaryPageDate(startMonth: string, pageNumber: number) {
  const pageCount = notebookDiaryPageCount(startMonth);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(startMonth);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, pageNumber));
  return date.toISOString().slice(0, 10);
}

export const DEFAULT_NOTEBOOK_COVER: NotebookCoverDesign = {
  style: "minimal",
  background: "#173b4a",
  accent: "#d8a85c",
  description: "",
  backDescription: "",
  frontImageUrl: "",
};
