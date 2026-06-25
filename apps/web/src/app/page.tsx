import { auth, githubProviderIsConfigured } from "@/auth";
import { AuthCta } from "@/components/auth-cta";
import { GithubOnboardingDashboard } from "@/components/github-onboarding-dashboard";

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_30px_100px_rgba(31,41,55,0.12)] backdrop-blur">
          <div className="grid gap-10 px-6 py-8 sm:px-10 lg:grid-cols-[1.3fr_0.9fr] lg:px-12 lg:py-12">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-600">
                  Sprint Wrap-Up Buddy
                </p>
                <AuthCta
                  configured={githubProviderIsConfigured}
                  signedIn={signedIn}
                />
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Connect GitHub, choose a repo, and generate onboarding context
                  on demand.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  This slice turns the landing page into a working GitHub
                  workspace. A signed-in user can choose a repository, set the
                  summary window, add notes context, and generate a markdown
                  onboarding brief immediately.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
                <span className="rounded-full bg-orange-100 px-4 py-2">
                  GitHub OAuth
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2">
                  Date range aware
                </span>
                <span className="rounded-full bg-emerald-100 px-4 py-2">
                  Notes-linked onboarding markdown
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-900 p-6 text-slate-50">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
                GitHub flow
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                <li>1. Sign in with GitHub.</li>
                <li>2. Select a repository and a work window.</li>
                <li>3. Add notes that should feed the summary.</li>
                <li>4. Generate a markdown onboarding brief on demand.</li>
              </ol>
            </div>
          </div>
        </section>

        {signedIn ? (
          <GithubOnboardingDashboard githubLogin={session?.user?.login} />
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                GitHub-backed repo picker
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Signed-in users can load repositories directly from GitHub
                rather than typing raw URLs or branch names.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                Notes-aware summary input
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The GitHub slice already accepts developer and meeting notes so
                the later notes-ingestion work has a direct place to land.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                On-demand onboarding markdown
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Generate a clean onboarding brief from repository context, repo
                activity, and the user’s selected date window.
              </p>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
