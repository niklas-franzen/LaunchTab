/* ─── options.js ─────────────────────────────────────────────────────────────
 *
 * Handles all four settings tabs: Shortcuts, Search Engines, Appearance,
 * and Bookmarks. Requires defaults.js + storage.js + search-engines.js +
 * bookmarks.js + themes.js to be loaded first.
 * ─────────────────────────────────────────────────────────────────────────── */

/* ─── State ──────────────────────────────────────────────────────────────── */

let shortcuts    = [];
let engines      = [];
let appearance   = {};
let editingKey   = null;   // null = adding; string = key being edited
let editingEngKey = null;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showStatus(msg, type = "ok") {
  const el = document.getElementById("status-banner");
  el.textContent = msg;
  el.className   = `status-banner status-banner--${type}`;
  el.hidden      = false;
  setTimeout(() => { el.hidden = true; }, 3500);
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.hidden      = !msg;
}

/* ─── Tab Switching ──────────────────────────────────────────────────────── */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");
  });
});

/* ─── Back to LaunchTab ──────────────────────────────────────────────────── */

document.getElementById("btn-back").addEventListener("click", () => {
  window.location.href = chrome.runtime.getURL("app.html?x");
});

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 1 — SHORTCUTS
 * ══════════════════════════════════════════════════════════════════════════ */

const shortcutList  = document.getElementById("shortcut-list");
const filterInput   = document.getElementById("filter-input");
const formCard      = document.getElementById("form-card");
const formTitle     = document.getElementById("form-title");
const fKey          = document.getElementById("f-key");
const fName         = document.getElementById("f-name");
const fUrl          = document.getElementById("f-url");
const fCategory     = document.getElementById("f-category");
const btnSave       = document.getElementById("btn-save");
const btnCancel     = document.getElementById("btn-cancel");
const btnAdd        = document.getElementById("btn-add");

function renderShortcutList() {
  shortcutList.innerHTML = "";
  const q = filterInput.value.toLowerCase().trim();

  const visible = q
    ? shortcuts.filter(s =>
        s.key.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        getDomain(s.url).toLowerCase().includes(q))
    : shortcuts;

  if (visible.length === 0) {
    const p = document.createElement("p");
    p.className   = "empty-state";
    p.textContent = shortcuts.length === 0
      ? 'No shortcuts yet. Click "+ Add shortcut" to get started.'
      : "No shortcuts match the filter.";
    shortcutList.appendChild(p);
    return;
  }

  visible.forEach(s => shortcutList.appendChild(createShortcutItem(s)));
}

function createShortcutItem(sc) {
  const item = document.createElement("div");
  item.className = "shortcut-item";
  item.setAttribute("role", "listitem");

  // Favicon
  const favWrap = document.createElement("div");
  favWrap.className = "item-favicon-wrap";
  const fav  = document.createElement("img");
  fav.className = "item-favicon";
  fav.src = createFaviconUrl(sc.url); fav.alt = ""; fav.width = 20; fav.height = 20; fav.loading = "lazy";
  const favFb = document.createElement("span");
  favFb.className = "item-favicon-fallback";
  favFb.textContent = sc.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display = "none"; favFb.style.display = "flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";  keyEl.textContent = sc.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name"; nameEl.textContent = sc.name;
  const domEl  = document.createElement("span"); domEl.className  = "item-domain"; domEl.textContent = getDomain(sc.url);
  const catEl  = document.createElement("span"); catEl.className  = "item-category"; catEl.textContent = sc.category || "—";

  const acts = document.createElement("div");
  acts.className = "item-actions";
  const editBtn = makeIconBtn(editSvg, "Edit", "Edit " + sc.name);
  editBtn.addEventListener("click", () => openShortcutEditForm(sc));
  const delBtn  = makeIconBtn(deleteSvg, "Delete", "Delete " + sc.name, true);
  delBtn.addEventListener("click", () => confirmShortcutDelete(sc, acts));
  acts.append(editBtn, delBtn);

  item.append(favWrap, keyEl, nameEl, domEl, catEl, acts);
  return item;
}

function confirmShortcutDelete(sc, actsEl) {
  actsEl.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "confirm-wrap";
  const lbl  = document.createElement("span"); lbl.className = "confirm-label"; lbl.textContent = "Delete?";
  const yes  = document.createElement("button"); yes.className = "btn-confirm-yes"; yes.textContent = "Yes";
  yes.addEventListener("click", () => {
    deleteShortcut(sc.key).then(u => { shortcuts = u; renderShortcutList(); showStatus(`"${sc.name}" deleted.`); if (editingKey === sc.key) closeShortcutForm(); });
  });
  const no = document.createElement("button"); no.className = "btn-confirm-no"; no.textContent = "No";
  no.addEventListener("click", () => renderShortcutList());
  wrap.append(lbl, yes, no);
  actsEl.appendChild(wrap);
}

function openShortcutAddForm() {
  editingKey = null;
  formTitle.textContent = "Add shortcut";
  fKey.value = ""; fName.value = ""; fUrl.value = ""; fCategory.value = "";
  setFieldError("form-error", "");
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openShortcutEditForm(sc) {
  editingKey = sc.key;
  formTitle.textContent = "Edit shortcut";
  fKey.value = sc.key; fName.value = sc.name; fUrl.value = sc.url; fCategory.value = sc.category || "";
  setFieldError("form-error", "");
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeShortcutForm() {
  formCard.hidden = true; editingKey = null; setFieldError("form-error", "");
}

function handleShortcutSave() {
  const key      = fKey.value.trim();
  const name     = fName.value.trim();
  const rawUrl   = fUrl.value.trim();
  const category = fCategory.value.trim();

  if (!key)  { setFieldError("form-error", "Shortcut key is required."); return; }
  if (!name) { setFieldError("form-error", "Name is required."); return; }
  if (!rawUrl) { setFieldError("form-error", "URL is required."); return; }

  const url = normalizeUrl(rawUrl);
  try { new URL(url); } catch { setFieldError("form-error", "Enter a valid URL."); return; }

  const dup = shortcuts.find(s => s.key === key && s.key !== editingKey);
  if (dup) { setFieldError("form-error", `Key "${key}" is already used by "${dup.name}".`); return; }

  setFieldError("form-error", "");
  const sc = { key, name, url, category: category || "Other" };
  const p  = editingKey !== null ? updateShortcut(editingKey, sc) : addShortcut(sc);
  p.then(u => { shortcuts = u; renderShortcutList(); closeShortcutForm(); showStatus(editingKey !== null ? "Shortcut updated." : "Shortcut added."); });
}

btnAdd.addEventListener("click", openShortcutAddForm);
btnCancel.addEventListener("click", closeShortcutForm);
btnSave.addEventListener("click", handleShortcutSave);
filterInput.addEventListener("input", renderShortcutList);
[fKey, fName, fUrl, fCategory].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") handleShortcutSave(); });
});

document.getElementById("btn-reset-shortcuts").addEventListener("click", () => {
  if (!window.confirm("Reset all shortcuts to factory defaults? This cannot be undone.")) return;
  resetShortcuts().then(d => { shortcuts = d; renderShortcutList(); closeShortcutForm(); showStatus("Shortcuts reset to defaults."); });
});

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 2 — SEARCH ENGINES
 * ══════════════════════════════════════════════════════════════════════════ */

const engineList      = document.getElementById("engine-list");
const engineFormCard  = document.getElementById("engine-form-card");
const engineFormTitle = document.getElementById("engine-form-title");
const efKey           = document.getElementById("ef-key");
const efName          = document.getElementById("ef-name");
const efUrl           = document.getElementById("ef-url");

function renderEngineList() {
  engineList.innerHTML = "";
  if (engines.length === 0) {
    const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "No search engines.";
    engineList.appendChild(p); return;
  }
  engines.forEach(e => engineList.appendChild(createEngineItem(e)));
}

function createEngineItem(eng) {
  const item = document.createElement("div");
  item.className = "engine-item";
  item.setAttribute("role", "listitem");

  const favWrap = document.createElement("div"); favWrap.className = "item-favicon-wrap";
  const fav = document.createElement("img"); fav.className = "item-favicon"; fav.src = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(eng.domain)}`; fav.alt = ""; fav.width = 20; fav.height = 20;
  const favFb = document.createElement("span"); favFb.className = "item-favicon-fallback"; favFb.textContent = eng.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display="none"; favFb.style.display="flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";  keyEl.textContent = eng.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name"; nameEl.textContent = eng.name;

  // Enabled toggle
  const toggleWrap = document.createElement("label"); toggleWrap.className = "toggle-wrap item-toggle"; toggleWrap.title = eng.enabled ? "Disable" : "Enable";
  const toggleInput = document.createElement("input"); toggleInput.type = "checkbox"; toggleInput.className = "toggle-input"; toggleInput.checked = eng.enabled;
  const toggleTrack = document.createElement("span"); toggleTrack.className = "toggle-track";
  toggleInput.addEventListener("change", () => {
    eng.enabled = toggleInput.checked;
    saveSearchEngines(engines).then(() => showStatus(eng.enabled ? `${eng.name} enabled.` : `${eng.name} disabled.`));
  });
  toggleWrap.append(toggleInput, toggleTrack);

  const acts = document.createElement("div"); acts.className = "item-actions";
  const editBtn = makeIconBtn(editSvg, "Edit", "Edit " + eng.name);
  editBtn.addEventListener("click", () => openEngineEditForm(eng));
  const delBtn  = makeIconBtn(deleteSvg, "Delete", "Delete " + eng.name, true);
  delBtn.addEventListener("click", () => confirmEngineDelete(eng, acts));
  acts.append(editBtn, delBtn);

  item.append(favWrap, keyEl, nameEl, toggleWrap, acts);
  return item;
}

function confirmEngineDelete(eng, actsEl) {
  actsEl.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "confirm-wrap";
  const lbl  = document.createElement("span"); lbl.className = "confirm-label"; lbl.textContent = "Delete?";
  const yes  = document.createElement("button"); yes.className = "btn-confirm-yes"; yes.textContent = "Yes";
  yes.addEventListener("click", () => {
    engines = engines.filter(e => e.key !== eng.key);
    saveSearchEngines(engines).then(() => { renderEngineList(); showStatus(`"${eng.name}" removed.`); if (editingEngKey === eng.key) closeEngineForm(); });
  });
  const no = document.createElement("button"); no.className = "btn-confirm-no"; no.textContent = "No";
  no.addEventListener("click", () => renderEngineList());
  wrap.append(lbl, yes, no);
  actsEl.appendChild(wrap);
}

function openEngineAddForm() {
  editingEngKey = null;
  engineFormTitle.textContent = "Add search engine";
  efKey.value = ""; efName.value = ""; efUrl.value = "";
  setFieldError("engine-form-error", "");
  engineFormCard.hidden = false;
  efKey.focus();
  engineFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openEngineEditForm(eng) {
  editingEngKey = eng.key;
  engineFormTitle.textContent = "Edit search engine";
  efKey.value = eng.key; efName.value = eng.name; efUrl.value = eng.searchUrl;
  setFieldError("engine-form-error", "");
  engineFormCard.hidden = false;
  efKey.focus();
  engineFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEngineForm() {
  engineFormCard.hidden = true; editingEngKey = null; setFieldError("engine-form-error", "");
}

function handleEngineSave() {
  const key     = efKey.value.trim();
  const name    = efName.value.trim();
  const rawUrl  = efUrl.value.trim();

  if (!key)  { setFieldError("engine-form-error", "Prefix key is required."); return; }
  if (!name) { setFieldError("engine-form-error", "Name is required."); return; }
  if (!rawUrl.includes("{query}")) { setFieldError("engine-form-error", 'Search URL must contain {query} as a placeholder.'); return; }

  const dup = engines.find(e => e.key === key && e.key !== editingEngKey);
  if (dup) { setFieldError("engine-form-error", `Key "${key}" is already used by "${dup.name}".`); return; }

  setFieldError("engine-form-error", "");
  let domain = "google.com";
  try { domain = new URL(rawUrl.replace("{query}", "test")).hostname.replace(/^www\./, ""); } catch (_) {}

  const eng = { key, name, searchUrl: rawUrl, domain, enabled: true };
  if (editingEngKey !== null) {
    const i = engines.findIndex(e => e.key === editingEngKey);
    if (i !== -1) engines[i] = eng;
  } else {
    engines.push(eng);
  }
  saveSearchEngines(engines).then(() => { renderEngineList(); closeEngineForm(); showStatus(editingEngKey !== null ? "Engine updated." : "Engine added."); });
}

document.getElementById("btn-add-engine").addEventListener("click", openEngineAddForm);
document.getElementById("btn-engine-save").addEventListener("click", handleEngineSave);
document.getElementById("btn-engine-cancel").addEventListener("click", closeEngineForm);
[efKey, efName, efUrl].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") handleEngineSave(); });
});
document.getElementById("btn-reset-engines").addEventListener("click", () => {
  if (!window.confirm("Reset search engines to factory defaults?")) return;
  resetSearchEngines().then(d => { engines = d; renderEngineList(); closeEngineForm(); showStatus("Search engines reset."); });
});

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 3 — APPEARANCE
 * ══════════════════════════════════════════════════════════════════════════ */

function renderAppearance() {
  // Theme swatches
  document.querySelectorAll(".theme-swatch").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === appearance.theme);
    btn.addEventListener("click", () => {
      appearance.theme = btn.dataset.theme;
      applyTheme(appearance.theme, appearance.accent);
      renderAppearance();
      saveAppearance(appearance);
    });
  });

  // Accent swatches
  document.querySelectorAll(".accent-swatch").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.accent === appearance.accent);
    btn.addEventListener("click", () => {
      appearance.accent = btn.dataset.accent;
      applyTheme(appearance.theme, appearance.accent);
      renderAppearance();
      saveAppearance(appearance);
    });
  });

  // Toggles
  const setToggle = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!appearance[key];
    el.onchange = () => {
      appearance[key] = el.checked;
      saveAppearance(appearance).then(() => showStatus("Settings saved."));
    };
  };
  setToggle("toggle-weather",     "showWeather");
  setToggle("toggle-hints",       "showHints");
  setToggle("toggle-mostvisited", "showMostVisited");
}

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 4 — BOOKMARKS
 * ══════════════════════════════════════════════════════════════════════════ */

async function renderBookmarksTab() {
  const toggleEl  = document.getElementById("toggle-bookmarks");
  const statusEl  = document.getElementById("bookmark-permission-status");

  toggleEl.checked = !!appearance.showBookmarks;

  const hasPerm = await hasBookmarkPermission();

  if (appearance.showBookmarks && !hasPerm) {
    // Was enabled but permission was revoked
    appearance.showBookmarks = false;
    toggleEl.checked = false;
    await saveAppearance(appearance);
  }

  function updatePermStatus() {
    if (!appearance.showBookmarks) { statusEl.hidden = true; return; }
    statusEl.hidden    = false;
    statusEl.className = `permission-status permission-status--ok`;
    statusEl.textContent = "Permission granted. Bookmarks are included in search results.";
  }
  updatePermStatus();

  toggleEl.onchange = async () => {
    if (toggleEl.checked) {
      const already = await hasBookmarkPermission();
      if (!already) {
        const granted = await requestBookmarkPermission();
        if (!granted) {
          toggleEl.checked = false;
          statusEl.hidden    = false;
          statusEl.className = "permission-status permission-status--error";
          statusEl.textContent = "Permission denied. Enable it manually in Chrome extension settings.";
          return;
        }
      }
      appearance.showBookmarks = true;
    } else {
      appearance.showBookmarks = false;
    }
    await saveAppearance(appearance);
    updatePermStatus();
    showStatus("Settings saved.");
  };
}

document.getElementById("btn-reset-usage").addEventListener("click", () => {
  if (!window.confirm("Reset all usage data? The top-6 tiles will revert to default order.")) return;
  resetUsageData().then(() => showStatus("Usage data reset."));
});

/* ─── Icon SVG helpers ───────────────────────────────────────────────────── */

const editSvg   = `<svg viewBox="0 0 16 16" fill="none"><path d="M2 14l1.5-4.5 8-8 3 3-8 8L2 14z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const deleteSvg = `<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function makeIconBtn(svg, title, ariaLabel, isDanger = false) {
  const btn = document.createElement("button");
  btn.className = isDanger ? "btn-icon btn-icon--danger" : "btn-icon";
  btn.title = title;
  btn.setAttribute("aria-label", ariaLabel);
  btn.innerHTML = svg;
  return btn;
}

/* ─── Init ───────────────────────────────────────────────────────────────── */

Promise.all([
  getShortcuts(),
  getSearchEngines(),
  getAppearance(),
]).then(([sc, eng, ap]) => {
  shortcuts  = sc;
  engines    = eng;
  appearance = ap;

  applyTheme(ap.theme, ap.accent);

  renderShortcutList();
  renderEngineList();
  renderAppearance();
  renderBookmarksTab();
});
