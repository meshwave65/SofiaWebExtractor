import { createClient } from "@supabase/supabase-js";

// ==========================
// SUPABASE
// ==========================
const supabase = createClient(
  "https://ufylccbdjfzydbwhpmpp.supabase.co",
  "YOUR_ANON_KEY"
);

// ==========================
// STATE
// ==========================
let USER = null;

// ==========================
// TAB SYSTEM
// ==========================
window.showTab = (n) => {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tab" + n).classList.add("active");
};

// ==========================
// AUTH
// ==========================
window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  USER = data.user;

  document.getElementById("user").innerText =
    "Logado: " + USER.email;
};

// ==========================
// CREATE TASK
// ==========================
window.createTask = async () => {
  const link = document.getElementById("link").value;

  const { data, error } = await supabase
    .from("appsofia_tasks")
    .insert([{
      user_name: USER.email,
      full_url: link,
      status: "STAGED"
    }]);

  if (error) {
    document.getElementById("insert_status").innerText =
      "Erro: " + error.message;
    return;
  }

  document.getElementById("insert_status").innerText =
    "Task criada!";
};

// ==========================
// LOAD TASKS
// ==========================
window.loadTasks = async () => {
  const { data, error } = await supabase
    .from("appsofia_tasks")
    .select("*")
    .order("id", { ascending: false });

  const el = document.getElementById("tasks");
  el.innerHTML = "";

  if (error) {
    el.innerText = error.message;
    return;
  }

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "box";

    div.innerHTML = `
      <b>${t.status}</b><br/>
      ${t.full_url || ""}
    `;

    el.appendChild(div);
  });
};

// ==========================
// FILES (stub inicial)
// ==========================
window.loadFiles = async () => {
  const el = document.getElementById("files");
  el.innerHTML = "Files UI pronta (integração Locaweb depois)";
};
