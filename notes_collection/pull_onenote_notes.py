"""
Pull user-approved OneNote notes from Microsoft Graph.

Summary:
This script signs a user in with Microsoft identity, lists the OneNote notebooks,
sections, and pages visible to the application, and can download a selected page
as HTML. It is the second half of the notes collection step for the weekly
meeting summary application.

Before running:
- Register an app in Microsoft Entra ID.
- Grant delegated Graph permissions for OneNote notes.
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
    "Notes.Read",
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

    During development this uses the device-code flow. In the full application,
    this should be replaced with the same sign-in flow as the web UI so users can
    clearly consent to the notebooks/pages the app can read.
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


def graph_get_json(access_token: str, url: str) -> dict[str, Any]:
    """Make an authenticated GET request to Microsoft Graph and parse JSON."""
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def list_notebooks(access_token: str) -> list[dict[str, Any]]:
    """List OneNote notebooks the signed-in user has allowed Graph to read."""
    settings = load_settings()
    url = f"{settings['graph_base_url']}/me/onenote/notebooks"
    return graph_get_json(access_token, url).get("value", [])


def list_sections(access_token: str, notebook_id: str) -> list[dict[str, Any]]:
    """List sections inside a specific OneNote notebook."""
    settings = load_settings()
    url = f"{settings['graph_base_url']}/me/onenote/notebooks/{notebook_id}/sections"
    return graph_get_json(access_token, url).get("value", [])


def list_pages(access_token: str, section_id: str) -> list[dict[str, Any]]:
    """List pages inside a specific OneNote section."""
    settings = load_settings()
    url = f"{settings['graph_base_url']}/me/onenote/sections/{section_id}/pages"
    return graph_get_json(access_token, url).get("value", [])


def download_page_html(access_token: str, page_id: str) -> str:
    """
    Download the full HTML content for one OneNote page.

    HTML is kept intact because it preserves headings, links, and light structure
    that can help the summarization layer understand the notes.
    """
    settings = load_settings()
    url = f"{settings['graph_base_url']}/me/onenote/pages/{page_id}/content"
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "text/html",
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.text


def save_page(access_token: str, page_id: str, output_dir: Path) -> Path:
    """Download one OneNote page and save it to the local output folder."""
    output_dir.mkdir(parents=True, exist_ok=True)
    html = download_page_html(access_token, page_id)
    file_path = output_dir / f"onenote_page_{page_id}.html"
    file_path.write_text(html, encoding="utf-8")
    return file_path


def print_available_pages(access_token: str) -> None:
    """
    Print a simple inventory of notebooks, sections, and pages.

    This helps a user choose which page IDs they want the application to access
    before a download or summarization job is started.
    """
    for notebook in list_notebooks(access_token):
        print(f"Notebook: {notebook.get('displayName')} ({notebook.get('id')})")

        for section in list_sections(access_token, notebook["id"]):
            print(f"  Section: {section.get('displayName')} ({section.get('id')})")

            for page in list_pages(access_token, section["id"]):
                title = page.get("title") or "Untitled page"
                print(f"    Page: {title} ({page.get('id')})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pull user-approved OneNote notes from Graph.")
    parser.add_argument("--list", action="store_true", help="List visible notebooks, sections, and pages.")
    parser.add_argument("--page-id", help="OneNote page id to download.")
    parser.add_argument(
        "--output-dir",
        default="notes_collection/output/onenote",
        help="Folder where OneNote pages will be saved.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = get_access_token(DEFAULT_SCOPES)

    if args.list:
        print_available_pages(token)

    if args.page_id:
        file_path = save_page(token, args.page_id, Path(args.output_dir))
        print(f"Saved OneNote page: {file_path}")

    if not args.list and not args.page_id:
        print("Nothing requested. Use --list or --page-id.")


if __name__ == "__main__":
    main()
