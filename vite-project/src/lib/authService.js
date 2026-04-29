import { supabase } from "./supabase";

/**
 * LOGIN HÍBRIDO:
 * 1. busca client
 * 2. autentica no auth.users
 */
export async function loginHybrid(identifier, password) {

  // =========================
  // 1. CLIENT LOOKUP
  // =========================
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .or(`user_name.eq.${identifier},email.eq.${identifier}`)
    .single();

  if (clientError || !client) {
    return { ok: false, error: "client not found" };
  }

  // =========================
  // 2. AUTH SUPABASE
  // =========================
  const { data, error } = await supabase.auth.signInWithPassword({
    email: client.email,
    password
  });

  if (error || !data?.user) {
    return { ok: false, error: "invalid credentials" };
  }

  // =========================
  // 3. RESULT
  // =========================
  return {
    ok: true,
    user: data.user,
    client
  };
}
