"use strict";

import "./styles.css";

// ======================
// MOCK TASKS
// ======================
let TASKS = [
  {
    id: "1dc03cca-ae3d",
    status: "DONE",
    llm_provider: "chatgpt",
    full_url: "https://chatgpt.com/share/demo1"
  },
  {
    id: "5992971d-a8d3",
    status: "PROCESSING",
    llm_provider: "manus",
    full_url: "https://manus.im/share/demo2"
  },
  {
    id: "722a83e8-62fb",
    status: "FAIL",
    llm_provider: "grok",
    full_url: "https://grok.com/share/demo3"
  }
];

// ======================
// MOCK FILES
// ======================
let FILES = [
  { type: "dir", name: "agents" },
  { type: "dir", name: "logs" },
  { type: "dir", name: "exports" },
  { type: "file", name: "readme.md", content: "# MeshWave\nSystem file mock..." },
  { type: "file", name: "config.json", content: "{ \"mode\": \"dev\" }" }
];

// ======================
// NAV
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => {
    t.style.display = "none";
  });

  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";

  if (n === 3) renderTasks();
  if (n === 4) renderFiles();
}

window.showTab = showTab;

// ======================
// TASKS
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
        <div>${t.id}</div>
        <div>${t.llm_provider}</div>
        <div>${t.full_url}</div>
      </div>
      <div style="background:${color[t.status]};color:#fff;padding:4px;border-radius:6px;font-size:10px;text-align:center;">
        ${t.status}
      </div>
    `;

    el.appendChild(row);
  });
}

// ======================
// FILES
// ======================
function renderFiles() {
  const el = document.getElementById("files");
  const preview = document.getElementById("filePreview");

  el.innerHTML = "";

  FILES.forEach(f => {
    const row = document.createElement("div");
    row.className = "file-row";

    row.innerHTML = `
      <div class="file-icon">${f.type === "dir" ? "📁" : "📄"}</div>
      <div class="file-name">${f.name}</div>
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
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(4); // abre FILES direto pra validar UI
});
