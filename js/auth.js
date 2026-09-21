const API_BASE = "/api/auth";

function showError(form, message) {
  let el = form.querySelector(".auth-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "auth-error";
    form.prepend(el);
  }
  el.textContent = message;
  el.hidden = false;
}

function clearError(form) {
  const el = form.querySelector(".auth-error");
  if (el) el.hidden = true;
}

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.dataset.label = btn.dataset.label || btn.textContent;
  btn.textContent = loading ? "Please wait..." : label || btn.dataset.label;
}

function saveSession(token, user) {
  localStorage.setItem("agriksense_token", token);
  localStorage.setItem("agriksense_user", JSON.stringify(user));
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

const loginForm = document.querySelector("form.auth-form");
const isSignup = document.title.toLowerCase().includes("sign up");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(loginForm);
    const btn = loginForm.querySelector(".btn-submit");
    setLoading(btn, true);

    try {
      if (isSignup) {
        const firstName = loginForm.querySelector("#first-name")?.value?.trim();
        const lastName = loginForm.querySelector("#last-name")?.value?.trim();
        const email = loginForm.querySelector("#email")?.value?.trim();
        const organization = loginForm.querySelector("#organization")?.value?.trim();
        const password = loginForm.querySelector("#password")?.value;

        if (!password || password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }

        const data = await postJSON(`${API_BASE}/signup`, {
          firstName,
          lastName,
          email,
          organization,
          password,
        });
        saveSession(data.token, data.user);
        window.location.href = "/dashboard";
      } else {
        const email = loginForm.querySelector("#email")?.value?.trim();
        const password = loginForm.querySelector("#password")?.value;
        const data = await postJSON(`${API_BASE}/login`, { email, password });
        saveSession(data.token, data.user);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      showError(loginForm, err.message || "Something went wrong");
      setLoading(btn, false);
    }
  });
}
