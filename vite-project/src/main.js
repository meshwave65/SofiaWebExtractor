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
// INSERT TASK - DIRETO NO SUPABASE (Sem usar backend)
// ======================
async function insertTask() {
  // Captura os valores dos inputs da aba Insert
  const agentSelect = document.querySelector("#tab2 select")?.value || "meshwave65";
  const agentOverride = document.querySelector("#tab2 input[placeholder='agent override']")?.value?.trim();
  const linkInput = document.querySelector("#tab2 input[placeholder='https://...']");
  const link = linkInput ? linkInput.value.trim() : "";

  if (!link) {
    alert("❌ O link (URL) é obrigatório!");
    return;
  }

  if (!SESSION.logged || !USER.id) {
    alert("❌ Você precisa estar logado para inserir uma task.");
    showTab(1);
    return;
  }

  const slug = extractSlugFromUrl(link);
  const llm_provider = extractLLMProvider(link);

  const payload = {
    user_name: USER.user_name,
    agente: agentOverride || agentSelect,
    full_url: link,
    session_user_id: USER.id,
    slug: slug,
    llm_provider: llm_provider,
    status: "STAGED"
  };

  console.log("🔄 Tentando inserir no Supabase:", payload);

  // === INSERT DIRETO NO SUPABASE ===
  const { data, error } = await supabase
    .from("appsofia_tasks")
    .insert([payload])
    .select();

  if (error) {
    console.error("❌ Erro ao inserir task:", error);
    alert("Erro ao salvar no banco:\n" + (error.message || error));
    return;
  }

  console.log("✅ Task inserida com sucesso:", data);
  alert("✅ Task inserida com sucesso!");

  // Limpa os campos após inserir
  if (linkInput) linkInput.value = "";
  const overrideInput = document.querySelector("#tab2 input[placeholder='agent override']");
  if (overrideInput) overrideInput.value = "";

  loadTasks();        // Atualiza a lista de tasks automaticamente
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
    console.error("Erro ao carregar arquivos:", err);
    FILES_DATA = [];
    renderFiles();
  }
}

// ======================
// RENDER FILES (mantém o que já estava bom)
// ======================
function renderFiles() {
  const container = document.getElementById("files");
  if (!container) return;

  container.innerHTML = "";

  if (!FILES_DATA || FILES_DATA.length === 0) {
    container.innerHTML = `<div style="padding:30px;color:#8aa0b5;text-align:center;">Nenhum arquivo encontrado</div>`;
    return;
  }

  FILES_DATA.forEach(provider => {
    const providerEl = document.createElement("div");
    providerEl.className = "file-provider";
    providerEl.textContent = `📁 ${provider.provider.toUpperCase()}`;
    container.appendChild(providerEl);

    (provider.tasks || []).forEach(task => {
      const taskEl = document.createElement("div");
      taskEl.className = "file-task";

      const header = document.createElement("div");
      header.className = "file-task-header";
      header.innerHTML = `Task: <strong>${task.task_id}</strong> <span style="float:right; font-size:9px;">${task.files?.length || 0} arq.</span>`;
      taskEl.appendChild(header);

      (task.files || []).forEach(file => {
        const row = document.createElement("div");
        row.className = "file-row";

        const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.filename);

        row.innerHTML = `
          <div>${isImage ? '🖼️' : '📄'}</div>
          <div class="filename">${file.filename}</div>
        `;

        row.onclick = () => previewFile(file);
        taskEl.appendChild(row);
      });

      container.appendChild(taskEl);
    });
  });
}

// ======================
// PREVIEW FILE + DOWNLOAD
// ======================
async function previewFile(file) {
  const previewPanel = document.getElementById("filePreview");

  previewPanel.innerHTML = `
    <div class="preview-header">
      <strong>${file.filename}</strong>
      <button onclick="downloadFile('${encodeURIComponent(file.path)}')" class="download-btn">
        ⬇️ Baixar
      </button>
    </div>
    <div id="preview-content" class="preview-content">
      Carregando...
    </div>
  `;

  const contentArea = document.getElementById("preview-content");
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.filename);

  try {
    const url = `/api/file?path=${encodeURIComponent(file.path)}`;

    if (isImage) {
      contentArea.innerHTML = `<img src="${url}" style="max-width:100%; height:auto;" alt="${file.filename}">`;
    } else {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Falha ao carregar");
      const text = await resp.text();
      contentArea.innerHTML = `<pre>${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
    }
  } catch (e) {
    contentArea.innerHTML = `
      <div style="color:#ff5c5c; padding:20px; text-align:center;">
        Não foi possível carregar o preview.<br><br>
        <button onclick="downloadFile('${encodeURIComponent(file.path)}')" class="download-btn">
          ⬇️ Baixar Arquivo
        </button>
      </div>`;
  }
}

// ======================
// DOWNLOAD
// ======================
function downloadFile(encodedPath) {
  const a = document.createElement('a');
  a.href = `/api/file?path=${encodedPath}&download=true`;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
window.insertTask = insertTask;     // ← Tem que ter esta linha
window.runAction = (a) => console.log("ACTION:", a);

// placeholder (UI only)
window.runAction = (a) => console.log("ACTION:", a);

// ======================
// INIT
// ======================
document.addEventListener("DOMContentLoaded", () => {
  showTab(1);
});
