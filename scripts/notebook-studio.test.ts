import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NOTEBOOK_SETTINGS,
  NOTEBOOK_INTRO_PAGE_OPTIONS,
  NOTEBOOK_OUTRO_PAGE_OPTIONS,
  notebookTotalPageCount,
} from "../shared/notebook-studio";
import { createNotebookInteriorPdf, validateNotebook } from "../server/notebook-pdf";

test("Lined journal PDF draws visible rules using the saved line controls", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    introPages: [],
    lineStyle: "lined-journal" as const,
    lineSpacing: 0.28,
    lineThickness: 1.25,
    lineColor: "#123456",
    ownershipPage: false,
    showPageNumbers: false,
  };
  const pdf = createNotebookInteriorPdf("Line test", settings).toString("latin1");
  const selectedRule = "0.071 0.204 0.337 RG 1.25 w";

  assert.match(pdf, /\/Count 2/);
  assert.ok((pdf.match(new RegExp(selectedRule, "g")) || []).length > 20, "each writing page should contain many ruled lines");
});

test("selected intro designs precede the writing pages and are included in the print count", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    introPages: NOTEBOOK_INTRO_PAGE_OPTIONS.map((option) => option.value),
    lineStyle: "lined-journal" as const,
  };
  const pdf = createNotebookInteriorPdf("Intro test", settings).toString("latin1");
  const validation = validateNotebook("Intro test", settings, { interiorExists: true, coverExists: false });

  const expectedPages = 2 + NOTEBOOK_INTRO_PAGE_OPTIONS.length;
  assert.equal(notebookTotalPageCount(settings), expectedPages);
  assert.match(pdf, new RegExp(`/Count ${expectedPages}`));
  assert.equal(validation.pageCount, expectedPages);
  assert.equal(validation.writingPageCount, 2);
  assert.equal(validation.introPageCount, NOTEBOOK_INTRO_PAGE_OPTIONS.length);
  for (const title of [
    "A JOURNAL FOR YOUR NEXT CHAPTER",
    "MAKE THIS JOURNAL YOURS",
    "SET YOUR INTENTIONS",
    "WORLD MAP",
    "THE CONTINENTS",
    "OUR SOLAR SYSTEM",
    "WORLD LEADERS",
    "CURRENT AFFAIRS",
    "2027 YEAR CALENDAR",
  ]) {
    assert.ok(pdf.includes(`(${title}) Tj`), `the PDF includes its ${title} intro design`);
  }
  for (const month of ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]) {
    assert.ok(pdf.includes(`(${month}) Tj`), `the calendar includes ${month}`);
  }
});

test("front blanks, closing designs, and end blanks are physically ordered and counted", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    frontBlankPageCount: 1,
    introPages: ["welcome"] as const,
    outroPages: ["year-reflection"] as const,
    backBlankPageCount: 2,
    ownershipPage: false,
    showPageNumbers: true,
    lineStyle: "lined-journal" as const,
  };
  const pdf = createNotebookInteriorPdf("Page sequence", settings).toString("latin1");
  const streams = [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((match) => match[1]);

  assert.equal(notebookTotalPageCount(settings), 7);
  assert.equal(streams.length, 7);
  assert.equal(streams[0], "", "the first front-matter page is truly blank");
  assert.match(streams[1], /A JOURNAL FOR YOUR NEXT CHAPTER/);
  assert.match(streams[2], /\(1\) Tj/, "writing page numbers start at one after the front matter");
  assert.match(streams[3], /\(2\) Tj/);
  assert.match(streams[4], /LOOKING BACK/);
  assert.equal(streams[5], "", "the first end blank contains no running elements");
  assert.equal(streams[6], "", "the final end blank contains no running elements");
  const validation = validateNotebook("Page sequence", settings, { interiorExists: true, coverExists: false });
  assert.equal(validation.pageCount, 7);
  assert.equal(validation.introPageCount, 1);
  assert.equal(validation.outroPageCount, 1);
  assert.equal(validation.blankPageCount, 3);
});

test("each available outro option produces its own complete closing design", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    outroPages: NOTEBOOK_OUTRO_PAGE_OPTIONS.map((option) => option.value),
  };
  const pdf = createNotebookInteriorPdf("Closing design test", settings).toString("latin1");
  const validation = validateNotebook("Closing design test", settings, { interiorExists: true, coverExists: false });

  assert.match(pdf, /\(LOOKING BACK\) Tj/);
  assert.match(pdf, /\(A NOTE TO MY FUTURE SELF\) Tj/);
  assert.match(pdf, /\(THE NEXT CHAPTER\) Tj/);
  assert.equal(validation.outroPageCount, NOTEBOOK_OUTRO_PAGE_OPTIONS.length);
  assert.equal(validation.pageCount, 2 + NOTEBOOK_OUTRO_PAGE_OPTIONS.length);
});

test("configured reference pages print publisher data and warn when facts lack sources", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    introPages: ["world-presidents", "current-affairs"] as const,
    worldLeaderEntries: [{
      country: "Exampleland",
      leader: "Jordan Lee",
      office: "Prime Minister",
      checkedDate: "2026-10-13",
      source: "Official government website",
    }],
    currentAffairsEntries: [{
      headline: "Regional energy agreement signed",
      date: "2026-10-12",
      location: "Example City",
      source: "Example News Service",
      whyItMatters: "It may affect regional electricity supply.",
    }],
  };
  const pdf = createNotebookInteriorPdf("Reference test", settings).toString("latin1");
  const validation = validateNotebook("Reference test", settings, { interiorExists: true, coverExists: false });

  assert.match(pdf, /\(Jordan Lee\) Tj/);
  assert.match(pdf, /\(Prime Minister\) Tj/);
  assert.match(pdf, /\(Regional energy agreement signed\) Tj/);
  assert.ok(validation.items.some((item) => item.label === "World leader references" && item.status === "ready"));
  assert.ok(validation.items.some((item) => item.label === "Current affairs references" && item.status === "ready"));

  const incomplete = { ...settings, worldLeaderEntries: [{ ...settings.worldLeaderEntries[0], source: "" }] };
  const incompleteValidation = validateNotebook("Reference test", incomplete, { interiorExists: true, coverExists: false });
  assert.ok(incompleteValidation.items.some((item) => item.label === "World leader references" && item.status === "warning"));
});

test("writing rules stay below the header and subject row and above the footer margin", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 1,
    introPages: [],
    lineStyle: "lined-journal" as const,
    lineSpacing: 0.32,
    headerText: "MY HEADER",
    showDateField: true,
    showSubjectField: true,
    footerText: "MY FOOTER",
    showPageNumbers: true,
    ownershipPage: false,
  };
  const pdf = createNotebookInteriorPdf("Margin test", settings).toString("latin1");
  const stream = [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)][0][1];
  const writingLines = [...stream.matchAll(/([\d.]+) ([\d.]+) m ([\d.]+) ([\d.]+) l S/g)]
    .filter((line) => Math.abs(Number(line[1]) - 30.6) < 0.2 && Math.abs(Number(line[3]) - 405) < 0.2)
    .map((line) => Number(line[2]));

  assert.ok(writingLines.length > 10);
  assert.ok(Math.max(...writingLines) < (9 - 0.72 - 0.24 - 0.32) * 72 + 1, "no ruled line enters the header or metadata band");
  assert.ok(Math.min(...writingLines) >= 0.67 * 72 - 1, "no ruled line enters the footer region");
  assert.match(stream, /\(MY HEADER\) Tj/);
  assert.match(stream, /\(MY FOOTER\) Tj/);
});
