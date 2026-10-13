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
