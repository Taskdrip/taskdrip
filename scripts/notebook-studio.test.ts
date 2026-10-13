import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NOTEBOOK_SETTINGS,
  NOTEBOOK_INTRO_PAGE_OPTIONS,
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

  assert.equal(notebookTotalPageCount(settings), 8);
  assert.match(pdf, /\/Count 8/);
  assert.equal(validation.pageCount, 8);
  assert.equal(validation.writingPageCount, 2);
  assert.equal(validation.introPageCount, 6);
  for (const title of [
    "WORLD MAP",
    "THE CONTINENTS",
    "OUR SOLAR SYSTEM",
    "WORLD LEADERS TRACKER",
    "CURRENT AFFAIRS",
    "2027 YEAR CALENDAR",
  ]) {
    assert.ok(pdf.includes(`(${title}) Tj`), `the PDF includes its ${title} intro design`);
  }
  for (const month of ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]) {
    assert.ok(pdf.includes(`(${month}) Tj`), `the calendar includes ${month}`);
  }
});
