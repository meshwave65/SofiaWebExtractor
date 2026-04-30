"use strict";

import "./styles.css";
import { supabase } from "./lib/supabase";

// ======================
// STATE
// ======================
let USER = {
  id: null,
  user_name: "guest",
  full_name: "Guest User",
  email: null
};

let SESSION = {
  logged: false
};

let CLIENT = {
  client_uuid: null,
  user_name: "",
  full_name: "",
  email: "",
  tel1: "",
  password: ""
};

// TASK STATE
let TASKS = [];
let TASK_FILTER = {
  status: "ALL",
  llm: "ALL",
  agent: "ALL"
};

let TASK_SELECTION = new Set();

// FILES STATE (FIX CRÍTICO)
let FILES_DATA = [];

// ======================
// LLM PROVIDER
// ======================
function extractLLMProvider(url = "") {
  if (!url || typeof url !== "string") return "unknown";

  try {
    const host = new URL(url).hostname.toLowerCase();

    if (host.includes("manus.im")) return "manus";
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("grok.com")) return "grok";
    if (host.includes("perplexity.ai")) return "perplexity";
    if (host.includes("claude.ai")) return "claude";
  } catch {}

  const u = url.toLowerCase();

  if (u.includes("manus")) return "manus";
  if (u.includes("chatgpt")) return "chatgpt";
  if (u.includes("grok")) return "grok";
  if (u.includes("perplexity")) return "perplexity";
  if (u.includes("claude")) return "claude";

  return "unknown";
}

// ======================
// SLUG
// ======================
function extractSlugFromUrl(url) {
  if (!url) return null;

  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

// ======================
// TAB
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));
  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";
}

// ======================
// LOGIN
// ======================
async function login() {
  const identifier = document.getElementById("login_email")?.value;
  const password = document.getElementById("login_pass")?.value;

  if (!identifier || !password) {
    alert("Fill login fields");
    return;
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .or(`email.eq.${identifier},user_name.eq.${identifier}`)
    .single();

  if (clientError || !client) {
    alert("User not found");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: client.email,
    password
  });

  if (error || !data?.user) {
    alert("Auth failed");
    return;
  }

  SESSION.logged = true;

  USER = {
    id: data.user.id,
    user_name: client.user_name,
    full_name: client.full_name || client.user_name,
    email: client.email
  };

  const el = document.getElementById("fullName");
  if (el) el.innerText = USER.full_name;

  showTab(3);
  loadTasks();
  loadFiles();
}

// ======================
// TASKS
// ======================
async function loadTasks() {
  if (!SESSION.logged || !USER.id) return;

  const { data, error } = await supabase
    .from("appsofia_tasks")
    .select("*")
    .eq("session_user_id", USER.id)
    .order("created_at", { ascending: false });

  if (error) return;

  TASKS = (data || []).map(t => ({
    ...t,
    llm_provider: t.llm_provider || extractLLMProvider(t.full_url)
  }));

  renderTasks();
  renderTaskToolbar();
}

// ======================
// INSERT TASK
// ======================
async function insertTask() {
  const agentSelect =
    document.querySelector("#tab2 select")?.value || "meshwave65";

  const agentNew =
    document.querySelector("#tab2 input[placeholder='agent override']")?.value;

  const link =
    document.querySelector("#tab2 input[placeholder='https://...']")?.value;

  if (!link) return alert("Link obrigatório");
  if (!SESSION.logged || !USER.id) return alert("Not authenticated");

  const slug = extractSlugFromUrl(link);
  const llm_provider = extractLLMProvider(link);

  const payload = {
    user_name: USER.user_name,
    agente: agentNew || agentSelect,
    full_url: link,
    session_user_id: USER.id,
    slug,
    llm_provider
  };

  const res = await fetch("http://127.0.0.1:3000/task/insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!data.ok) return alert(data.error || "Insert error");

  alert("Task inserida");
  loadTasks();
}



// ======================
// TOOLBAR (NOVA UI)
// ======================
function renderTaskToolbar() {
  const container = document.getElementById("taskToolbar");
  if (!container) return;

  container.innerHTML = `
    <div class="task-toolbar">
      <button class="primary" onclick="runAction('PLAY')">▶ Play</button>
      <button onclick="runAction('PAUSE')">⏸ Pause</button>
      <button onclick="runAction('DELETE')">🗑 Delete</button>
      <button class="refresh" onclick="loadTasks()">⟳ Refresh</button>
    </div>
  `;
}

// ======================
// TASK RENDER
// ======================
function renderTasks() {
  const container = document.getElementById("tasks");
  if (!container) return;

  container.innerHTML = "";

  TASKS.forEach(t => {
    const row = document.createElement("div");
    row.className = "task-row";

    const checked = TASK_SELECTION.has(t.id);
    const status = (t.status || "STAGED").toUpperCase();

    row.innerHTML = `
      <div class="task-check">
        <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleTask('${t.id}')">
      </div>

      <div class="task-icon">
        ${renderStatusIcon(status)}
      </div>

      <div class="task-content">
        <div class="task-id">${t.slug || t.id}</div>
        <div class="task-llm">${t.llm_provider || "unknown"}</div>
        <div class="task-url">${t.full_url || ""}</div>
      </div>

      <div class="task-status status-${status}">
        ${status}
      </div>
    `;

    container.appendChild(row);
  });
}

// ======================
// STATUS ICONS
// ======================
function renderStatusIcon(status) {
  switch ((status || "").toUpperCase()) {
    case "PROCESS":
      return "⚙️";
    case "PAUSED":
      return "⏸️";
    case "STAGED":
      return "🟡";
    case "DONE":
      return "🏁";
    case "FAIL":
      return "🚨";
    case "DELETED":
      return "🗑️";
    default:
      return "•";
  }
}

// ======================
// FILES (FIX DEFINITIVO)
// ======================
async function loadFiles() {
  if (!USER.user_name || USER.user_name === "guest") return;

  const API_BASE = "https://appsofia.meshwave.com.br";

  try {
    const resp = await fetch(`${API_BASE}/files?user_name=${USER.user_name}`);
    const json = await resp.json();

    FILES_DATA = json?.data?.providers || [];

    renderFiles();

  } catch (err) {
    console.error(err);
    FILES_DATA = [];
  }
}

// ======================
// FILES RENDER
// ======================
function renderFiles() {
  const container = document.getElementById("files");
  if (!container) return;

  container.innerHTML = "";

  if (!FILES_DATA.length) {
    container.innerHTML = `<div style="padding:10px;color:#8aa0b5;">Sem arquivos</div>`;
    return;
  }

  FILES_DATA.forEach(provider => {
    const header = document.createElement("div");
    header.textContent = provider.provider;
    header.style.cssText =
      "padding:8px;font-size:10px;color:#4ea1ff;border-bottom:1px solid #1f2a3a;";
    container.appendChild(header);

    (provider.tasks || []).forEach(task => {
      (task.files || []).forEach(file => {
        const row = document.createElement("div");
        row.className = "file-row";

        row.innerHTML = `
          <div>📄</div>
          <div>${file.filename}</div>
        `;

        container.appendChild(row);
      });
    });
  });
}

// ======================
// TASK SELECTION
// ======================
function toggleTask(id) {
  if (TASK_SELECTION.has(id)) TASK_SELECTION.delete(id);
  else TASK_SELECTION.add(id);
}

// ======================
// EXPORT
// ======================
window.showTab = showTab;
window.login = login;
window.loadTasks = loadTasks;
window.loadFiles = loadFiles;
window.toggleTask = toggleTask;

// placeholder (UI only)
window.runAction = (a) => console.log("ACTION:", a);

// ======================
// INIT
// ======================
document.addEventListener("DOMContentLoaded", () => {
  showTab(1);
});
