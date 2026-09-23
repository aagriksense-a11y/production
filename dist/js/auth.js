const renderApi = "https://production-lvw9.onrender.com";
const isSameHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.includes("onrender.com");
const API_BASE = isSameHost ? "" : renderApi;

let authState = {
  access: localStorage.getItem("agriksense_token") || null,
  refresh: localStorage.getItem("agriksense_refresh") || null,
};

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
  localStorage.setItem("agriksense_token", data.accessToken);
  localStorage.setItem("agriksense_refresh", data.refreshToken);
  localStorage.setItem("agriksense_user", JSON.stringify(data));
  authState.access = data.accessToken;
  authState.refresh = data.refreshToken;
}

function clearSession() {
  localStorage.removeItem("agriksense_token");
  localStorage.removeItem("agriksense_refresh");
  localStorage.removeItem("agriksense_user");
  authState.access = null;
  authState.refresh = null;
}

function errorMessage(data, fallback) {
  if (data && data.errors && data.errors.length) return data.errors[0].message;
  if (data && data.message) return data.message;
  return fallback;
}

async function refreshAccessToken() {
  if (!authState.refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: authState.refresh }),
    });
    const data = await res.json();
    if (!res.ok || !data.data) {
      clearSession();
      return false;
    }
    localStorage.setItem("agriksense_token", data.data.accessToken);
    localStorage.setItem("agriksense_refresh", data.data.refreshToken);
    authState.access = data.data.accessToken;
    authState.refresh = data.data.refreshToken;
    return true;
  } catch {
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (authState.access) headers.Authorization = `Bearer ${authState.access}`;
  let res = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));
  if (res.status === 401 && authState.refresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${authState.access}`;
      res = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));
    }
  }
  return res;
}

function userDisplay(user) {
  const profile = user.profile || {};
  if (profile.type === "organization") return profile.orgName || "Operator";
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Operator";
}

async function submitLogin(form, btn) {
  const identifier = form.querySelector("#identifier").value.trim();
  const password = form.querySelector("#password").value;
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(form, errorMessage(data, "Login failed. Please try again."));
      return;
    }
    storeSession(data.data);
    window.location.href = "/dashboard";
  } catch (err) {
    showError(form, "Could not reach the server. Please try again.");
  }
}

function roleFields(role) {
  switch (role) {
    case "farmer":
      return { url: "/api/auth/signup/farmer" };
    case "dco":
      return { url: "/api/auth/signup/dco" };
    case "organization":
      return { url: "/api/auth/signup/organization" };
  }
}

function readPanel(panel, selector, trim) {
  const el = panel.querySelector(selector);
  if (!el) return "";
  return trim ? el.value.trim() : el.value;
}

async function submitSignup(form, btn) {
  const roleEl = form.querySelector('input[name="role"]');
  const role = (roleEl && roleEl.value) || "farmer";
  if (role === "farmer" && !form.querySelector('input[name="consent"]').checked) {
    showError(form, "Please accept the Farmer Informed Consent terms.");
    return;
  }
  const cfg = roleFields(role);
  const panel = form.querySelector(`[data-role-panel="${role}"]`);
  const pwdSelector = role === "farmer" ? "#f-password" : role === "dco" ? "#dco-password" : "#org-password";
  const confirmSelector = role === "farmer" ? "#f-confirm-password" : role === "dco" ? "#dco-confirm-password" : "#org-confirm-password";
  const password = readPanel(panel, pwdSelector, false);
  const confirmPassword = readPanel(panel, confirmSelector, false);
  if (confirmPassword && password !== confirmPassword) {
    showError(form, "Passwords do not match.");
    return;
  }
  let body;
  if (role === "farmer") {
    body = {
      firstName: readPanel(panel, "#f-first-name", true),
      lastName: readPanel(panel, "#f-last-name", true),
      otherName: readPanel(panel, "#f-other-name", true) || undefined,
      phoneNumber: readPanel(panel, "#f-phone", true),
      email: readPanel(panel, "#f-email", true),
      password,
      confirmPassword,
      consentAccepted: panel.querySelector('input[name="consent"]').checked,
    };
  } else if (role === "dco") {
    body = {
      firstName: readPanel(panel, "#dco-first-name", true),
      lastName: readPanel(panel, "#dco-last-name", true),
      otherName: readPanel(panel, "#dco-other-name", true) || undefined,
      email: readPanel(panel, "#dco-email", true),
      phoneNumber: readPanel(panel, "#dco-phone", true),
      password,
      confirmPassword,
    };
  } else {
    body = {
      orgName: readPanel(panel, "#org-org-name", true),
      email: readPanel(panel, "#org-email", true),
      phoneNumber: readPanel(panel, "#org-phone", true) || "",
      password,
      confirmPassword,
    };
  }
  try {
    const res = await fetch(`${API_BASE}${cfg.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(form, errorMessage(data, "Sign up failed. Please try again."));
      return;
    }
    storeSession(data.data);
    window.location.href = "/dashboard";
  } catch (err) {
    showError(form, "Could not reach the server. Please try again.");
  }
}

const form = document.querySelector("form.auth-form");
  if (form) {
    const isLogin = form.querySelector("#identifier") && !form.querySelector("#first-name");
    const roleTabs = form.querySelectorAll(".role-tab");
    const activeTab = roleTabs.length ? (form.querySelector(".role-tab.active") || roleTabs[0]) : null;
    if (activeTab) {
      const role = activeTab.dataset.role;
      form.querySelectorAll("[data-role-panel]").forEach((p) => {
        const active = p.dataset.rolePanel === role;
        p.hidden = !active;
        p.querySelectorAll("[required]").forEach((el) => {
          el.toggleAttribute("required", active);
        });
      });
    }
    roleTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        roleTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const role = tab.dataset.role;
        const roleEl = form.querySelector('input[name="role"]');
        if (roleEl) roleEl.value = role;
        const panels = form.querySelectorAll("[data-role-panel]");
        panels.forEach((p) => {
          const active = p.dataset.rolePanel === role;
          p.hidden = !active;
          p.querySelectorAll("[required]").forEach((el) => {
            el.toggleAttribute("required", active);
          });
        });
        clearError(form);
      });
    });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError(form);
    const btn = form.querySelector(".btn-submit");
    setBusy(btn, true, isLogin ? "Logging in..." : "Creating account...");
    (isLogin ? submitLogin(form, btn) : submitSignup(form, btn)).finally(() => {
      setBusy(btn, false);
    });
  });
  const firstInput = form.querySelector("input");
  if (firstInput) firstInput.addEventListener("input", () => clearError(form));
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "/login";
  });
}