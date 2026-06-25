export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_30px_100px_rgba(31,41,55,0.12)] backdrop-blur">
          <div className="grid gap-10 px-6 py-8 sm:px-10 lg:grid-cols-[1.3fr_0.9fr] lg:px-12 lg:py-12">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-600">
                Sprint Wrap-Up Buddy
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Turn sprint artifacts into crisp updates, decision logs, and
                  onboarding context.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  This workspace will ingest commits, pull requests, notes,
                  transcripts, and team conversations, then generate
                  stakeholder-ready writeups and a short slide deck.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
                <span className="rounded-full bg-orange-100 px-4 py-2">
                  GitHub ingestion
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2">
                  Teams and notes
                </span>
                <span className="rounded-full bg-emerald-100 px-4 py-2">
                  Markdown and PPTX artifacts
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-900 p-6 text-slate-50">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
                MVP flow
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                <li>1. Select a date range and connect sources.</li>
                <li>2. Normalize evidence into a single timeline.</li>
                <li>3. Draft the personal write-up and slide deck.</li>
                <li>4. Review decisions, blockers, and next steps in chat.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Evidence timeline
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Normalize commits, pull requests, notes, meetings, and chats into
              one reviewable stream.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Artifact generation
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Produce markdown recaps for retros and a compact PowerPoint for
              demos or stakeholder updates.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Repo onboarding
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Summarize architecture, surface risky code paths, and help new
              teammates ramp quickly.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
