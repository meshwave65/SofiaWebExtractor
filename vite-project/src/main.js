"use strict";

import "./styles.css";

let USER = {
  user_name: "meshwave65",
  full_name: "Diogenes Duarte Sobral",
  id: "demo"
};

let TASKS = [
  { id: "1", status: "DONE", full_url: "https://chatgpt.com/share/demo1", llm_provider: "chatgpt" },
  { id: "2", status: "PROCESSING", full_url: "https://manus.im/share/demo2", llm_provider: "manus" },
  { id: "3", status: "STAGED", full_url: "https://grok.com/share/demo3", llm_provider: "grok" }
];

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.style.display = "none");
  const el = document.getElementById("view-" + name);
  if (el) el.style.display = "block";
  if (name === "tasks") renderTasks();
}

window.showView = showView;

window.addEventListener("DOMContentLoaded", () => {
  const label = document.getElementById("userLabel");
  if (label) label.innerText = USER.full_name;

  showView("tasks");
});

function renderTasks() {
  const el = document.getElementById("tasks");
  if (!el) return;

  el.innerHTML = "";

  TASKS.forEach(t => {
    const div = document.createElement("div");

    const color =
      t.status === "DONE" ? "#2ecc71" :
      t.status === "PROCESSING" ? "#3498db" :
      t.status === "STAGED" ? "#f39c12" : "#999";

    div.className = "card";

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <b>#${t.id}</b>
        <span style="color:${color}">${t.status}</span>
      </div>

      <div style="font-size:12px; color:#aaa;">
        ${t.llm_provider}
      </div>

      <div style="font-size:11px; color:#4ea1ff; word-break:break-all;">
        ${t.full_url}
      </div>
    `;

    el.appendChild(div);
  });
}

window.insertTask = function () {
  const link = document.getElementById("link").value;
  const agent = document.getElementById("agent").value;

  TASKS.unshift({
    id: String(Date.now()),
    status: "STAGED",
    full_url: link,
    llm_provider: agent || "manual"
  });

  renderTasks();
};

window.clearForm = function () {
  document.getElementById("link").value = "";
  document.getElementById("agent").value = "";
};
