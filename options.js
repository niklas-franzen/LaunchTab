/* ─── options.js ─────────────────────────────────────────────────────────────
 *
 * Handles all settings tabs: Shortcuts · Search · Appearance · Bookmarks ·
 * Data · About.
 *
 * Requires: themes.js · defaults.js · storage.js · search-engines.js ·
 *           bookmarks.js
 * ─────────────────────────────────────────────────────────────────────────── */

/* ─── State ──────────────────────────────────────────────────────────────── */

let shortcuts   = [];
let engines     = [];
let appearance  = {};

// Keyboard navigation state
let focusedItemIdx   = -1;   // highlighted index in shortcut list
let focusedEngineIdx = -1;   // highlighted index in engine list

// Form modes
let editingKey    = null;   // null = add; string = editing this key
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

/** Normalise a URL for duplicate comparison (strips trailing slash, lower-cases host). */
function normalizeUrlForCompare(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

/* ─── Tab Switching ──────────────────────────────────────────────────────── */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    focusedItemIdx = focusedEngineIdx = -1;   // reset keyboard nav when switching tabs
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

/* ─── Back to LaunchTab ──────────────────────────────────────────────────── */

document.getElementById("btn-back").addEventListener("click", () => {
  window.location.href = chrome.runtime.getURL("app.html?x");
});

/* ─── About: Privacy link ────────────────────────────────────────────────── */

const privacyLink = document.getElementById("link-privacy");
if (privacyLink) {
  privacyLink.href = chrome.runtime.getURL("PRIVACY.md");
  privacyLink.target = "_blank";
}

/* ══════════════════════════════════════════════════════════════════════════
 *  GLOBAL KEYBOARD HANDLER
 *  - Cmd/Ctrl+S  → save the active form (never fires while typing in inputs)
 *  - ArrowUp/Down → navigate the shortcut list (when no input is focused)
 *  - A            → open Add-Shortcut form (when no input focused)
 * ══════════════════════════════════════════════════════════════════════════ */

document.addEventListener("keydown", (e) => {
  const inputFocused = ["INPUT", "TEXTAREA", "SELECT"]
    .includes(document.activeElement.tagName);

  // Cmd/Ctrl+S — save active form regardless of input focus
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    const formCard       = document.getElementById("form-card");
    const engineFormCard = document.getElementById("engine-form-card");
    if (formCard && !formCard.hidden) {
      e.preventDefault(); handleShortcutSave(); return;
    }
    if (engineFormCard && !engineFormCard.hidden) {
      e.preventDefault(); handleEngineSave(); return;
    }
  }

  if (inputFocused) return;  // don't steal keys while the user is typing

  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;

  // ── Shared navigation helper
  function navigateList(items, idxRef, setIdx, openEditFn, addFn) {
    const len = items.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx(Math.min(idxRef + 1, len - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx(Math.max(idxRef - 1, 0));
    } else if (e.key === "Enter" && idxRef >= 0) {
      e.preventDefault();
      const key = items[idxRef]?.dataset.key;
      const item = (shortcuts.concat(engines)).find(s => s.key === key);
      if (item) openEditFn(item);
    } else if ((e.key === "Delete" || e.key === "Backspace") && idxRef >= 0) {
      // Delete/Backspace: trigger inline confirm on the focused item
      e.preventDefault();
      const el    = items[idxRef];
      const key   = el?.dataset.key;
      const acts  = el?.querySelector(".item-actions");
      if (key && acts) {
        const sc = shortcuts.find(s => s.key === key);
        const eng = engines.find(s => s.key === key);
        if (sc)  confirmShortcutDelete(sc, acts);
        if (eng) confirmEngineDelete(eng, acts);
      }
    } else if (e.key === "Escape" && idxRef >= 0) {
      e.preventDefault();
      setIdx(-1);
    } else if (e.key === "a" || e.key === "A") {
      // preventDefault stops the browser from firing keypress after keydown,
      // so the letter 'a' is never inserted into the form field that gets focus.
      e.preventDefault();
      e.stopPropagation();
      addFn();
    }
  }

  // ── Shortcuts tab
  if (activeTab === "shortcuts") {
    const formCard = document.getElementById("form-card");
    if (formCard && !formCard.hidden) {
      // Escape closes an open shortcut form
      if (e.key === "Escape") { e.preventDefault(); closeShortcutForm(); }
    } else if (formCard && formCard.hidden) {
      const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
      navigateList(
        items,
        focusedItemIdx,
        (i) => { focusedItemIdx = i; updateListFocus(items, focusedItemIdx); },
        openShortcutEditForm,
        openShortcutAddForm
      );
    }
  }

  // ── Search engines tab
  if (activeTab === "engines") {
    const engineFormCard = document.getElementById("engine-form-card");
    if (engineFormCard && !engineFormCard.hidden) {
      // Escape closes an open engine form
      if (e.key === "Escape") { e.preventDefault(); closeEngineForm(); }
    } else if (engineFormCard && engineFormCard.hidden) {
      const items = engineList.querySelectorAll(".engine-item[data-key]");
      navigateList(
        items,
        focusedEngineIdx,
        (i) => { focusedEngineIdx = i; updateListFocus(items, focusedEngineIdx); },
        openEngineEditForm,
        openEngineAddForm
      );
    }
  }
});

function updateListFocus(items, activeIdx) {
  items.forEach((item, i) => {
    item.classList.toggle("keyboard-focused", i === activeIdx);
  });
  if (activeIdx >= 0) {
    items[activeIdx].scrollIntoView({ block: "nearest" });
  }
}

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

function renderShortcutList() {
  shortcutList.innerHTML = "";
  focusedItemIdx = -1;
  const q = filterInput.value.toLowerCase().trim();
  const visible = q
    ? shortcuts.filter(s =>
        s.key.toLowerCase().includes(q)  ||
        s.name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        getDomain(s.url).toLowerCase().includes(q))
    : shortcuts;

  if (visible.length === 0) {
    const p = document.createElement("p");
    p.className   = "empty-state";
    p.textContent = shortcuts.length === 0
      ? "No shortcuts yet. Click \"+ Add shortcut\" or press A to add one."
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
  item.dataset.key = sc.key;   // needed for keyboard navigation

  const favWrap = document.createElement("div");
  favWrap.className = "item-favicon-wrap";
  const fav   = document.createElement("img");
  fav.className = "item-favicon"; fav.src = createFaviconUrl(sc.url);
  fav.alt = ""; fav.width = 20; fav.height = 20; fav.loading = "lazy";
  const favFb = document.createElement("span");
  favFb.className = "item-favicon-fallback";
  favFb.textContent = sc.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display = "none"; favFb.style.display = "flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";    keyEl.textContent = sc.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name";   nameEl.textContent = sc.name;
  const domEl  = document.createElement("span"); domEl.className  = "item-domain"; domEl.textContent = getDomain(sc.url);
  const catEl  = document.createElement("span"); catEl.className  = "item-category"; catEl.textContent = sc.category || "—";

  const acts = document.createElement("div"); acts.className = "item-actions";
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
    deleteShortcut(sc.key).then(u => {
      shortcuts = u;
      renderShortcutList();
      showStatus(`"${sc.name}" deleted.`);
      if (editingKey === sc.key) closeShortcutForm();
    });
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

  if (!key)    { setFieldError("form-error", "Shortcut key is required."); fKey.focus();  return; }
  if (!name)   { setFieldError("form-error", "Name is required."); fName.focus(); return; }
  if (!rawUrl) { setFieldError("form-error", "URL is required."); fUrl.focus();  return; }

  const url = normalizeUrl(rawUrl);
  try { new URL(url); } catch { setFieldError("form-error", "Enter a valid URL."); fUrl.focus(); return; }

  // Key uniqueness check
  const keyDup = shortcuts.find(s => s.key === key && s.key !== editingKey);
  if (keyDup) {
    setFieldError("form-error", `Key "${key}" is already used by "${keyDup.name}".`);
    fKey.focus(); return;
  }

  // URL duplicate check — warn but allow user to proceed
  const normNew = normalizeUrlForCompare(url);
  const urlDup  = shortcuts.find(s => s.key !== editingKey && normalizeUrlForCompare(s.url) === normNew);
  if (urlDup) {
    const confirmed = window.confirm(
      `This URL already belongs to "${urlDup.name}" (key: ${urlDup.key}).\n\nAdd another shortcut for the same URL?`
    );
    if (!confirmed) { fUrl.focus(); return; }
  }

  setFieldError("form-error", "");
  const sc = { key, name, url, category: category || "Other" };
  const p  = editingKey !== null ? updateShortcut(editingKey, sc) : addShortcut(sc);
  p.then(u => {
    shortcuts = u;
    renderShortcutList();
    closeShortcutForm();
    showStatus(editingKey !== null ? "Shortcut updated." : "Shortcut added.");
  });
}

document.getElementById("btn-add").addEventListener("click", openShortcutAddForm);
document.getElementById("btn-cancel").addEventListener("click", closeShortcutForm);
document.getElementById("btn-save").addEventListener("click", handleShortcutSave);
filterInput.addEventListener("input", renderShortcutList);

// Enter / Escape inside the filter field jump focus into the list.
// These keys are swallowed by `if (inputFocused) return` in the global
// handler, so we handle them here with a dedicated listener.
filterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // stopPropagation prevents the event from reaching the global handler after
    // blur() moves focus away, which would otherwise immediately open Edit.
    e.preventDefault();
    e.stopPropagation();
    const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
    if (items.length > 0) {
      focusedItemIdx = 0;
      updateListFocus(items, focusedItemIdx);
      filterInput.blur();
    }
  } else if (e.key === "Escape") {
    // stopPropagation prevents the global handler from deselecting the item we
    // are about to select after clearing the filter.
    e.preventDefault();
    e.stopPropagation();
    filterInput.value = "";
    renderShortcutList();   // resets focusedItemIdx = -1 and re-renders all items
    const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
    if (items.length > 0) {
      focusedItemIdx = 0;
      updateListFocus(items, focusedItemIdx);
    }
    filterInput.blur();
  }
});
[fKey, fName, fUrl, fCategory].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") { handleShortcutSave(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeShortcutForm(); }
  });
});

document.getElementById("btn-reset-shortcuts").addEventListener("click", () => {
  if (!window.confirm("Reset all shortcuts to factory defaults? This cannot be undone.")) return;
  resetShortcuts().then(d => { shortcuts = d; renderShortcutList(); closeShortcutForm(); showStatus("Shortcuts reset."); });
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
  focusedEngineIdx = -1;
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
  item.dataset.key = eng.key;   // needed for keyboard navigation

  const favWrap = document.createElement("div"); favWrap.className = "item-favicon-wrap";
  const fav = document.createElement("img");
  fav.className = "item-favicon";
  fav.src = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(eng.domain)}`;
  fav.alt = ""; fav.width = 20; fav.height = 20;
  const favFb = document.createElement("span"); favFb.className = "item-favicon-fallback"; favFb.textContent = eng.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display="none"; favFb.style.display="flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";  keyEl.textContent = eng.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name"; nameEl.textContent = eng.name;

  const toggleWrap  = document.createElement("label"); toggleWrap.className = "toggle-wrap item-toggle";
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
  const key    = efKey.value.trim();
  const name   = efName.value.trim();
  const rawUrl = efUrl.value.trim();

  if (!key)  { setFieldError("engine-form-error", "Prefix key is required."); return; }
  if (!name) { setFieldError("engine-form-error", "Name is required."); return; }
  if (!rawUrl.includes("{query}")) {
    setFieldError("engine-form-error", "Search URL must contain {query} as a placeholder.");
    return;
  }

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
  saveSearchEngines(engines).then(() => {
    renderEngineList();
    closeEngineForm();
    showStatus(editingEngKey !== null ? "Engine updated." : "Engine added.");
  });
}

document.getElementById("btn-add-engine").addEventListener("click", openEngineAddForm);
document.getElementById("btn-engine-save").addEventListener("click", handleEngineSave);
document.getElementById("btn-engine-cancel").addEventListener("click", closeEngineForm);
[efKey, efName, efUrl].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") { handleEngineSave(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeEngineForm(); }
  });
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
    // Attach listener only once (idempotent via replacing)
    btn.onclick = () => {
      appearance.theme = btn.dataset.theme;
      applyTheme(appearance.theme, appearance.accent);
      renderAppearance();
      saveAppearance(appearance);
    };
  });

  // Accent swatches
  document.querySelectorAll(".accent-swatch").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.accent === appearance.accent);
    btn.onclick = () => {
      appearance.accent = btn.dataset.accent;
      applyTheme(appearance.theme, appearance.accent);
      renderAppearance();
      saveAppearance(appearance);
    };
  });

  // Font size buttons
  document.querySelectorAll(".font-size-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.size === (appearance.fontSize || "medium"));
    btn.onclick = () => {
      appearance.fontSize = btn.dataset.size;
      applyFontSize(appearance.fontSize);
      renderAppearance();
      saveAppearance(appearance).then(() => showStatus("Font size saved."));
    };
  });

  // Temperature unit buttons
  document.querySelectorAll(".unit-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.unit === (appearance.tempUnit || "C"));
    btn.onclick = () => {
      appearance.tempUnit = btn.dataset.unit;
      renderAppearance();
      saveAppearance(appearance).then(() => showStatus("Temperature unit saved."));
    };
  });

  // All toggles
  const setToggle = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!appearance[key];
    el.onchange = () => {
      appearance[key] = el.checked;
      saveAppearance(appearance).then(() => showStatus("Setting saved."));
    };
  };
  setToggle("toggle-time",        "showTime");
  setToggle("toggle-date",        "showDate");
  setToggle("toggle-weather",     "showWeather");
  setToggle("toggle-hints",       "showHints");
  setToggle("toggle-mostvisited", "showMostVisited");
  setToggle("toggle-visitcounts", "showVisitCounts");
  setToggle("toggle-settingsbtn", "showSettingsBtn");
}

// btn-restore-theme removed from HTML — full reset is now btn-reset-appearance
// in the Appearance tab (see below in TAB 5 — DATA section)

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 4 — BOOKMARKS
 * ══════════════════════════════════════════════════════════════════════════ */

async function renderBookmarksTab() {
  const toggleEl = document.getElementById("toggle-bookmarks");
  const statusEl = document.getElementById("bookmark-permission-status");

  toggleEl.checked = !!appearance.showBookmarks;

  const hasPerm = await hasBookmarkPermission();

  // If enabled but permission was revoked, auto-disable
  if (appearance.showBookmarks && !hasPerm) {
    appearance.showBookmarks = false;
    toggleEl.checked = false;
    await saveAppearance(appearance);
  }

  function updatePermStatus() {
    if (!appearance.showBookmarks) { statusEl.hidden = true; return; }
    statusEl.hidden    = false;
    statusEl.className = "permission-status permission-status--ok";
    statusEl.textContent = "Permission granted — bookmarks appear in search results.";
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
          statusEl.textContent = "Permission denied — enable it in chrome://extensions → LaunchTab → Details.";
          return;
        }
      }
      appearance.showBookmarks = true;
    } else {
      appearance.showBookmarks = false;
    }
    await saveAppearance(appearance);
    updatePermStatus();
    showStatus("Setting saved.");
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 5 — DATA  (Import / Export / Reset)
 * ══════════════════════════════════════════════════════════════════════════ */

document.getElementById("btn-export").addEventListener("click", () => {
  const data = {
    version:       "1",
    exported:      new Date().toISOString(),
    shortcuts,
    searchEngines: engines,
    appearance,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `launchtab-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Data exported.");
});

const importFileInput = document.getElementById("import-file-input");

document.getElementById("btn-import").addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;
  importFileInput.value = "";   // reset so the same file can be re-imported

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    showStatus("Import failed — file is not valid JSON.", "error");
    return;
  }

  await processImport(data);
});

async function processImport(data) {
  if (!data || typeof data !== "object") {
    showStatus("Import failed — unexpected format.", "error"); return;
  }

  const errors = [];

  if (data.shortcuts !== undefined) {
    if (!Array.isArray(data.shortcuts)) {
      errors.push("shortcuts must be an array");
    } else {
      data.shortcuts.forEach((s, i) => {
        if (!s.key || !s.name || !s.url) errors.push(`shortcuts[${i}]: missing key, name, or url`);
      });
    }
  }

  if (data.searchEngines !== undefined) {
    if (!Array.isArray(data.searchEngines)) {
      errors.push("searchEngines must be an array");
    } else {
      data.searchEngines.forEach((e, i) => {
        if (!e.searchUrl?.includes("{query}")) {
          errors.push(`searchEngines[${i}]: searchUrl must contain {query}`);
        }
      });
    }
  }

  if (errors.length > 0) {
    showStatus("Import failed — " + errors.join("; "), "error"); return;
  }

  const doReplace = window.confirm(
    "Replace all existing data with the imported data?\n\nOK = Replace everything\nCancel = Merge (imported items with duplicate keys are skipped)"
  );

  if (doReplace) {
    if (data.shortcuts) {
      shortcuts = data.shortcuts;
      await saveShortcuts(shortcuts);
    }
    if (data.searchEngines) {
      engines = data.searchEngines;
      await saveSearchEngines(engines);
    }
    if (data.appearance) {
      appearance = { ...appearance, ...data.appearance };
      await saveAppearance(appearance);
      applyTheme(appearance.theme, appearance.accent);
      applyFontSize(appearance.fontSize);
    }
  } else {
    // Merge — skip duplicates
    if (data.shortcuts) {
      const existingKeys = new Set(shortcuts.map(s => s.key));
      const newItems = data.shortcuts.filter(s => !existingKeys.has(s.key));
      shortcuts = [...shortcuts, ...newItems];
      await saveShortcuts(shortcuts);
    }
    if (data.searchEngines) {
      const existingKeys = new Set(engines.map(e => e.key));
      const newItems = data.searchEngines.filter(e => !existingKeys.has(e.key));
      engines = [...engines, ...newItems];
      await saveSearchEngines(engines);
    }
  }

  renderShortcutList();
  renderEngineList();
  renderAppearance();
  showStatus("Import complete.");
}

document.getElementById("btn-reset-usage").addEventListener("click", () => {
  if (!window.confirm("Reset all usage data? The most-visited tile order will revert to default.")) return;
  resetUsageData().then(() => showStatus("Usage data reset."));
});

document.getElementById("btn-reset-appearance").addEventListener("click", () => {
  if (!window.confirm("Reset all appearance settings to defaults?")) return;
  const defaults = {
    theme: "graphite", accent: "blue", fontSize: "medium",
    showTime: true, showDate: true, showWeather: false, tempUnit: "C",
    showHints: true, showMostVisited: true, showVisitCounts: false, showSettingsBtn: true,
  };
  appearance = { ...appearance, ...defaults };
  applyTheme(appearance.theme, appearance.accent);
  applyFontSize(appearance.fontSize);
  saveAppearance(appearance).then(() => {
    renderAppearance();
    showStatus("Appearance settings reset.");
  });
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
  applyFontSize(ap.fontSize || "medium");

  renderShortcutList();
  renderEngineList();
  renderAppearance();
  renderBookmarksTab();
});
