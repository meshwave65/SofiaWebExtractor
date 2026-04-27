"use strict";

import "./styles.css";

// ======================
// MOCK USER
// ======================
let USER = {
  user_name: "guest",
  full_name: "Guest User"
};

// ======================
// MOCK TASKS
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

// ======================
// MOCK FILES
// ======================
let FILES = [
  { type: "dir", name: "agents" },
  { type: "dir", name: "logs" },
  { type: "dir", name: "exports" },
  { type: "file", name: "readme.md", content: "# MeshWave System\nMock file content..." },
  { type: "file", name: "config.json", content: "{ \"mode\": \"dev\" }" }
];

// ======================
// MOCK ARTIFACTS (SEARCH SYSTEM)
// ======================
let ARTIFACTS = [];

// ======================
// TAB NAVIGATION
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => {
    t.style.display = "none";
  });

  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";

  if (n === 3) renderTasks();
  if (n === 4) renderFiles();
  if (n === 5) mockSearch();
}

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
        color:#fff;
        font-size:10px;
        padding:4px;
        border-radius:6px;
        text-align:center;
        font-weight:bold;
      ">
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

  if (!el) return;

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
// SEARCH ENGINE (MOCK)
// ======================
function mockSearch() {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");

  if (!results) return;

  const query = (input?.value || "").toLowerCase();

  const DB = [
    { id: "a1", title: "ChatGPT Share", type: "task", content: "AI workflow analysis..." },
    { id: "a2", title: "Manus Project", type: "task", content: "Automation pipeline design..." },
    { id: "a3", title: "Grok Analysis", type: "task", content: "Reasoning chain output..." },
    { id: "a4", title: "MeshWave Docs", type: "doc", content: "System documentation base..." }
  ];

  ARTIFACTS = DB.filter(d =>
    d.title.toLowerCase().includes(query) ||
    d.content.toLowerCase().includes(query)
  );

  results.innerHTML = "";

  ARTIFACTS.forEach(a => {
    const div = document.createElement("div");
    div.className = "artifact";

    div.innerHTML = `
      <input type="checkbox" class="artifact-check" data-id="${a.id}">
      <div>
        <div class="artifact-title">${a.title}</div>
        <div class="artifact-type">${a.type}</div>
      </div>
    `;

    div.onclick = (e) => {
      if (e.target.type === "checkbox") return;
      document.getElementById("searchPreview").textContent = a.content;
    };

    results.appendChild(div);
  });
}

// ======================
// RESUMIR
// ======================
function mockSummarize() {
  const artifact = {
    id: "resume_" + Date.now(),
    title: "RESUME ARTIFACT",
    type: "resume",
    content: "AI-generated summary of selected artifacts..."
  };

  ARTIFACTS = [artifact];
  renderSingleArtifact(artifact);
}

// ======================
// ENRIQUECER
// ======================
function mockEnrich() {
  const artifact = {
    id: "rich_" + Date.now(),
    title: "RICH TEXT ARTIFACT",
    type: "rich",
    content: "Expanded contextual analysis with external knowledge..."
  };

  ARTIFACTS = [artifact];
  renderSingleArtifact(artifact);
}

// ======================
// SINGLE ARTIFACT VIEW
// ======================
function renderSingleArtifact(a) {
  const left = document.getElementById("searchResults");
  const right = document.getElementById("searchPreview");

  if (!left || !right) return;

  left.innerHTML = "";

  const div = document.createElement("div");
  div.className = "artifact";

  div.innerHTML = `
    <input type="checkbox" class="artifact-check" data-id="${a.id}">
    <div>
      <div class="artifact-title">${a.title}</div>
      <div class="artifact-type">${a.type}</div>
    </div>
  `;

  div.onclick = () => {
    right.textContent = a.content;
  };

  left.appendChild(div);
}

// ======================
// SELECT ALL
// ======================
function toggleSelectAll() {
  const boxes = document.querySelectorAll(".artifact-check");
  const master = document.getElementById("selectAll");

  boxes.forEach(b => b.checked = master.checked);
}

// ======================
// DOWNLOAD
// ======================
function downloadSelected() {
  const selected = [];

  document.querySelectorAll(".artifact-check:checked").forEach(cb => {
    const id = cb.dataset.id;
    const found = ARTIFACTS.find(a => a.id === id);
    if (found) selected.push(found);
  });

  const blob = new Blob([JSON.stringify(selected, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "artifacts.json";
  a.click();
}

// ======================
// GLOBAL EXPORTS (IMPORTANT FIX)
// ======================
window.showTab = showTab;
window.mockSearch = mockSearch;
window.mockSummarize = mockSummarize;
window.mockEnrich = mockEnrich;
window.toggleSelectAll = toggleSelectAll;
window.downloadSelected = downloadSelected;

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(4);
  renderFiles();
});
