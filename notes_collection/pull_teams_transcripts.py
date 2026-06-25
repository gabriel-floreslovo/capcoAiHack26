"""
Pull Microsoft Teams meeting transcripts from Microsoft Graph.

Summary:
This script signs a user in with Microsoft identity, calls Microsoft Graph for a
specific Teams online meeting, lists the available transcript records, and saves
each transcript body to a local output folder. It is the first half of the notes
collection step for the weekly meeting summary application.

Before running:
- Register an app in Microsoft Entra ID.
- Grant delegated Graph permissions for online meetings and transcripts.
- Put the app settings in notes_collection/.env.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import msal
import requests
from dotenv import load_dotenv


DEFAULT_SCOPES = [
    "OnlineMeetings.Read",
    "OnlineMeetingTranscript.Read.All",
]


def load_settings() -> dict[str, str]:
    """Load app settings used by Microsoft Authentication Library and Graph."""
    load_dotenv(Path(__file__).with_name(".env"))

    client_id = os.getenv("MS_CLIENT_ID", "")
    authority = os.getenv("MS_AUTHORITY") or "https://login.microsoftonline.com/common"
    graph_base_url = os.getenv("GRAPH_BASE_URL") or "https://graph.microsoft.com/v1.0"

    if not client_id:
        raise RuntimeError("MS_CLIENT_ID is required. Add it to notes_collection/.env.")

    return {
        "client_id": client_id,
        "authority": authority,
        "graph_base_url": graph_base_url.rstrip("/"),
    }


def get_access_token(scopes: list[str]) -> str:
    """
    Sign the user in and return an access token.

    The device-code flow is useful during hackathon development because it does
    not require a local web server callback. For production, replace this with a
    normal auth-code flow and store tokens securely.
    """
    settings = load_settings()
    app = msal.PublicClientApplication(
        client_id=settings["client_id"],
        authority=settings["authority"],
    )

    accounts = app.get_accounts()
    result = app.acquire_token_silent(scopes=scopes, account=accounts[0] if accounts else None)

    if not result:
        flow = app.initiate_device_flow(scopes=scopes)
        if "user_code" not in flow:
            raise RuntimeError(f"Could not start device flow: {flow}")

        print(flow["message"])
        result = app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        raise RuntimeError(f"Authentication failed: {result}")

    return result["access_token"]


def graph_get(access_token: str, url: str, *, accept: str = "application/json") -> requests.Response:
    """Make an authenticated GET request to Microsoft Graph."""
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": accept,
        },
        timeout=60,
    )
    response.raise_for_status()
    return response


def list_transcripts(access_token: str, user_id: str, meeting_id: str) -> list[dict[str, Any]]:
    """
    Return transcript metadata for one online meeting.

    `user_id` can be `me` for the signed-in user, or an Azure AD user id. The
    `meeting_id` should be the Graph onlineMeeting id, not just a calendar event id.
    """
    settings = load_settings()
    url = (
        f"{settings['graph_base_url']}/users/{user_id}/onlineMeetings/"
        f"{meeting_id}/transcripts"
    )
    return graph_get(access_token, url).json().get("value", [])


def download_transcript_content(
    access_token: str,
    user_id: str,
    meeting_id: str,
    transcript_id: str,
) -> str:
    """
    Download transcript text/content for one transcript record.

    Graph may return WebVTT or text-like content depending on tenant capability.
    The saved file is intentionally raw so the summarization layer can parse it
    without losing timestamps or speaker labels.
    """
    settings = load_settings()
    url = (
        f"{settings['graph_base_url']}/users/{user_id}/onlineMeetings/"
        f"{meeting_id}/transcripts/{transcript_id}/content"
    )
    return graph_get(access_token, url, accept="text/vtt, text/plain, */*").text


def save_transcripts(
    access_token: str,
    user_id: str,
    meeting_id: str,
    output_dir: Path,
) -> list[Path]:
    """List and save all transcripts for the given Teams online meeting."""
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_files: list[Path] = []

    for transcript in list_transcripts(access_token, user_id, meeting_id):
        transcript_id = transcript["id"]
        content = download_transcript_content(
            access_token=access_token,
            user_id=user_id,
            meeting_id=meeting_id,
            transcript_id=transcript_id,
        )

        file_path = output_dir / f"teams_transcript_{meeting_id}_{transcript_id}.vtt"
        file_path.write_text(content, encoding="utf-8")
        saved_files.append(file_path)

    return saved_files


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pull Teams meeting transcripts from Graph.")
    parser.add_argument("--user-id", default="me", help="Graph user id, or 'me' for signed-in user.")
    parser.add_argument("--meeting-id", required=True, help="Graph onlineMeeting id.")
    parser.add_argument(
        "--output-dir",
        default="notes_collection/output/teams",
        help="Folder where transcript files will be saved.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = get_access_token(DEFAULT_SCOPES)
    saved_files = save_transcripts(
        access_token=token,
        user_id=args.user_id,
        meeting_id=args.meeting_id,
        output_dir=Path(args.output_dir),
    )

    if not saved_files:
        print("No transcripts were found for this meeting.")
        return

    for file_path in saved_files:
        print(f"Saved transcript: {file_path}")


if __name__ == "__main__":
    main()
