import type { GithubRepoSnapshot } from "@/lib/github";

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
    signals.push("The repository is structured as a multi-package or monorepo-style codebase.");
  }
  if (names.has("terraform") || snapshot.treePaths.some((path) => path.endsWith(".tf"))) {
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
    checklist.push("Start by mapping each app under `apps/` to its runtime responsibility.");
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

export function buildOnboardingMarkdown(input: {
  endDate: string;
  notes: string;
  repoFullName: string;
  snapshot: GithubRepoSnapshot;
  startDate: string;
}) {
  const { endDate, notes, repoFullName, snapshot, startDate } = input;
  const architectureSignals = inferArchitectureSignals(snapshot);
  const onboardingChecklist = inferOnboardingChecklist(snapshot);

  const commits = snapshot.commits.length
    ? snapshot.commits
        .map(
          (commit) =>
            `- \`${commit.sha}\` ${commit.message} — ${commit.author} ([view commit](${commit.url}))`,
        )
        .join("\n")
    : "- No commits were returned in the selected date range.";

  const pullRequests = snapshot.pullRequests.length
    ? snapshot.pullRequests
        .map((pullRequest) => {
          const status = pullRequest.mergedAt ? "merged" : pullRequest.state;
          return `- PR #${pullRequest.number} ${pullRequest.title} — ${status}, by ${pullRequest.author} ([view PR](${pullRequest.url}))`;
        })
        .join("\n")
    : "- No pull requests were active in the selected date range.";

  const readmeExcerpt = snapshot.readme
    ? snapshot.readme
        .replace(/\r/g, "")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .slice(0, 8)
        .join("\n")
    : "No README content was returned from the repository.";

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
${readmeExcerpt}

## Recent pull requests in scope
${pullRequests}

## Recent commits in scope
${commits}

## Notes ingestion context
${
  notes.trim().length > 0
    ? notes.trim()
    : "No additional notes were provided. When notes ingestion is expanded, attach meeting notes, personal notes, and architectural discussion points here to enrich the summary."
}

## First-week onboarding checklist
${onboardingChecklist.map((item) => `- ${item}`).join("\n")}

## Suggested next questions
- Which directories are considered stable shared foundations versus active feature work?
- Which recent pull requests reflect architectural decisions that a new contributor should understand first?
- What undocumented setup steps still live in team memory instead of the repository?
`;
}
