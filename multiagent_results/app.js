const $ = (sel) => document.querySelector(sel);

const state = {
  allScenes: [],
  filtered: [],
  activeId: null,
  activeScene: null,
};

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function norm(s) {
  return (s || "").toLowerCase().trim();
}

function contains(hay, needle) {
  return norm(hay).includes(norm(needle));
}

function uniq(arr) {
  return [...new Set(arr)];
}

/** ---------- Grouping helpers ---------- */
function sceneGroup(s) {
  const tags = (s.tags || []).map(norm);

  if (tags.includes("breakingbad")) return "Breaking Bad";
  if (tags.includes("madmen")) return "Mad Men";

  const id = (s.id || "").toLowerCase();
  if (id.startsWith("bb-")) return "Breaking Bad";
  if (id.startsWith("mm-")) return "Mad Men";

  // fallback: try parse title prefix "XXX — ..."
  const title = s.title || "";
  const m = title.match(/^([^—-]+)\s*[—-]\s+/);
  if (m && m[1]) return m[1].trim();

  return "Other";
}

function groupScenes(scenes) {
  const groups = new Map();
  for (const s of scenes) {
    const g = sceneGroup(s);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  }

  // Preferred group order
  const order = ["Breaking Bad", "Mad Men"];
  const out = [];
  for (const g of order) {
    if (groups.has(g)) out.push([g, groups.get(g)]);
  }
  for (const [g, arr] of groups.entries()) {
    if (!order.includes(g)) out.push([g, arr]);
  }
  return out;
}
/** ---------- /Grouping helpers ---------- */

async function load() {
  const res = await fetch("./scenes.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load scenes.json (${res.status})`);
  const data = await res.json();

  const scenes = (data.scenes || []).map((s, idx) => ({
    id: s.id || `scene-${String(idx + 1).padStart(3, "0")}`,
    title: s.title || `Scene ${idx + 1}`,
    prompt: s.prompt || "",
    video: s.video || "",
    tags: s.tags || [],
    notes: s.notes || "",
  }));

  state.allScenes = scenes;
  state.filtered = scenes;

  $("#subtitle").textContent = `${scenes.length} scenes`;
  if (data.projectTitle) {
    document.title = data.projectTitle;
    $("#projectTitle").textContent = data.projectTitle;
  }

  renderFilterOptions(scenes);
  renderAll();

  if (scenes.length) setActive(scenes[0].id, { scrollIntoView: false });
}

function renderFilterOptions(scenes) {
  const tags = uniq(scenes.flatMap((s) => s.tags || [])).sort((a, b) => a.localeCompare(b));
  const sel = $("#filter");
  sel.innerHTML =
    `<option value="all">All tags</option>` +
    tags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function renderSidebar() {
  const list = $("#sceneList");
  const grouped = groupScenes(state.filtered);

  let globalIndex = 0;

  list.innerHTML = grouped
    .map(([groupName, scenes]) => {
      const header = `
        <div class="group-head">
          <div class="group-title">${escapeHtml(groupName)}</div>
          <div class="group-count">${escapeHtml(String(scenes.length))}</div>
        </div>
      `;

      const items = scenes
        .map((s) => {
          globalIndex += 1;
          const active = s.id === state.activeId ? "active" : "";
          const tag = (s.tags && s.tags[0]) ? s.tags[0] : "scene";
          const meta = (s.notes || "").replace(/\s+/g, " ").trim();

          return `
            <div class="scene-link ${active}" data-id="${escapeHtml(s.id)}" title="Jump to ${escapeHtml(s.title)}">
              <div class="badge">${escapeHtml(String(globalIndex).padStart(2, "0"))}</div>
              <div class="link-text">
                <div class="link-title">${escapeHtml(s.title)}</div>
                <div class="link-meta">${escapeHtml(tag)} • ${escapeHtml(meta.slice(0, 44))}${meta.length > 44 ? "…" : ""}</div>
              </div>
            </div>
          `;
        })
        .join("");

      return `<div class="group-block">${header}${items}</div>`;
    })
    .join("");

  list.querySelectorAll(".scene-link").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-id");
      setActive(id, { scrollIntoView: true });
    });
  });
}

function renderGrid() {
  const grid = $("#grid");
  const grouped = groupScenes(state.filtered);

  let globalIndex = 0;

  grid.innerHTML = grouped
    .map(([groupName, scenes]) => {
      // group header spans full grid width (inline style so no CSS dependency)
      const header = `
        <div style="grid-column: 1 / -1; margin: 14px 0 6px; font-weight: 700; opacity: 0.9;">
          ${escapeHtml(groupName)} <span style="opacity:0.6; font-weight:600;">(${escapeHtml(String(scenes.length))})</span>
        </div>
      `;

      const cards = scenes
        .map((s) => {
          globalIndex += 1;

          const tags = (s.tags || []).map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("");
          const safePrompt = escapeHtml(s.prompt || "");
          const safeNotes = escapeHtml(s.notes || "");
          const safeVideo = escapeHtml(s.video || "");

          return `
            <article class="card" id="${escapeHtml(s.id)}">
              <div class="card-top">
                <div style="min-width:0">
                  <h3 class="card-title">${escapeHtml(String(globalIndex).padStart(2, "0"))}. ${escapeHtml(s.title)}</h3>
                  <div class="card-tags">${tags}</div>
                </div>
                <div class="card-actions">
                  <button class="btn small ghost" data-copy="${escapeHtml(s.id)}">Copy prompt</button>
                  <button class="btn small" data-open="${escapeHtml(s.id)}">Open</button>
                </div>
              </div>

              <div class="prompt">${safePrompt}</div>

              <div class="video-wrap">
                <video
                  src="${safeVideo}"
                  controls
                  playsinline
                  preload="metadata"
                  data-video="${escapeHtml(s.id)}"
                ></video>
                ${safeNotes ? `<div class="card-note">${safeNotes}</div>` : ""}
              </div>
            </article>
          `;
        })
        .join("");

      return header + cards;
    })
    .join("");

  grid.querySelectorAll("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const scene = state.allScenes.find((x) => x.id === id);
      if (!scene) return;
      await copyText(scene.prompt || "");
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy prompt"), 900);
    });
  });

  grid.querySelectorAll("button[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.getAttribute("data-open")));
  });

  grid.querySelectorAll("video[data-video]").forEach((v) => {
    v.addEventListener("click", () => openModal(v.getAttribute("data-video")));
  });
}

function renderAll() {
  renderSidebar();
  renderGrid();
}

function setActive(id, { scrollIntoView }) {
  state.activeId = id;
  renderSidebar();
  const el = document.getElementById(id);
  if (el && scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function applyFilters() {
  const q = $("#search").value.trim();
  const tag = $("#filter").value;

  const filtered = state.allScenes.filter((s) => {
    const tagOk = tag === "all" || (s.tags || []).includes(tag);
    if (!tagOk) return false;
    if (!q) return true;
    return (
      contains(s.title, q) ||
      contains(s.prompt, q) ||
      contains(s.notes, q) ||
      (s.tags || []).some((t) => contains(t, q))
    );
  });

  state.filtered = filtered;
  $("#subtitle").textContent = `${filtered.length}/${state.allScenes.length} scenes`;
  renderAll();

  if (filtered.length) setActive(filtered[0].id, { scrollIntoView: false });
}

function openModal(id) {
  const scene = state.allScenes.find((x) => x.id === id);
  if (!scene) return;
  state.activeScene = scene;

  $("#modalTitle").textContent = scene.title;
  $("#modalPrompt").textContent = scene.prompt || "";

  const mv = $("#modalVideo");
  mv.src = scene.video || "";
  mv.currentTime = 0;

  const modal = $("#modal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = $("#modal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");

  const mv = $("#modalVideo");
  mv.pause();
  mv.removeAttribute("src");
  mv.load();
  state.activeScene = null;
}

function initUI() {
  $("#search").addEventListener("input", applyFilters);
  $("#filter").addEventListener("change", applyFilters);

  $("#toggleDense").addEventListener("click", () => {
    document.body.classList.toggle("dense");
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", closeModal);

  $("#modalCopy").addEventListener("click", async () => {
    if (!state.activeScene) return;
    await copyText(state.activeScene.prompt || "");
    const b = $("#modalCopy");
    b.textContent = "Copied!";
    setTimeout(() => (b.textContent = "Copy prompt"), 900);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

initUI();
load().catch((e) => {
  $("#subtitle").textContent = "Failed to load scenes";
  console.error(e);
  alert(String(e));
});
