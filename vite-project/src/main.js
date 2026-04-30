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

let TASKS = [];
let TASK_SELECTION = new Set();
let FILES_DATA = [];

// ======================
// LLM DETECTOR
// ======================
function extractLLMProvider(url = "") {
  if (!url) return "unknown";

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("chatgpt")) return "chatgpt";
    if (host.includes("grok")) return "grok";
    if (host.includes("manus")) return "manus";
    if (host.includes("perplexity")) return "perplexity";
    if (host.includes("claude")) return "claude";
  } catch {}

  const u = url.toLowerCase();
  if (u.includes("chatgpt")) return "chatgpt";
  if (u.includes("grok")) return "grok";
  if (u.includes("manus")) return "manus";
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
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";
}

// ======================
// LOGIN (FIX USER INJECTION)
// ======================
async function login() {
  const inputVal = document.getElementById("login_email")?.value?.trim();
  const pass = document.getElementById("login_pass")?.value;

  if (!inputVal || !pass) return alert("Preencha todos os campos");

  // --- CAMADA 1: Verificar na tabela 'clients' ---
  // Buscamos por email OU user_name
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("email, user_name, full_name")
    .or(`email.eq.${inputVal},user_name.eq.${inputVal}`)
    .single();

  if (clientError || !client) {
    console.error("Erro Camada 1:", clientError);
    return alert("Usuário ou e-mail não encontrados");
  }

  // Agora temos o e-mail real de cadastro para a Camada 2
  const realEmail = client.email;

  // --- CAMADA 2: Autenticação no Supabase Auth ---
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: realEmail,
    password: pass
  });

  if (authError) {
    console.error("Erro Camada 2:", authError);
    return alert("Falha na autenticação: e-mail ou password inválidos");
  }

  // Sucesso! Atualizamos o estado global
  SESSION.logged = true;
  USER.id = authData.user.id;
  USER.email = realEmail;
  USER.user_name = client.user_name;
  USER.full_name = client.full_name;

  // Atualiza UI de apresentação
  const el = document.getElementById("taskUserName");
  if (el) el.textContent = USER.full_name || USER.user_name;

  // Vai para a aba de Tasks
  showTab(3);
  loadTasks();
  loadFiles();
}

// ======================
// LOAD TASKS (REAL DB)
// ======================
async function loadTasks() {
  if (!USER.id) return;

  const { data, error } = await supabase
    .from("appsofia_tasks")
    .select("*")
    .eq("session_user_id", USER.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  TASKS = (data || []).map(t => ({
    ...t,
    llm_provider: t.llm_provider || extractLLMProvider(t.full_url)
  }));

  updateFilters();
  renderTasks();
}

// ======================
// FILTER LOGIC
// ======================
function updateFilters() {
  const agents = [...new Set(TASKS.map(t => t.agent_name).filter(Boolean))];
  const llms = [...new Set(TASKS.map(t => t.llm_provider).filter(Boolean))];
  const statuses = [...new Set(TASKS.map(t => t.status).filter(Boolean))];

  const fAgent = document.getElementById("filter_agent");
  const fLlm = document.getElementById("filter_llm");
  const fStatus = document.getElementById("filter_status");

  if (fAgent) {
    fAgent.innerHTML = '<option value="ALL">All Agents</option>' + 
      agents.map(a => `<option value="${a}">${a}</option>`).join("");
  }
  if (fLlm) {
    fLlm.innerHTML = '<option value="ALL">All LLM</option>' + 
      llms.map(l => `<option value="${l}">${l}</option>`).join("");
  }
  if (fStatus) {
    fStatus.innerHTML = '<option value="ALL">All Status</option>' + 
      statuses.map(s => `<option value="${s}">${s}</option>`).join("");
  }
}

function getFilteredTasks() {
  const agent = document.getElementById("filter_agent")?.value || "ALL";
  const llm = document.getElementById("filter_llm")?.value || "ALL";
  const status = document.getElementById("filter_status")?.value || "ALL";

  return TASKS.filter(t => {
    const mAgent = agent === "ALL" || t.agent_name === agent;
    const mLlm = llm === "ALL" || t.llm_provider === llm;
    const mStatus = status === "ALL" || t.status === status;
    return mAgent && mLlm && mStatus;
  });
}

// ======================
// RENDER TASKS (SAFE UI)
// ======================
function renderTasks() {
  const container = document.getElementById("tasks");
  if (!container) return;

  const tasks = getFilteredTasks();
  container.innerHTML = "";

  tasks.forEach(t => {
    const isSelected = TASK_SELECTION.has(t.id);
    const row = document.createElement("div");
    row.className = "task-row";

    row.innerHTML = `
      <div class="task-check">
        <input type="checkbox" ${isSelected ? "checked" : ""} onchange="toggleTask('${t.id}')">
      </div>

      <div class="task-icon">⚙</div>

      <div class="task-content">
        <div class="task-id">${t.slug || t.id}</div>
        <div class="task-llm">${t.llm_provider}</div>
        <div class="task-url">${t.full_url || ""}</div>
      </div>

      <div class="task-status">${t.status}</div>
    `;

    container.appendChild(row);
  });
}

// ======================
// SELECTION
// ======================
function toggleTask(id) {
  if (TASK_SELECTION.has(id)) TASK_SELECTION.delete(id);
  else TASK_SELECTION.add(id);
}

function toggleAllTasks(el) {
  const tasks = getFilteredTasks();
  if (el.checked) {
    tasks.forEach(t => TASK_SELECTION.add(t.id));
  } else {
    tasks.forEach(t => TASK_SELECTION.delete(t.id));
  }
  renderTasks();
}

// ======================
// ACTIONS (RUN, PAUSE, DELETE)
// ======================
// ======================
// FILES (PAGINA 4)
// ======================
async function loadFiles() {
  if (!USER.user_name || USER.user_name === "guest") return;

    const API_BASE = "https://appsofia.meshwave.com.br";
//    const API_BASE = "http://127.0.0.1:3000";
  
  try {
    const resp = await fetch(`${API_BASE}/files?user_name=${USER.user_name}`);
    const json = await resp.json();

    if (json.ok && json.data) {
      FILES_DATA = json.data.providers || [];
      renderFiles();
    }
  } catch (err) {
    console.error("Erro ao carregar arquivos:", err);
  }
}

function renderFiles() {
  const container = document.getElementById("files");
  if (!container) return;

  container.innerHTML = "";

  if (FILES_DATA.length === 0) {
    container.innerHTML = '<div style="padding:10px; font-size:10px; color:#8aa0b5;">Nenhum arquivo encontrado.</div>';
    return;
  }

  FILES_DATA.forEach(provider => {
    // Provider Header
    const pHeader = document.createElement("div");
    pHeader.style.cssText = "padding:8px; font-size:10px; font-weight:bold; background:#1a2433; color:#4ea1ff; border-bottom:1px solid #1f2a3a;";
    pHeader.textContent = provider.provider.toUpperCase();
    container.appendChild(pHeader);

    provider.tasks.forEach(task => {
      task.files.forEach(file => {
        const row = document.createElement("div");
        row.className = "file-row";
        row.innerHTML = `
          <div style="font-size:10px; color:#8aa0b5;">📄</div>
          <div style="font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${file.filename}">
            ${file.filename}
          </div>
        `;
        row.onclick = () => previewFile(file);
        container.appendChild(row);
      });
    });
  });
}

function previewFile(file) {
  const preview = document.getElementById("filePreview");
  if (!preview) return;

  preview.innerHTML = `
    <div style="border-bottom:1px solid #1f2a3a; padding-bottom:8px; margin-bottom:10px;">
      <b style="color:#4ea1ff; font-size:11px;">${file.filename}</b>
      <div style="font-size:8px; color:#8aa0b5; margin-top:4px;">Caminho: ${file.path}</div>
    </div>
    <div style="color:#ccc; font-family:monospace; white-space:pre-wrap; font-size:10px;">
      Carregando conteúdo...
    </div>
  `;

  // Aqui poderíamos fazer um fetch do conteúdo se o backend suportasse.
  // Por enquanto, mostramos os metadados conforme o layout original.
  setTimeout(() => {
    preview.innerHTML = `
      <div style="border-bottom:1px solid #1f2a3a; padding-bottom:8px; margin-bottom:10px;">
        <b style="color:#4ea1ff; font-size:11px;">${file.filename}</b>
        <div style="font-size:8px; color:#8aa0b5; margin-top:4px;">Caminho: ${file.path}</div>
      </div>
      <div style="background:#0e141d; padding:8px; border-radius:4px; border:1px solid #1f2a3a;">
        <p style="margin:0; color:#8aa0b5; font-size:9px;">
          O conteúdo deste arquivo está armazenado no servidor local. 
          Para visualizar o conteúdo completo, utilize o módulo de busca ou download.
        </p>
      </div>
    `;
  }, 500);
}

async function runAction(action) {
  if (TASK_SELECTION.size === 0) return alert("No tasks selected");

  const ids = Array.from(TASK_SELECTION);
  let updateData = {};

  if (action === "RUN") updateData = { status: "RUNNING" };
  else if (action === "PAUSE") updateData = { status: "PAUSED" };
  else if (action === "DELETE") {
    if (!confirm(`Delete ${ids.length} tasks?`)) return;
    const { error } = await supabase
      .from("appsofia_tasks")
      .delete()
      .in("id", ids);
    
    if (error) return alert("Delete failed");
    TASK_SELECTION.clear();
    return loadTasks();
  }

  const { error } = await supabase
    .from("appsofia_tasks")
    .update(updateData)
    .in("id", ids);

  if (error) return alert("Action failed");
  loadTasks();
}

// ======================
// EXPORT
// ======================
window.showTab = showTab;
window.login = login;
window.toggleTask = toggleTask;
window.toggleAllTasks = toggleAllTasks;
window.runAction = runAction;
window.renderTasks = renderTasks; // For filter onchange
window.loadFiles = loadFiles;
window.previewFile = previewFile;

// INIT
document.addEventListener("DOMContentLoaded", () => {
  showTab(1);

  // Add event listeners for filters
  ["filter_agent", "filter_llm", "filter_status"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderTasks);
  });
});
