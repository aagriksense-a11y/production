const loginForm = document.querySelector("form.auth-form");

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

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector(".btn-submit");
    btn.disabled = true;
    btn.textContent = "Please wait...";
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 250);
  });
}