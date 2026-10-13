export type NotebookBinding = "paperback" | "hardcover" | "spiral";
export type NotebookLineStyle =
  | "classic"
  | "wide"
  | "college"
  | "minimalist"
  | "business"
  | "daily"
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

export const DEFAULT_NOTEBOOK_COVER: NotebookCoverDesign = {
  style: "minimal",
  background: "#173b4a",
  accent: "#d8a85c",
  description: "",
  backDescription: "",
  frontImageUrl: "",
};
