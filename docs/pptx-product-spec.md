# PPTX Product Specification

## Purpose

The PowerPoint artifact is a stakeholder-ready view of sprint evidence.

It is not a raw export of commits, pull requests, or markdown. Its job is to
turn the app's synthesized sprint understanding into a concise deck that a user
can present with minimal cleanup.

## Default Audience

The default audience is stakeholder and demo oriented.

The artifact should help a user explain:

- what changed
- why it matters
- what decisions were made
- what risks remain
- what happens next

## Role In The App Workflow

The PPTX artifact sits after evidence ingestion and report synthesis.

### Workflow

1. User connects sources and selects a date range.
2. App ingests GitHub activity, notes, transcripts, and later collaboration artifacts.
3. App normalizes evidence into a shared report model.
4. App generates narrative outputs from that shared model.
5. PPTX generation renders a short deck from the same report model used by markdown and chat.

## Product Principle

The deck is another view of the same sprint understanding.

That means:

- markdown and PPTX should agree on core narrative
- PPTX should not rely on a separate hidden logic path
- evidence should shape the deck even when the final language is polished
- users should be able to trust that slides came from real sprint context

## Success Criteria

The PPTX artifact succeeds when:

- a user can download a `.pptx` directly from the app
- the deck is usable with little or no manual rewriting
- the content is understandable to non-technical stakeholders
- the slide story is concise and presentation-ready
- the narrative aligns with the markdown recap

## Output Shape

The deck should default to three slides.

### Default slide structure

#### Slide 1: Sprint outcomes

- sprint title or repo/context title
- major accomplishments
- stakeholder-facing impact
- a short summary statement

#### Slide 2: Decisions and delivery context

- important decisions or tradeoffs
- blockers, risks, or unresolved items
- evidence-backed context for what changed

#### Slide 3: Forward look

- next steps
- near-term focus
- support or decisions needed from stakeholders

## What The Deck Must Emphasize

- business or workflow impact
- accomplishments in plain language
- major decisions
- risks and blockers
- forward-looking direction

## What The Deck Must Avoid

- raw commit dumps
- long PR lists with no interpretation
- overly technical language by default
- decorative slide clutter
- deviating from the default three-slide structure without a strong product reason

## Source Inputs

The PPTX generator must work from the same core inputs already used in report generation.

### Required inputs

- repository selection
- date range
- generated sprint report model

### Supporting inputs

- notes ingestion context
- later meeting transcripts and chat artifacts

Notes should influence the synthesis but should not be copied verbatim into the deck unless explicitly requested.

## Shared Report Model Contract

The PPTX generator should consume a structured report object, not raw GitHub API responses.

### Minimum report sections

- title
- scope metadata
- accomplishments
- functional impact
- decisions
- blockers or risks
- evidence pointers
- next steps

This keeps markdown, PPTX, and future chat workflows aligned.

## MVP Functional Requirements

### User-facing

- user can generate a PowerPoint artifact from the same screen used for sprint report generation
- user can download a `.pptx` file
- user can choose the sprint-summary report path as the source narrative

### System-facing

- generator maps the structured report model into slide sections
- generator enforces the default three-slide structure
- generator uses editable native PowerPoint text, not screenshots
- generator handles sparse data gracefully

## Content Rules

### Slide title rules

- short and clear
- tied to the repo, initiative, or sprint context
- avoid internal-only jargon where possible

### Body content rules

- bullet points should be concise
- prefer functional phrasing over technical phrasing
- each bullet should stand on its own when presented aloud
- if evidence is thin, acknowledge uncertainty instead of overstating confidence

## Visual Direction

The deck should be clean, modern, and minimally branded.

### Design guidance

- strong headline hierarchy
- high contrast for readability
- restrained use of accent color
- enough whitespace to feel presentation-ready
- no generic template filler

## Editing And Trust

Users should expect to edit the PPTX after download if they want to tailor the presentation.

The app's responsibility is to create a high-quality starting artifact, not a locked final document.

## Non-Goals For The First Implementation

- advanced theme customization
- speaker notes generation
- multi-audience templates
- embedded charts
- direct export to Google Slides or PowerPoint Online

## Future Extensions

- audience mode: stakeholder, leadership, internal team
- tone presets
- richer evidence citations
- presenter notes
- branded company templates
- multi-sprint comparison decks

## Implementation Guidance

Build the PPTX flow as a renderer over the report model.

### Recommended sequence

1. Define a structured sprint report payload that is strong enough for both markdown and slides.
2. Add a PPTX builder module that converts that payload into slide objects.
3. Add an API route that returns a downloadable `.pptx`.
4. Add a UI action beside the markdown generation flow.
5. Validate the deck using sparse, medium, and rich evidence cases.
