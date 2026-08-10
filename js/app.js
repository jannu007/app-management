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

render();
moveTabIndicator(document.querySelector(".tab.active"));
