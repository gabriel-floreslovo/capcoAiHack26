import type { GithubRepoSnapshot } from "@/lib/github";

export type GithubReportType = "onboarding" | "sprint-summary";

type ReportInput = {
  endDate: string;
  notes: string;
  repoFullName: string;
  snapshot: GithubRepoSnapshot;
  startDate: string;
};

type ParsedNotesContext = {
  accomplishments: string[];
  blockers: string[];
  decisions: string[];
  functionalThemes: string[];
  nextSteps: string[];
};

export type SprintReportModel = {
  accomplishments: string[];
  decisions: string[];
  forwardLook: string[];
  functionalImpact: string[];
  functionalThemes: string[];
  generatedSummary: string;
  repoAreasTouched: {
    directories: string[];
    files: string[];
  };
  reportTitle: string;
  risksAndBlockers: string[];
  scope: {
    defaultBranch: string;
    endDate: string;
    repoFullName: string;
    repoUrl: string;
    startDate: string;
    topLanguages: string[];
  };
  stakeholderHighlights: string[];
};

function inferArchitectureSignals(snapshot: GithubRepoSnapshot) {
  const names = new Set(snapshot.rootEntries);
  const tree = new Set(snapshot.treePaths);
  const signals: string[] = [];

  if (names.has("package.json")) {
    signals.push("Node.js application with package-managed dependencies.");
  }
  if (names.has("next.config.ts") || names.has("next.config.js")) {
    signals.push("Next.js application with an App Router-style frontend.");
  }
  if (names.has("tsconfig.json")) {
    signals.push("TypeScript is part of the primary development workflow.");
  }
  if (names.has("package-lock.json")) {
    signals.push("npm is the package manager and lockfile source of truth.");
  }
  if (names.has("Dockerfile") || tree.has("Dockerfile")) {
    signals.push("Containerization is present through Docker configuration.");
  }
  if (names.has("docker-compose.yml") || names.has("docker-compose.yaml")) {
    signals.push("Local multi-service orchestration is defined with Docker Compose.");
  }
  if (
    names.has("requirements.txt") ||
    names.has("pyproject.toml") ||
    names.has("Pipfile")
  ) {
    signals.push("Python services or tooling are present in the repository.");
  }
  if (tree.has(".github/workflows")) {
    signals.push("GitHub Actions workflows are configured for automation or CI.");
  }
  if (names.has("apps") || names.has("packages")) {
    signals.push(
      "The repository is structured as a multi-package or monorepo-style codebase.",
    );
  }
  if (
    names.has("terraform") ||
    snapshot.treePaths.some((path) => path.endsWith(".tf"))
  ) {
    signals.push("Infrastructure as code is present through Terraform files.");
  }

  if (signals.length === 0) {
    signals.push(
      "The repository layout is lightweight enough that architecture should be confirmed from the README and top-level directories.",
    );
  }

  return signals;
}

function inferOnboardingChecklist(snapshot: GithubRepoSnapshot) {
  const checklist = [
    `Read the README and confirm how ${snapshot.defaultBranch} is used as the default branch.`,
    "Clone the repository and install dependencies before touching workflow-specific files.",
    "Review the top-level directories to understand where product code, shared packages, and docs live.",
    "Skim the recent pull requests and commits in the selected window to understand what changed most recently.",
  ];

  if (snapshot.topLevelDirectories.includes("apps")) {
    checklist.push(
      "Start by mapping each app under `apps/` to its runtime responsibility.",
    );
  }
  if (snapshot.topLevelDirectories.includes("packages")) {
    checklist.push(
      "Review shared libraries under `packages/` before changing business logic in app code.",
    );
  }
  if (snapshot.rootEntries.includes("package.json")) {
    checklist.push("Run the root npm scripts to verify local lint and build behavior.");
  }

  return checklist;
}

function formatCommits(snapshot: GithubRepoSnapshot) {
  return snapshot.commits.length
    ? snapshot.commits
        .map(
          (commit) =>
            `- \`${commit.sha}\` ${commit.message} — ${commit.author} ([view commit](${commit.url}))`,
        )
        .join("\n")
    : "- No commits were returned in the selected date range.";
}

function formatPullRequests(snapshot: GithubRepoSnapshot) {
  return snapshot.pullRequests.length
    ? snapshot.pullRequests
        .map((pullRequest) => {
          const status = pullRequest.mergedAt ? "merged" : pullRequest.state;
          return `- PR #${pullRequest.number} ${pullRequest.title} — ${status}, by ${pullRequest.author} ([view PR](${pullRequest.url}))`;
        })
        .join("\n")
    : "- No pull requests were active in the selected date range.";
}

function formatReadmeExcerpt(snapshot: GithubRepoSnapshot) {
  return snapshot.readme
    ? snapshot.readme
        .replace(/\r/g, "")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .slice(0, 8)
        .join("\n")
    : "No README content was returned from the repository.";
}

function normalizeNoteLine(line: string) {
  return line
    .replace(/^[-*•\d.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNotesContext(notes: string): ParsedNotesContext {
  const lines = notes
    .split(/\r?\n/)
    .map(normalizeNoteLine)
    .filter((line) => line.length > 0);

  const context: ParsedNotesContext = {
    accomplishments: [],
    blockers: [],
    decisions: [],
    functionalThemes: [],
    nextSteps: [],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      /decision|decided|agreed|approved|chose|aligned|finalized/.test(lower)
    ) {
      context.decisions.push(line);
    }

    if (
      /blocker|risk|issue|stuck|waiting|dependency|concern|delay/.test(lower)
    ) {
      context.blockers.push(line);
    }

    if (
      /next step|next up|follow up|todo|to do|plan|action|need to|will /.test(
        lower,
      )
    ) {
      context.nextSteps.push(line);
    }

    if (
      /launch|demo|stakeholder|client|customer|user|workflow|experience|business|process|retro|meeting|review|adoption|value|impact/.test(
        lower,
      )
    ) {
      context.functionalThemes.push(line);
    }

    if (
      /shipped|built|added|completed|delivered|implemented|finished|created|improved|updated|connected|generated|enabled/.test(
        lower,
      )
    ) {
      context.accomplishments.push(line);
    }
  }

  return {
    accomplishments: context.accomplishments.slice(0, 5),
    blockers: context.blockers.slice(0, 5),
    decisions: context.decisions.slice(0, 5),
    functionalThemes: context.functionalThemes.slice(0, 5),
    nextSteps: context.nextSteps.slice(0, 5),
  };
}

function inferSprintHighlights(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
) {
  const highlights: string[] = [];

  if (notesContext.accomplishments.length > 0) {
    highlights.push(
      `The notes point to ${notesContext.accomplishments.length} concrete accomplishment${
        notesContext.accomplishments.length === 1 ? "" : "s"
      } during the sprint, suggesting meaningful progress beyond raw code churn.`,
    );
  }
  if (snapshot.pullRequests.length > 0) {
    highlights.push(
      `The repo had ${snapshot.pullRequests.length} pull request${
        snapshot.pullRequests.length === 1 ? "" : "s"
      } active in the selected window.`,
    );
  }
  if (snapshot.commits.length > 0) {
    highlights.push(
      `There were ${snapshot.commits.length} recent commit${
        snapshot.commits.length === 1 ? "" : "s"
      } available for the sprint recap.`,
    );
  }
  if (snapshot.languages.length > 0) {
    highlights.push(
      `Work centered on ${snapshot.languages.join(", ")} across the selected repository.`,
    );
  }
  if (snapshot.topLevelDirectories.length > 0) {
    highlights.push(
      `The most visible repo surfaces were ${snapshot.topLevelDirectories.slice(0, 5).join(", ")}.`,
    );
  }
  if (notesContext.functionalThemes.length > 0) {
    highlights.push(
      "The work appears tied to user-facing or stakeholder-facing themes captured in the sprint notes, not just low-level implementation updates.",
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      "The repository returned limited structured activity, so the recap should be supplemented with additional artifacts if available.",
    );
  }

  return highlights;
}

function inferForwardLook(snapshot: GithubRepoSnapshot, notes: string) {
  const notesContext = parseNotesContext(notes);
  const forwardLook: string[] = [];

  if (notesContext.nextSteps.length > 0) {
    forwardLook.push(
      "The captured notes already point to immediate follow-up work, so the next sprint can start from documented momentum rather than a blank slate.",
    );
  }
  if (snapshot.openIssuesCount > 0) {
    forwardLook.push(
      `Review the ${snapshot.openIssuesCount} open GitHub issue${
        snapshot.openIssuesCount === 1 ? "" : "s"
      } to confirm what remains in flight after this sprint.`,
    );
  }
  if (snapshot.topLevelDirectories.includes("apps")) {
    forwardLook.push(
      "Use the app boundaries in `apps/` to break the next sprint into smaller, ownable UI or service slices.",
    );
  }
  if (snapshot.topLevelDirectories.includes("packages")) {
    forwardLook.push(
      "Stabilize shared package contracts before parallel feature work expands across the codebase.",
    );
  }
  if (notes.trim().length > 0) {
    forwardLook.push(
      "Cross-check the generated recap against the notes you captured to ensure no key discussion or decision is missing before demo day.",
    );
  }

  if (forwardLook.length === 0) {
    forwardLook.push(
      "Use the latest merged pull requests and the repo structure to identify the most natural next implementation slice.",
    );
  }

  return forwardLook;
}

function inferFunctionalImpact(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
) {
  const impact: string[] = [];

  if (notesContext.functionalThemes.length > 0) {
    impact.push(
      "The sprint included functional context that can be framed in terms of workflow quality, stakeholder readiness, or end-user experience.",
    );
  }
  if (notesContext.decisions.length > 0) {
    impact.push(
      "The notes show active decision-making, which suggests the sprint moved the product direction forward and reduced ambiguity for the team.",
    );
  }
  if (snapshot.pullRequests.length > 0 && snapshot.commits.length > 0) {
    impact.push(
      "GitHub activity supports a narrative of implemented work rather than planning only, which is useful for demos and stakeholder updates.",
    );
  }
  if (snapshot.topLevelDirectories.includes("apps")) {
    impact.push(
      "Visible changes in application-facing areas suggest at least part of the sprint impacted product behavior or presentation rather than only internal tooling.",
    );
  }

  if (impact.length === 0) {
    impact.push(
      "The available evidence suggests engineering progress, but additional business context would make the user impact clearer.",
    );
  }

  return impact;
}

function inferSuggestedDemoHighlights(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
) {
  const highlights: string[] = [];

  if (notesContext.accomplishments.length > 0) {
    highlights.push(
      "Lead with the accomplishments captured in the notes, since they represent the clearest human-readable story of progress.",
    );
  }
  if (snapshot.pullRequests.length > 0) {
    highlights.push(
      "Reference the most relevant pull requests as proof points behind the demo narrative or stakeholder update.",
    );
  }
  if (notesContext.decisions.length > 0) {
    highlights.push(
      "Mention the key sprint decisions to show that the team resolved ambiguity, not just wrote code.",
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      "Use the recent GitHub changes as proof points and supplement with verbal context during the demo.",
    );
  }

  return highlights;
}

function inferAccomplishmentSummary(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
) {
  if (notesContext.accomplishments.length > 0) {
    return notesContext.accomplishments;
  }

  if (snapshot.pullRequests.length > 0) {
    return snapshot.pullRequests
      .slice(0, 3)
      .map((pullRequest) => pullRequest.title);
  }

  if (snapshot.commits.length > 0) {
    return snapshot.commits.slice(0, 3).map((commit) => commit.message);
  }

  return [
    "The available sprint evidence shows repository activity, but the top accomplishments should be clarified with more notes or supporting artifacts.",
  ];
}

function stripMarkdownBullets(value: string) {
  return value.replace(/^- /, "").trim();
}

export function buildSprintReportModel(input: ReportInput): SprintReportModel {
  const { endDate, notes, repoFullName, snapshot, startDate } = input;
  const notesContext = parseNotesContext(notes);
  const highlights = inferSprintHighlights(snapshot, notesContext);
  const functionalImpact = inferFunctionalImpact(snapshot, notesContext);
  const forwardLook = inferForwardLook(snapshot, notes);
  const demoHighlights = inferSuggestedDemoHighlights(snapshot, notesContext);
  const accomplishments = inferAccomplishmentSummary(snapshot, notesContext);
  const decisions =
    notesContext.decisions.length > 0
      ? notesContext.decisions
      : snapshot.pullRequests.length > 0
        ? snapshot.pullRequests.slice(0, 3).map((pullRequest) => pullRequest.title)
        : ["No explicit sprint decisions were detected from the provided notes."];
  const risksAndBlockers =
    notesContext.blockers.length > 0
      ? notesContext.blockers
      : [
          "No blockers or delivery risks were called out in the provided notes.",
        ];
  const functionalThemes =
    notesContext.functionalThemes.length > 0
      ? notesContext.functionalThemes
      : [
          "No explicit functional or stakeholder-oriented themes were detected from the notes.",
        ];

  return {
    accomplishments,
    decisions,
    forwardLook,
    functionalImpact,
    functionalThemes,
    generatedSummary: highlights.map(stripMarkdownBullets).join(" "),
    repoAreasTouched: {
      directories: snapshot.topLevelDirectories,
      files: snapshot.topLevelFiles,
    },
    reportTitle: `${repoFullName} sprint change summary`,
    risksAndBlockers,
    scope: {
      defaultBranch: snapshot.defaultBranch,
      endDate,
      repoFullName,
      repoUrl: snapshot.repoUrl,
      startDate,
      topLanguages: snapshot.languages,
    },
    stakeholderHighlights: demoHighlights,
  };
}

export function buildOnboardingMarkdown(input: ReportInput) {
  const { endDate, repoFullName, snapshot, startDate } = input;
  const architectureSignals = inferArchitectureSignals(snapshot);
  const onboardingChecklist = inferOnboardingChecklist(snapshot);

  return `# ${repoFullName} onboarding summary

## Scope
- Repository: [${repoFullName}](${snapshot.repoUrl})
- Date range: ${startDate} to ${endDate}
- Default branch: \`${snapshot.defaultBranch}\`
- Top languages: ${
    snapshot.languages.length > 0 ? snapshot.languages.join(", ") : "Not returned"
  }
- Stars: ${snapshot.stars}
- Open issues: ${snapshot.openIssuesCount}

## What this repo appears to be
${snapshot.description ?? "No repository description is set on GitHub."}

## Architecture signals
${architectureSignals.map((signal) => `- ${signal}`).join("\n")}

## Top-level layout
- Directories: ${
    snapshot.topLevelDirectories.length > 0
      ? snapshot.topLevelDirectories.join(", ")
      : "None returned"
  }
- Files: ${
    snapshot.topLevelFiles.length > 0
      ? snapshot.topLevelFiles.join(", ")
      : "None returned"
  }

## README excerpt
${formatReadmeExcerpt(snapshot)}

## Recent pull requests in scope
${formatPullRequests(snapshot)}

## Recent commits in scope
${formatCommits(snapshot)}

## First-week onboarding checklist
${onboardingChecklist.map((item) => `- ${item}`).join("\n")}

## Suggested next questions
- Which directories are considered stable shared foundations versus active feature work?
- Which recent pull requests reflect architectural decisions that a new contributor should understand first?
- What undocumented setup steps still live in team memory instead of the repository?
`;
}

export function buildSprintSummaryMarkdown(input: ReportInput) {
  const sprintReport = buildSprintReportModel(input);
  const {
    accomplishments,
    decisions,
    forwardLook,
    functionalImpact,
    functionalThemes,
    repoAreasTouched,
    risksAndBlockers,
    scope,
    stakeholderHighlights,
  } = sprintReport;
  const { repoFullName, repoUrl, startDate, endDate, defaultBranch, topLanguages } =
    scope;
  const { snapshot } = input;

  return `# ${repoFullName} sprint change summary

## Scope
- Repository: [${repoFullName}](${repoUrl})
- Sprint window: ${startDate} to ${endDate}
- Default branch: \`${defaultBranch}\`
- Top languages: ${
    topLanguages.length > 0 ? topLanguages.join(", ") : "Not returned"
  }

## What changed this sprint
${accomplishments.map((item) => `- ${item}`).join("\n")}

## Functional themes and stakeholder context
${functionalThemes.map((theme) => `- ${theme}`).join("\n")}

## Why this work matters
${functionalImpact.map((item) => `- ${item}`).join("\n")}

## Decisions captured during the sprint
${decisions.map((item) => `- ${item}`).join("\n")}

## Risks and blockers
${risksAndBlockers.map((item) => `- ${item}`).join("\n")}

## Pull requests in scope
${formatPullRequests(snapshot)}

## Commits in scope
${formatCommits(snapshot)}

## Repo areas touched
- Directories: ${
    repoAreasTouched.directories.length > 0
      ? repoAreasTouched.directories.join(", ")
      : "None returned"
  }
- Files: ${
    repoAreasTouched.files.length > 0
      ? repoAreasTouched.files.join(", ")
      : "None returned"
  }

## Demo or stakeholder-ready highlights
${stakeholderHighlights.map((item) => `- ${item}`).join("\n")}

## Forward look
${forwardLook.map((item) => `- ${item}`).join("\n")}
`;
}
