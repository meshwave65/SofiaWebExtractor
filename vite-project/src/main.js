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

function extractSlugFromUrl(url) {
  if (!url) return null;
  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch { return null; }
}

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
  return "unknown";
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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: pass
  });

  if (authError || !authData?.user) {
    if (msg) msg.innerText = "Erro ao criar conta no Auth";
    return;
  }

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
    slug: extractSlugFromUrl(url),
    llm_provider: extractLLMProvider(url),
    status: "STAGED"
  };
  const { error } = await supabase.from("appsofia_tasks").insert([payload]);
  if (error) alert(error.message);
  else { alert("Sucesso!"); loadTasks(); }
}

// ======================
// FILES MANAGER (NEW INTEGRATION)
// ======================

async function loadFiles() {
  if (!SESSION.logged) return;

  try {
    const url = `${API_BASE_URL}/files?user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
    const res = await fetch(url);
    const json = await res.json();

    FILES_DATA = json?.data?.providers || [];
    renderFileTree();
  } catch (err) {
    console.error("loadFiles error:", err);
  }
}

// ======================
// RENDER TREE (APP VERSION)
// ======================
function renderFileTree() {
  const container = document.getElementById("files"); 
  if (!container) return;

  container.innerHTML = "";

  if (!FILES_DATA.length) {
    container.innerHTML = "<div style='padding:10px;'>No files</div>";
    return;
  }

  FILES_DATA.forEach(provider => {

    const p = document.createElement("div");
    p.className = "manager-item";
    p.innerHTML = "📁 " + provider.provider;
    container.appendChild(p);

    (provider.tasks || []).forEach(task => {

      const t = document.createElement("div");
      t.className = "manager-item";
      t.style.paddingLeft = "12px";
      t.innerHTML = "📂 " + task.task_id;
      container.appendChild(t);

      (task.files || []).forEach(file => {

        const f = document.createElement("div");
        f.className = "manager-item";
        f.style.paddingLeft = "24px";
        f.innerHTML = "📄 " + file.filename;

        f.onclick = () => previewFileUnified(file, f);

        container.appendChild(f);
      });
    });
  });
}

// ======================
// PREVIEW (UNIFIED - SAME LOGIC AS HTML TEST)
// ======================
async function previewFileUnified(file, element) {

  SELECTED_FILE = file;

  document.querySelectorAll(".manager-item")
    .forEach(i => i.classList.remove("active"));

  element.classList.add("active");

  const header = document.getElementById("fileNameDisplay");
  if (header) {
    header.innerHTML = `
      <span>${file.filename}</span>
      <button onclick="downloadFile('${file.path}')"
        style="background:#4ea1ff;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
        Download
      </button>
    `;
  }

  const preview = document.getElementById("filePreview");
  preview.innerHTML = "Loading...";

  const ext = file.filename.split(".").pop().toLowerCase();
  const fileUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(file.path)}&download=false`;

  // ======================
  // IMAGE
  // ======================
  if (["png","jpg","jpeg","gif","webp"].includes(ext)) {
    preview.innerHTML = `<img src="${fileUrl}" style="max-width:100%;">`;
    return;
  }

  // ======================
  // PDF (inline iframe)
  // ======================
  if (ext === "pdf") {
    preview.innerHTML = `<iframe src="${fileUrl}"></iframe>`;
    return;
  }

  // ======================
  // DOC / DOCX (google viewer fallback)
  // ======================
  if (ext === "doc" || ext === "docx") {
    const google = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    preview.innerHTML = `
      <iframe src="${google}"></iframe>
      <div style="margin-top:10px;">
        <a href="${fileUrl}" target="_blank" style="color:#4ea1ff;">
          Open original file
        </a>
      </div>
    `;
    return;
  }

  // ======================
  // TEXT fallback
  // ======================
  try {
    const text = await fetch(fileUrl).then(r => r.text());
    preview.innerHTML = `<pre>${text || "empty"}</pre>`;
  } catch (e) {
    preview.innerHTML = `<pre>Error loading file</pre>`;
  }
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
