const STORAGE_APPS = "ccam_apps_v1";
const STORAGE_SETTINGS = "ccam_settings_v1";

const STATUS_LABELS = {
  unclassified: "未分類",
  in_progress: "開発中",
  completed: "完成",
  paused: "一時停止",
  archived: "アーカイブ",
};

const STATUS_COLOR_VARS = {
  unclassified: "--status-unclassified",
  in_progress: "--status-in_progress",
  completed: "--status-completed",
  paused: "--status-paused",
  archived: "--status-archived",
};

// ---------- lock screen ----------
// Casual deterrent only: the hash below ships in this public repo's source,
// so anyone determined enough to read it can bypass this. It just keeps the
// app from being immediately usable by someone who stumbles onto the URL.

const LOCK_HASH_HEX = "cd0aa9856147b6c5b4ff2b7dfee5da20aa38253099ef1b4a64aced233c9afe29";

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const lockForm = document.getElementById("lock-form");
if (lockForm) {
  lockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("lock-input");
    const error = document.getElementById("lock-error");
    const hash = await sha256Hex(input.value);
    if (hash === LOCK_HASH_HEX) {
      localStorage.setItem("ccam_unlocked_v1", "1");
      document.documentElement.classList.remove("ccam-locked");
      error.classList.add("hidden");
    } else {
      error.classList.remove("hidden");
      input.value = "";
      input.focus();
    }
  });
}

let apps = loadApps();
let settings = loadSettings();
let state = { status: "all", search: "", sort: "updated_desc" };

function loadApps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_APPS)) || [];
  } catch {
    return [];
  }
}

function saveApps() {
  localStorage.setItem(STORAGE_APPS, JSON.stringify(apps));
}

function loadSettings() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_SETTINGS)) || {
        username: "",
        token: "",
        onlyTopic: false,
        topicName: "claude-code",
      }
    );
  } catch {
    return { username: "", token: "", onlyTopic: false, topicName: "claude-code" };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function relativeTime(iso) {
  if (!iso) return "更新日時不明";
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "今日";
  if (days === 1) return "1日前";
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ヶ月前`;
  return `${Math.floor(months / 12)}年前`;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add("hidden"), 3200);
}

// ---------- Rendering ----------

function getFilteredSortedApps() {
  let list = apps;
  if (state.status !== "all") {
    list = list.filter((a) => a.status === state.status);
  }
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter((a) => {
      const hay = [a.name, a.description, ...(a.tags || [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  list = [...list];
  switch (state.sort) {
    case "updated_asc":
      list.sort((a, b) => new Date(a.lastUpdated || 0) - new Date(b.lastUpdated || 0));
      break;
    case "name_asc":
      list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      break;
    default:
      list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
  }
  return list;
}

function render() {
  renderInner();
}

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


// ---------- Edit modal ----------

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");

function openEditModal(id) {
  const app = id ? apps.find((a) => a.id === id) : null;

  document.getElementById("edit-modal-title").textContent = app ? "アプリを編集" : "アプリを追加";
  document.getElementById("f-id").value = app ? app.id : "";
  document.getElementById("f-source").value = app ? app.source : "manual";
  document.getElementById("f-repo-full-name").value = app ? app.repoFullName || "" : "";
  document.getElementById("f-name").value = app ? app.name : "";
  document.getElementById("f-description").value = app ? app.description || "" : "";
  document.getElementById("f-status").value = app ? app.status : "unclassified";
  document.getElementById("f-url").value = app ? app.url || "" : "";
  document.getElementById("f-tags").value = app ? (app.tags || []).join(", ") : "";
  document.getElementById("f-notes").value = app ? app.notes || "" : "";
  document.getElementById("btn-delete").classList.toggle("hidden", !app);

  editModal.showModal();
}

editForm.addEventListener("submit", (e) => {
  const id = document.getElementById("f-id").value;
  const tags = document
    .getElementById("f-tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const data = {
    name: document.getElementById("f-name").value.trim(),
    description: document.getElementById("f-description").value.trim(),
    status: document.getElementById("f-status").value,
    url: document.getElementById("f-url").value.trim(),
    tags,
    notes: document.getElementById("f-notes").value.trim(),
  };

  if (id) {
    const app = apps.find((a) => a.id === id);
    Object.assign(app, data);
  } else {
    apps.push({
      id: uid(),
      source: "manual",
      repoFullName: null,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...data,
    });
  }
  saveApps();
  render();
});

document.getElementById("btn-cancel").addEventListener("click", () => editModal.close());

document.getElementById("btn-delete").addEventListener("click", () => {
  const id = document.getElementById("f-id").value;
  if (!id) return;
  if (confirm("このアプリの登録を削除しますか？（GitHub同期対象の場合、次回同期で再登録されます）")) {
    apps = apps.filter((a) => a.id !== id);
    saveApps();
    render();
    editModal.close();
  }
});

document.getElementById("btn-add").addEventListener("click", () => openEditModal(null));

// ---------- Settings modal ----------

const settingsModal = document.getElementById("settings-modal");

document.getElementById("btn-settings").addEventListener("click", () => {
  document.getElementById("s-username").value = settings.username || "";
  document.getElementById("s-token").value = settings.token || "";
  document.getElementById("s-only-topic").checked = !!settings.onlyTopic;
  document.getElementById("s-topic-name").value = settings.topicName || "claude-code";
  settingsModal.showModal();
});

document.getElementById("btn-settings-cancel").addEventListener("click", () => settingsModal.close());

document.getElementById("settings-form").addEventListener("submit", () => {
  settings = {
    username: document.getElementById("s-username").value.trim(),
    token: document.getElementById("s-token").value.trim(),
    onlyTopic: document.getElementById("s-only-topic").checked,
    topicName: document.getElementById("s-topic-name").value.trim() || "claude-code",
  };
  saveSettings();
  showToast("設定を保存しました");
});

document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `claude-code-apps-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("invalid format");
    let added = 0;
    for (const item of imported) {
      const key = item.repoFullName;
      const exists = key ? apps.find((a) => a.repoFullName === key) : apps.find((a) => a.id === item.id);
      if (!exists) {
        apps.push({ ...item, id: item.id || uid() });
        added++;
      }
    }
    saveApps();
    render();
    showToast(`${added}件のアプリをインポートしました`);
  } catch (err) {
    showToast("インポートに失敗しました：ファイル形式を確認してください");
  } finally {
    e.target.value = "";
  }
});

// ---------- GitHub sync ----------

function parseLinkHeader(header) {
  if (!header) return {};
  const links = {};
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  }
  return links;
}

function computeAppUrl(repo) {
  if (repo.homepage && repo.homepage.trim()) return repo.homepage.trim();
  if (repo.has_pages && repo.owner && repo.owner.login) {
    const owner = repo.owner.login;
    const isUserSite = repo.name.toLowerCase() === `${owner.toLowerCase()}.github.io`;
    return isUserSite ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repo.name}/`;
  }
  return repo.html_url;
}

function summarizeReadme(text) {
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("<!--")) continue;
    if (line.startsWith("<img") || line.startsWith("<p align") || line.startsWith("<div")) continue;
    if (/^[-=*_]{3,}$/.test(line)) continue;
    line = line
      .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[*_`#]/g, "")
      .trim();
    if (line.length > 3) {
      return line.length > 140 ? `${line.slice(0, 137)}…` : line;
    }
  }
  return "";
}

async function fetchReadmeSummary(fullName) {
  try {
    const headers = { Accept: "application/vnd.github.raw+json" };
    if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
    const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers });
    if (!res.ok) return "";
    return summarizeReadme(await res.text());
  } catch {
    return "";
  }
}

// ---------- automatic status classification ----------
// Only ever applied to repos left as "未分類" (either newly synced, or a
// user hasn't manually picked a status for yet) — a manually-chosen status
// is never overwritten by a sync.

async function repoHasRelease(fullName) {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
    const res = await fetch(`https://api.github.com/repos/${fullName}/releases?per_page=1`, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

async function classifyRepoStatus(repo) {
  if (repo.archived) return "archived";
  if (await repoHasRelease(repo.full_name)) return "completed";
  const daysSincePush = repo.pushed_at
    ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
    : Infinity;
  return daysSincePush <= 30 ? "in_progress" : "paused";
}

async function fetchAllRepos() {
  const headers = { Accept: "application/vnd.github+json" };
  if (settings.token) headers.Authorization = `Bearer ${settings.token}`;

  let url = settings.token
    ? "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner"
    : `https://api.github.com/users/${encodeURIComponent(settings.username)}/repos?per_page=100&sort=updated`;

  const results = [];
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GitHub API エラー (${res.status}): ${body.slice(0, 200)}`);
    }
    const page = await res.json();
    results.push(...page);
    const links = parseLinkHeader(res.headers.get("Link"));
    url = links.next || null;
  }
  return results;
}

async function syncGithub() {
  if (!settings.username && !settings.token) {
    showToast("先に「設定」でGitHubユーザー名またはトークンを入力してください");
    settingsModal.showModal();
    return;
  }

  const btn = document.getElementById("btn-sync");
  btn.disabled = true;
  btn.textContent = "同期中…";

  try {
    let repos = await fetchAllRepos();

    if (settings.onlyTopic && settings.topicName) {
      const headers = { Accept: "application/vnd.github.mercy-preview+json" };
      if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
      const withTopics = [];
      for (const repo of repos) {
        try {
          const tRes = await fetch(`https://api.github.com/repos/${repo.full_name}/topics`, { headers });
          const tData = tRes.ok ? await tRes.json() : { names: [] };
          if ((tData.names || []).includes(settings.topicName)) withTopics.push(repo);
        } catch {
          // skip repo if topic lookup fails
        }
      }
      repos = withTopics;
    }

    let added = 0;
    let updated = 0;

    for (const repo of repos) {
      const existing = apps.find((a) => a.repoFullName === repo.full_name);
      const appUrl = computeAppUrl(repo);

      if (existing) {
        if (repo.description) {
          existing.description = repo.description;
        } else if (!existing.description) {
          existing.description = await fetchReadmeSummary(repo.full_name);
        }
        if (existing.status === "unclassified") {
          existing.status = await classifyRepoStatus(repo);
        }
        existing.lastUpdated = repo.pushed_at;
        existing.url = appUrl;
        existing.repoUrl = repo.html_url;
        existing.homepage = repo.homepage || "";
        existing.hasPages = !!repo.has_pages;
        existing.defaultBranch = repo.default_branch || "main";
        updated++;
      } else {
        const description = repo.description || (await fetchReadmeSummary(repo.full_name));
        apps.push({
          id: uid(),
          source: "github",
          repoFullName: repo.full_name,
          name: repo.name,
          description,
          status: await classifyRepoStatus(repo),
          url: appUrl,
          repoUrl: repo.html_url,
          homepage: repo.homepage || "",
          hasPages: !!repo.has_pages,
          defaultBranch: repo.default_branch || "main",
          tags: repo.language ? [repo.language] : [],
          notes: "",
          lastUpdated: repo.pushed_at,
          createdAt: new Date().toISOString(),
        });
        added++;
      }
    }

    saveApps();
    render();
    showToast(`同期完了：新規 ${added}件 / 更新 ${updated}件`);
    settingsModal.close();
  } catch (err) {
    showToast(err.message || "同期に失敗しました");
  } finally {
    btn.disabled = false;
    btn.textContent = "GitHubと同期";
  }
}

document.getElementById("btn-sync").addEventListener("click", syncGithub);

// ---------- Toolbar events ----------

document.getElementById("search").addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});

document.getElementById("sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

function moveTabIndicator(tab) {
  const indicator = document.getElementById("tab-indicator");
  if (!tab || !indicator) return;
  indicator.style.width = `${tab.offsetWidth}px`;
  indicator.style.height = `${tab.offsetHeight}px`;
  indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
}

document.getElementById("status-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  moveTabIndicator(btn);
  state.status = btn.dataset.status;
  render();
});

window.addEventListener("resize", () => {
  moveTabIndicator(document.querySelector(".tab.active"));
});
window.addEventListener("load", () => {
  moveTabIndicator(document.querySelector(".tab.active"));
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => moveTabIndicator(document.querySelector(".tab.active")));
}

// ---------- falling petals ----------

function spawnPetal() {
  const container = document.getElementById("petals");
  if (!container) return;
  const petal = document.createElement("div");
  petal.className = "petal";
  const startX = Math.random() * 100;
  const drift = (Math.random() - 0.5) * 160;
  const duration = 9 + Math.random() * 8;
  const size = 8 + Math.random() * 8;
  petal.style.left = `${startX}vw`;
  petal.style.width = petal.style.height = `${size}px`;
  petal.style.setProperty("--drift", `${drift}px`);
  petal.style.animationDuration = `${duration}s`;
  petal.style.background = Math.random() > 0.5 ? "var(--accent-2)" : "var(--blob-gold)";
  container.appendChild(petal);
  petal.addEventListener("animationend", () => petal.remove());
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  for (let i = 0; i < 3; i++) setTimeout(spawnPetal, i * 1500);
  setInterval(spawnPetal, 3200);
}

// ---------- PWA install ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

let deferredInstallPrompt = null;
const installBtn = document.getElementById("btn-install");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
  showToast("インストールしました");
});

// ---------- ink ripple effect ----------

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
});

render();
moveTabIndicator(document.querySelector(".tab.active"));
