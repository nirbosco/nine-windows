#!/usr/bin/env python3
"""
notebooklm-sync.py — סנכרון קבוצה מתשעת החלונות ל-NotebookLM

תהליך:
1. שולף את כל הפתקים של הקבוצה מ-Supabase
2. מחפש/יוצר מחברת NotebookLM לפי שם האתגר
3. מעלה את התוכן כמקור טקסטואלי מובנה
4. מייצר סיכום ושאלות ניתוח

הרצה:
  /Users/nirbosco/.notebooklm-env/bin/python3.12 scripts/notebooklm-sync.py <group_id>

  עם --json: מחזיר JSON (לשימוש מ-API route)
  /Users/nirbosco/.notebooklm-env/bin/python3.12 scripts/notebooklm-sync.py <group_id> --json
"""

import asyncio
import json
import os
import sys
from datetime import date
from pathlib import Path

# Supabase
SUPABASE_URL = os.environ.get(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://ghslwhnzqyomkhpstwsi.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2x3aG56cXlvbWtocHN0d3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Mjg3MzAsImV4cCI6MjA4ODAwNDczMH0.hIW0wPC1cdlcPPp2LNwm_73EGgXA2OH7Vg5ilcWibuE"
)

# Windows metadata
WINDOWS = [
    {"number": 1, "title": "מערכת + הווה", "subtitle": "העוגן לתהליך", "system": "מערכת", "time": "הווה"},
    {"number": 2, "title": "תת-מערכת + הווה", "subtitle": "זום-אין: פירוק הבעיה", "system": "תת-מערכת", "time": "הווה"},
    {"number": 3, "title": "מערכת-על + הווה", "subtitle": "זום-אאוט: הקשר ומשאבים חיצוניים", "system": "מערכת-על", "time": "הווה"},
    {"number": 4, "title": "מערכת-על + עבר", "subtitle": "התנאים המקדימים בסביבה הרחבה", "system": "מערכת-על", "time": "עבר"},
    {"number": 5, "title": "מערכת + עבר", "subtitle": "ההיסטוריה שלנו", "system": "מערכת", "time": "עבר"},
    {"number": 6, "title": "תת-מערכת + עבר", "subtitle": "רכיבי המערכת בעבר", "system": "תת-מערכת", "time": "עבר"},
    {"number": 7, "title": "מערכת-על + עתיד", "subtitle": "מגמות-על", "system": "מערכת-על", "time": "עתיד"},
    {"number": 8, "title": "תת-מערכת + עתיד", "subtitle": "דמיון העתיד ברמת הרכיבים", "system": "תת-מערכת", "time": "עתיד"},
    {"number": 9, "title": "מערכת + עתיד", "subtitle": "היעד: תמונת הניצחון או מחיר המחדל", "system": "מערכת", "time": "עתיד"},
]

DEPTH_LABELS = {
    "floating": "צף — מה שכבר גלוי לנו",
    "deep": "שקוע — מה שצריך לחקור",
}


def log(msg, json_mode=False):
    if not json_mode:
        print(msg)


async def fetch_group_data(group_id):
    """Fetch group, challenge, members, and notes from Supabase via REST API."""
    import httpx

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    base = f"{SUPABASE_URL}/rest/v1"

    async with httpx.AsyncClient(headers=headers) as http:
        # Group
        r = await http.get(f"{base}/groups", params={"id": f"eq.{group_id}", "select": "*"})
        groups = r.json()
        if not groups:
            raise ValueError(f"Group {group_id} not found")
        group = groups[0]

        # Challenge
        r = await http.get(f"{base}/challenges", params={"id": f"eq.{group['challenge_id']}", "select": "*"})
        challenges = r.json()
        challenge = challenges[0] if challenges else {"name": "אתגר"}

        # Members
        r = await http.get(f"{base}/group_members", params={"group_id": f"eq.{group_id}", "select": "name"})
        members = r.json()

        # Notes
        r = await http.get(f"{base}/notes", params={
            "group_id": f"eq.{group_id}",
            "select": "*",
            "order": "created_at.asc",
        })
        notes = r.json()

    return group, challenge, members, notes


def build_source_content(group, challenge, members, notes):
    """Build structured Markdown content for NotebookLM source."""
    text = f"# ניתוח אתגר בשיטת תשעת החלונות\n\n"
    text += f"## פרטי הסדנה\n"
    text += f"- **אתגר:** {challenge['name']}\n"
    text += f"- **קבוצה:** {group['name']}\n"
    text += f"- **משתתפים:** {', '.join(m['name'] for m in members)}\n"
    text += f"- **תאריך:** {date.today().isoformat()}\n"
    text += f"- **תוכנית:** אדוות — מחזור ז'\n\n"
    text += f"---\n\n"
    text += f"## הסבר על המבנה\n"
    text += f"הטבלה מאורגנת כמטריצה של 3×3:\n"
    text += f"- **שורות** = רמות מערכת: מערכת-על (סביבה רחבה), מערכת (האתגר עצמו), תת-מערכת (רכיבים פנימיים)\n"
    text += f"- **עמודות** = ממדי זמן: עבר, הווה, עתיד\n"
    text += f"- **רמות עומק**: צף (מה שכבר גלוי לנו), שקוע (מה שצריך לחקור)\n\n"
    text += f"---\n\n"

    for win in WINDOWS:
        window_notes = [n for n in notes if n["window_number"] == win["number"]]
        text += f"## חלון {win['number']}: {win['title']}\n"
        text += f"**{win['subtitle']}** | {win['system']} + {win['time']}\n\n"

        if window_notes:
            for depth_key, label in DEPTH_LABELS.items():
                typed = [n for n in window_notes if n["depth"] == depth_key]
                if typed:
                    text += f"### {label}\n"
                    for n in typed:
                        author = f" *({n['author_name']})*" if n.get("author_name") else ""
                        text += f"- {n['content']}{author}\n"
                    text += "\n"
        else:
            text += "*(לא מולא עדיין)*\n\n"

        text += "---\n\n"

    # Summary stats
    text += f"## סיכום כמותי\n"
    text += f"- **סה\"כ נקודות:** {len(notes)}\n"
    text += f"- **צף:** {sum(1 for n in notes if n['depth'] == 'floating')}\n"
    text += f"- **שקוע:** {sum(1 for n in notes if n['depth'] == 'deep')}\n"

    return text


async def fetch_all_groups_for_challenge(challenge_id):
    """Fetch all groups and their notes for a challenge."""
    import httpx

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    base = f"{SUPABASE_URL}/rest/v1"

    async with httpx.AsyncClient(headers=headers) as http:
        # Challenge
        r = await http.get(f"{base}/challenges", params={"id": f"eq.{challenge_id}", "select": "*"})
        challenges = r.json()
        if not challenges:
            raise ValueError(f"Challenge {challenge_id} not found")
        challenge = challenges[0]

        # All groups for this challenge
        r = await http.get(f"{base}/groups", params={
            "challenge_id": f"eq.{challenge_id}",
            "select": "*",
            "order": "created_at.asc",
        })
        groups = r.json()

        results = []
        for group in groups:
            r = await http.get(f"{base}/group_members", params={
                "group_id": f"eq.{group['id']}",
                "select": "name",
            })
            members = r.json()

            r = await http.get(f"{base}/notes", params={
                "group_id": f"eq.{group['id']}",
                "select": "*",
                "order": "created_at.asc",
            })
            notes = r.json()

            results.append((group, members, notes))

    return challenge, results


async def sync_to_notebooklm(group_id, json_mode=False):
    """Main sync: fetch ALL groups for the challenge, upload to ONE notebook."""
    try:
        from notebooklm import NotebookLMClient
    except ImportError:
        msg = "notebooklm-py not installed"
        if json_mode:
            return {"error": msg}
        print(f"  {msg}")
        sys.exit(1)

    # Step 1: Find which challenge this group belongs to
    log("  Fetching group data from Supabase...", json_mode)
    group, challenge, members, notes = await fetch_group_data(group_id)
    challenge_id = challenge["id"]
    log(f"  Challenge: {challenge['name']}", json_mode)

    # Step 2: Fetch ALL groups for this challenge
    log("  Fetching all groups for challenge...", json_mode)
    challenge, all_groups = await fetch_all_groups_for_challenge(challenge_id)
    total_notes = sum(len(notes) for _, _, notes in all_groups)
    log(f"  {len(all_groups)} groups, {total_notes} total notes", json_mode)

    if total_notes == 0:
        msg = "No notes found for any group in this challenge"
        if json_mode:
            return {"error": msg}
        print(f"  {msg}")
        sys.exit(1)

    # Step 3: Connect to NotebookLM
    log("  Connecting to NotebookLM...", json_mode)
    client = await NotebookLMClient.from_storage()

    async with client:
        # Step 4: Find or create ONE notebook per challenge
        notebook_title = f"תשעת החלונות — {challenge['name']}"
        notebooks = await client.notebooks.list()
        notebook_id = None

        for nb in notebooks:
            if notebook_title in (nb.title or ""):
                notebook_id = nb.id
                log(f"  Found existing notebook: {nb.title} ({nb.id[:8]}...)", json_mode)
                break

        if not notebook_id:
            log(f"  Creating notebook: {notebook_title}", json_mode)
            nb = await client.notebooks.create(notebook_title)
            notebook_id = nb.id
            log(f"  Created: {notebook_id[:8]}...", json_mode)

        # Step 5: Check existing sources to avoid duplicates
        existing_sources = await client.sources.list(notebook_id)
        existing_titles = {s.title for s in existing_sources}

        # Step 6: Upload each group as a separate source
        uploaded = []
        for grp, mems, nts in all_groups:
            if not nts:
                continue

            source_title = f"קבוצת {grp['name']}"

            # Remove old version of this group's source if exists
            for existing in existing_sources:
                if existing.title == source_title:
                    log(f"  Removing old source: {source_title}...", json_mode)
                    try:
                        await client.sources.delete(notebook_id, existing.id)
                    except Exception:
                        pass
                    break

            content = build_source_content(grp, challenge, mems, nts)
            log(f"  Uploading: {source_title} ({len(nts)} notes)...", json_mode)
            source = await client.sources.add_text(
                notebook_id,
                title=source_title,
                content=content,
                wait=True,
                wait_timeout=120,
            )
            uploaded.append(grp["name"])
            log(f"  Uploaded: {source.id[:8]}...", json_mode)

        # Step 7: Ask cross-group analysis questions
        log("  Generating cross-group analysis...", json_mode)
        analysis_questions = [
            "השווה בין הקבוצות השונות — מהן התובנות המשותפות ומה הייחודי לכל קבוצה?",
            "מהן 3-5 התובנות המרכזיות שעולות מכלל הקבוצות יחד?",
            "מה הפער בין המצב הנוכחי (הווה) לבין העתיד הרצוי? מה צריך לקרות כדי לגשר?",
        ]

        answers = []
        for q in analysis_questions:
            try:
                result = await client.chat.ask(notebook_id, q)
                answers.append({"question": q, "answer": result.answer})
                log(f"  Answer received ({len(result.answer)} chars)", json_mode)
            except Exception as e:
                answers.append({"question": q, "answer": f"Error: {e}"})
                log(f"  Question failed: {e}", json_mode)

        # Step 8: Generate study guide
        log("  Generating study guide...", json_mode)
        try:
            await client.artifacts.generate_study_guide(notebook_id, language="he")
            log("  Study guide generated", json_mode)
        except Exception as e:
            log(f"  Study guide failed: {e}", json_mode)

        notebook_url = f"https://notebooklm.google.com/notebook/{notebook_id}"
        log(f"\n  Done! Notebook: {notebook_url}", json_mode)

        result = {
            "success": True,
            "notebook_id": notebook_id,
            "notebook_url": notebook_url,
            "notebook_title": notebook_title,
            "groups_synced": uploaded,
            "total_notes": total_notes,
            "analysis": answers,
        }

        return result


async def lookup_notebook(group_id):
    """Find notebook URL for a group's challenge without syncing."""
    try:
        from notebooklm import NotebookLMClient
    except ImportError:
        return {"error": "notebooklm-py not installed"}

    group, challenge, _, _ = await fetch_group_data(group_id)
    notebook_title = f"תשעת החלונות — {challenge['name']}"

    client = await NotebookLMClient.from_storage()
    async with client:
        notebooks = await client.notebooks.list()
        for nb in notebooks:
            if notebook_title in (nb.title or ""):
                return {
                    "found": True,
                    "notebook_id": nb.id,
                    "notebook_url": f"https://notebooklm.google.com/notebook/{nb.id}",
                    "notebook_title": nb.title,
                }

    return {"found": False}


async def main():
    if len(sys.argv) < 2:
        print("Usage: notebooklm-sync.py <group_id> [--json] [--lookup]")
        sys.exit(1)

    group_id = sys.argv[1]
    json_mode = "--json" in sys.argv
    lookup_mode = "--lookup" in sys.argv

    if lookup_mode:
        result = await lookup_notebook(group_id)
        if json_mode:
            print(json.dumps(result, ensure_ascii=False))
        else:
            if result.get("found"):
                print(f"Notebook: {result['notebook_url']}")
            else:
                print("No notebook found for this challenge")
        return

    if not json_mode:
        print(f"Nine Windows -> NotebookLM Sync")
        print(f"Group ID: {group_id}")
        print()

    result = await sync_to_notebooklm(group_id, json_mode)

    if json_mode:
        print(json.dumps(result, ensure_ascii=False))
    elif result.get("success"):
        print(f"\nNotebook URL: {result['notebook_url']}")
        print(f"Groups synced: {', '.join(result['groups_synced'])}")
        print(f"\nAnalysis:")
        for a in result.get("analysis", []):
            print(f"\n  Q: {a['question']}")
            print(f"  A: {a['answer'][:200]}...")


if __name__ == "__main__":
    asyncio.run(main())
