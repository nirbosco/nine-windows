"""
Vercel Python Serverless Function — NotebookLM Sync

GET ?groupId=xxx  → lookup notebook URL
POST {groupId}    → sync all groups for challenge to NotebookLM

Auth: NOTEBOOKLM_AUTH_JSON env var (storage_state.json content)
"""

import asyncio
import json
import os
from datetime import date
from http.server import BaseHTTPRequestHandler

# ── Supabase config ──

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()

# ── Windows metadata ──

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
    "floating": "צף — על פני השטח",
    "deep": "צולל — לעומק",
}


# ── Supabase helpers ──

async def supabase_get(http, path, params):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    r = await http.get(f"{SUPABASE_URL}/rest/v1/{path}", params=params, headers=headers)
    return r.json()


async def fetch_group_data(group_id):
    import httpx
    async with httpx.AsyncClient() as http:
        groups = await supabase_get(http, "groups", {"id": f"eq.{group_id}", "select": "*"})
        if not groups:
            raise ValueError(f"Group {group_id} not found")
        group = groups[0]

        challenges = await supabase_get(http, "challenges", {"id": f"eq.{group['challenge_id']}", "select": "*"})
        challenge = challenges[0] if challenges else {"name": "אתגר", "id": group["challenge_id"]}

        members = await supabase_get(http, "group_members", {"group_id": f"eq.{group_id}", "select": "name"})

        notes = await supabase_get(http, "notes", {
            "group_id": f"eq.{group_id}",
            "select": "*",
            "order": "created_at.asc",
        })

    return group, challenge, members, notes


async def fetch_all_groups_for_challenge(challenge_id):
    import httpx
    async with httpx.AsyncClient() as http:
        challenges = await supabase_get(http, "challenges", {"id": f"eq.{challenge_id}", "select": "*"})
        if not challenges:
            raise ValueError(f"Challenge {challenge_id} not found")
        challenge = challenges[0]

        groups = await supabase_get(http, "groups", {
            "challenge_id": f"eq.{challenge_id}",
            "select": "*",
            "order": "created_at.asc",
        })

        results = []
        for group in groups:
            members = await supabase_get(http, "group_members", {"group_id": f"eq.{group['id']}", "select": "name"})
            notes = await supabase_get(http, "notes", {
                "group_id": f"eq.{group['id']}",
                "select": "*",
                "order": "created_at.asc",
            })
            results.append((group, members, notes))

    return challenge, results


# ── Content builder ──

def build_source_content(group, challenge, members, notes):
    text = f"# ניתוח אתגר בשיטת תשעת החלונות (TRIZ)\n\n"
    text += f"## פרטי הסדנה\n"
    text += f"- **אתגר:** {challenge['name']}\n"
    text += f"- **קבוצה:** {group['name']}\n"
    text += f"- **משתתפים:** {', '.join(m['name'] for m in members)}\n"
    text += f"- **תאריך:** {date.today().isoformat()}\n"
    text += f"- **תוכנית:** אדוות — מחזור ז'\n\n---\n\n"
    text += f"## הסבר על המבנה\n"
    text += f"הטבלה מאורגנת כמטריצה של 3×3:\n"
    text += f"- **שורות** = רמות מערכת: מערכת-על, מערכת, תת-מערכת\n"
    text += f"- **עמודות** = ממדי זמן: עבר, הווה, עתיד\n"
    text += f"- **רמות עומק**: צף (תצפיות ראשוניות), צולל (תובנות עמוקות)\n\n---\n\n"

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

    text += f"## סיכום כמותי\n"
    text += f"- **סה\"כ נקודות:** {len(notes)}\n"
    text += f"- **צף:** {sum(1 for n in notes if n['depth'] == 'floating')}\n"
    text += f"- **צולל:** {sum(1 for n in notes if n['depth'] == 'deep')}\n"
    return text


# ── NotebookLM operations ──

async def get_client():
    from notebooklm import NotebookLMClient
    return await NotebookLMClient.from_storage()


async def lookup_notebook(group_id):
    group, challenge, _, _ = await fetch_group_data(group_id)
    notebook_title = f"תשעת החלונות — {challenge['name']}"

    client = await get_client()
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


async def sync_to_notebooklm(group_id):
    group, challenge, _, _ = await fetch_group_data(group_id)
    challenge_id = challenge["id"]

    challenge, all_groups = await fetch_all_groups_for_challenge(challenge_id)
    total_notes = sum(len(notes) for _, _, notes in all_groups)

    if total_notes == 0:
        return {"error": "No notes found for any group in this challenge"}

    client = await get_client()
    async with client:
        notebook_title = f"תשעת החלונות — {challenge['name']}"
        notebooks = await client.notebooks.list()
        notebook_id = None

        for nb in notebooks:
            if notebook_title in (nb.title or ""):
                notebook_id = nb.id
                break

        if not notebook_id:
            nb = await client.notebooks.create(notebook_title)
            notebook_id = nb.id

        # Check existing sources
        existing_sources = await client.sources.list(notebook_id)

        # Upload each group
        uploaded = []
        for grp, mems, nts in all_groups:
            if not nts:
                continue

            source_title = f"קבוצת {grp['name']}"

            # Remove old version
            for existing in existing_sources:
                if existing.title == source_title:
                    try:
                        await client.sources.delete(notebook_id, existing.id)
                    except Exception:
                        pass
                    break

            content = build_source_content(grp, challenge, mems, nts)
            await client.sources.add_text(
                notebook_id,
                title=source_title,
                content=content,
                wait=True,
                wait_timeout=120,
            )
            uploaded.append(grp["name"])

        # Cross-group analysis
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
            except Exception as e:
                answers.append({"question": q, "answer": f"Error: {e}"})

        try:
            await client.artifacts.generate_study_guide(notebook_id, language="he")
        except Exception:
            pass

        return {
            "success": True,
            "notebook_id": notebook_id,
            "notebook_url": f"https://notebooklm.google.com/notebook/{notebook_id}",
            "notebook_title": notebook_title,
            "groups_synced": uploaded,
            "total_notes": total_notes,
            "analysis": answers,
        }


# ── Vercel handler ──

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        params = parse_qs(urlparse(self.path).query)
        group_id = params.get("groupId", [None])[0]

        if not group_id:
            self._json_response({"error": "Missing groupId"}, 400)
            return

        try:
            result = asyncio.run(lookup_notebook(group_id))
            self._json_response(result)
        except Exception as e:
            self._json_response({"error": str(e)}, 500)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        group_id = body.get("groupId")

        if not group_id:
            self._json_response({"error": "Missing groupId"}, 400)
            return

        try:
            result = asyncio.run(sync_to_notebooklm(group_id))
            self._json_response(result)
        except Exception as e:
            self._json_response({"error": str(e)}, 500)

    def _json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
