import { auth, githubProviderIsConfigured } from "@/auth";
import { AuthCta } from "@/components/auth-cta";
import { GithubOnboardingDashboard } from "@/components/github-onboarding-dashboard";

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const integrationStatus = [
    {
      label: "GitHub",
      active: signedIn,
      description: "Repo history, commits, and release context.",
    },
    {
      label: "Microsoft Teams",
      active: false,
      description: "Meeting transcripts and chat context.",
    },
    {
      label: "VS Code",
      active: false,
      description: "Developer notes and local coding context.",
    },
    {
      label: "OneNote",
      active: false,
      description: "Personal notes and working memos.",
    },
    {
      label: "SharePoint",
      active: false,
      description: "Project docs and shared artifacts.",
    },
  ];

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.16),_transparent_28%),linear-gradient(180deg,_#f7faf8_0%,_#eef3ef_48%,_#e7ece7_100%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8">
        <section className="overflow-hidden rounded-[2.25rem] border border-emerald-950/10 bg-white/70 shadow-[0_30px_100px_rgba(6,15,10,0.14)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(180deg,rgba(34,197,94,0.14),rgba(0,0,0,0))]" />
              <div className="relative space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.34em] text-emerald-700">
                    Sprint Wrap-Up Buddy
                  </p>
                  <AuthCta
                    configured={githubProviderIsConfigured}
                    signedIn={signedIn}
                  />
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    Turn sprint evidence into a clean wrap-up, onboarding brief,
                    and stakeholder-ready summary.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-slate-700">
                    Sprint Wrap-Up Buddy reads GitHub activity, meeting notes,
                    and project artifacts to synthesize what changed, why it
                    matters, and what should happen next. GitHub unlocks the
                    current workflow, while future integrations will expand the
                    picture across the rest of the team’s tooling.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-800">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-900">
                    Clean, rounded summaries
                  </span>
                  <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-2">
                    GitHub-first today
                  </span>
                  <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-2">
                    Artifact-aware by design
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-950/10 bg-slate-950 px-6 py-8 text-slate-50 sm:px-10 lg:border-l lg:border-t-0 lg:px-10 lg:py-12">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Product flow
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                <li>1. Sign in with GitHub.</li>
                <li>2. Choose the repo and sprint window.</li>
                <li>3. Add notes from meetings, standups, and developer context.</li>
                <li>4. Generate markdown or PowerPoint deliverables on demand.</li>
              </ol>
              <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-50">
                The landing page now frames the whole workflow, while the action
                buttons only appear once GitHub login is active.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.75rem] border border-emerald-950/10 bg-white/72 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Connected integrations
                </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Integration scaffolding
                  </h2>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-900">
                {signedIn ? "GitHub connected" : "GitHub not connected"}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {integrationStatus.map((integration) => (
                <div
                  key={integration.label}
                  className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-3.5 w-3.5 rounded-full border ${
                        integration.active
                          ? "border-emerald-500 bg-emerald-500 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    <h3 className="font-semibold text-slate-950">
                      {integration.label}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {integration.description}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {integration.active ? "Connected" : "Not connected"}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-emerald-950/10 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
              What you can do now
            </p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
              <p>
                GitHub unlocks the current workflows: repo selection, sprint
                date range selection, notes capture, markdown generation, and
                PowerPoint export.
              </p>
              <p>
                The future integrations are intentionally shown here as
                scaffolding so the product direction is visible without making
                them look active before they are wired up.
              </p>
            </div>
          </article>
        </section>

        {signedIn ? (
          <GithubOnboardingDashboard githubLogin={session?.user?.login} />
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-emerald-950/10 bg-white/72 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-950">
                GitHub-gated actions
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Report generation stays hidden until GitHub login is active, so
                the landing page reflects the app’s real access flow.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-emerald-950/10 bg-white/72 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-950">
                Multi-integration shell
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The interface now makes room for Teams, VS Code, OneNote, and
                SharePoint without pretending those connectors are live yet.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-emerald-950/10 bg-white/72 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-950">
                Notes plus code evidence
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The product is framed around combining notes, repo changes, and
                future artifact streams into one wrap-up experience.
              </p>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
