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
  password: ""
};

// ======================
// MOCK DATA (INTACT)
// ======================
let TASKS = [
  {
    id: "1dc03cca-ae3d-431c",
    status: "DONE",
    llm_provider: "chatgpt",
    full_url: "https://chatgpt.com/share/demo1"
  },
  {
    id: "5992971d-a8d3-4f12",
    status: "PROCESSING",
    llm_provider: "manus",
    full_url: "https://manus.im/share/demo2"
  },
  {
    id: "722a83e8-62fb-9a11",
    status: "FAIL",
    llm_provider: "grok",
    full_url: "https://grok.com/share/demo3"
  }
];

let FILES = [
  { type: "dir", name: "agents" },
  { type: "dir", name: "logs" },
  { type: "file", name: "readme.md", content: "MeshWave system mock file" }
];

let ARTIFACTS = [];

// ======================
// TAB SYSTEM (UNCHANGED LOGIC)
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");

  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";

  if (n === 3) renderTasks();
  if (n === 4) renderFiles();
  if (n === 5) mockSearch();
  if (n === 6) loadProfile();
  if (n === 7) loadRegister();
}

// ======================
// AUTH (FIXED ONLY)
// ======================
function login() {
  const email = document.getElementById("login_email")?.value;
  const pass = document.getElementById("login_pass")?.value;

  // mock validation (SEM backend ainda)
  if (!email || !pass) {
    alert("Fill login fields");
    return;
  }

  SESSION.logged = true;

  USER = {
    user_name: email.split("@")[0],
    full_name: "MeshWave User"
  };

  showTab(3);
}

// alias antigo (não quebra nada)
function loginMock() {
  login();
}

function openRegister() {
  showTab(7);
}

// ======================
// TASKS (UNCHANGED UI)
// ======================
function renderTasks() {
  const el = document.getElementById("tasks");
  if (!el) return;

  el.innerHTML = "";

  const icon = {
    DONE: "✔",
    PROCESSING: "⚙",
    STAGED: "⚠",
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
      <div><input type="checkbox"></div>
      <div>${icon[t.status]}</div>
      <div>
        <div style="font-size:10px;font-weight:bold;">${t.id}</div>
        <div style="font-size:9px;color:#8aa0b5;">${t.llm_provider}</div>
        <div style="font-size:9px;color:#4ea1ff;word-break:break-all;">
          ${t.full_url}
        </div>
      </div>
      <div style="
        background:${color[t.status]};
        color:white;
        font-size:10px;
        font-weight:bold;
        padding:4px;
        border-radius:6px;
        text-align:center;
      ">
        ${t.status}
      </div>
    `;

    el.appendChild(row);
  });
}

// ======================
// FILES (UNCHANGED)
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
// SEARCH (UNCHANGED)
// ======================
function mockSearch() {
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const left = document.getElementById("searchResults");
  const right = document.getElementById("searchPreview");

  if (!left) return;

  const DB = [
    { id: "a1", title: "ChatGPT Share", type: "task", content: "AI workflow..." },
    { id: "a2", title: "Manus Project", type: "task", content: "Automation..." },
    { id: "a3", title: "Grok Analysis", type: "task", content: "Reasoning..." }
  ];

  ARTIFACTS = DB.filter(d =>
    d.title.toLowerCase().includes(q) ||
    d.content.toLowerCase().includes(q)
  );

  left.innerHTML = "";

  ARTIFACTS.forEach(a => {
    const div = document.createElement("div");
    div.className = "artifact";

    div.innerHTML = `
      <input type="checkbox">
      <div>
        <div style="font-size:11px;font-weight:bold;">${a.title}</div>
        <div style="font-size:9px;color:#8aa0b5;">${a.type}</div>
      </div>
    `;

    div.onclick = (e) => {
      if (e.target.type === "checkbox") return;
      if (right) right.textContent = a.content;
    };

    left.appendChild(div);
  });
}

// ======================
// PROFILE (UNCHANGED)
// ======================
function loadProfile() {
  const u = document.getElementById("p_username");
  const n = document.getElementById("p_name");
  const e = document.getElementById("p_email");
  const t = document.getElementById("p_tel");
  const p = document.getElementById("p_pass");

  if (!u) return;

  u.value = USER.user_name;

  n.value = CLIENT.full_name;
  e.value = CLIENT.email;
  t.value = CLIENT.tel1;
  p.value = CLIENT.password;
}

function saveProfile() {
  CLIENT.full_name = document.getElementById("p_name").value;
  CLIENT.email = document.getElementById("p_email").value;
  CLIENT.tel1 = document.getElementById("p_tel").value;
  CLIENT.password = document.getElementById("p_pass").value;

  document.getElementById("profile_msg").textContent = "Profile updated";
}

// ======================
// REGISTER (UNCHANGED FLOW)
// ======================
function loadRegister() {
  document.getElementById("reg_name").value = "";
  document.getElementById("reg_email").value = "";
  document.getElementById("reg_tel").value = "";
  document.getElementById("reg_pass").value = "";
  document.getElementById("reg_pass2").value = "";
}

function registerUser() {
  const name = document.getElementById("reg_name").value;
  const email = document.getElementById("reg_email").value;
  const tel = document.getElementById("reg_tel").value;
  const pass = document.getElementById("reg_pass").value;
  const pass2 = document.getElementById("reg_pass2").value;

  const msg = document.getElementById("reg_msg");

  if (pass !== pass2) {
    msg.textContent = "Passwords do not match";
    return;
  }

  CLIENT = { full_name: name, email, tel1: tel, password: pass };

  msg.textContent = "Account created";
  showTab(6);
}

// ======================
// EXPORTS
// ======================
window.showTab = showTab;
window.login = login;
window.loginMock = loginMock;
window.openRegister = openRegister;

window.renderTasks = renderTasks;
window.renderFiles = renderFiles;

window.mockSearch = mockSearch;

window.loadProfile = loadProfile;
window.saveProfile = saveProfile;

window.loadRegister = loadRegister;
window.registerUser = registerUser;

// INIT FIX
window.addEventListener("DOMContentLoaded", () => {
  showTab(1);
});
