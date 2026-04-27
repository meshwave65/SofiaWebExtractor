"use strict";

import "./styles.css";

let TASKS = [
  {
    id: "1dc03cca-ae3d-431c",
    status: "DONE",
    llm_provider: "chatgpt",
    full_url: "https://chatgpt.com/share/demo1"
  },
  {
    id: "5992971d-a8d3-4421",
    status: "PROCESSING",
    llm_provider: "manus",
    full_url: "https://manus.im/share/demo2"
  },
  {
    id: "722a83e8-62fb-4c91",
    status: "FAIL",
    llm_provider: "grok",
    full_url: "https://grok.com/share/demo3"
  }
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
}

window.showTab = showTab;

// ======================
// TASKS RENDER
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
      <div class="task-check">
        <input type="checkbox">
      </div>

      <div class="task-icon">
        <span style="color:${color[t.status]}; font-weight:bold;">
          ${icon[t.status]}
        </span>
      </div>

      <div class="task-content">
        <div class="task-id">${t.id}</div>
        <div class="task-llm">${t.llm_provider}</div>
        <div class="task-url">${t.full_url}</div>
      </div>

      <div class="task-status" style="background:${color[t.status]}">
        ${t.status}
      </div>
    `;

    el.appendChild(row);
  });
}

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(3);
});
