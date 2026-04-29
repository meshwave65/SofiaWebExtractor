from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime
import os
import uuid

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
# ======================
# CLIENTS LAYER
# ======================
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
# AUTH BRIDGE (clients → supabase auth)
# ======================
@app.post("/auth/login")
def login(payload: dict):

    input_user = payload.get("user_name")
    password = payload.get("password")

    if not input_user or not password:
        return {"ok": False, "error": "MISSING_CREDENTIALS"}

    # 1. resolve client
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

    # 2. auth supabase (source of truth)
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
        return {
            "ok": False,
            "error": "AUTH_FAILED",
            "details": auth.text
        }

    return {
        "ok": True,
        "client": client,
        "session": auth.json()
    }


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
# FILES TREE (storage local)
# ======================
@app.get("/files")
def list_files(user_name: str = Query(...)):

    base_path = "/mnt/hd1tb/projetos/_storage/knowledge"
    user_path = os.path.join(base_path, user_name)

    if not os.path.exists(user_path):
        return {"ok": True, "data": []}

    result = {
        "user_name": user_name,
        "providers": []
    }

    for provider in os.listdir(user_path):
        provider_path = os.path.join(user_path, provider)

        if not os.path.isdir(provider_path):
            continue

        provider_obj = {
            "provider": provider,
            "tasks": []
        }

        for task_id in os.listdir(provider_path):
            task_path = os.path.join(provider_path, task_id)

            if not os.path.isdir(task_path):
                continue

            files = []

            for root, _, filenames in os.walk(task_path):
                for f in filenames:
                    files.append({
                        "filename": f,
                        "path": os.path.join(root, f)
                    })

            provider_obj["tasks"].append({
                "task_id": task_id,
                "files": files
            })

        result["providers"].append(provider_obj)

    return {"ok": True, "data": result}
