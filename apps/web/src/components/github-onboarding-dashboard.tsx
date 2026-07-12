"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { GithubRepoOption } from "@/lib/github";
import type { GithubReportType } from "@/lib/github-reports";

type SummaryResponse = {
  generatedAt: string;
  reportType: GithubReportType;
  repoFullName: string;
  summary: string;
};

type DashboardProps = {
  githubLogin?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function GithubOnboardingDashboard({
  githubLogin,
}: DashboardProps) {
  const [repos, setRepos] = useState<GithubRepoOption[]>([]);
  const [repoFullName, setRepoFullName] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const [startDate, setStartDate] = useState(daysAgoIsoDate(14));
  const [endDate, setEndDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingDeck, setGeneratingDeck] = useState(false);

  const summaryHeading = summary?.reportType === "sprint-summary"
    ? "Sprint summary preview"
    : "Onboarding summary preview";

  useEffect(() => {
    let cancelled = false;

    async function loadRepos() {
      try {
        setLoadingRepos(true);
        setRepoError(null);
        const response = await fetch("/api/github/repos", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Unable to load repositories.");
        }

        const payload = (await response.json()) as { repos: GithubRepoOption[] };

        if (!cancelled) {
          setRepos(payload.repos);
          setRepoFullName(payload.repos[0]?.fullName ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setRepoError(
            error instanceof Error ? error.message : "Unable to load repositories.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingRepos(false);
        }
      }
    }

    void loadRepos();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveRepo = useMemo(() => {
    return manualRepo.trim().length > 0 ? manualRepo.trim() : repoFullName;
  }, [manualRepo, repoFullName]);

  async function handleGenerateSummary(reportType: GithubReportType) {
    setSummaryError(null);
    setGeneratingSummary(true);

    try {
      const response = await fetch("/api/github/onboarding-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endDate,
          notes,
          reportType,
          repoFullName: effectiveRepo,
          startDate,
        }),
      });

      const payload = (await response.json()) as
        | SummaryResponse
        | { error?: string };
      const errorMessage = "error" in payload ? payload.error : undefined;

      if (!response.ok || !("summary" in payload)) {
        throw new Error(errorMessage ?? "Unable to generate summary.");
      }

      startTransition(() => {
        setSummary(payload);
      });
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to generate summary.",
      );
    } finally {
      setGeneratingSummary(false);
    }
  }

  function handleDownloadMarkdown() {
    if (!summary) {
      return;
    }

    const blob = new Blob([summary.summary], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${summary.repoFullName.replace("/", "-")}-${
      summary.reportType
    }.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPptx() {
    setSummaryError(null);
    setGeneratingDeck(true);

    try {
      const response = await fetch("/api/github/sprint-summary-pptx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endDate,
          notes,
          repoFullName: effectiveRepo,
          startDate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to generate PowerPoint artifact.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${effectiveRepo.replace("/", "-")}-sprint-summary.pptx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSummaryError(
        error instanceof Error
          ? error.message
          : "Unable to generate PowerPoint artifact.",
      );
    } finally {
      setGeneratingDeck(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              GitHub integration
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Pull repo context into the wrap-up flow
            </h2>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {githubLogin ? `Connected as @${githubLogin}` : "Connected"}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Select a repository
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              disabled={loadingRepos || repos.length === 0}
              onChange={(event) => setRepoFullName(event.target.value)}
              value={repoFullName}
            >
              {loadingRepos ? (
                <option>Loading repositories...</option>
              ) : repos.length === 0 ? (
                <option>No repositories returned</option>
              ) : (
                repos.map((repo) => (
                  <option key={repo.fullName} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Or type an owner/repo manually
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              onChange={(event) => setManualRepo(event.target.value)}
              placeholder="owner/repo"
              value={manualRepo}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Start date
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                End date
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Notes ingestion context
            </span>
            <textarea
              className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste developer notes, meeting callouts, onboarding hints, or sprint context here."
              value={notes}
            />
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Notes are included as input context for report generation, but
              they are not echoed back verbatim in the markdown output.
            </p>
          </label>

          {(repoError || summaryError) && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {repoError ?? summaryError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={
                generatingSummary ||
                loadingRepos ||
                effectiveRepo.trim().length === 0 ||
                startDate.length === 0 ||
                endDate.length === 0
              }
              onClick={() => void handleGenerateSummary("onboarding")}
              type="button"
            >
              {generatingSummary
                ? "Generating report..."
                : "Generate onboarding summary"}
            </button>
            <button
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              disabled={
                generatingSummary ||
                generatingDeck ||
                loadingRepos ||
                effectiveRepo.trim().length === 0 ||
                startDate.length === 0 ||
                endDate.length === 0
              }
              onClick={() => void handleGenerateSummary("sprint-summary")}
              type="button"
            >
              {generatingSummary ? "Generating report..." : "Generate sprint summary"}
            </button>
          </div>

          <button
            className="w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
            disabled={
              generatingSummary ||
              generatingDeck ||
              loadingRepos ||
              effectiveRepo.trim().length === 0 ||
              startDate.length === 0 ||
              endDate.length === 0
            }
            onClick={() => void handleDownloadPptx()}
            type="button"
          >
            {generatingDeck ? "Generating PowerPoint..." : "Download sprint summary deck (.pptx)"}
          </button>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-black/10 bg-slate-950 p-6 text-slate-50 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
              Markdown output
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {summaryHeading}
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-100 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
            disabled={!summary}
            onClick={handleDownloadMarkdown}
            type="button"
          >
            Download .md
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-black/30 p-5">
          {summary ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {summary.summary}
            </pre>
          ) : (
            <div className="space-y-3 text-sm leading-7 text-slate-400">
              <p>
                Generate a report to get either an onboarding brief or a sprint
                recap grounded in the selected GitHub repository and date range.
              </p>
              <p>
                The notes field is already wired into this workflow as private
                input context without being copied into the generated markdown.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
