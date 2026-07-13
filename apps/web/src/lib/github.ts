const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

type GithubRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export type GithubRepoOption = {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  isPrivate: boolean;
  updatedAt: string;
};

export type GithubChangedFile = {
  additions: number;
  changes: number;
  deletions: number;
  directory: string;
  extension: string;
  path: string;
  patch: string | null;
  sourceCommitShas: string[];
  status: string;
};

export type GithubRepoSnapshot = {
  changeSummary: {
    additions: number;
    analyzedCommitCount: number;
    deletions: number;
    directoryBreakdown: Array<{
      filesChanged: number;
      path: string;
    }>;
    fileTypeBreakdown: Array<{
      extension: string;
      filesChanged: number;
    }>;
    filesChanged: number;
    statusBreakdown: Array<{
      filesChanged: number;
      status: string;
    }>;
  };
  changedFiles: GithubChangedFile[];
  commits: Array<{
    author: string;
    message: string;
    sha: string;
    url: string;
  }>;
  commitDetails: Array<{
    author: string;
    changedFiles: GithubChangedFile[];
    message: string;
    sha: string;
    url: string;
  }>;
  defaultBranch: string;
  description: string | null;
  languages: string[];
  openIssuesCount: number;
  pullRequests: Array<{
    author: string;
    mergedAt: string | null;
    number: number;
    state: string;
    title: string;
    updatedAt: string;
    url: string;
  }>;
  readme: string | null;
  repoUrl: string;
  rootEntries: string[];
  stars: number;
  topLevelDirectories: string[];
  topLevelFiles: string[];
  treePaths: string[];
};

type GitTreeResponse = {
  tree: Array<{
    path: string;
    type: "blob" | "tree";
  }>;
};

type CommitDetailResponse = {
  files?: Array<{
    additions: number;
    changes: number;
    deletions: number;
    filename: string;
    patch?: string;
    status: string;
  }>;
};

type CommitDetailFile = NonNullable<CommitDetailResponse["files"]>[number];

type RepoResponse = {
  default_branch: string;
  description: string | null;
  full_name: string;
  html_url: string;
  open_issues_count: number;
  private: boolean;
  stargazers_count: number;
  updated_at: string;
};

const MAX_COMMITS_IN_SCOPE = 15;

function deriveDirectory(path: string) {
  const segments = path.split("/");

  if (segments.length <= 1) {
    return "(root)";
  }

  return segments.slice(0, Math.min(2, segments.length - 1)).join("/");
}

function deriveExtension(path: string) {
  const fileName = path.split("/").at(-1) ?? path;

  if (fileName === "Dockerfile") {
    return "dockerfile";
  }

  if (fileName.startsWith(".") && !fileName.includes(".", 1)) {
    return fileName.toLowerCase();
  }

  const extensionIndex = fileName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return "(none)";
  }

  return fileName.slice(extensionIndex + 1).toLowerCase();
}

function normalizeFileChange(
  file: CommitDetailFile,
  sourceCommitSha: string,
): GithubChangedFile {
  return {
    additions: file.additions,
    changes: file.changes,
    deletions: file.deletions,
    directory: deriveDirectory(file.filename),
    extension: deriveExtension(file.filename),
    path: file.filename,
    patch: file.patch ?? null,
    sourceCommitShas: [sourceCommitSha],
    status: file.status,
  };
}

function mergeChangedFiles(files: GithubChangedFile[]) {
  const byPath = new Map<string, GithubChangedFile>();
  const directoryCounts = new Map<string, number>();
  const fileTypeCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();

  for (const file of files) {
    directoryCounts.set(file.directory, (directoryCounts.get(file.directory) ?? 0) + 1);
    fileTypeCounts.set(file.extension, (fileTypeCounts.get(file.extension) ?? 0) + 1);
    statusCounts.set(file.status, (statusCounts.get(file.status) ?? 0) + 1);

    const existing = byPath.get(file.path);

    if (existing) {
      existing.additions += file.additions;
      existing.changes += file.changes;
      existing.deletions += file.deletions;
      existing.sourceCommitShas = Array.from(
        new Set([...existing.sourceCommitShas, ...file.sourceCommitShas]),
      );
      existing.status =
        existing.status === file.status ? existing.status : "mixed";
      continue;
    }

    byPath.set(file.path, { ...file });
  }

  const changedFiles = Array.from(byPath.values()).sort(
    (left, right) =>
      right.changes - left.changes ||
      right.additions - left.additions ||
      left.path.localeCompare(right.path),
  );

  return {
    changedFiles,
    directoryBreakdown: Array.from(directoryCounts.entries())
      .map(([path, filesChanged]) => ({ filesChanged, path }))
      .sort(
        (left, right) =>
          right.filesChanged - left.filesChanged || left.path.localeCompare(right.path),
      )
      .slice(0, 12),
    fileTypeBreakdown: Array.from(fileTypeCounts.entries())
      .map(([extension, filesChanged]) => ({ extension, filesChanged }))
      .sort(
        (left, right) =>
          right.filesChanged - left.filesChanged ||
          left.extension.localeCompare(right.extension),
      )
      .slice(0, 12),
    statusBreakdown: Array.from(statusCounts.entries())
      .map(([status, filesChanged]) => ({ filesChanged, status }))
      .sort(
        (left, right) =>
          right.filesChanged - left.filesChanged || left.status.localeCompare(right.status),
      ),
  };
}

function buildHeaders(token: string, extraHeaders?: Record<string, string>) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    ...extraHeaders,
  };
}

async function githubRequest<T>(
  path: string,
  token: string,
  init: GithubRequestInit = {},
) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: buildHeaders(token, init.headers),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub request failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

async function githubTextRequest(path: string, token: string) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: buildHeaders(token, {
      Accept: "application/vnd.github.raw+json",
    }),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub request failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  return response.text();
}

export function parseRepoFullName(fullName: string) {
  const [owner, repo] = fullName.trim().split("/");

  if (!owner || !repo) {
    throw new Error("Repository must be in the format owner/repo.");
  }

  return { owner, repo };
}

export async function listAccessibleRepos(token: string) {
  const repos = await githubRequest<RepoResponse[]>(
    "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
    token,
  );

  return repos
    .map((repo) => ({
      defaultBranch: repo.default_branch,
      description: repo.description,
      fullName: repo.full_name,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getRepoSnapshot(
  token: string,
  fullName: string,
  startDate: string,
  endDate: string,
): Promise<GithubRepoSnapshot> {
  const { owner, repo } = parseRepoFullName(fullName);
  const repoPath = `/repos/${owner}/${repo}`;
  const repoDetails = await githubRequest<RepoResponse>(repoPath, token);

  const [languages, readme, rootEntries, tree, commits, pullRequests] =
    await Promise.all([
      githubRequest<Record<string, number>>(`${repoPath}/languages`, token),
      githubTextRequest(`${repoPath}/readme`, token),
      githubRequest<Array<{ name: string; type: "file" | "dir" }>>(
        `${repoPath}/contents`,
        token,
      ),
      githubRequest<GitTreeResponse>(
        `${repoPath}/git/trees/${encodeURIComponent(
          repoDetails.default_branch,
        )}?recursive=1`,
        token,
      ),
      githubRequest<
        Array<{
          commit: {
            author: { name: string };
            message: string;
          };
          html_url: string;
          sha: string;
        }>
      >(
        `${repoPath}/commits?since=${encodeURIComponent(
          `${startDate}T00:00:00Z`,
        )}&until=${encodeURIComponent(`${endDate}T23:59:59Z`)}&per_page=20`,
        token,
      ),
      githubRequest<
        Array<{
          html_url: string;
          merged_at: string | null;
          number: number;
          state: string;
          title: string;
          updated_at: string;
          user: { login: string };
          created_at: string;
        }>
      >(
        `${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=50`,
        token,
      ),
    ]);

  const rangeStart = new Date(`${startDate}T00:00:00Z`).getTime();
  const rangeEnd = new Date(`${endDate}T23:59:59Z`).getTime();

  const filteredPullRequests = pullRequests.filter((pullRequest) => {
    const timestamps = [
      pullRequest.created_at,
      pullRequest.updated_at,
      pullRequest.merged_at,
    ]
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime());

    return timestamps.some((value) => value >= rangeStart && value <= rangeEnd);
  });

  const topLevelDirectories = rootEntries
    .filter((entry) => entry.type === "dir")
    .map((entry) => entry.name);
  const topLevelFiles = rootEntries
    .filter((entry) => entry.type === "file")
    .map((entry) => entry.name);
  const scopedCommits = commits.slice(0, MAX_COMMITS_IN_SCOPE);
  const commitDetailResults = await Promise.allSettled(
    scopedCommits.map(async (commit) => {
      const commitDetails = await githubRequest<CommitDetailResponse>(
        `${repoPath}/commits/${commit.sha}`,
        token,
      );

      return {
        author: commit.commit.author.name,
        changedFiles: (commitDetails.files ?? []).map((file) =>
          normalizeFileChange(file, commit.sha.slice(0, 7)),
        ),
        message: commit.commit.message.split("\n")[0],
        sha: commit.sha.slice(0, 7),
        url: commit.html_url,
      };
    }),
  );
  const commitDetails = commitDetailResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        author: string;
        changedFiles: GithubChangedFile[];
        message: string;
        sha: string;
        url: string;
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value);
  const mergedChanges = mergeChangedFiles(
    commitDetails.flatMap((commit) => commit.changedFiles),
  );
  const totalAdditions = mergedChanges.changedFiles.reduce(
    (sum, file) => sum + file.additions,
    0,
  );
  const totalDeletions = mergedChanges.changedFiles.reduce(
    (sum, file) => sum + file.deletions,
    0,
  );

  return {
    changeSummary: {
      additions: totalAdditions,
      analyzedCommitCount: commitDetails.length,
      deletions: totalDeletions,
      directoryBreakdown: mergedChanges.directoryBreakdown,
      fileTypeBreakdown: mergedChanges.fileTypeBreakdown,
      filesChanged: mergedChanges.changedFiles.length,
      statusBreakdown: mergedChanges.statusBreakdown,
    },
    changedFiles: mergedChanges.changedFiles,
    commits: commits.map((commit) => ({
      author: commit.commit.author.name,
      message: commit.commit.message.split("\n")[0],
      sha: commit.sha.slice(0, 7),
      url: commit.html_url,
    })),
    commitDetails,
    defaultBranch: repoDetails.default_branch,
    description: repoDetails.description,
    languages: Object.keys(languages).slice(0, 5),
    openIssuesCount: repoDetails.open_issues_count,
    pullRequests: filteredPullRequests.slice(0, 10).map((pullRequest) => ({
      author: pullRequest.user.login,
      mergedAt: pullRequest.merged_at,
      number: pullRequest.number,
      state: pullRequest.state,
      title: pullRequest.title,
      updatedAt: pullRequest.updated_at,
      url: pullRequest.html_url,
    })),
    readme,
    repoUrl: repoDetails.html_url,
    rootEntries: rootEntries.map((entry) => entry.name),
    stars: repoDetails.stargazers_count,
    topLevelDirectories,
    topLevelFiles,
    treePaths: tree.tree.slice(0, 400).map((entry) => entry.path),
  };
}
