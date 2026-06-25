"""
Collect locally uploaded meeting notes and transcripts.

This is the fast hackathon path: teammates export or paste notes into
notes_collection/input, then this script normalizes the files and creates a
starter report without needing Microsoft Graph permissions.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
SUPPORTED_EXTENSIONS = {
    ".txt": ("local_upload", "note"),
    ".md": ("local_upload", "note"),
    ".markdown": ("local_upload", "note"),
    ".vtt": ("teams_export", "meeting_transcript"),
    ".html": ("onenote_export", "note"),
    ".htm": ("onenote_export", "note"),
}


@dataclass
class LocalNoteArtifact:
    id: str
    source: str
    artifact_type: str
    title: str
    owner: str
    occurred_at: str | None
    captured_at: str
    original_file: str
    content_file: str
    content_preview: str
    tags: list[str]


class HtmlTextExtractor(HTMLParser):
    """Small HTML-to-text helper for exported OneNote pages."""

    block_tags = {"br", "div", "p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in self.block_tags:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self.block_tags:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(html.unescape(data))

    def text(self) -> str:
        return normalize_whitespace(" ".join(self.parts))


def normalize_whitespace(value: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.splitlines()]
    compacted: list[str] = []

    for line in lines:
        if line or (compacted and compacted[-1]):
            compacted.append(line)

    return "\n".join(compacted).strip()


def clean_vtt(value: str) -> str:
    cleaned_lines: list[str] = []

    for raw_line in value.splitlines():
        line = raw_line.strip()
        if not line or line == "WEBVTT":
            continue
        if "-->" in line:
            continue
        if re.fullmatch(r"\d+", line):
            continue
        if line.startswith(("NOTE", "STYLE", "REGION")):
            continue
        cleaned_lines.append(re.sub(r"<[^>]+>", "", line))

    return normalize_whitespace("\n".join(cleaned_lines))


def clean_html(value: str) -> str:
    parser = HtmlTextExtractor()
    parser.feed(value)
    return parser.text()


def read_note_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8-sig", errors="replace")
    suffix = path.suffix.lower()

    if suffix == ".vtt":
        return clean_vtt(raw)
    if suffix in {".html", ".htm"}:
        return clean_html(raw)
    return normalize_whitespace(raw)


def parse_filename_metadata(path: Path, default_owner: str) -> tuple[str, str, str | None]:
    stem = path.stem
    date_match = re.search(r"(20\d{2})[-_](\d{2})[-_](\d{2})", stem)
    occurred_at = None

    if date_match:
        year, month, day = date_match.groups()
        occurred_at = f"{year}-{month}-{day}"
        stem = (stem[: date_match.start()] + stem[date_match.end() :]).strip(" _-")

    parts = [part.strip() for part in re.split(r"\s+-\s+|_", stem) if part.strip()]
    owner = default_owner
    title_parts = parts

    if len(parts) >= 2:
        owner = parts[0].replace("-", " ").title()
        title_parts = parts[1:]

    title = " ".join(title_parts).replace("-", " ").strip().title() or path.stem
    return title, owner, occurred_at


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return slug or "note"


def make_artifact_id(path: Path, text: str) -> str:
    digest = hashlib.sha1(f"{path.as_posix()}\n{text}".encode("utf-8")).hexdigest()
    return digest[:12]


def iter_note_files(input_dir: Path) -> list[Path]:
    if not input_dir.exists():
        input_dir.mkdir(parents=True, exist_ok=True)
        return []

    files: list[Path] = []
    for path in input_dir.rglob("*"):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(path)

    return sorted(files, key=lambda item: item.as_posix().lower())


def preview(text: str, limit: int = 260) -> str:
    one_line = re.sub(r"\s+", " ", text).strip()
    if len(one_line) <= limit:
        return one_line
    return f"{one_line[: limit - 3].rstrip()}..."


def write_artifacts(input_dir: Path, output_dir: Path, default_owner: str) -> list[LocalNoteArtifact]:
    normalized_dir = output_dir / "normalized"
    content_dir = normalized_dir / "content"
    content_dir.mkdir(parents=True, exist_ok=True)

    artifacts: list[LocalNoteArtifact] = []
    captured_at = datetime.now(timezone.utc).isoformat()

    for source_file in iter_note_files(input_dir):
        text = read_note_text(source_file)
        if not text:
            continue

        source, artifact_type = SUPPORTED_EXTENSIONS[source_file.suffix.lower()]
        title, owner, occurred_at = parse_filename_metadata(source_file, default_owner)
        artifact_id = make_artifact_id(source_file, text)
        content_file = content_dir / f"{slugify(title)}-{artifact_id}.txt"
        content_file.write_text(text, encoding="utf-8")

        tags = ["uploaded"]
        if occurred_at:
            tags.append("dated")
        if artifact_type == "meeting_transcript":
            tags.append("meeting")

        artifacts.append(
            LocalNoteArtifact(
                id=artifact_id,
                source=source,
                artifact_type=artifact_type,
                title=title,
                owner=owner,
                occurred_at=occurred_at,
                captured_at=captured_at,
                original_file=str(source_file.relative_to(SCRIPT_DIR)),
                content_file=str(content_file.relative_to(SCRIPT_DIR)),
                content_preview=preview(text),
                tags=tags,
            )
        )

    artifacts_path = normalized_dir / "artifacts.jsonl"
    with artifacts_path.open("w", encoding="utf-8") as handle:
        for artifact in artifacts:
            handle.write(json.dumps(asdict(artifact), ensure_ascii=False) + "\n")

    return artifacts


def load_content(script_relative_path: str) -> str:
    return (SCRIPT_DIR / script_relative_path).read_text(encoding="utf-8", errors="replace")


def matching_lines(text: str, keywords: tuple[str, ...], limit: int = 6) -> list[str]:
    lines = [line.strip("-* \t") for line in text.splitlines() if line.strip()]
    matches: list[str] = []

    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in keywords):
            matches.append(line)
        if len(matches) >= limit:
            break

    return matches


def bullet_lines(lines: list[str]) -> list[str]:
    if not lines:
        return ["- No explicit evidence found in uploaded files."]
    return [f"- {line}" for line in lines]


def generate_report(artifacts: list[LocalNoteArtifact], output_dir: Path, title: str) -> Path:
    report_path = output_dir / "report.md"
    output_dir.mkdir(parents=True, exist_ok=True)

    accomplishments: list[str] = []
    decisions: list[str] = []
    next_steps: list[str] = []
    blockers: list[str] = []

    for artifact in artifacts:
        content = load_content(artifact.content_file)
        accomplishments.extend(
            matching_lines(content, ("completed", "finished", "shipped", "built", "demo", "progress"), 3)
        )
        decisions.extend(matching_lines(content, ("decision", "decided", "agreed", "approved"), 3))
        next_steps.extend(matching_lines(content, ("next", "todo", "to do", "action", "follow up", "owner"), 3))
        blockers.extend(matching_lines(content, ("blocked", "blocker", "risk", "issue", "dependency"), 3))

    evidence_rows = [
        f"| {artifact.title} | {artifact.owner} | {artifact.source} | {artifact.occurred_at or 'n/a'} |"
        for artifact in artifacts
    ]

    report = [
        f"# {title}",
        "",
        f"Generated from {len(artifacts)} uploaded note file{'s' if len(artifacts) != 1 else ''}.",
        "",
        "## Accomplishments And Updates",
        *bullet_lines(accomplishments[:8]),
        "",
        "## Decisions",
        *bullet_lines(decisions[:8]),
        "",
        "## Action Items And Next Steps",
        *bullet_lines(next_steps[:8]),
        "",
        "## Blockers Or Risks",
        *bullet_lines(blockers[:8]),
        "",
        "## Evidence Inventory",
        "| Title | Owner | Source | Date |",
        "| --- | --- | --- | --- |",
        *(evidence_rows or ["| No uploaded files found | n/a | n/a | n/a |"]),
        "",
    ]

    report_path.write_text("\n".join(report), encoding="utf-8")
    return report_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize uploaded meeting notes and generate a report.")
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=SCRIPT_DIR / "input",
        help="Folder containing uploaded/exported note files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=SCRIPT_DIR / "output",
        help="Folder for normalized artifacts and generated report.",
    )
    parser.add_argument(
        "--default-owner",
        default="Team Upload",
        help="Owner used when the filename does not include one.",
    )
    parser.add_argument(
        "--report-title",
        default="Meeting Notes Upload Report",
        help="Title for the generated markdown report.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    artifacts = write_artifacts(args.input_dir, args.output_dir, args.default_owner)
    report_path = generate_report(artifacts, args.output_dir, args.report_title)

    artifacts_path = args.output_dir / "normalized" / "artifacts.jsonl"
    print(f"Collected {len(artifacts)} uploaded note file(s).")
    print(f"Normalized artifacts: {artifacts_path}")
    print(f"Generated report: {report_path}")

    if not artifacts:
        print(f"Add .txt, .md, .vtt, .html, or .htm files to {args.input_dir} and run again.")


if __name__ == "__main__":
    main()
