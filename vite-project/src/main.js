"use strict";

// ======================
// STATE MOCK
// ======================
let TASKS = [
  {
    id: "1",
    status: "DONE",
    full_url: "https://chatgpt.com/share/demo1",
    llm_provider: "chatgpt"
  },
  {
    id: "2",
    status: "PROCESSING",
    full_url: "https://manus.im/share/demo2",
    llm_provider: "manus"
  },
  {
    id: "3",
    status: "STAGED",
    full_url: "https://grok.com/share/demo3",
    llm_provider: "grok"
  }
];

// ======================
// VIEW ROUTER
// ======================
window.showView = function (name) {
  document.querySelectorAll(".view").forEach(v => {
    v.style.display = "none";
  });

  const el = document.getElementById("view-" + name);
  if (el) el.style.display = "block";

  if (name === "tasks") renderTasks();
  if (name === "files") renderFiles();
};

// ======================
// TASKS
// ======================
function renderTasks() {
  const el = document.getElementById("tasks");
  el.innerHTML = "";

  TASKS.forEach(t => {
    const div = document.createElement("div");

    div.className = "card";

    div.innerHTML = `
      <b>#${t.id}</b>
      <div>${t.status}</div>
      <div style="font-size:12px;color:#888">${t.llm_provider}</div>
      <div style="font-size:11px;color:#4ea1ff;word-break:break-all">
        ${t.full_url}
      </div>
    `;

    el.appendChild(div);
  });
}

// ======================
// INSERT TASK
// ======================
function insertTask() {
  const link = document.getElementById("link").value;
  const agent = document.getElementById("agent_new").value;

  if (!link) return;

  TASKS.unshift({
    id: String(Date.now()),
    status: "STAGED",
    full_url: link,
    llm_provider: agent || "unknown"
  });

  renderTasks();
}

// ======================
// CLEAR
// ======================
function clearForm() {
  document.getElementById("link").value = "";
  document.getElementById("agent_new").value = "";
}

// ======================
// FILES (UI ONLY)
// ======================
function renderFiles() {
  const el = document.getElementById("files");
  el.innerHTML = `
    <div class="card">📁 File system placeholder</div>
  `;
}

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  showView("tasks");

  document.getElementById("btnInsert").onclick = insertTask;
  document.getElementById("btnClear").onclick = clearForm;
});
