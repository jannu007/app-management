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

// ---------- filtering/sorting (rendering itself is page-specific) ----------

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

// render() delegates to renderInner(), which each page defines for its own
// layout (card list vs. icon grid). Do not call render() from this file —
// it must run only after the page-specific script has defined renderInner().
function render() {
  renderInner();
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
// Only present on pages that include the manifest link + install-fab button.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(window.SW_PATH || "./sw.js").catch(() => {});
  });
}

let deferredInstallPrompt = null;
const installBtn = document.getElementById("btn-install");

if (installBtn) {
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
}

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.classList.add("hidden");
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
