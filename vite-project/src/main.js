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

// ======================
// TAB SYSTEM
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));
  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";
}

// ======================
// FETCH TASKS
// ======================
async function loadTasks() {
  if (!USER.user_name) return;

  const { data, error } = await supabase
    .from("appsofia_tasks")
    .select("*")
    .eq("user_name", USER.user_name)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  TASKS = data || [];
  renderTasks();
}

// ======================
// ICON BY STATUS
// ======================
function getStatusIcon(status) {
  switch (status) {
    case "PROCESS":
      return "⚙️";
    case "DONE":
      return "✅";
    case "PAUSED":
      return "⏸️";
    case "FAIL":
      return "❌";
    case "STAGED":
      return "📦";
    default:
      return "•";
  }
}

// ======================
// RENDER TASKS
// ======================
function renderTasks() {
  const container = document.getElementById("tasks");

  container.innerHTML = `
    
    <div class="tasks-header">
      <div class="tasks-title">TASKS</div>
      <div class="tasks-user">User: ${USER.full_name}</div>
    </div>

    <div class="tasks-controls">

      <div class="tasks-filters">
        <select id="filterAgent">
          <option>All Agents</option>
        </select>

        <select id="filterLLM">
          <option>All LLM</option>
        </select>

        <select id="filterStatus">
          <option>All Status</option>
        </select>
      </div>

      <div class="tasks-actions">
        <button onclick="runAction('PROCESS')">▶</button>
        <button onclick="runAction('PAUSED')">⏸</button>
        <button onclick="runAction('DELETED')">■</button>
      </div>

    </div>

    <div class="task-row task-head">
      <div><input type="checkbox" id="selectAll" onclick="toggleAll()"></div>
      <div></div>
      <div></div>
      <div></div>
    </div>

  `;

  TASKS.forEach(t => {
    container.innerHTML += `
      <div class="task-row">

        <div class="task-check">
          <input type="checkbox" class="taskSelect" data-id="${t.id}">
        </div>

        <div class="task-icon">
          ${getStatusIcon(t.status)}
        </div>

        <div class="task-content">
          <div class="task-id">${t.id}</div>
          <div class="task-llm">${t.llm_provider || "-"}</div>
          <div class="task-url">${t.full_url}</div>
        </div>

        <div class="task-status">
          ${t.status}
        </div>

      </div>
    `;
  });
}

// ======================
// SELECT ALL
// ======================
window.toggleAll = function () {
  const state = document.getElementById("selectAll").checked;
  document.querySelectorAll(".taskSelect").forEach(c => (c.checked = state));
};

// ======================
// ACTIONS
// ======================
window.runAction = function (action) {

  const selected = [...document.querySelectorAll(".taskSelect:checked")]
    .map(el => el.dataset.id);

  if (!selected.length) {
    alert("Nenhuma task selecionada");
    return;
  }

  const confirmMsg = `Você selecionou ${action} nas tasks selecionadas. Confirmar?`;

  if (!confirm(confirmMsg)) return;

  console.log("ACTION:", action, selected);
};

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

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .or(`email.eq.${identifier},user_name.eq.${identifier}`)
    .single();

  if (!client) {
    alert("User not found");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: client.email,
    password
  });

  if (error) {
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

  showTab(3);
  loadTasks();
}

// ======================
// EXPORTS
// ======================
window.showTab = showTab;
window.login = login;

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(1);
});
