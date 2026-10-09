
const $ = id => document.getElementById(id);

const gallery = $("gallery");
const empty = $("empty");
const search = $("search");
const clearSearch = $("clearSearch");
const searchInfo = $("searchInfo");
const template = $("artTemplate");
const loader = $("loader");
const modal = $("adminModal");
const adminBtn = $("adminBtn");
const closeModal = $("closeModal");
const loginView = $("loginView");
const adminView = $("adminView");
const loginForm = $("loginForm");
const loginCode = $("loginCode");
const loginError = $("loginError");
const logoutBtn = $("logoutBtn");
const uploadForm = $("uploadForm");
const imageInput = $("imageInput");
const fileName = $("fileName");
const uploadStatus = $("uploadStatus");
const manageList = $("manageList");

let adminCode = sessionStorage.getItem("adminCode") || "";
let timer;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  }[c]));
}

async function loadArtworks(q = "") {
  try {
    const response = await fetch(
      "/api/artworks" + (q ? "?q=" + encodeURIComponent(q) : "")
    );

    if (!response.ok) throw new Error("Не удалось загрузить работы");

    const artworks = await response.json();
    gallery.innerHTML = "";
    empty.classList.toggle("hidden", artworks.length > 0);

    if (q) {
      searchInfo.textContent = `Найдено: ${artworks.length} — «${q}»`;
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

      card.style.animationDelay = `${Math.min(index * 0.055, 0.6)}s`;

      if (adminCode) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "art-edit-button";
        editButton.textContent = "✎";
        editButton.title = "Управлять публикацией";
        editButton.setAttribute("aria-label", "Управлять публикацией");
        editButton.addEventListener("click", () => openAdmin());
        card.appendChild(editButton);
      }

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

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      loginError.textContent = "Неверный код.";
      return;
    }

    adminCode = code;
    sessionStorage.setItem("adminCode", code);
    showAdmin();
    loadArtworks(search.value.trim());
  } catch {
    loginError.textContent = "Ошибка соединения.";
  }
});

logoutBtn.addEventListener("click", () => {
  adminCode = "";
  sessionStorage.removeItem("adminCode");
  adminView.classList.add("hidden");
  loginView.classList.remove("hidden");
  loginCode.value = "";
  closeAdmin();
  loadArtworks(search.value.trim());
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

    const result = await response.json().catch(() => ({}));

    if (response.status === 403) {
      expireAdmin();
      uploadStatus.textContent = "Код больше не действителен.";
      return;
    }

    if (!response.ok) {
      uploadStatus.textContent =
        result.error || `Ошибка ${response.status}.`;
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

function expireAdmin() {
  adminCode = "";
  sessionStorage.removeItem("adminCode");
  closeAdmin();
  loadArtworks(search.value.trim());
}

async function loadManageList() {
  if (!adminCode) return;

  try {
    const response = await fetch("/api/artworks");
    if (!response.ok) throw new Error("Ошибка загрузки");

    const artworks = await response.json();

    manageList.innerHTML = artworks.map(art => `
      <div class="manage-item" data-id="${escapeHTML(art.id)}">
        <img src="${escapeHTML(art.image_url)}" alt="">
        <div class="manage-item-content">
          <div class="title">${escapeHTML(art.title)}</div>
          <div class="manage-actions">
            <button type="button" class="edit">✎ Редактировать</button>
            <button type="button" class="delete">🗑 Удалить</button>
          </div>
        </div>
      </div>
    `).join("");

    manageList.querySelectorAll(".edit").forEach(button => {
      button.addEventListener("click", () => {
        const item = button.closest(".manage-item");
        const art = artworks.find(a => String(a.id) === item.dataset.id);
        if (art) showEditor(item, art);
      });
    });

    manageList.querySelectorAll(".delete").forEach(button => {
      button.addEventListener("click", () => {
        const item = button.closest(".manage-item");
        deleteArtwork(item.dataset.id, button);
      });
    });
  } catch {
    manageList.innerHTML =
      '<p class="status">Не удалось загрузить список публикаций.</p>';
  }
}

function showEditor(item, art) {
  item.innerHTML = `
    <form class="edit-form">
      <label>Название
        <input name="title" maxlength="120" required
          value="${escapeHTML(art.title)}">
      </label>
      <label>Описание
        <textarea name="description" maxlength="500">${escapeHTML(
          art.description || ""
        )}</textarea>
      </label>
      <div class="manage-actions">
        <button type="submit" class="save">Сохранить</button>
        <button type="button" class="cancel">Отмена</button>
        <button type="button" class="delete">🗑 Удалить</button>
      </div>
      <div class="edit-status status"></div>
    </form>
  `;

  const form = item.querySelector("form");
  const status = item.querySelector(".edit-status");

  form.querySelector(".cancel").addEventListener("click", loadManageList);

  form.querySelector(".delete").addEventListener("click", () => {
    deleteArtwork(art.id, form.querySelector(".delete"));
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const title = form.elements.title.value.trim();
    const description = form.elements.description.value.trim();

    if (!title) return;

    const save = form.querySelector(".save");
    save.disabled = true;
    status.textContent = "Сохраняю…";

    try {
      const response = await fetch(
        `/api/edit?id=${encodeURIComponent(art.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-code": adminCode
          },
          body: JSON.stringify({ title, description })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 403) {
        expireAdmin();
        return;
      }

      if (!response.ok) {
        status.textContent = result.error || "Не удалось сохранить.";
        save.disabled = false;
        return;
      }

      await loadManageList();
      await loadArtworks(search.value.trim());
    } catch {
      status.textContent = "Ошибка соединения.";
      save.disabled = false;
    }
  });
}

async function deleteArtwork(id, button) {
  if (!confirm("Точно удалить эту публикацию?")) return;

  button.disabled = true;

  try {
    const response = await fetch(
      `/api/delete?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "x-admin-code": adminCode }
      }
    );

    const result = await response.json().catch(() => ({}));

    if (response.status === 403) {
      expireAdmin();
      return;
    }

    if (!response.ok) {
      alert(result.error || "Не удалось удалить публикацию.");
      button.disabled = false;
      return;
    }

    await loadManageList();
    await loadArtworks(search.value.trim());
  } catch {
    alert("Ошибка соединения.");
    button.disabled = false;
  }
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
