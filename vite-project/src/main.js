"use strict";

import "./styles.css";

// ======================
// STATE
// ======================
let USER = {
  user_name: "guest",
  full_name: "Guest User"
};

let SESSION = {
  logged: false
};

let CLIENT = {
  full_name: "",
  email: "",
  tel1: "",
  company: "",
  role: "",
  password: ""
};

// ======================
// MOCK DATA
// ======================
let TASKS = [
  {
    id: "1dc03cca-ae3d-431c",
    status: "DONE",
    llm: "chatgpt",
    url: "https://chatgpt.com/share/demo1"
  },
  {
    id: "5992971d-a8d3-4f12",
    status: "PROCESSING",
    llm: "manus",
    url: "https://manus.im/share/demo2"
  },
  {
    id: "722a83e8-62fb-9a11",
    status: "FAIL",
    llm: "grok",
    url: "https://grok.com/share/demo3"
  }
];

let FILES = [
  { type: "dir", name: "agents" },
  { type: "dir", name: "logs" },
  { type: "file", name: "readme.md", content: "MeshWave system file content..." }
];

// ======================
// ROUTER
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));

  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";

  if (n === 3) renderTasks();
  if (n === 4) renderFiles();
  if (n === 5) renderSearch();
  if (n === 6) loadProfile();
  if (n === 7) loadRegister();
}

// ======================
// AUTH
// ======================
function loginMock() {
  SESSION.logged = true;

  USER = {
    user_name: "meshwave",
    full_name: "MeshWave Operator"
  };

  showTab(3);
}

function openRegister() {
  showTab(7);
}

// ======================
// TASKS (RESTORED GRID)
// ======================
function renderTasks() {
  const el = document.getElementById("tasks");
  if (!el) return;

  el.innerHTML = "";

  const icon = {
    DONE: "✔",
    PROCESSING: "⚙",
    STAGED: "🚨",
    FAIL: "⛔"
  };

  const color = {
    DONE: "#2ecc71",
    PROCESSING: "#3498db",
    STAGED: "#f39c12",
    FAIL: "#e74c3c"
  };

  TASKS.forEach(t => {
    const row = document.createElement("div");
    row.className = "task-row";

    row.innerHTML = `
      <div class="task-check">
        <input type="checkbox">
      </div>

      <div class="task-icon">
        ${icon[t.status]}
      </div>

      <div class="task-content">
        <div class="task-id">${t.id}</div>
        <div class="task-llm">${t.llm}</div>
        <div class="task-url">${t.url}</div>
      </div>

      <div class="task-status" style="background:${color[t.status]}">
        ${t.status}
      </div>
    `;

    el.appendChild(row);
  });
}

// ======================
// FILES (RESTORED)
// ======================
function renderFiles() {
  const el = document.getElementById("files");
  const preview = document.getElementById("filePreview");

  if (!el) return;

  el.innerHTML = "";

  FILES.forEach(f => {
    const row = document.createElement("div");
    row.className = "file-row";

    row.innerHTML = `
      <div>${f.type === "dir" ? "📁" : "📄"}</div>
      <div>${f.name}</div>
    `;

    row.onclick = () => {
      if (f.type === "file") {
        preview.textContent = f.content;
      }
    };

    el.appendChild(row);
  });
}

// ======================
// SEARCH (DUAL PANE RESTORED)
// ======================
function renderSearch() {
  const left = document.getElementById("searchResults");
  const right = document.getElementById("searchPreview");

  if (!left) return;

  const DB = [
    { id: "a1", title: "ChatGPT Artifact", content: "LLM output..." },
    { id: "a2", title: "Manus Artifact", content: "workflow data..." },
    { id: "a3", title: "Grok Artifact", content: "analysis..." }
  ];

  left.innerHTML = "";

  DB.forEach(a => {
    const div = document.createElement("div");
    div.className = "artifact";

    div.innerHTML = `
      <input type="checkbox">
      <div>
        <div style="font-weight:bold;font-size:11px;">${a.title}</div>
        <div style="font-size:9px;color:#8aa0b5;">artifact</div>
      </div>
    `;

    div.onclick = () => {
      right.textContent = a.content;
    };

    left.appendChild(div);
  });
}

// ======================
// PROFILE (EXPANDED REAL MODEL)
// ======================
function loadProfile() {
  document.getElementById("p_username").value = USER.user_name;

  document.getElementById("p_name").value = CLIENT.full_name;
  document.getElementById("p_email").value = CLIENT.email;
  document.getElementById("p_tel").value = CLIENT.tel1;
  document.getElementById("p_company").value = CLIENT.company;
  document.getElementById("p_role").value = CLIENT.role;
}

function saveProfile() {
  CLIENT.full_name = document.getElementById("p_name").value;
  CLIENT.email = document.getElementById("p_email").value;
  CLIENT.tel1 = document.getElementById("p_tel").value;
  CLIENT.company = document.getElementById("p_company").value;
  CLIENT.role = document.getElementById("p_role").value;

  document.getElementById("profile_msg").innerText = "Profile updated";
}

// ======================
// REGISTER (LEAN FLOW)
// ======================
function loadRegister() {
  ["reg_name","reg_email","reg_tel","reg_pass","reg_pass2"]
    .forEach(id => (document.getElementById(id).value = ""));
}

function registerUser() {
  const p1 = document.getElementById("reg_pass").value;
  const p2 = document.getElementById("reg_pass2").value;

  if (p1 !== p2) {
    document.getElementById("reg_msg").innerText = "Password mismatch";
    return;
  }

  CLIENT.full_name = document.getElementById("reg_name").value;
  CLIENT.email = document.getElementById("reg_email").value;
  CLIENT.tel1 = document.getElementById("reg_tel").value;

  showTab(6);
}

// ======================
// GLOBAL EXPORT
// ======================
window.showTab = showTab;
window.loginMock = loginMock;
window.openRegister = openRegister;

window.renderTasks = renderTasks;
window.renderFiles = renderFiles;
window.renderSearch = renderSearch;

window.loadProfile = loadProfile;
window.saveProfile = saveProfile;

window.loadRegister = loadRegister;
window.registerUser = registerUser;

// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(1);
});
