// ---------- Rendering (card list view) ----------

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
    grid.appendChild(buildCard(app, index));
  });
}

function buildCard(app, index) {
  const card = document.createElement("div");
  card.className = "app-card";
  card.style.setProperty("--i", index);
  card.style.setProperty(
    "--card-accent",
    `var(${STATUS_COLOR_VARS[app.status] || "--accent"})`
  );
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 14;
    const ry = (px - 0.5) * 14;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.015)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });

  const head = document.createElement("div");
  head.className = "app-card-head";

  const headMain = document.createElement("div");
  headMain.className = "app-card-head-main";

  const name = document.createElement("div");
  name.className = "app-name";
  name.textContent = app.name;

  const badge = document.createElement("span");
  badge.className = `badge badge-${app.status}`;
  badge.textContent = STATUS_LABELS[app.status] || app.status;

  headMain.append(name, badge);

  const headActions = document.createElement("div");
  headActions.className = "app-card-head-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "card-edit-btn";
  editBtn.title = "編集";
  editBtn.textContent = "✎";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(app.id);
  });

  const chevron = document.createElement("span");
  chevron.className = "card-chevron";
  chevron.textContent = "⌄";

  headActions.append(editBtn, chevron);
  head.append(headMain, headActions);

  const desc = document.createElement("div");
  desc.className = "app-desc";
  desc.textContent = app.description || "説明なし";

  const tags = document.createElement("div");
  tags.className = "app-tags";
  for (const tag of app.tags || []) {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;
    tags.appendChild(chip);
  }

  const foot = document.createElement("div");
  foot.className = "app-card-foot";

  const updated = document.createElement("span");
  updated.className = app.source === "github" ? "source-github" : "";
  updated.textContent = relativeTime(app.lastUpdated);

  foot.append(updated);

  const expandWrap = document.createElement("div");
  expandWrap.className = "app-expand-wrap";
  const expandPanel = document.createElement("div");
  expandPanel.className = "app-expand-panel";
  expandWrap.appendChild(expandPanel);

  let expanded = false;
  let loaded = false;

  card.addEventListener("click", async () => {
    expanded = !expanded;
    card.classList.toggle("expanded", expanded);
    if (expanded && !loaded) {
      loaded = true;
      await loadExpandPanel(app, expandPanel);
    }
  });

  card.append(head, desc, tags, foot, expandWrap);
  return card;
}

// ---------- app picker (browses HTML files inside the repo) ----------

async function loadExpandPanel(app, panel) {
  panel.innerHTML = "";
  const loading = document.createElement("div");
  loading.className = "app-expand-status";
  loading.textContent = "読み込み中…";
  panel.appendChild(loading);

  const rows = await buildAppRows(app);

  panel.innerHTML = "";
  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "app-expand-status";
    empty.textContent = "開けるページが見つかりませんでした";
    panel.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "app-expand-row";

    const label = document.createElement("span");
    label.className = "app-expand-label";
    label.textContent = row.label;

    const arrow = document.createElement("span");
    arrow.className = "app-expand-arrow";
    arrow.textContent = "→";

    btn.append(label, arrow);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(row.url, "_blank", "noopener,noreferrer");
    });
    panel.appendChild(btn);
  }
}

async function buildAppRows(app) {
  if (!app.repoFullName) {
    return app.url ? [{ label: "アプリを開く", url: app.url }] : [];
  }

  const rows = [];

  const files = await fetchRepoHtmlFiles(app);
  if (files.length > 0) {
    for (const path of files) {
      // GitHub's has_pages flag can lag behind an actual Pages deployment, so
      // always offer the pages.github.io URL as the primary destination; only
      // add the htmlpreview.github.io fallback when Pages isn't confirmed yet.
      rows.push({ label: htmlFileLabel(path), url: htmlFileToPagesUrl(app, path) });
      if (!app.hasPages) {
        rows.push({ label: `${htmlFileLabel(path)}（プレビュー）`, url: htmlFileToPreviewUrl(app, path) });
      }
    }
  } else if (app.url && app.url !== app.repoUrl) {
    // No static HTML files in the repo (e.g. a Next.js app deployed to
    // Vercel/Netlify) — fall back to the app's Next.js App Router pages,
    // resolved against its deployed URL.
    const routes = await fetchRepoNextRoutes(app);
    if (routes.length > 0) {
      for (const route of routes) {
        rows.push({ label: route === "" ? "トップページ" : route, url: joinUrl(app.url, route) });
      }
    } else {
      rows.push({ label: "トップページ", url: app.url });
    }
  }

  if (app.repoUrl) rows.push({ label: "GitHubで見る", url: app.repoUrl });
  return rows;
}

function joinUrl(base, route) {
  const b = base.endsWith("/") ? base : `${base}/`;
  return route ? b + route : b;
}

const repoTreeCache = new Map();

async function fetchRepoTree(app) {
  const cacheKey = app.repoFullName;
  if (repoTreeCache.has(cacheKey)) return repoTreeCache.get(cacheKey);

  const promise = (async () => {
    try {
      const headers = { Accept: "application/vnd.github+json" };
      if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
      const branch = app.defaultBranch || "main";
      const res = await fetch(
        `https://api.github.com/repos/${app.repoFullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        { headers }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.tree || [])
        .filter((item) => item.type === "blob")
        .filter((item) => !/(^|\/)(node_modules|\.git)\//.test(item.path))
        .map((item) => item.path);
    } catch {
      return [];
    }
  })();

  repoTreeCache.set(cacheKey, promise);
  return promise;
}

async function fetchRepoHtmlFiles(app) {
  const paths = await fetchRepoTree(app);
  const files = paths.filter((path) => /\.html?$/i.test(path));
  files.sort((a, b) => {
    const aIsRootIndex = /^index\.html?$/i.test(a) ? 0 : 1;
    const bIsRootIndex = /^index\.html?$/i.test(b) ? 0 : 1;
    return aIsRootIndex !== bIsRootIndex ? aIsRootIndex - bIsRootIndex : a.localeCompare(b);
  });
  return files.slice(0, 40);
}

async function fetchRepoNextRoutes(app) {
  const paths = await fetchRepoTree(app);
  const routes = paths
    .filter((path) => /^app\/.*page\.(tsx|jsx|js|mdx)$/i.test(path))
    .filter((path) => !/\[[^\]]+\]/.test(path)) // skip dynamic segments — no concrete URL to link to
    .map((path) => path.replace(/^app\//, "").replace(/\/?page\.(tsx|jsx|js|mdx)$/i, ""));
  routes.sort((a, b) => {
    const aIsRoot = a === "" ? 0 : 1;
    const bIsRoot = b === "" ? 0 : 1;
    return aIsRoot !== bIsRoot ? aIsRoot - bIsRoot : a.localeCompare(b);
  });
  return routes.slice(0, 40);
}

function htmlFileToPagesUrl(app, filePath) {
  const [owner, repoName] = app.repoFullName.split("/");
  let path = filePath;
  if (/^index\.html?$/i.test(path)) path = "";
  else if (/\/index\.html?$/i.test(path)) path = path.replace(/index\.html?$/i, "");
  const isUserSite = repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const base = isUserSite ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repoName}/`;
  return base + path;
}

function htmlFileToPreviewUrl(app, filePath) {
  return `https://htmlpreview.github.io/?https://github.com/${app.repoFullName}/blob/${app.defaultBranch || "main"}/${filePath}`;
}

function htmlFileLabel(filePath) {
  if (/^index\.html?$/i.test(filePath)) return "トップページ";
  if (/\/index\.html?$/i.test(filePath)) return filePath.replace(/index\.html?$/i, "");
  return filePath;
}

render();
moveTabIndicator(document.querySelector(".tab.active"));
