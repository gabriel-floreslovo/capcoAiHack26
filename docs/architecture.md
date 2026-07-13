# Architecture Blueprint

## Product Goal

Give a user a reliable sprint or weekly wrap-up buddy that can:

- gather evidence from connected work systems
- synthesize accomplishments, discussions, decisions, and next steps
- generate a personal markdown summary
- generate a short PowerPoint deck
- explain a repository to a new teammate in plain language

## Architecture Decision

Use a TypeScript-first monorepo with a chat-first Next.js application.

### Rationale

- One language across UI, APIs, source connectors, and generation logic keeps team velocity high.
- GitHub, Microsoft Graph, local file parsing, and PowerPoint generation all have workable Node tooling.
- Browser-based auth is much easier for GitHub and Microsoft than a CLI-first experience.
- Functional users can use it without touching a terminal, while developers can still get a repo scan mode later.
- The product now optimizes for robustness and extensibility over hackathon-only speed.

## Stack

### Application

- Next.js App Router
- React + TypeScript
- Tailwind CSS for speed
- Auth.js for sign-in

### Background work

- Inngest or Trigger.dev for async jobs
- Route handlers or server actions to kick off ingestion and artifact generation

### Data

- Postgres with Prisma
- `jsonb` for normalized source artifacts
- vector support in a later phase for semantic retrieval

### AI

- OpenAI Responses API for extraction, reasoning, summarization, and artifact drafting
- application-owned tools for fetching source records, filtering date ranges, and rendering outputs
- keep deterministic orchestration in code instead of putting the whole workflow inside one giant prompt

### Integrations

- GitHub REST or GraphQL for commits, PRs, issues, discussions
- Microsoft Graph for Teams, OneNote, SharePoint, and meeting artifacts
- local repo scanner for architecture and code issue analysis
- uploaded markdown, text, or transcript files for unstructured notes

### Output generation

- markdown files for the personal write-up
- `pptxgenjs` for `.pptx` slide generation

## Interface

Do not make this a plain chatbot.

Make it an AI-native workspace with three panels:

1. Chat and intent panel
2. Evidence timeline panel
3. Artifact preview panel

### Core flow

1. User picks a date range and sources.
2. App ingests artifacts into a normalized timeline.
3. AI drafts a summary and slide deck from evidence.
4. User asks follow-up questions, such as:
   "Show me what drove this accomplishment"
   "Tone this for executives"
   "Regenerate the slide with more technical detail"

### Why this interface works

- Chat gives flexibility and feels AI-native.
- Evidence traceability builds trust.
- Preview panels make the generated outputs tangible and editable.

## Core Domain Model

Everything normalizes into a shared event model.

### Example normalized record

- `source`: github, teams, onenote, sharepoint, notes, repo-scan
- `artifact_type`: commit, pr, issue, meeting, chat, note, file
- `occurred_at`
- `author`
- `title`
- `body`
- `url`
- `tags`
- `linked_entities`

This gives you one timeline and one retrieval surface regardless of source.

## Workflow Design

### Sprint wrap-up mode

1. Collect artifacts in the date range.
2. Group them into accomplishments, discussions, decisions, blockers, and next steps.
3. Produce:
   - personal markdown recap
   - leadership-ready bullet summary
   - `.pptx` deck

### Repo onboarding mode

1. Scan repo structure, docs, config, and recent changes.
2. Map the architecture and important subsystems.
3. Surface code smells, risky areas, conventions, and local setup tips.
4. Return:
   - onboarding markdown
   - chat Q&A over indexed repo context

## MVP Scope

Keep each version tight, but build on foundations that can support a durable product.

### Must-have

- GitHub integration
- Microsoft Teams or uploaded transcript ingestion
- freeform developer notes ingestion
- markdown summary generation
- PowerPoint generation
- repo onboarding document generation

### Later Expansion

- SharePoint and OneNote
- VS Code extension
- semantic search over prior sprints
- personalized tone profiles per user

## Monorepo Shape

```text
apps/
  web/          # Next.js app, auth, chat UI, artifact previews
packages/
  core/         # shared types, prompts, domain logic
  connectors/   # GitHub and Microsoft adapters
  artifacts/    # markdown and pptx generators
workers/
  jobs/         # async ingestion and generation jobs
```

## First Build Sequence

1. Scaffold Next.js in `apps/web`.
2. Define the normalized artifact schema in `packages/core`.
3. Implement GitHub ingestion first.
4. Generate the markdown artifact from GitHub data only.
5. Add PowerPoint generation.
6. Add Teams transcript or note ingestion.
7. Add repo onboarding flow.

## Product Direction

The project is no longer constrained by hackathon presentation needs.

That means:

- prefer durable domain models over one-off demo shortcuts
- keep artifact generation paths consistent across markdown, slides, and chat
- preserve evidence traceability so outputs can be trusted and audited
- build each MVP slice so it can remain part of a long-term product

## Key Product Principle

The model is the analyst and writing partner, not the system of record.

That means:

- source retrieval stays in code
- normalization stays in code
- artifact rendering stays in code
- AI handles extraction, synthesis, prioritization, and wording
