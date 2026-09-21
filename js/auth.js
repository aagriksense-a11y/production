const renderApi = "https://production-lvw9.onrender.com";
const isSameHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.includes("onrender.com");
const API_BASE = isSameHost ? "" : renderApi;

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

function setBusy(btn, busy, busyText) {
  if (!btn) return;
  btn.disabled = busy;
  if (busy) {
    btn.dataset.original = btn.textContent;
    btn.textContent = busyText;
  } else {
    btn.textContent = btn.dataset.original || btn.textContent;
  }
}

function storeSession(data) {
  localStorage.setItem("agriksense_token", data.token);
  localStorage.setItem("agriksense_user", JSON.stringify(data.user));
}

async function submitLogin(form, btn) {
  const email = form.querySelector("#email").value.trim();
  const password = form.querySelector("#password").value;
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(form, (data && data.error) || "Login failed. Please try again.");
      return;
    }
    storeSession(data);
    window.location.href = "/dashboard";
  } catch (err) {
    showError(form, "Could not reach the server. Please try again.");
  }
}

async function submitSignup(form, btn) {
  const firstName = form.querySelector("#first-name").value.trim();
  const lastName = form.querySelector("#last-name").value.trim();
  const email = form.querySelector("#email").value.trim();
  const organization = form.querySelector("#organization").value.trim();
  const password = form.querySelector("#password").value;
  const terms = form.querySelector('input[name="terms"]');
  if (terms && !terms.checked) {
    showError(form, "Please agree to the Terms of Service.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, organization, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const details = data && data.details;
      let msg = (data && data.error) || "Sign up failed. Please try again.";
      if (details && details.email) msg = "Please enter a valid email address.";
      else if (details && details.password) msg = "Password must be at least 8 characters.";
      showError(form, msg);
      return;
    }
    storeSession(data);
    window.location.href = "/dashboard";
  } catch (err) {
    showError(form, "Could not reach the server. Please try again.");
  }
}

const loginForm = document.querySelector("form.auth-form");
if (loginForm) {
  const emailInput = loginForm.querySelector("#email");
  const isLogin = loginForm.querySelector("#password") && !loginForm.querySelector("#first-name");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError(loginForm);
    const btn = loginForm.querySelector(".btn-submit");
    setBusy(btn, true, isLogin ? "Logging in..." : "Creating account...");
    (isLogin ? submitLogin(loginForm, btn) : submitSignup(loginForm, btn)).finally(() => {
      setBusy(btn, false);
    });
  });
  if (emailInput) {
    emailInput.addEventListener("input", () => clearError(loginForm));
  }
}