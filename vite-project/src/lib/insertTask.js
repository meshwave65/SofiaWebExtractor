import { supabase } from "./supabase";
import { Session } from "./session";

/**
 * slug real = último segmento da URL
 */
function extractSlug(url) {
  if (!url) return null;

  const clean = url.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);

  return parts.length ? parts[parts.length - 1] : null;
}

export async function insertTask() {

  const agentSelect = document.querySelector("#agent_select")?.value;
  const agentNew = document.querySelector("#agent_new")?.value;
  const link = document.querySelector("#link")?.value;

  if (!link) {
    alert("Link obrigatório");
    return;
  }

  const slug = extractSlug(link);

  const payload = {
    user_name: Session.client?.user_name || "meshwave",
    agente: agentNew || agentSelect || "meshwave65",
    full_url: link,

    // 🔥 ID REAL DO SUPABASE AUTH
    session_user_id: Session.getUserId(),

    slug,
    status: "STAGED",
    execution_mode: "local",
    device_id: "vite_web"
  };

  const { data, error } = await supabase
    .from("appsofia_tasks")
    .insert(payload)
    .select();

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  console.log("TASK CREATED:", data);
  alert("Task criada: " + slug);
}
