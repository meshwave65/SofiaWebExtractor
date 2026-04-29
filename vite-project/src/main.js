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

let CLIENT = {
  client_uuid: null,
  user_name: "",
  full_name: "",
  email: "",
  tel1: "",
  password: ""
};

// ======================
// TASK STATE
// ======================
let TASKS = [];
let FILES = [];
let ARTIFACTS = [];

// ======================
// SLUG EXTRACTION
// ======================
function extractSlugFromUrl(url) {
  if (!url) return null;

  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

// ======================
// TAB SYSTEM
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));
  const el = document.getElementById("tab" + n);
  if (el) el.style.display = "block";
}

// ======================
// STEP 1 — FIND CLIENT
// ======================
async function fetchClient(identifier) {
  const isEmail = identifier.includes("@");

  let query = supabase.from("clients").select("*");

  if (isEmail) {
    query = query.eq("email", identifier);
  } else {
    query = query.eq("user_name", identifier);
  }

  const { data, error } = await query.single();

  if (error) return null;
  return data;
}

// ======================
// STEP 2 — AUTH SUPABASE
// ======================
async function authenticate(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password
  });
}

// ======================
// LOGIN REAL (2 STEP)
// ======================
async function login() {
  const identifier = document.getElementById("login_email")?.value;
  const password = document.getElementById("login_pass")?.value;

  if (!identifier || !password) {
    alert("Fill login fields");
    return;
  }

  const client = await fetchClient(identifier);

  if (!client) {
    alert("User not found in clients");
    return;
  }

  const { data, error } = await authenticate(client.email, password);

  if (error || !data?.user) {
    alert("Authentication failed");
    return;
  }

  SESSION.logged = true;

  USER = {
    id: data.user.id,
    user_name: client.user_name,
    full_name: client.full_name || client.user_name,
    email: client.email
  };

  console.log("LOGIN OK:", USER);

  showTab(3);
}

function loginMock() {
  login();
}

function openRegister() {
  showTab(7);
}

// ======================
// INSERT TASK
// ======================
async function insertTask() {

  const agentSelect =
    document.querySelector("#tab2 select")?.value || "meshwave65";

  const agentNew =
    document.querySelector("#tab2 input[placeholder='agent override']")?.value;

  const link =
    document.querySelector("#tab2 input[placeholder='https://...']")?.value;

  if (!link) {
    alert("Link obrigatório");
    return;
  }

  if (!SESSION.logged || !USER.id) {
    alert("Not authenticated");
    return;
  }

  const slug = extractSlugFromUrl(link);

  const payload = {
    user_name: USER.user_name,
    agente: agentNew || agentSelect,
    full_url: link,
    session_user_id: USER.id,
    slug
  };

  const res = await fetch("http://127.0.0.1:3000/task/insert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!data.ok) {
    alert(data.error || "Insert error");
    return;
  }

  alert("Task inserida: " + slug);
}

// ======================
// EXPORTS
// ======================
window.showTab = showTab;
window.login = login;
window.loginMock = loginMock;
window.openRegister = openRegister;
window.insertTask = insertTask;

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
  showTab(1);

  const btn = document.querySelector("#tab2 button:last-of-type");
  if (btn) btn.onclick = insertTask;
});
