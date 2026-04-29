import { loginHybrid } from "./authService";
import { Session } from "./session";

export async function login() {

  const identifier = document.getElementById("login_email")?.value;
  const password = document.getElementById("login_password")?.value;

  if (!identifier || !password) {
    alert("preencha login");
    return;
  }

  const res = await loginHybrid(identifier, password);

  if (!res.ok) {
    alert(res.error);
    return;
  }

  Session.set({
    user: res.user,
    client: res.client
  });

  console.log("LOGIN OK:", res.user.id);

  window.showTab(2);
}
