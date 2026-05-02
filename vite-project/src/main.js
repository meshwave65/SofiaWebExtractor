"use strict";

import "./styles.css";
import { supabase } from "./lib/supabase";

const MESH_WAVE_UUID = "7891b8f4-68cc-4344-89e1-c000b80918bb";
const API_BASE_URL = "https://appsofia.meshwave.com.br";

// ======================
// STATE
// ======================
let USER = { id: null, user_name: "guest", full_name: "Guest User", email: null };
let SESSION = { logged: false };
let TASKS = [];
let TASK_SELECTION = new Set();

// Estado do File Manager
let FILES_DATA = []; 
let FILE_NAV_PATH = []; 
let SELECTED_FILE = null;

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
// AUTH & LOGIN
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
  
  document.getElementById("p_username").value = USER.user_name;
  document.getElementById("p_name").value = USER.full_name || "";
  document.getElementById("p_email").value = USER.email || "";
  document.getElementById("taskUserName").innerText = USER.user_name;

  showTab(3);
  loadTasks();
  loadFiles();
}

// ======================
// REGISTER USER
// ======================
async function registerUser() {
  const name = document.getElementById("reg_name")?.value?.trim();
  const email = document.getElementById("reg_email")?.value?.trim();
  const customUsername = document.getElementById("reg_username")?.value?.trim();
  const code = document.getElementById("reg_code")?.value?.trim()?.toUpperCase();
  const pass = document.getElementById("reg_pass")?.value;
  const pass2 = document.getElementById("reg_pass2")?.value;

  const msg = document.getElementById("reg_msg");
  if (msg) msg.innerText = "";

  if (!name || !email || !code || !pass || !pass2) {
    if (msg) msg.innerText = "Preencha todos os campos obrigatórios";
    return;
  }

  if (pass !== pass2) {
    if (msg) msg.innerText = "Senhas não conferem";
    return;
  }

  const username = customUsername || email.split("@")[0];

  // 1. Verificar convite
  const { data: invite, error: inviteError } = await supabase
    .from("invites_dev")
    .select("*")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();

  if (inviteError || !invite) {
    if (msg) msg.innerText = "Código de convite inválido ou já utilizado";
    return;
  }

  // 2. Inserir na tabela de usuários (clients)
  const { data: userInsert, error: userError } = await supabase
    .from("clients")
    .insert([{
      client_id: Date.now(),
      user_name: username,
      email: email,
      full_name: name,
      owner_user_id: MESH_WAVE_UUID
    }])
    .select()
    .maybeSingle();

  if (userError || !userInsert) {
    if (msg) msg.innerText = `Erro ao criar perfil: ${userError?.message}`;
    return;
  }

  // 3. Criar Auth User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: pass
  });

  if (authError || !authData?.user) {
    if (msg) msg.innerText = "Erro ao criar conta no Auth";
    return;
  }

  // 4. Atualizar vínculo e queimar convite
  await Promise.all([
    supabase.from("clients").update({ owner_user_id: authData.user.id }).eq("client_uuid", userInsert.client_uuid),
    supabase.from("invites_dev").update({ status: "used" }).eq("code", code)
  ]);

  if (msg) msg.innerText = "Usuário criado com sucesso! Faça login.";
  setTimeout(() => showTab(1), 2000);
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
    slug: extractSlugFromUrl(link),
    llm_provider: extractLLMProvider(link),
//    owner_user_id: MESH_WAVE_UUID,
    status: "STAGED"
  };
  const { error } = await supabase.from("appsofia_tasks").insert([payload]);
  if (error) alert(error.message);
  else { alert("Sucesso!"); loadTasks(); }
}

// ======================
// FILES MANAGER (Hierárquico)
// ======================
async function loadFiles() {
  if (!USER.user_name) return;
  try {
    const resp = await fetch(`${API_BASE_URL}/files?user_name=${USER.user_name}`);
    const json = await resp.json();
    FILES_DATA = json?.data?.providers || [];
    FILE_NAV_PATH = [{ type: 'root', name: 'Knowledge' }];
    renderFiles();
  } catch (err) { console.error(err); }
}

function renderFiles() {
  const container = document.getElementById("files");
  if (!container) return;
  container.innerHTML = "";

  if (FILE_NAV_PATH.length > 1) {
    const back = document.createElement("div");
    back.className = "manager-item back-item";
    back.onclick = goBack;
    back.innerHTML = `<span>⬅️</span> <div style="font-weight:bold;">Voltar</div>`;
    container.appendChild(back);
  }

  const currentLevel = FILE_NAV_PATH[FILE_NAV_PATH.length - 1];

  if (currentLevel.type === 'root') {
    FILES_DATA.forEach(p => {
      const item = document.createElement("div");
      item.className = "manager-item folder-item";
      item.onclick = () => {
        FILE_NAV_PATH.push({ type: 'provider', name: p.provider, data: p });
        renderFiles();
      };
      item.innerHTML = `<span>📁</span> <div>${p.provider.toUpperCase()}</div>`;
      container.appendChild(item);
    });
  } 
  else if (currentLevel.type === 'provider') {
    currentLevel.data.tasks.forEach(t => {
      const item = document.createElement("div");
      item.className = "manager-item folder-item";
      item.onclick = () => {
        FILE_NAV_PATH.push({ type: 'task', name: t.task_id, data: t });
        renderFiles();
      };
      item.innerHTML = `<span>📂</span> <div style="font-size:10px; word-break:break-all;">${t.task_id}</div>`;
      container.appendChild(item);
    });
  }
  else if (currentLevel.type === 'task') {
    currentLevel.data.files.forEach(f => {
      const item = document.createElement("div");
      item.className = "manager-item file-item";
      if (SELECTED_FILE && SELECTED_FILE.path === f.path) item.classList.add("active");
      item.onclick = () => previewFile(f, item);
      item.innerHTML = `<span>📄</span> <div style="font-size:11px; overflow:hidden; text-overflow:ellipsis;">${f.filename}</div>`;
      container.appendChild(item);
    });
  }
}

function goBack() {
  FILE_NAV_PATH.pop();
  renderFiles();
}

async function previewFile(file, element) {
  SELECTED_FILE = file;
  document.querySelectorAll(".manager-item").forEach(i => i.classList.remove("active"));
  element.classList.add("active");
  
  const header = document.getElementById("fileNameDisplay");
  header.innerHTML = `
    <span>${file.filename}</span>
    <button onclick="downloadFile('${file.path}')" style="background:#4ea1ff; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">Download</button>
  `;

  const preview = document.getElementById("filePreview");
  preview.innerHTML = `<div style="text-align:center; padding:50px;">⌛ Carregando...</div>`;

  try {
    const fileUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(file.path)}`;
    const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.filename);

    if (isImg) {
      preview.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">`;
    } else {
      const resp = await fetch(fileUrl);
      const text = await resp.text();
      preview.innerHTML = `<pre style="font-size:12px; color:#cfd6e4; white-space:pre-wrap; background:#111826; padding:15px; border-radius:8px; border:1px solid #1f2a3a;">${text || "Arquivo vazio"}</pre>`;
    }
  } catch (err) {
    preview.innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar arquivo: ${err.message}</div>`;
  }
}

window.downloadFile = function(path) {
  const downloadUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(path)}&download=true`;
  window.open(downloadUrl, '_blank');
};

// ======================
// SEARCH & PROFILE
// ======================
function setSearchMode(mode) {
  SEARCH_MODE = mode;
  document.querySelectorAll(".btn-mode").forEach(b => b.classList.remove("active"));
  document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()}`).classList.add("active");
}

async function performSearch() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;
  const preview = document.getElementById("searchPreview");
  preview.innerHTML = `<div style="text-align:center; padding:50px;">🔍 Processando modo ${SEARCH_MODE}...</div>`;
  setTimeout(() => {
    preview.innerHTML = `<h3>Resultado (${SEARCH_MODE})</h3><p>Informações sobre "${query}" processadas com sucesso.</p>`;
  }, 1000);
}

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
  if (error) msg.innerHTML = `<span style="color:#ef4444;">Erro ao salvar</span>`;
  else msg.innerHTML = `<span style="color:#4ade80;">Salvo!</span>`;
}

// ======================
// INIT
// ======================
window.showTab = showTab;
window.login = login;
window.registerUser = registerUser;
window.loadTasks = loadTasks;
window.loadFiles = loadFiles;
window.insertTask = insertTask;
window.setSearchMode = setSearchMode;
window.performSearch = performSearch;
window.saveProfile = saveProfile;
window.toggleTaskSelection = (id, cb) => toggleTaskSelection(id, cb);
window.openRegister = () => showTab(7);

document.addEventListener("DOMContentLoaded", () => showTab(1));
