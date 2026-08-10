// ---------- Rendering (icon grid view) ----------

function renderInner() {
  const grid = document.getElementById("app-grid");
  const empty = document.getElementById("empty-state");
  const list = getFilteredSortedApps();

  grid.innerHTML = "";

  if (apps.length === 0) {
    empty.classList.remove("hidden");
    empty.textContent = "";
    empty.innerHTML =
      "まだ登録されたアプリがありません。<br>「設定」からGitHubアカウントを連携して同期するか、「＋ 手動で追加」から登録してください。";
    return;
  }
  empty.classList.add("hidden");

  if (list.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = "条件に一致するアプリがありません。";
    grid.appendChild(p);
    return;
  }

  list.forEach((app, index) => {
    grid.appendChild(buildIconTile(app, index));
  });
}

const ICON_CANDIDATE_PATHS = [
  "icons/icon-512.png",
  "icons/icon-192.png",
  "icons/icon.png",
  "icons/apple-touch-icon.png",
  "apple-touch-icon.png",
  "icons/favicon.svg",
  "favicon.svg",
  "favicon.ico",
  // Vite/CRA-style projects (e.g. this app's own novel/Moog repos) keep
  // their PWA icons directly under public/ instead of a top-level icons/.
  "public/icon-512.png",
  "public/icon-192.png",
  "public/apple-touch-icon.png",
  "public/favicon.svg",
  "public/favicon.ico",
];

function buildIconCandidates(app) {
  if (!app.repoFullName) return [];
  const branch = app.defaultBranch || "main";
  return ICON_CANDIDATE_PATHS.map(
    (path) => `https://raw.githubusercontent.com/${app.repoFullName}/${branch}/${path}`
  );
}

const FALLBACK_PALETTE = [
  "var(--blob-indigo)",
  "var(--blob-sakura)",
  "var(--blob-matcha)",
  "var(--blob-gold)",
  "var(--accent)",
  "var(--accent-2)",
];

function colorForName(name) {
  let hash = 0;
  for (const ch of name || "") hash = (hash * 31 + ch.codePointAt(0)) % 997;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

function setIconWithFallback(imgEl, fallbackEl, candidates) {
  let i = 0;
  imgEl.addEventListener("load", () => {
    imgEl.classList.remove("hidden");
    fallbackEl.classList.add("hidden");
  });
  imgEl.addEventListener("error", () => {
    if (i < candidates.length) {
      imgEl.src = candidates[i++];
    } else {
      imgEl.classList.add("hidden");
      fallbackEl.classList.remove("hidden");
    }
  });
  if (candidates.length > 0) {
    imgEl.src = candidates[i++];
  } else {
    imgEl.classList.add("hidden");
    fallbackEl.classList.remove("hidden");
  }
}

function buildIconTile(app, index) {
  const tile = document.createElement("div");
  tile.className = "icon-tile";
  tile.style.setProperty("--i", index);
  tile.style.setProperty("--card-accent", `var(${STATUS_COLOR_VARS[app.status] || "--accent"})`);
  tile.title = `${app.name}（${STATUS_LABELS[app.status] || app.status}）`;

  const statusDot = document.createElement("div");
  statusDot.className = "icon-tile-status-dot";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "icon-tile-edit";
  editBtn.title = "編集";
  editBtn.textContent = "✎";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(app.id);
  });

  const imageWrap = document.createElement("div");
  imageWrap.className = "icon-tile-image-wrap";

  const img = document.createElement("img");
  img.className = "icon-tile-image hidden";
  img.alt = "";

  const fallback = document.createElement("div");
  fallback.className = "icon-tile-fallback hidden";
  fallback.style.background = colorForName(app.name);
  fallback.textContent = [...(app.name || "?").trim()][0]?.toUpperCase() || "?";

  imageWrap.append(img, fallback);
  setIconWithFallback(img, fallback, buildIconCandidates(app));

  const name = document.createElement("div");
  name.className = "icon-tile-name";
  name.textContent = app.name;

  tile.append(statusDot, editBtn, imageWrap, name);

  tile.addEventListener("click", () => {
    if (app.url) {
      window.open(app.url, "_blank", "noopener,noreferrer");
    } else {
      showToast("URLが未設定です。✎から編集してください");
    }
  });

  return tile;
}

render();
moveTabIndicator(document.querySelector(".tab.active"));
