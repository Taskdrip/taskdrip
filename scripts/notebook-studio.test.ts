import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import {
  DEFAULT_NOTEBOOK_PAGE_COPY,
  DEFAULT_NOTEBOOK_SETTINGS,
  NOTEBOOK_INTRO_PAGE_OPTIONS,
  NOTEBOOK_LINE_SPACING_PRESETS,
  NOTEBOOK_OUTRO_PAGE_OPTIONS,
  normalizeNotebookLineSpacing,
  notebookPageArtKey,
  notebookPrintArtPixels,
  notebookLogicalPageCount,
  notebookDiaryPageCount,
  resolveNotebookDiaryStartMonth,
  notebookTotalPageCount,
} from "../shared/notebook-studio";
import {
  createPlanner2027PagePreview,
  createNotebookInteriorPdf,
  inspectNotebookPageImage,
  prependPlanner2027Pages,
  validateNotebook,
} from "../server/notebook-pdf";

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
}

function createTestPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.from([
    0, 230, 180, 120, 150, 170, 130,
    0, 80, 120, 200, 230, 180, 120,
  ]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

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

test("exact line-spacing presets create one uniform interval for every ruled layout", () => {
  assert.deepEqual(
    NOTEBOOK_LINE_SPACING_PRESETS.map((preset) => preset.value),
    [0.24, 0.28, 0.32, 0.38],
  );
  assert.equal(normalizeNotebookLineSpacing("0.276"), 0.28);
  assert.equal(normalizeNotebookLineSpacing(-1), 0.16);
  assert.equal(normalizeNotebookLineSpacing(2), 0.75);

  for (const lineStyle of ["classic", "wide", "college", "business", "lined-journal"] as const) {
    const settings = {
      ...DEFAULT_NOTEBOOK_SETTINGS,
      pageCount: 1,
      introPages: [],
      lineStyle,
      lineSpacing: 0.29,
      ownershipPage: false,
      showDateField: false,
      showSubjectField: false,
      headerText: "",
      footerText: "",
      showPageNumbers: false,
    };
    const pdf = createNotebookInteriorPdf("Spacing test", settings).toString("latin1");
    const stream = [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)][0][1];
    const yPositions = [...stream.matchAll(/([\d.]+) ([\d.]+) m ([\d.]+) ([\d.]+) l S/g)]
      .filter((line) => Math.abs(Number(line[1]) - 30.6) < 0.2 && Math.abs(Number(line[3]) - 405) < 0.2)
      .map((line) => Number(line[2]))
      .sort((a, b) => a - b);

    assert.ok(yPositions.length > 10, `${lineStyle} has a full writing area of evenly spaced rules`);
    for (let index = 1; index < yPositions.length; index++) {
      assert.ok(
        Math.abs((yPositions[index] - yPositions[index - 1]) - 0.29 * 72) < 0.02,
        `${lineStyle} rule ${index + 1} uses exactly the selected 0.29-inch baseline spacing`,
      );
    }
  }
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
    "A place to pause",
    "Make this journal yours",
    "Set your intentions",
    "Explore the world",
    "Seven continents, one curious world",
    "A tour of our solar system",
    "World leaders",
    "The stories shaping our time",
    "A year at a glance",
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
  assert.match(streams[4], /\(Looking back\) Tj/);
  assert.equal(streams[5], "", "the first end blank contains no running elements");
  assert.equal(streams[6], "", "the final end blank contains no running elements");
  const validation = validateNotebook("Page sequence", settings, { interiorExists: true, coverExists: false });
  assert.equal(validation.pageCount, 7);
  assert.equal(validation.introPageCount, 1);
  assert.equal(validation.outroPageCount, 1);
  assert.equal(validation.blankPageCount, 3);
});

test("imported planner projects retain closing pages and front/end blanks in the KDP interior", async () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    trimSize: "8.27x11.69",
    customWidth: 8.27,
    customHeight: 11.69,
    bleed: false,
    lineThickness: 0.75,
    use2027PlannerPdf: true,
    introPages: ["welcome"] as const,
    outroPages: ["year-reflection"] as const,
    frontBlankPageCount: 2,
    backBlankPageCount: 1,
    ownershipPage: false,
  };
  const source = await PDFDocument.create();
  for (let index = 0; index < 32; index++) source.addPage([595.5, 842.25]);

  const generated = createNotebookInteriorPdf("Imported journal", settings);
  const finalPdf = await prependPlanner2027Pages(
    generated,
    Buffer.from(await source.save({ useObjectStreams: false })),
    settings,
  );
  const document = await PDFDocument.load(finalPdf);
  const validation = validateNotebook("Imported journal", settings, {
    interiorExists: true,
    coverExists: false,
    plannerPdfAvailable: true,
  });

  assert.equal(notebookLogicalPageCount(settings), 36);
  assert.equal(notebookTotalPageCount(settings), 36);
  assert.equal(document.getPageCount(), 36);
  assert.ok(document.getPages().every((page) =>
    Math.abs(page.getWidth() - 8.27 * 72) < 0.1
    && Math.abs(page.getHeight() - 11.69 * 72) < 0.1,
  ), "every exported page matches the selected A4 trim with bleed off");
  assert.equal(validation.pageCount, 36);
  assert.equal(validation.introPageCount, 30);
  assert.equal(validation.writingPageCount, 2);
  assert.equal(validation.outroPageCount, 1);
  assert.equal(validation.blankPageCount, 3);
});

test("imported planner pages fit the selected trim and bleed size", async () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 1,
    trimSize: "6x9",
    customWidth: 6,
    customHeight: 9,
    bleed: true,
    lineThickness: 0.75,
    use2027PlannerPdf: true,
    outroPages: ["future-letter"] as const,
    frontBlankPageCount: 1,
    backBlankPageCount: 1,
    disabledPages: [4],
    ownershipPage: false,
  };
  const source = await PDFDocument.create();
  for (let index = 0; index < 32; index++) source.addPage([595.5, 842.25]);

  const generated = createNotebookInteriorPdf("Trimmed planner journal", settings);
  const finalPdf = await prependPlanner2027Pages(
    generated,
    Buffer.from(await source.save({ useObjectStreams: false })),
    settings,
  );
  const document = await PDFDocument.load(finalPdf);
  const validation = validateNotebook("Trimmed planner journal", settings, {
    interiorExists: true,
    coverExists: false,
    plannerPdfAvailable: true,
  });
  const plannerCheck = validation.items.find((item) => item.label === "Imported 2027 planner pages");

  assert.equal(document.getPageCount(), notebookTotalPageCount(settings));
  assert.ok(document.getPages().every((page) =>
    Math.abs(page.getWidth() - (6 + 0.125) * 72) < 0.02
    && Math.abs(page.getHeight() - (9 + 0.25) * 72) < 0.02,
  ), "all imported and generated pages use the selected 6 × 9 trim plus bleed");
  assert.equal(plannerCheck?.status, "ready");
  assert.match(plannerCheck?.message || "", /6\.00 × 9\.00 inch trim with bleed/);
});

test("empty or stale diary months do not block undated journals", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");

  assert.equal(resolveNotebookDiaryStartMonth("classic", "", "", now), "");
  assert.equal(resolveNotebookDiaryStartMonth("lined-journal", "not-a-month", "2027-01", now), "");
  assert.equal(resolveNotebookDiaryStartMonth("diary", "", "", now), "2026-10");
  assert.equal(resolveNotebookDiaryStartMonth("diary", "2027-12", "", now), "2027-12");
  assert.equal(resolveNotebookDiaryStartMonth("diary", "2028-01", "", now), null);
  assert.equal(notebookDiaryPageCount("2027-12"), 31);
});

test("disabled pages are omitted from KDP output and page edits can replace an imported planner page", async () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    trimSize: "8.27x11.69",
    customWidth: 8.27,
    customHeight: 11.69,
    bleed: false,
    lineThickness: 0.75,
    use2027PlannerPdf: true,
    introPages: [],
    outroPages: [],
    disabledPages: [3, 30],
    pageEdits: {
      "4": {
        title: "My custom opening page",
        subtitle: "A page tailored to this notebook.",
        body: "Write down what matters most.",
        replace: true,
      },
    },
  };
  const source = await PDFDocument.create();
  for (let index = 0; index < 32; index++) source.addPage([595.5, 842.25]);
  const generated = createNotebookInteriorPdf("Page controls", settings);
  const generatedText = generated.toString("latin1");
  const finalPdf = await prependPlanner2027Pages(
    generated,
    Buffer.from(await source.save({ useObjectStreams: false })),
    settings,
  );
  const finalDocument = await PDFDocument.load(finalPdf);
  const validation = validateNotebook("Page controls", settings, { interiorExists: true, coverExists: false, plannerPdfAvailable: true });

  assert.equal(notebookLogicalPageCount(settings), 32);
  assert.equal(notebookTotalPageCount(settings), 30);
  assert.match(generatedText, /\(My custom opening page\) Tj/);
  assert.equal(finalDocument.getPageCount(), 30, "excluded planner pages do not appear in the downloaded PDF");
  assert.equal(validation.pageCount, 30);
  assert.equal(validation.introPageCount, 28);
  assert.equal(validation.writingPageCount, 2);
});

test("planner page previews work before the project toggle is saved and use the current trim", async () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    use2027PlannerPdf: false,
    trimSize: "8.27x11.69",
    customWidth: 8.27,
    customHeight: 11.69,
  };
  const source = await PDFDocument.create();
  for (let index = 0; index < 32; index++) source.addPage([595.5, 842.25]);

  const preview = await createPlanner2027PagePreview(
    Buffer.from(await source.save({ useObjectStreams: false })),
    1,
    settings,
  );
  const document = await PDFDocument.load(preview);
  const dimensions = document.getPage(0).getSize();

  assert.equal(document.getPageCount(), 1);
  assert.ok(Math.abs(dimensions.width - 8.27 * 72) < 0.1);
  assert.ok(Math.abs(dimensions.height - 11.69 * 72) < 0.1);
});

test("excluded writing pages reflow writing-page numbers and reduce the physical PDF count", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 3,
    introPages: [],
    disabledPages: [2],
    ownershipPage: false,
    showPageNumbers: true,
  };
  const pdf = createNotebookInteriorPdf("Excluded writing page", settings).toString("latin1");
  const validation = validateNotebook("Excluded writing page", settings, { interiorExists: true, coverExists: false });

  assert.equal(notebookLogicalPageCount(settings), 3);
  assert.equal(notebookTotalPageCount(settings), 2);
  assert.match(pdf, /\/Count 2/);
  assert.match(pdf, /\(1\) Tj/);
  assert.match(pdf, /\(2\) Tj/);
  assert.equal(validation.writingPageCount, 2);
});

test("each available outro option produces its own complete closing design", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 2,
    outroPages: NOTEBOOK_OUTRO_PAGE_OPTIONS.map((option) => option.value),
  };
  const pdf = createNotebookInteriorPdf("Closing design test", settings).toString("latin1");
  const validation = validateNotebook("Closing design test", settings, { interiorExists: true, coverExists: false });

  assert.match(pdf, /\(Looking back\) Tj/);
  assert.match(pdf, /\(A note to my future self\) Tj/);
  assert.match(pdf, /\(The next chapter\) Tj/);
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

test("page copy edits are used in the generated introduction and closing pages", () => {
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 1,
    introPages: ["intentions"] as const,
    outroPages: ["year-reflection"] as const,
    pageCopy: {
      ...DEFAULT_NOTEBOOK_PAGE_COPY,
      "intro-intentions": {
        title: "A season with purpose",
        subtitle: "Write what you want to protect and grow.",
        prompts: ["Make room for rest", "Call someone I miss", "Take one focused step"],
      },
      "outro-year-reflection": {
        title: "What I am taking with me",
        subtitle: "A few details can hold a whole season.",
        prompts: ["The moment I replay", "A lesson I earned", "A kindness I received", "What I will carry forward"],
      },
    },
  };
  const pdf = createNotebookInteriorPdf("Copy edit test", settings).toString("latin1");

  for (const copy of [
    "A season with purpose",
    "Write what you want to protect and grow.",
    "MAKE ROOM FOR REST",
    "What I am taking with me",
    "A KINDNESS I RECEIVED",
  ]) {
    assert.ok(pdf.includes(copy), `the PDF includes saved page copy: ${copy}`);
  }
});

test("uploaded page artwork replaces the designed page and is embedded in the print PDF", () => {
  const image = createTestPng();
  const info = inspectNotebookPageImage(image);
  assert.deepEqual(info, { width: 2, height: 2, format: "png" });
  const settings = {
    ...DEFAULT_NOTEBOOK_SETTINGS,
    pageCount: 1,
    introPages: ["welcome"] as const,
  };
  const pdf = createNotebookInteriorPdf("Artwork test", settings, {
    [notebookPageArtKey("intro", "welcome")]: image,
  }).toString("latin1");

  assert.match(pdf, /\/Subtype \/Image \/Width 2 \/Height 2/);
  assert.match(pdf, /\/XObject << \/Im0 \d+ 0 R >>/);
  assert.match(pdf, /\/Im0 Do Q/);
  assert.ok(!pdf.includes("A JOURNAL FOR YOUR NEXT CHAPTER"), "replacement artwork suppresses the vector template");
  assert.match(pdf, /\/Count 2/);
});

test("page art dimensions follow trim size and include bleed at 300 DPI", () => {
  assert.deepEqual(
    notebookPrintArtPixels({ trimSize: "6x9", customWidth: 6, customHeight: 9, bleed: false }),
    { width: 1800, height: 2700 },
  );
  assert.deepEqual(
    notebookPrintArtPixels({ trimSize: "6x9", customWidth: 6, customHeight: 9, bleed: true }),
    { width: 1838, height: 2775 },
  );
  assert.deepEqual(
    notebookPrintArtPixels({ trimSize: "custom", customWidth: 5.5, customHeight: 8.5, bleed: false }),
    { width: 1650, height: 2550 },
  );
});

test("generated interior PDF page size matches each selected trim and bleed setting", async () => {
  const trims = [
    { trimSize: "5x8", width: 5, height: 8 },
    { trimSize: "5.5x8.5", width: 5.5, height: 8.5 },
    { trimSize: "6x9", width: 6, height: 9 },
    { trimSize: "8.27x11.69", width: 8.27, height: 11.69 },
    { trimSize: "custom", width: 7.25, height: 10.25 },
  ];

  for (const trim of trims) {
    for (const bleed of [false, true]) {
      const settings = {
        ...DEFAULT_NOTEBOOK_SETTINGS,
        pageCount: 1,
        trimSize: trim.trimSize,
        customWidth: trim.width,
        customHeight: trim.height,
        bleed,
        introPages: [],
        outroPages: [],
        ownershipPage: false,
        frontBlankPageCount: 0,
        backBlankPageCount: 0,
      };
      const document = await PDFDocument.load(createNotebookInteriorPdf("Trim check", settings));
      const [page] = document.getPages();
      const expectedWidth = (trim.width + (bleed ? 0.125 : 0)) * 72;
      const expectedHeight = (trim.height + (bleed ? 0.25 : 0)) * 72;

      assert.ok(
        Math.abs(page.getWidth() - expectedWidth) < 0.02,
        `${trim.trimSize} ${bleed ? "with" : "without"} bleed uses the correct PDF width`,
      );
      assert.ok(
        Math.abs(page.getHeight() - expectedHeight) < 0.02,
        `${trim.trimSize} ${bleed ? "with" : "without"} bleed uses the correct PDF height`,
      );
    }
  }
});
