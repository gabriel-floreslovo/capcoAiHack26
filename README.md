# Sprint Wrap-Up Buddy

An AI-native sprint wrap-up assistant that pulls evidence from work artifacts and turns it into stakeholder-ready outputs.

## Outputs

1. A personal markdown write-up for demos, retros, and status updates.
2. A short PowerPoint deck that highlights accomplishments, discussions, decisions, and likely next paths.
3. A repo onboarding mode that explains architecture, code issues, and important context for a new teammate.

## Product Direction

- Primary interface: chat-first web app with artifact previews and traceable evidence.
- Core stack: TypeScript end-to-end with Next.js for UI and backend routes.
- Integrations: GitHub API, Microsoft Graph, local repo scanning, and uploaded notes/transcripts.
- AI role: use the model for reasoning, extraction, synthesis, and drafting; keep orchestration in application code.

## Repo Layout

- [`docs/architecture.md`](/Users/gfgu/Documents/Capco%20AI%20Hackathon/docs/architecture.md)
- [`apps/web/README.md`](/Users/gfgu/Documents/Capco%20AI%20Hackathon/apps/web/README.md)
- [`packages/core/README.md`](/Users/gfgu/Documents/Capco%20AI%20Hackathon/packages/core/README.md)
- [`workers/README.md`](/Users/gfgu/Documents/Capco%20AI%20Hackathon/workers/README.md)
- [`notes_collection/README.md`](notes_collection/README.md)

## Immediate MVP

- Connect GitHub and Microsoft.
- Ingest commits, PRs, issues, chats, uploaded meeting transcripts, and freeform notes for a chosen date range.
- Normalize everything into one timeline.
- Generate markdown recap plus `.pptx`.
- Add repo onboarding mode as a second workflow using the same evidence pipeline.

## Next Step

Scaffold `apps/web` as a Next.js app, then build the first end-to-end slice:

1. Connect GitHub.
2. Pull commits and PRs for a selected date range.
3. Generate a markdown wrap-up.
4. Add PowerPoint generation.
