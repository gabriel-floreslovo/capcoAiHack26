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

type NoteSignals = {
  customerWorkflow: boolean;
  dataQuality: boolean;
  integration: boolean;
  planning: boolean;
  stakeholderStory: boolean;
  validation: boolean;
};

type CodeSignals = {
  automation: boolean;
  dataHandling: boolean;
  deliveryHardened: boolean;
  docsExpanded: boolean;
  uiChanged: boolean;
  workflowChanged: boolean;
};

export type SprintReportModel = {
  accomplishments: string[];
  codeEvidence: string[];
  decisions: string[];
  deliveryContext: string[];
  engineeringWatchouts: string[];
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

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

function formatCommits(snapshot: GithubRepoSnapshot) {
  return snapshot.commits.length > 0
    ? snapshot.commits
        .map(
          (commit) =>
            `- \`${commit.sha}\` ${commit.message} — ${commit.author} ([view commit](${commit.url}))`,
        )
        .join("\n")
    : "- No commits were returned in the selected date range.";
}

function formatPullRequests(snapshot: GithubRepoSnapshot) {
  return snapshot.pullRequests.length > 0
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

function inferNoteSignals(notesContext: ParsedNotesContext): NoteSignals {
  const corpus = [
    ...notesContext.accomplishments,
    ...notesContext.blockers,
    ...notesContext.decisions,
    ...notesContext.functionalThemes,
    ...notesContext.nextSteps,
  ]
    .join(" ")
    .toLowerCase();

  return {
    customerWorkflow:
      /workflow|screen|view|summary|export|handoff|dashboard|experience|user|client|customer|recruiter|candidate/.test(
        corpus,
      ),
    dataQuality:
      /missing|partial|fallback|default|normalize|inconsistent|edge case|empty|optional|conditional|uneven|format/.test(
        corpus,
      ),
    integration:
      /merge|conflict|sync|aligned|align|develop branch|regression|integration|field names|data model/.test(
        corpus,
      ),
    planning:
      /next step|next up|follow up|todo|to do|plan|action|will /.test(corpus),
    stakeholderStory:
      /stakeholder|demo|handoff|meeting|retro|review|business|value|impact/.test(
        corpus,
      ),
    validation:
      /test|testing|validate|validation|verify|check|smoke|edge case|regression/.test(
        corpus,
      ),
  };
}

const EMPTY_CODE_SIGNALS: CodeSignals = {
  automation: false,
  dataHandling: false,
  deliveryHardened: false,
  docsExpanded: false,
  uiChanged: false,
  workflowChanged: false,
};

function normalizePatch(patch: string | null | undefined) {
  return (patch ?? "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\+{1,2}/, "").replace(/^-{1,2}/, ""))
    .join("\n")
    .toLowerCase();
}

function collectPatchCorpus(snapshot: GithubRepoSnapshot) {
  return snapshot.commitDetails
    .flatMap((commit) => commit.changedFiles)
    .map((file) => `${file.path}\n${normalizePatch(file.patch)}`)
    .join("\n");
}

function inferCodeSignals(snapshot: GithubRepoSnapshot): CodeSignals {
  const corpus = collectPatchCorpus(snapshot);
  const changedPaths = snapshot.changedFiles.map((file) => file.path).join("\n");

  return {
    automation:
      /github actions|workflow|cron|ci|pipeline|build|deploy|lint|format|script|task|job|automation/.test(
        corpus,
      ) || /(^|\/)\.github(\/|$)|package(-lock)?\.json|dockerfile/i.test(changedPaths),
    dataHandling:
      /fallback|default|normalize|sanitize|parse|map|filter|transform|optional|missing|null|undefined|empty|inconsistent|validation|schema|type|model|payload/.test(
        corpus,
      ) || /types?|schema|model|data|payload|api|service/i.test(changedPaths),
    deliveryHardened:
      /test|spec|assert|expect|verify|smoke|mock|edge case|error|try|catch|guard|retry|safe|validation/.test(
        corpus,
      ) || /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(spec|test)\.[^.]+$/i.test(changedPaths),
    docsExpanded:
      /readme|docs?|changelog|guide|comment|example|notes?/.test(corpus) ||
      /(^|\/)docs(\/|$)|\.mdx?$/i.test(changedPaths),
    uiChanged:
      /screen|page|view|component|ui|layout|dialog|modal|form|button|table|sidebar|dashboard|summary/.test(
        corpus,
      ) || /(^|\/)(app|pages|components|ui|styles)(\/|$)|\.(tsx|jsx|css|scss)$/i.test(changedPaths),
    workflowChanged:
      /export|import|share|review|handoff|onboard|summary|report|sprint|candidate|recruiter|stakeholder|meeting/.test(
        corpus,
      ),
  };
}

function summarizeCodeInsights(snapshot: GithubRepoSnapshot) {
  const signals = inferCodeSignals(snapshot);
  const insights: string[] = [];

  if (signals.workflowChanged) {
    insights.push(
      "The code changes show the team shaping a workflow or output path, which is stronger evidence than notes alone that the product surface moved forward.",
    );
  }
  if (signals.uiChanged) {
    insights.push(
      "The diffs touched visible UI or layout code, so the sprint likely changed how people experience the product directly.",
    );
  }
  if (signals.dataHandling) {
    insights.push(
      "The patches suggest work on data shaping, normalization, or model boundaries, which usually means the team was improving how messy inputs flow through the system.",
    );
  }
  if (signals.deliveryHardened) {
    insights.push(
      "The code also points to delivery hardening through tests, guards, or error handling, which is a useful sign that the work is being made dependable and demo-ready.",
    );
  }
  if (signals.automation) {
    insights.push(
      "Repository changes also hint at automation or workflow tooling, which suggests the sprint affected how the team ships or validates work, not just product behavior.",
    );
  }
  if (signals.docsExpanded) {
    insights.push(
      "Documentation moved alongside implementation, which usually means the code change was important enough to preserve for future contributors.",
    );
  }

  if (insights.length === 0) {
    insights.push(
      "The diff evidence is more structural than descriptive, so the safest read is that the sprint changed implementation details without enough patch text to infer a stronger product story.",
    );
  }

  return { insights, signals };
}

function topChangedDirectories(snapshot: GithubRepoSnapshot, limit = 5) {
  return snapshot.changeSummary.directoryBreakdown.slice(0, limit);
}

function topChangedFiles(snapshot: GithubRepoSnapshot, limit = 5) {
  return snapshot.changedFiles.slice(0, limit);
}

function formatDirectoryBreakdown(snapshot: GithubRepoSnapshot, limit = 4) {
  const directories = topChangedDirectories(snapshot, limit);

  return directories.length > 0
    ? directories
        .map((directory) => `${directory.path} (${directory.filesChanged})`)
        .join(", ")
    : "No directory breakdown was available.";
}

function formatFileTypeBreakdown(snapshot: GithubRepoSnapshot, limit = 4) {
  const fileTypes = snapshot.changeSummary.fileTypeBreakdown.slice(0, limit);

  return fileTypes.length > 0
    ? fileTypes
        .map((fileType) => `${fileType.extension} (${fileType.filesChanged})`)
        .join(", ")
    : "No file type breakdown was available.";
}

function formatChangedFileBreakdown(snapshot: GithubRepoSnapshot, limit = 4) {
  const files = topChangedFiles(snapshot, limit);

  return files.length > 0
    ? files
        .map((file) => `${file.path} (${formatCount(file.changes)} changes)`)
        .join(", ")
    : "No file-level change evidence was available.";
}

function hasChangedPath(snapshot: GithubRepoSnapshot, matcher: RegExp) {
  return snapshot.changedFiles.some(
    (file) => matcher.test(file.path) || matcher.test(file.directory),
  );
}

function inferRepoAreasTouched(snapshot: GithubRepoSnapshot) {
  const directories = topChangedDirectories(snapshot, 6).map(
    (directory) => directory.path,
  );
  const files = topChangedFiles(snapshot, 6).map((file) => file.path);

  return {
    directories:
      directories.length > 0 ? directories : snapshot.topLevelDirectories,
    files: files.length > 0 ? files : snapshot.topLevelFiles,
  };
}

function inferChangeEvidence(snapshot: GithubRepoSnapshot) {
  if (snapshot.changeSummary.filesChanged === 0) {
    return [
      "GitHub returned commits and metadata, but detailed file-change evidence was not available for the selected window.",
    ];
  }

  return [
    `Diff analysis covered ${formatCount(snapshot.changeSummary.analyzedCommitCount)} recent commit${snapshot.changeSummary.analyzedCommitCount === 1 ? "" : "s"} and found ${formatCount(snapshot.changeSummary.filesChanged)} changed files, ${formatCount(snapshot.changeSummary.additions)} additions, and ${formatCount(snapshot.changeSummary.deletions)} deletions.`,
    `The most active delivery areas were ${formatDirectoryBreakdown(snapshot)}.`,
    `The most common file types in motion were ${formatFileTypeBreakdown(snapshot)}.`,
    `The largest file-level changes were concentrated in ${formatChangedFileBreakdown(snapshot)}.`,
  ];
}

function inferDeliveryContext(
  snapshot: GithubRepoSnapshot,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const context: string[] = [];
  const hasUiChange = hasChangedPath(
    snapshot,
    /(^|\/)(app|pages|components|ui|styles)(\/|$)|\.(tsx|jsx|css|scss)$/i,
  );
  const hasApiChange = hasChangedPath(
    snapshot,
    /(^|\/)(api|server|backend|services?|controllers?|routes?)(\/|$)|\.(py|go|rb|java|cs)$/i,
  );
  const hasDataContractChange = hasChangedPath(
    snapshot,
    /(^|\/)(types?|models?|schema|schemas)(\/|$)|\.(prisma|sql)$/i,
  );
  const hasTestChange = hasChangedPath(
    snapshot,
    /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(spec|test)\.[^.]+$/i,
  );
  const hasDocsChange = hasChangedPath(snapshot, /(^|\/)docs(\/|$)|\.mdx?$/i);
  const hasConfigChange = hasChangedPath(
    snapshot,
    /(^|\/)\.github(\/|$)|(^|\/)(package(-lock)?\.json|tsconfig\.json|next\.config\.(js|ts)|docker-compose\.(yml|yaml)|Dockerfile|eslint\.config\.(js|mjs|cjs)|prettier\.config\.(js|mjs|cjs)|pnpm-lock\.yaml)$/i,
  );

  if (hasUiChange) {
    context.push(
      "Recent diffs touched UI or application-facing surfaces, which suggests the sprint affected what users or stakeholders see directly.",
    );
  }
  if (codeSignals.workflowChanged) {
    context.push(
      "The patch text shows concrete workflow or output changes, which is better evidence of trajectory than commit titles alone.",
    );
  }
  if (hasApiChange) {
    context.push(
      "Server-side or API-oriented files changed in the same window, so at least part of the work extended beyond presentation-only updates.",
    );
  }
  if (hasDataContractChange) {
    context.push(
      "Type, model, or schema-related changes suggest the sprint also adjusted the shape of data moving through the product.",
    );
  }
  if (codeSignals.dataHandling) {
    context.push(
      "Patch contents point to data shaping or boundary management, which often means the implementation is adapting the product contract itself.",
    );
  }
  if (hasTestChange || noteSignals.validation) {
    context.push(
      "Validation and delivery hardening were part of the sprint, either through explicit test changes or through notes that point to verification work.",
    );
  }
  if (codeSignals.automation) {
    context.push(
      "The code also suggests automation or workflow tooling improvements, which can change how the team ships or verifies future work.",
    );
  }
  if (hasDocsChange) {
    context.push(
      "Documentation moved alongside implementation, which improves handoff and future onboarding quality.",
    );
  }
  if (hasConfigChange) {
    context.push(
      "Tooling or configuration files changed during the sprint, so delivery context included environment or workflow adjustments as well.",
    );
  }

  if (context.length === 0) {
    context.push(
      "The repository activity looks concentrated enough that delivery context should be confirmed with a quick walkthrough of the active directories and pull requests.",
    );
  }

  return context;
}

function inferEngineeringWatchouts(snapshot: GithubRepoSnapshot) {
  const watchouts: string[] = [];
  const hasImplementationChange = hasChangedPath(
    snapshot,
    /\.(ts|tsx|js|jsx|py|go|rb|java|cs)$/i,
  );
  const hasTestChange = hasChangedPath(
    snapshot,
    /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(spec|test)\.[^.]+$/i,
  );
  const hasDocsChange = hasChangedPath(snapshot, /(^|\/)docs(\/|$)|\.mdx?$/i);
  const hasConfigChange = hasChangedPath(
    snapshot,
    /(^|\/)\.github(\/|$)|(^|\/)(package(-lock)?\.json|tsconfig\.json|next\.config\.(js|ts)|docker-compose\.(yml|yaml)|Dockerfile|eslint\.config\.(js|mjs|cjs)|prettier\.config\.(js|mjs|cjs)|pnpm-lock\.yaml)$/i,
  );

  if (hasImplementationChange && !hasTestChange) {
    watchouts.push(
      "Recent implementation changes do not show obvious test-file updates in the selected window, so ask the team how this area is being validated.",
    );
  }
  if (hasConfigChange) {
    watchouts.push(
      "Because tooling or configuration changed recently, verify local setup and CI expectations before making your first contribution.",
    );
  }
  if (snapshot.changeSummary.directoryBreakdown.length >= 6) {
    watchouts.push(
      "Recent work spans several directories, which can mean dependency boundaries are still evolving across the codebase.",
    );
  }
  if (!hasDocsChange && snapshot.openIssuesCount > 0) {
    watchouts.push(
      "Open issues remain while docs did not visibly change in this window, so some operational knowledge may still live with the team instead of the repo.",
    );
  }

  if (watchouts.length === 0) {
    watchouts.push(
      "No major onboarding watchouts surfaced from the recent diff slice, but runtime setup and team conventions should still be confirmed.",
    );
  }

  return watchouts;
}

function inferCodeWatchouts(snapshot: GithubRepoSnapshot, codeSignals: CodeSignals) {
  const watchouts: string[] = [];

  if (codeSignals.uiChanged && !codeSignals.deliveryHardened) {
    watchouts.push(
      "The code touched user-facing surfaces without obvious test or guardrail signals, so verify the visible flows carefully.",
    );
  }
  if (codeSignals.dataHandling && !codeSignals.deliveryHardened) {
    watchouts.push(
      "Data shaping changed in the code, but the patch evidence does not clearly show defensive handling for malformed inputs.",
    );
  }
  if (codeSignals.workflowChanged && !codeSignals.docsExpanded) {
    watchouts.push(
      "A workflow changed in code without parallel documentation movement, so the next contributor may need extra context from the team.",
    );
  }

  return watchouts;
}

function inferSprintHighlights(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const highlights: string[] = [];

  if (noteSignals.customerWorkflow || noteSignals.stakeholderStory) {
    highlights.push(
      "The sprint appears to have moved a user-facing or stakeholder-facing workflow forward rather than stopping at purely internal engineering cleanup.",
    );
  }
  if (noteSignals.dataQuality) {
    highlights.push(
      "A meaningful part of the work focused on making the experience safer when source data is incomplete, inconsistent, or unevenly structured.",
    );
  }
  if (codeSignals.workflowChanged) {
    highlights.push(
      "The code itself shows the team shipped a workflow or output change, which makes the sprint story more concrete than the notes alone.",
    );
  }
  if (codeSignals.dataHandling) {
    highlights.push(
      "Patch evidence points to data shaping or model boundary work, which usually means the team was hardening how the product behaves with real input.",
    );
  }
  if (noteSignals.integration) {
    highlights.push(
      "The delivery story included merge or integration follow-through, which matters because it turns isolated branch work into shared team progress.",
    );
  }
  if (noteSignals.validation || notesContext.blockers.length > 0) {
    highlights.push(
      "Notes from the sprint show attention to edge cases and validation, suggesting the team spent time reducing handoff and demo risk.",
    );
  }
  if (snapshot.changeSummary.filesChanged > 0) {
    highlights.push(
      `GitHub evidence supports that story with ${formatCount(snapshot.changeSummary.filesChanged)} changed files across ${formatCount(snapshot.changeSummary.directoryBreakdown.length)} active directory areas.`,
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      "The repository returned enough activity to confirm progress, but the strongest sprint story will still come from pairing the GitHub output with richer notes or meeting context.",
    );
  }

  return highlights;
}

function inferForwardLook(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const forwardLook: string[] = [];
  const hasDocsChange = hasChangedPath(snapshot, /(^|\/)docs(\/|$)|\.mdx?$/i);

  if (noteSignals.dataQuality) {
    forwardLook.push(
      "Keep validating sparse, partial, or unusually formatted inputs so the improved workflow holds up beyond the happy path.",
    );
  }
  if (codeSignals.dataHandling) {
    forwardLook.push(
      "Keep pressure-testing the new data boundaries because the code indicates this sprint changed how inputs are normalized or interpreted.",
    );
  }
  if (noteSignals.customerWorkflow) {
    forwardLook.push(
      "Run the delivered workflow with real stakeholder scenarios to confirm the new experience is clear enough for handoff, demos, or recurring team use.",
    );
  }
  if (noteSignals.integration) {
    forwardLook.push(
      "Protect the merged path with regression checks so future branch work does not quietly reintroduce model or integration drift.",
    );
  }
  if (codeSignals.automation) {
    forwardLook.push(
      "If the code touched automation or workflows, lock down the next path with repeatable checks so the new behavior stays stable.",
    );
  }
  if (snapshot.openIssuesCount > 0) {
    forwardLook.push(
      `Review the ${snapshot.openIssuesCount} open GitHub issue${snapshot.openIssuesCount === 1 ? "" : "s"} and decide which items belong in the next delivery slice versus backlog maintenance.`,
    );
  }
  if (notesContext.nextSteps.length > 0) {
    forwardLook.push(
      "The captured notes already imply active follow-up work, so the next sprint should formalize those items into explicit owners and acceptance checks.",
    );
  }
  if (!hasDocsChange) {
    forwardLook.push(
      "Capture any newly learned setup, edge-case, or workflow behavior in docs while the implementation context is still fresh.",
    );
  }

  if (forwardLook.length === 0) {
    forwardLook.push(
      "Use the most active directories, recent pull requests, and any sprint notes to define the next implementation slice with clear ownership.",
    );
  }

  return forwardLook;
}

function inferFunctionalImpact(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const impact: string[] = [];
  const hasUiChange = hasChangedPath(
    snapshot,
    /(^|\/)(app|pages|components|ui|styles)(\/|$)|\.(tsx|jsx|css|scss)$/i,
  );
  const hasDocsChange = hasChangedPath(snapshot, /(^|\/)docs(\/|$)|\.mdx?$/i);

  if (noteSignals.customerWorkflow || hasUiChange) {
    impact.push(
      "The sprint likely changed a visible workflow or presentation layer, which makes the work easier to demonstrate and easier for stakeholders to evaluate.",
    );
  }
  if (codeSignals.workflowChanged) {
    impact.push(
      "The patch text shows the delivered workflow changed in code, which is strong evidence that users or stakeholders will notice the result directly.",
    );
  }
  if (noteSignals.dataQuality) {
    impact.push(
      "More resilient handling of incomplete or inconsistent inputs reduces manual cleanup, awkward blank states, and downstream confusion for users.",
    );
  }
  if (codeSignals.dataHandling) {
    impact.push(
      "The implementation appears to have tightened how data is transformed or validated, reducing the chance of awkward states reaching the end user.",
    );
  }
  if (noteSignals.integration) {
    impact.push(
      "Closing the gap between implementation and integration reduced the risk that work would remain stranded in a branch instead of becoming team-usable capability.",
    );
  }
  if (codeSignals.deliveryHardened) {
    impact.push(
      "Tests, guards, or error-handling changes in the diff improve confidence that the delivered behavior will survive real usage rather than only local demos.",
    );
  }
  if (noteSignals.validation || notesContext.blockers.length > 0) {
    impact.push(
      "Validation work raises confidence for demos, stakeholder reviews, and follow-on development because it surfaces fragile edges earlier.",
    );
  }
  if (hasDocsChange) {
    impact.push(
      "Documentation movement during the sprint lowers handoff friction and shortens the ramp for the next contributor.",
    );
  }

  if (impact.length === 0) {
    impact.push(
      "The available evidence clearly shows engineering progress, but additional product or stakeholder context would sharpen the business impact story.",
    );
  }

  return impact;
}

function inferSuggestedDemoHighlights(
  snapshot: GithubRepoSnapshot,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const highlights: string[] = [];

  if (noteSignals.customerWorkflow) {
    highlights.push(
      "Frame the sprint around the user workflow that improved, then use the changed directories and pull requests as proof that the work made it into the codebase.",
    );
  }
  if (codeSignals.workflowChanged) {
    highlights.push(
      "Lead with the code-level workflow change, because it gives the demo a clear before-and-after story even if the notes are thin.",
    );
  }
  if (noteSignals.dataQuality) {
    highlights.push(
      "Call out how the team handled incomplete or uneven data, because that translates technical hardening into a clear user-value story.",
    );
  }
  if (codeSignals.dataHandling) {
    highlights.push(
      "Call out the data-handling changes explicitly so stakeholders hear the risk reduction story, not just the feature description.",
    );
  }
  if (noteSignals.integration || noteSignals.validation) {
    highlights.push(
      "Explain that the sprint covered implementation plus integration or validation, not just feature coding in isolation.",
    );
  }
  if (snapshot.changeSummary.filesChanged > 0) {
    highlights.push(
      `Use the active delivery areas (${formatDirectoryBreakdown(snapshot, 3)}) as concrete evidence behind the stakeholder narrative.`,
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      "Use the recent GitHub changes as proof points and pair them with a short spoken narrative about why the work matters.",
    );
  }

  return highlights;
}

function inferAccomplishmentSummary(
  snapshot: GithubRepoSnapshot,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const accomplishments: string[] = [];

  if (noteSignals.customerWorkflow) {
    accomplishments.push(
      "Delivered progress on a user-facing or stakeholder-facing workflow instead of limiting the sprint to internal code cleanup.",
    );
  }
  if (codeSignals.workflowChanged) {
    accomplishments.push(
      "Shipped a concrete workflow or output change in the codebase, which is stronger evidence of delivery than a status note alone.",
    );
  }
  if (noteSignals.dataQuality) {
    accomplishments.push(
      "Improved the experience for incomplete, inconsistent, or partially available data so the output remains usable under less-than-ideal conditions.",
    );
  }
  if (codeSignals.dataHandling) {
    accomplishments.push(
      "Improved data normalization, validation, or model boundaries in the implementation so the product behaves more predictably.",
    );
  }
  if (snapshot.changeSummary.filesChanged > 0) {
    accomplishments.push(
      `Implemented changes across ${formatCount(snapshot.changeSummary.filesChanged)} files, with the heaviest activity in ${formatDirectoryBreakdown(snapshot, 3)}.`,
    );
  }
  if (noteSignals.integration && snapshot.pullRequests.length > 0) {
    accomplishments.push(
      "Carried the work through merge and integration so the sprint ended with shared-branch progress rather than isolated branch work.",
    );
  }
  if (noteSignals.validation) {
    accomplishments.push(
      "Paired delivery work with validation, edge-case review, or smoke testing before handoff.",
    );
  }
  if (codeSignals.deliveryHardened) {
    accomplishments.push(
      "Added guardrails in the code through tests, error handling, or defensive checks to make the change safer to operate.",
    );
  }

  if (accomplishments.length === 0) {
    if (snapshot.pullRequests.length > 0) {
      accomplishments.push(
        `Closed meaningful delivery work through ${snapshot.pullRequests.length} pull request${snapshot.pullRequests.length === 1 ? "" : "s"} in the selected window.`,
      );
    } else if (snapshot.commits.length > 0) {
      accomplishments.push(
        `The repository shows ${snapshot.commits.length} recent commit${snapshot.commits.length === 1 ? "" : "s"} in scope, which confirms implementation progress during the sprint.`,
      );
    } else {
      accomplishments.push(
        "The available sprint evidence shows repository activity, but the top accomplishments still need richer supporting context.",
      );
    }
  }

  return accomplishments.slice(0, 5);
}

function inferDecisionSummary(
  snapshot: GithubRepoSnapshot,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const decisions: string[] = [];

  if (noteSignals.dataQuality) {
    decisions.push(
      "The team chose to handle incomplete or inconsistent data more deliberately instead of exposing uneven states directly to users.",
    );
  }
  if (codeSignals.workflowChanged) {
    decisions.push(
      "The team decided to change the workflow or output shape directly in code rather than leaving it as an external process step.",
    );
  }
  if (noteSignals.integration) {
    decisions.push(
      "The sprint included an explicit integration pass to align new work with the current branch and evolving implementation model.",
    );
  }
  if (noteSignals.validation) {
    decisions.push(
      "Validation of edge cases was treated as part of delivery, not as a separate cleanup phase after implementation.",
    );
  }
  if (codeSignals.automation) {
    decisions.push(
      "Automation or workflow tooling was updated, which suggests the team chose to invest in repeatability instead of manual follow-up.",
    );
  }
  if (
    hasChangedPath(
      snapshot,
      /(^|\/)\.github(\/|$)|(^|\/)(package(-lock)?\.json|tsconfig\.json|next\.config\.(js|ts)|docker-compose\.(yml|yaml)|Dockerfile)$/i,
    )
  ) {
    decisions.push(
      "Tooling or environment files moved during the sprint, which suggests delivery decisions were made around setup, build, or execution flow as well.",
    );
  }

  if (decisions.length === 0) {
    if (snapshot.pullRequests.length > 0) {
      decisions.push(
        "The active pull requests are the best available proxy for the sprint's decision trail and should be reviewed alongside the generated recap.",
      );
    } else {
      decisions.push(
        "No strong decision signal surfaced from the current artifacts, so major sprint choices should be confirmed in conversation or meeting notes.",
      );
    }
  }

  return decisions.slice(0, 5);
}

function inferRiskSummary(
  snapshot: GithubRepoSnapshot,
  notesContext: ParsedNotesContext,
  noteSignals: NoteSignals,
  codeSignals: CodeSignals,
) {
  const risks: string[] = [];

  if (noteSignals.dataQuality) {
    risks.push(
      "Data completeness and consistency remain a delivery risk area, so the team should keep testing the workflow against sparse or irregular inputs.",
    );
  }
  if (codeSignals.dataHandling && !codeSignals.deliveryHardened) {
    risks.push(
      "Because the code is changing data boundaries without obvious guardrails, malformed input could still expose edge cases later.",
    );
  }
  if (noteSignals.integration) {
    risks.push(
      "When branches and data models evolve quickly, integration drift can reappear unless merged paths are checked continuously.",
    );
  }
  if (noteSignals.validation || notesContext.blockers.length > 0) {
    risks.push(
      "Edge-case behavior still needs attention because validation surfaced that the fragile cases are not always the same as the happy path.",
    );
  }
  if (
    snapshot.changeSummary.filesChanged > 0 &&
    !hasChangedPath(
      snapshot,
      /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(spec|test)\.[^.]+$/i,
    )
  ) {
    risks.push(
      "Recent implementation changes are not obviously paired with test-file changes, so confidence may depend on manual verification or broader integration checks.",
    );
  }
  if (codeSignals.workflowChanged && !codeSignals.docsExpanded) {
    risks.push(
      "A workflow changed in code without a documentation signal, so the handoff story may still be incomplete.",
    );
  }

  if (risks.length === 0) {
    risks.push(
      "No explicit blockers were surfaced from the current artifacts, but validation and handoff assumptions should still be confirmed with the team.",
    );
  }

  return risks.slice(0, 5);
}

function inferFunctionalThemesSummary(
  noteSignals: NoteSignals,
  notesContext: ParsedNotesContext,
  codeSignals: CodeSignals,
) {
  const themes: string[] = [];

  if (noteSignals.customerWorkflow) {
    themes.push(
      "The sprint centered on improving a real workflow or output that other people will consume, not just internal implementation structure.",
    );
  }
  if (codeSignals.workflowChanged) {
    themes.push(
      "The product trajectory is visible in the code itself: the team changed how a workflow, summary, or output is produced.",
    );
  }
  if (noteSignals.dataQuality) {
    themes.push(
      "A major theme was resilience when the underlying information is incomplete, uneven, or otherwise not presentation-ready.",
    );
  }
  if (codeSignals.dataHandling) {
    themes.push(
      "The implementation focused on making data flow more durable, which is a sign of product hardening rather than cosmetic change.",
    );
  }
  if (noteSignals.validation) {
    themes.push(
      "Trust in the delivered experience depended on validating edge cases and confirming that the workflow still reads cleanly under pressure.",
    );
  }
  if (codeSignals.deliveryHardened) {
    themes.push(
      "The sprint emphasized safer delivery by pairing feature work with defensive coding and verification signals.",
    );
  }
  if (noteSignals.integration) {
    themes.push(
      "Shared-branch readiness and integration stability were part of the sprint narrative, not just something left for later.",
    );
  }
  if (noteSignals.stakeholderStory || notesContext.functionalThemes.length > 0) {
    themes.push(
      "The work can be framed in stakeholder terms because the notes imply downstream consumption in demos, reviews, or operational handoffs.",
    );
  }

  if (themes.length === 0) {
    themes.push(
      "The available notes did not expose a strong functional theme, so the sprint story should be sharpened with more user or stakeholder context.",
    );
  }

  return themes.slice(0, 5);
}

function inferOnboardingChecklist(
  snapshot: GithubRepoSnapshot,
  engineeringWatchouts: string[],
) {
  const checklist = [
    `Read the README and confirm how ${snapshot.defaultBranch} is used as the default branch.`,
    "Clone the repository and install dependencies before touching workflow-specific files.",
    "Review the most active directories from the recent diff window before diving into individual files.",
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
  if (engineeringWatchouts.length > 0) {
    checklist.push(
      "Before your first change, sanity-check the recent watchouts section against current team expectations.",
    );
  }

  return checklist;
}

export function buildSprintReportModel(input: ReportInput): SprintReportModel {
  const { endDate, notes, repoFullName, snapshot, startDate } = input;
  const notesContext = parseNotesContext(notes);
  const noteSignals = inferNoteSignals(notesContext);
  const codeInsights = summarizeCodeInsights(snapshot);
  const codeSignals = codeInsights.signals;
  const codeEvidence = inferChangeEvidence(snapshot);
  const deliveryContext = inferDeliveryContext(snapshot, noteSignals, codeSignals);
  const engineeringWatchouts = inferEngineeringWatchouts(snapshot);
  const codeWatchouts = inferCodeWatchouts(snapshot, codeSignals);
  const highlights = inferSprintHighlights(
    snapshot,
    notesContext,
    noteSignals,
    codeSignals,
  );
  const functionalImpact = inferFunctionalImpact(
    snapshot,
    notesContext,
    noteSignals,
    codeSignals,
  );
  const forwardLook = inferForwardLook(
    snapshot,
    notesContext,
    noteSignals,
    codeSignals,
  );
  const stakeholderHighlights = inferSuggestedDemoHighlights(
    snapshot,
    noteSignals,
    codeSignals,
  );
  const accomplishments = inferAccomplishmentSummary(
    snapshot,
    noteSignals,
    codeSignals,
  );
  const decisions = inferDecisionSummary(snapshot, noteSignals, codeSignals);
  const risksAndBlockers = inferRiskSummary(
    snapshot,
    notesContext,
    noteSignals,
    codeSignals,
  );
  const functionalThemes = inferFunctionalThemesSummary(noteSignals, notesContext, codeSignals);
  const repoAreasTouched = inferRepoAreasTouched(snapshot);

  return {
    accomplishments,
    codeEvidence,
    decisions,
    deliveryContext: [...codeInsights.insights, ...deliveryContext],
    engineeringWatchouts: [...codeWatchouts, ...engineeringWatchouts],
    forwardLook,
    functionalImpact,
    functionalThemes,
    generatedSummary: highlights.slice(0, 3).join(" "),
    repoAreasTouched,
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
    stakeholderHighlights,
  };
}

export function buildOnboardingMarkdown(input: ReportInput) {
  const { endDate, repoFullName, snapshot, startDate } = input;
  const architectureSignals = inferArchitectureSignals(snapshot);
  const engineeringWatchouts = inferEngineeringWatchouts(snapshot);
  const onboardingChecklist = inferOnboardingChecklist(
    snapshot,
    engineeringWatchouts,
  );
  const deliveryContext = inferDeliveryContext(snapshot, {
    customerWorkflow: false,
    dataQuality: false,
    integration: false,
    planning: false,
    stakeholderStory: false,
    validation: false,
  }, EMPTY_CODE_SIGNALS);

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

## Recent delivery hotspots
${inferChangeEvidence(snapshot).map((item) => `- ${item}`).join("\n")}

## Recent engineering context
${deliveryContext.map((item) => `- ${item}`).join("\n")}

## Watchouts for a new contributor
${engineeringWatchouts.map((item) => `- ${item}`).join("\n")}

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
- Which of the recently active directories are stable foundations versus still-evolving feature work?
- What validation path should a new contributor trust first: automated tests, manual smoke tests, or reviewer walkthroughs?
- Which workflow assumptions are still living in team memory instead of the repository docs?
`;
}

export function buildSprintSummaryMarkdown(input: ReportInput) {
  const sprintReport = buildSprintReportModel(input);
  const {
    accomplishments,
    codeEvidence,
    decisions,
    deliveryContext,
    engineeringWatchouts,
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

## Code evidence from GitHub
${codeEvidence.map((item) => `- ${item}`).join("\n")}

## Delivery context
${deliveryContext.map((item) => `- ${item}`).join("\n")}

## Functional themes and stakeholder context
${functionalThemes.map((theme) => `- ${theme}`).join("\n")}

## Why this work matters
${functionalImpact.map((item) => `- ${item}`).join("\n")}

## Decisions captured during the sprint
${decisions.map((item) => `- ${item}`).join("\n")}

## Risks and blockers
${risksAndBlockers.map((item) => `- ${item}`).join("\n")}

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

## Onboarding and engineering watchouts
${engineeringWatchouts.map((item) => `- ${item}`).join("\n")}

## Pull requests in scope
${formatPullRequests(snapshot)}

## Commits in scope
${formatCommits(snapshot)}

## Forward look
${forwardLook.map((item) => `- ${item}`).join("\n")}
`;
}
