"use strict";

import "./styles.css";
import { supabase } from "./lib/supabase";

const MESH_WAVE_UUID = "7891b8f4-68cc-4344-89e1-c000b80918bb";

// ======================
// STATE
// ======================
let USER = { id: null, user_name: "guest", full_name: "Guest User", email: null };
let SESSION = { logged: false };
let TASKS = [];
let TASK_SELECTION = new Set();
let FILES_DATA = [];
let SEARCH_MODE = "DEFAULT"; // DEFAULT, RESUMO, ENRICH

// ======================
// HELPERS
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));
  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";
}

function getStatusIcon(status) {
  const s = (status || "").toUpperCase();
  if (s === "STAGED") return "📦";
  if (s === "DONE") return "🏁";
  if (s === "DELETED") return "🗑️";
  if (s === "PROCESS" || s === "PROCESSING") return "⚙️";
  if (s === "FAIL" || s === "FAILED") return "🚨";
  if (s === "PAUSE" || s === "PAUSED") return "⏸️";
  return "❓";
}

function getStatusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "STAGED") return "status-staged";
  if (s === "PROCESS" || s === "PROCESSING") return "status-process";
  if (s === "DONE") return "status-done";
  if (s === "FAIL" || s === "FAILED") return "status-fail";
  if (s === "PAUSE" || s === "PAUSED") return "status-pause";
  return "status-staged";
}

// ======================
// AUTH
// ======================
async function login() {
  const identifier = document.getElementById("login_email")?.value?.trim();
  const password = document.getElementById("login_pass")?.value;
  if (!identifier || !password) { alert("Preencha os campos"); return; }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .or(`email.eq."${identifier}",user_name.eq."${identifier}"`)
    .maybeSingle();

  if (clientError || !client) { alert("Usuário não encontrado"); return; }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: client.email,
    password
  });

  if (error || !data?.user) { alert("Falha na autenticação"); return; }

  SESSION.logged = true;
  USER = { id: data.user.id, user_name: client.user_name, full_name: client.full_name, email: client.email };
  
  // Preencher Profile
  document.getElementById("p_username").value = USER.user_name;
  document.getElementById("p_name").value = USER.full_name || "";
  document.getElementById("p_email").value = USER.email || "";
  document.getElementById("taskUserName").innerText = USER.user_name;

  showTab(3);
  loadTasks();
  loadFiles();
}

// ======================
// TASKS
// ======================
async function loadTasks() {
  if (!SESSION.logged) return;
  const { data, error } = await supabase.from("appsofia_tasks").select("*").eq("session_user_id", USER.id).order("created_at", { ascending: false });
  if (error) return;
  TASKS = data || [];
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById("tasks");
  if (!container) return;
  container.innerHTML = "";
  TASKS.forEach(t => {
    const row = document.createElement("div");
    row.className = "task-row";
    const extStatus = t.extractor_status || t.status || "STAGED";
    const dwnStatus = t.downloader_status || t.status || "STAGED";
    row.innerHTML = `
      <div style="display:flex; justify-content:center;"><input type="checkbox" onchange="toggleTaskSelection(${t.id}, this)"></div>
      <div class="task-icon" style="text-align:center;">${getStatusIcon(extStatus)}</div>
      <div class="task-content">
        <div class="task-id">${t.id}</div>
        <div class="task-llm">${t.llm_provider || "unknown"}</div>
        <div class="task-url">${t.full_url}</div>
      </div>
      <div style="display:flex; justify-content:center;"><div class="task-status-btn ${getStatusClass(extStatus)}">${extStatus}</div></div>
      <div style="display:flex; justify-content:center;"><div class="task-status-btn ${getStatusClass(dwnStatus)}">${dwnStatus}</div></div>
    `;
    container.appendChild(row);
  });
}

function toggleTaskSelection(id, cb) { if (cb.checked) TASK_SELECTION.add(id); else TASK_SELECTION.delete(id); }

async function insertTask() {
  const url = document.getElementById("task_url").value.trim();
  if (!url) { alert("URL obrigatória"); return; }
  const payload = {
    user_name: USER.user_name,
    agente: document.getElementById("agent_override").value || document.getElementById("insert_agent").value,
    full_url: url,
    session_user_id: USER.id,
    owner_user_id: MESH_WAVE_UUID,
    status: "STAGED"
  };
  const { error } = await supabase.from("appsofia_tasks").insert([payload]);
  if (error) alert(error.message);
  else { alert("Sucesso!"); loadTasks(); }
}

// ======================
// FILES MANAGER
// ======================
async function loadFiles() {
  if (!USER.user_name) return;
  try {
    const resp = await fetch(`https://appsofia.meshwave.com.br/files?user_name=${USER.user_name}`);
    const json = await resp.json();
    FILES_DATA = json?.data?.providers || [];
    renderFiles();
  } catch (err) { console.error(err); }
}

function renderFiles() {
  const container = document.getElementById("files");
  if (!container) return;
  container.innerHTML = "";
  FILES_DATA.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "manager-item";
    item.onclick = () => previewFile(file, item);
    item.innerHTML = `<span>📄</span> <div style="font-size:12px; overflow:hidden; text-overflow:ellipsis;">${file.filename || file.name}</div>`;
    container.appendChild(item);
  });
}

function previewFile(file, element) {
  document.querySelectorAll(".manager-item").forEach(i => i.classList.remove("active"));
  element.classList.add("active");
  document.getElementById("fileNameDisplay").innerText = file.filename || file.name;
  const preview = document.getElementById("filePreview");
  const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.filename || file.name);
  if (isImg) {
    preview.innerHTML = `<img src="${file.url || file.path}" style="max-width:100%; border-radius:8px;">`;
  } else {
    preview.innerHTML = `<pre style="font-size:12px; color:#cfd6e4; white-space:pre-wrap;">${file.content || "Sem conteúdo para exibir"}</pre>`;
  }
}

// ======================
// SEARCH (3 MODES)
// ======================
function setSearchMode(mode) {
  SEARCH_MODE = mode;
  document.querySelectorAll(".btn-mode").forEach(b => b.classList.remove("active"));
  document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()}`).classList.add("active");
  alert(`Modo de busca alterado para: ${mode}`);
}

async function performSearch() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;
  const preview = document.getElementById("searchPreview");
  preview.innerHTML = `<div style="text-align:center; padding:50px;">🔍 Processando modo ${SEARCH_MODE}...</div>`;
  
  // Simulação de lógica por modo
  setTimeout(() => {
    if (SEARCH_MODE === "DEFAULT") {
      preview.innerHTML = `<h3>Resultados para: ${query}</h3><p>Lista de artefatos encontrados na base de dados...</p>`;
    } else if (SEARCH_MODE === "RESUMO") {
      preview.innerHTML = `<h3>Resumo Inteligente (LLM)</h3><p>Baseado na sua busca por "${query}", aqui está o resumo organizado das informações...</p>`;
    } else {
      preview.innerHTML = `<h3>Relatório Enrich (IA + Fontes Externas)</h3><p>Relatório detalhado sobre "${query}" enriquecido com dados da web e bases externas...</p>`;
    }
  }, 1000);
}

// ======================
// PROFILE
// ======================
async function saveProfile() {
  const payload = {
    full_name: document.getElementById("p_name").value,
    email: document.getElementById("p_email").value,
    tel1: document.getElementById("p_tel").value,
    company: document.getElementById("p_company").value,
    role: document.getElementById("p_role").value
  };
  const { error } = await supabase.from("clients").update(payload).eq("id", USER.id);
  const msg = document.getElementById("profile_msg");
  if (error) msg.innerHTML = `<span style="color:#ef4444;">Erro: ${error.message}</span>`;
  else msg.innerHTML = `<span style="color:#4ade80;">Perfil atualizado com sucesso!</span>`;
}

// ======================
// INIT
// ======================
window.showTab = showTab;
window.login = login;
window.loadTasks = loadTasks;
window.loadFiles = loadFiles;
window.insertTask = insertTask;
window.setSearchMode = setSearchMode;
window.performSearch = performSearch;
window.saveProfile = saveProfile;
window.toggleTaskSelection = (id, cb) => toggleTaskSelection(id, cb);

document.addEventListener("DOMContentLoaded", () => showTab(1));
