import PptxGenJS from "pptxgenjs";

import type { SprintReportModel } from "@/lib/github-reports";

function bulletLines(items: string[], limit: number) {
  return items.slice(0, limit).map((item) => ({
    options: { bullet: { indent: 14 } },
    text: item,
  }));
}

export async function buildSprintSummaryDeck(report: SprintReportModel) {
  const pptx = new PptxGenJS();
  pptx.author = "Sprint Wrap-Up Buddy";
  pptx.company = "Sprint Wrap-Up Buddy";
  pptx.subject = `${report.scope.repoFullName} sprint summary`;
  pptx.title = `${report.scope.repoFullName} sprint summary`;
  pptx.layout = "LAYOUT_WIDE";

  const addSlideShell = (title: string, subtitle: string) => {
    const slide = pptx.addSlide();
    slide.background = { color: "F8FAFC" };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.55,
      line: { color: "D97706", transparency: 100 },
      fill: { color: "D97706" },
    });
    slide.addText(title, {
      x: 0.65,
      y: 0.8,
      w: 7.6,
      h: 0.45,
      fontFace: "Aptos Display",
      fontSize: 24,
      bold: true,
      color: "111827",
      margin: 0,
    });
    slide.addText(subtitle, {
      x: 0.65,
      y: 1.25,
      w: 7.6,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 10,
      color: "64748B",
      margin: 0,
    });
    return slide;
  };

  const scopeLabel = `${report.scope.startDate} to ${report.scope.endDate} | ${report.scope.repoFullName}`;

  const outcomesSlide = addSlideShell("Sprint outcomes", scopeLabel);
  outcomesSlide.addText("Accomplishments", {
    x: 0.65,
    y: 1.9,
    w: 5.5,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  outcomesSlide.addText(bulletLines(report.accomplishments, 4), {
    x: 0.8,
    y: 2.25,
    w: 5.45,
    h: 2.1,
    fontFace: "Aptos",
    fontSize: 16,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  outcomesSlide.addText("Why it matters", {
    x: 6.85,
    y: 1.9,
    w: 5.4,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  outcomesSlide.addText(bulletLines(report.functionalImpact, 4), {
    x: 7,
    y: 2.25,
    w: 5.45,
    h: 2.1,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  outcomesSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.65,
    y: 5.1,
    w: 11.8,
    h: 1.2,
    rectRadius: 0.08,
    line: { color: "E2E8F0", transparency: 100 },
    fill: { color: "FFF7ED" },
  });
  outcomesSlide.addText(report.generatedSummary, {
    x: 0.95,
    y: 5.45,
    w: 11.2,
    h: 0.55,
    fontFace: "Aptos",
    fontSize: 16,
    italic: true,
    color: "7C2D12",
    align: "center",
    valign: "middle",
    margin: 0,
  });

  const contextSlide = addSlideShell("Decisions and delivery context", scopeLabel);
  contextSlide.addText("Key decisions", {
    x: 0.65,
    y: 1.9,
    w: 5.5,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  contextSlide.addText(bulletLines(report.decisions, 4), {
    x: 0.8,
    y: 2.25,
    w: 5.45,
    h: 1.85,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  contextSlide.addText("Risks and blockers", {
    x: 6.85,
    y: 1.9,
    w: 5.4,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  contextSlide.addText(bulletLines(report.risksAndBlockers, 4), {
    x: 7,
    y: 2.25,
    w: 5.45,
    h: 1.85,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  contextSlide.addText("Stakeholder framing", {
    x: 0.65,
    y: 4.45,
    w: 11.4,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  contextSlide.addText(bulletLines(report.stakeholderHighlights, 3), {
    x: 0.8,
    y: 4.8,
    w: 11.3,
    h: 1.1,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });

  const forwardSlide = addSlideShell("Forward look", scopeLabel);
  forwardSlide.addText("Next steps", {
    x: 0.65,
    y: 1.9,
    w: 5.5,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  forwardSlide.addText(bulletLines(report.forwardLook, 5), {
    x: 0.8,
    y: 2.25,
    w: 5.45,
    h: 2.6,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  forwardSlide.addText("Functional themes to carry forward", {
    x: 6.85,
    y: 1.9,
    w: 5.4,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: "D97706",
    margin: 0,
  });
  forwardSlide.addText(bulletLines(report.functionalThemes, 5), {
    x: 7,
    y: 2.25,
    w: 5.45,
    h: 2.6,
    fontFace: "Aptos",
    fontSize: 15,
    color: "111827",
    breakLine: false,
    paraSpaceAfter: 9,
    valign: "top",
    margin: 0,
  });
  forwardSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.65,
    y: 5.4,
    w: 11.8,
    h: 0.72,
    rectRadius: 0.08,
    line: { color: "CBD5E1", transparency: 100 },
    fill: { color: "E2E8F0" },
  });
  forwardSlide.addText(
    `Default branch: ${report.scope.defaultBranch} | Top languages: ${
      report.scope.topLanguages.length > 0
        ? report.scope.topLanguages.join(", ")
        : "Not returned"
    }`,
    {
      x: 0.95,
      y: 5.66,
      w: 11.2,
      h: 0.2,
      fontFace: "Aptos",
      fontSize: 11,
      color: "334155",
      align: "center",
      margin: 0,
    },
  );

  return pptx.write({ outputType: "nodebuffer" });
}
