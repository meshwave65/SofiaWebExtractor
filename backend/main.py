from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime
import os
import uuid
from pathlib import Path
from fastapi.responses import FileResponse

app = FastAPI()

# ======================
# CORS
# ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# SUPABASE CONFIG
# ======================
SUPABASE_URL = "https://ufylccbdjfzydbwhpmpp.supabase.co"
SUPABASE_KEY = "YOUR_ANON_KEY"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# ======================
# ROOT
# ======================
@app.get("/")
def root():
    return {"status": "ok"}

# ======================
# CLIENTS LAYER
# ======================
@app.get("/clients/resolve")
def resolve_client(input: str):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/clients",
        headers=HEADERS,
        params={
            "or": f"(user_name.eq.{input},email.eq.{input})",
            "select": "*"
        }
    )

    if r.status_code != 200:
        return {"ok": False, "error": r.text}

    data = r.json()

    if not data:
        return {"ok": False, "exists": False}

    return {"ok": True, "client": data[0]}


# ======================
# AUTH
# ======================
@app.post("/auth/login")
def login(payload: dict):
    input_user = payload.get("user_name")
    password = payload.get("password")

    if not input_user or not password:
        return {"ok": False, "error": "MISSING_CREDENTIALS"}

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/clients",
        headers=HEADERS,
        params={
            "or": f"(user_name.eq.{input_user},email.eq.{input_user})",
            "select": "*"
        }
    )

    if r.status_code != 200:
        return {"ok": False, "error": r.text}

    clients = r.json()

    if not clients:
        return {"ok": False, "error": "USER_NOT_FOUND"}

    client = clients[0]
    email = client.get("email")

    auth = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        },
        json={
            "email": email,
            "password": password
        }
    )

    if auth.status_code != 200:
        return {"ok": False, "error": "AUTH_FAILED", "details": auth.text}

    return {"ok": True, "client": client, "session": auth.json()}


# ======================
# TASK INSERT
# ======================
@app.post("/task/insert")
def insert_task(payload: dict):

    slug = f"{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}"
    agente = payload.get("agente") or payload.get("user_name") or "default"

    data = {
        "slug": slug,
        "full_url": payload.get("full_url"),
        "user_name": payload.get("user_name"),
        "agente": agente,
        "session_user_id": payload.get("session_user_id"),
        "status": "STAGED",
        "device_id": "api_server"
    }

    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/appsofia_tasks",
        json=data,
        headers=HEADERS
    )

    if r.status_code not in [200, 201]:
        return {"ok": False, "error": r.text}

    return {"ok": True, "slug": slug}


# ======================
# TASKS LIST
# ======================
@app.get("/tasks")
def get_tasks(user_name: str):

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/appsofia_tasks",
        headers=HEADERS,
        params={
            "user_name": f"eq.{user_name}",
            "select": "*",
            "order": "created_at.desc"
        }
    )

    if r.status_code != 200:
        return {"ok": False, "error": r.text}

    return {"ok": True, "data": r.json()}


# ======================
# FILES TREE
# ======================
@app.get("/files")
def list_files(
    user_name: str = Query(...),
    client_id: str = Query(...)
):

    base_path = Path("/mnt/hd1tb/projetos/_storage/knowledge")
    user_root = base_path / client_id

    if not user_root.exists():
        return {"ok": True, "data": {"providers": []}}

    result = {
        "user_name": user_name,
        "client_id": client_id,
        "providers": []
    }

    try:
        for llm_dir in sorted(user_root.iterdir(), reverse=True):
            if not llm_dir.is_dir():
                continue

            user_dir = llm_dir / user_name
            if not user_dir.exists():
                continue

            provider_obj = {
                "provider": llm_dir.name,
                "tasks": []
            }

            for agent_dir in user_dir.iterdir():
                if not agent_dir.is_dir():
                    continue

                tasks_root = agent_dir / "tasks"
                if not tasks_root.exists():
                    continue

                for task_dir in sorted(tasks_root.iterdir(), reverse=True):
                    if not task_dir.is_dir():
                        continue

                    files = []

                    for root, _, filenames in os.walk(task_dir):
                        for f in filenames:
                            files.append({
                                "filename": f,
                                "path": os.path.join(root, f)
                            })

                    if files:
                        provider_obj["tasks"].append({
                            "task_id": task_dir.name,
                            "agent": agent_dir.name,
                            "files": files
                        })

            if provider_obj["tasks"]:
                result["providers"].append(provider_obj)

    except Exception as e:
        print(e)

    return {"ok": True, "data": result}


# ======================
# FILE SERVE (CORRIGIDO)
# ======================
@app.get("/api/file")
def serve_file(path: str, download: bool = False):

    try:
        file_path = Path(path).resolve()
        root = Path("/mnt/hd1tb/projetos/_storage/knowledge").resolve()

        if not str(file_path).startswith(str(root)):
            raise HTTPException(status_code=403, detail="Access denied")

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Not found")

        media_type = "application/octet-stream"

        if file_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            media_type = "image/" + file_path.suffix.lower().replace(".", "")
        elif file_path.suffix.lower() == ".txt":
            media_type = "text/plain"
        elif file_path.suffix.lower() == ".pdf":
            media_type = "application/pdf"

        if download:
            return FileResponse(
                path=file_path,
                media_type=media_type,
                filename=file_path.name
            )

        return FileResponse(
            path=file_path,
            media_type=media_type
        )

    except HTTPException as e:
        raise e

    except Exception as e:
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail="internal error")
