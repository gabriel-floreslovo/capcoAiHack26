# Notes Collection Step

This folder contains the first ingestion step for the meeting-summary application.
The goal is to collect source notes before sending them to a summarization
pipeline.

## Fast Hackathon Flow

Use local file upload/drop-off first. This avoids losing time on Microsoft tenant
permissions during the demo.

1. Add exported or pasted notes to `notes_collection/input/`.
2. Use one of these supported formats:
   - `.md` or `.txt` for pasted meeting notes
   - `.vtt` for Teams transcript exports
   - `.html` or `.htm` for OneNote page exports
3. Optional filename pattern:

```text
2026-06-25 - Nad - Sprint Planning.md
2026-06-25 - Coworker - Standup Notes.txt
2026-06-25 - Team - Teams Transcript.vtt
```

4. Run the collector from the repo root:

```powershell
npm run collect:notes
```

Or run the PowerShell collector directly:

```powershell
powershell -ExecutionPolicy Bypass -File notes_collection\collect_local_notes.ps1
```

Or, if Python is installed:

```powershell
python notes_collection/collect_local_notes.py
```

The script writes:

- `notes_collection/output/normalized/artifacts.jsonl`
- `notes_collection/output/normalized/content/*.txt`
- `notes_collection/output/report.md`

Uploaded input files and generated output are ignored by Git so real meeting
notes do not get committed accidentally.

## Scripts

- `collect_local_notes.py`
  - Reads uploaded/exported notes from `notes_collection/input/`.
  - Normalizes each file into the shared artifact shape.
  - Generates a starter markdown report for the UI/report workflow.

- `collect_local_notes.ps1`
  - PowerShell version of the local upload collector.
  - Useful for a quick Windows demo when Python is not installed.

- `pull_teams_transcripts.py`
  - Authenticates to Microsoft Graph.
  - Lists Teams meeting transcripts for a specific online meeting.
  - Downloads transcript content into local text files.

- `pull_onenote_notes.py`
  - Authenticates to Microsoft Graph.
  - Lists notebooks, sections, and pages the signed-in user has granted access to.
  - Downloads selected OneNote page content as HTML.

## Setup

For the fast local-upload flow, no extra packages are required.

For Microsoft Graph collection:

1. Create an app registration in Microsoft Entra ID.
2. Add the required Microsoft Graph delegated permissions.
3. Copy `.env.example` to `.env` and fill in your tenant/client details.
4. Install dependencies:

```powershell
pip install -r notes_collection/requirements.txt
```

## Microsoft Graph Permissions

For Teams transcripts, start with delegated permissions such as:

- `OnlineMeetings.Read`
- `OnlineMeetingTranscript.Read.All`

For OneNote, start with delegated permissions such as:

- `Notes.Read`
- `Notes.Read.All`

Actual permission approval depends on the tenant's Microsoft 365 security policy.
Some permissions may require admin consent.

## Usage

Teams transcript download:

```powershell
python notes_collection/pull_teams_transcripts.py --user-id me --meeting-id "<online-meeting-id>"
```

OneNote page download:

```powershell
python notes_collection/pull_onenote_notes.py --page-id "<onenote-page-id>"
```

The scripts are intentionally conservative: they only pull data after a user signs
in and grants access through Microsoft Graph.
