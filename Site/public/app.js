const gallery = document.getElementById("gallery");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const searchInfo = document.getElementById("searchInfo");
const template = document.getElementById("artTemplate");
const loader = document.getElementById("loader");

const modal = document.getElementById("adminModal");
const adminBtn = document.getElementById("adminBtn");
const closeModal = document.getElementById("closeModal");
const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const loginCode = document.getElementById("loginCode");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const uploadForm = document.getElementById("uploadForm");
const imageInput = document.getElementById("imageInput");
const fileName = document.getElementById("fileName");
const uploadStatus = document.getElementById("uploadStatus");
const manageList = document.getElementById("manageList");

let adminCode = sessionStorage.getItem("adminCode") || "";
let timer;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

async function loadArtworks(q = "") {
  const endpoint = "/api/artworks" + (q ? "?q=" + encodeURIComponent(q) : "");

  try {
    const response = await fetch(endpoint);
    const artworks = await response.json();

    gallery.innerHTML = "";
    empty.classList.toggle("hidden", artworks.length > 0);

    if (q) {
      searchInfo.textContent =
        `Найдено: ${artworks.length} — «${q}»`;
      searchInfo.classList.remove("hidden");
    } else {
      searchInfo.classList.add("hidden");
    }

    artworks.forEach((art, index) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".art-card");
      const img = node.querySelector("img");
      const title = node.querySelector("h2");
      const description = node.querySelector("p");

      img.src = art.image_url;
      img.alt = art.title;
      title.textContent = art.title;

      if (art.description) {
        description.textContent = art.description;
      } else {
        description.remove();
      }

      card.style.animationDelay = `${Math.min(index * .055, .6)}s`;
      gallery.appendChild(node);
    });
  } catch {
    gallery.innerHTML = "";
    empty.classList.remove("hidden");
    searchInfo.textContent = "Не удалось загрузить работы.";
    searchInfo.classList.remove("hidden");
  }
}

function openAdmin() {
  modal.classList.remove("hidden");

  if (adminCode) {
    showAdmin();
  } else {
    loginView.classList.remove("hidden");
    adminView.classList.add("hidden");
    loginCode.focus();
  }
}

function closeAdmin() {
  modal.classList.add("hidden");
}

function showAdmin() {
  loginView.classList.add("hidden");
  adminView.classList.remove("hidden");
  loginError.textContent = "";
  loadManageList();
}

adminBtn.addEventListener("click", openAdmin);
closeModal.addEventListener("click", closeAdmin);

modal.addEventListener("click", e => {
  if (e.target === modal) closeAdmin();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAdmin();
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const code = loginCode.value.trim();
  if (!code) return;

  loginError.textContent = "Проверяю…";

  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  if (response.ok) {
    adminCode = code;
    sessionStorage.setItem("adminCode", code);
    loginError.textContent = "";
    showAdmin();
  } else {
    loginError.textContent = "Неверный код.";
  }
});

logoutBtn.addEventListener("click", () => {
  adminCode = "";
  sessionStorage.removeItem("adminCode");
  adminView.classList.add("hidden");
  loginView.classList.remove("hidden");
  loginCode.value = "";
  closeAdmin();
});

imageInput.addEventListener("change", () => {
  fileName.textContent = imageInput.files[0]?.name || "Выбрать картинку";
});

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (!adminCode) return;

  uploadStatus.textContent = "Выкладываю…";

  const data = new FormData(uploadForm);
  data.append("code", adminCode);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: data
    });

    const result = await response.json();

    if (response.status === 403) {
      adminCode = "";
      sessionStorage.removeItem("adminCode");
      uploadStatus.textContent = "Код больше не действителен.";
      return;
    }

    if (!response.ok) {
      uploadStatus.textContent = result.error || "Ошибка.";
      return;
    }

    uploadForm.reset();
    fileName.textContent = "Выбрать картинку";
    uploadStatus.textContent = "Работа опубликована ✓";

    await loadArtworks(search.value.trim());
    await loadManageList();
  } catch {
    uploadStatus.textContent = "Ошибка соединения.";
  }
});

async function loadManageList() {
  if (!adminCode) return;

  const response = await fetch("/api/artworks");
  if (!response.ok) return;

  const artworks = await response.json();

  manageList.innerHTML = artworks.map(art => `
    <div class="manage-item">
      <img src="${escapeHTML(art.image_url)}" alt="">
      <div class="title">${escapeHTML(art.title)}</div>
      <button class="delete" data-id="${art.id}">Удалить</button>
    </div>
  `).join("");

  manageList.querySelectorAll(".delete").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Удалить эту работу?")) return;

      const response = await fetch(`/api/delete?id=${encodeURIComponent(button.dataset.id)}`, {
        method: "DELETE",
        headers: { "x-admin-code": adminCode }
      });

      if (response.status === 403) {
        adminCode = "";
        sessionStorage.removeItem("adminCode");
        closeAdmin();
        return;
      }

      await loadManageList();
      await loadArtworks(search.value.trim());
    });
  });
}

search.addEventListener("input", () => {
  clearTimeout(timer);

  clearSearch.style.display = search.value ? "block" : "none";

  timer = setTimeout(() => {
    loadArtworks(search.value.trim());
  }, 220);
});

clearSearch.addEventListener("click", () => {
  search.value = "";
  clearSearch.style.display = "none";
  loadArtworks();
  search.focus();
});

window.addEventListener("load", () => {
  setTimeout(() => loader.classList.add("done"), 500);
  loadArtworks();
});