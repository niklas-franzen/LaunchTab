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
let focusedItemIdx   = -1;
let focusedEngineIdx = -1;

// Form modes
let editingKey    = null;   // null = add mode; string = editing this key
let editingEngKey = null;
let _preFormFocusKey    = null;  // shortcut key focused before form opened
let _preEngFormFocusKey = null;  // engine key focused before engine form opened

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

/* ─── Status / Undo Toast ────────────────────────────────────────────────── */

let _undoTimer = null;

function showStatus(msg, type = "ok") {
  const el = document.getElementById("status-banner");
  el.textContent = msg;
  el.className   = `status-banner status-banner--${type}`;
  el.hidden      = false;
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

function showStatusWithUndo(msg, onUndo) {
  clearTimeout(_undoTimer);
  const el = document.getElementById("status-banner");
  el.className = "status-banner status-banner--ok";
  el.hidden    = false;
  el.innerHTML = "";

  const text = document.createElement("span");
  text.className   = "status-text";
  text.textContent = msg;
  el.appendChild(text);

  const undoBtn = document.createElement("button");
  undoBtn.className   = "status-undo-btn";
  undoBtn.textContent = "Undo";
  undoBtn.addEventListener("click", () => {
    clearTimeout(_undoTimer);
    el.hidden    = true;
    el.innerHTML = "";
    onUndo();
  });
  el.appendChild(undoBtn);

  _undoTimer = setTimeout(() => {
    el.hidden    = true;
    el.innerHTML = "";
  }, 5000);
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.hidden      = !msg;
}

/* ─── Delete Confirm Modal ───────────────────────────────────────────────────
 *
 * Small floating modal — no overlapping with list rows.
 * Usage: showDeleteConfirm(name, onConfirm)
 *   - Escape / Cancel → closes without deleting
 *   - Delete button   → calls onConfirm(), then closes
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const _delModal       = document.getElementById("delete-confirm-modal");
const _delModalDesc   = document.getElementById("dcm-desc");
const _delModalCancel = document.getElementById("dcm-cancel");
const _delModalDelete = document.getElementById("dcm-delete");
let   _delOnConfirm   = null;
let   _delReturnFocus = null;   // element to re-focus after modal closes

function showDeleteConfirm(name, onConfirm) {
  _delOnConfirm   = onConfirm;
  _delReturnFocus = document.activeElement;
  _delModalDesc.textContent = `"${name}" will be permanently removed.`;
  _delModal.hidden = false;
  _delModalDelete.focus();
}

function hideDeleteConfirm() {
  _delModal.hidden = true;
  _delOnConfirm    = null;
  if (_delReturnFocus && typeof _delReturnFocus.focus === "function") {
    _delReturnFocus.focus();
  }
}

_delModalCancel.addEventListener("click", hideDeleteConfirm);

_delModalDelete.addEventListener("click", () => {
  const fn = _delOnConfirm;
  hideDeleteConfirm();
  if (fn) fn();
});

_delModal.addEventListener("keydown", e => {
  if (e.key === "Escape") { e.preventDefault(); hideDeleteConfirm(); }
  // Tab cycles only between Cancel and Delete
  if (e.key === "Tab") {
    e.preventDefault();
    if (document.activeElement === _delModalDelete) _delModalCancel.focus();
    else _delModalDelete.focus();
  }
});

/* ─── Tab Switching ──────────────────────────────────────────────────────── */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    focusedItemIdx = focusedEngineIdx = -1;
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
  privacyLink.href   = chrome.runtime.getURL("PRIVACY.md");
  privacyLink.target = "_blank";
}

/* ══════════════════════════════════════════════════════════════════════════
 *  GLOBAL KEYBOARD HANDLER
 * ══════════════════════════════════════════════════════════════════════════ */

document.addEventListener("keydown", (e) => {
  // Let the delete-confirm modal handle its own keyboard events
  if (_delModal && !_delModal.hidden) return;

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

  if (inputFocused) return;

  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;

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
      const key  = items[idxRef]?.dataset.key;
      const item = shortcuts.concat(engines).find(s => s.key === key);
      if (item) openEditFn(item);
    } else if ((e.key === "Delete" || e.key === "Backspace") && idxRef >= 0) {
      e.preventDefault();
      const el  = items[idxRef];
      const key = el?.dataset.key;
      if (key) {
        const sc  = shortcuts.find(s => s.key === key);
        const eng = engines.find(s => s.key === key);
        if (sc)  doDeleteShortcut(sc);
        if (eng) doDeleteEngine(eng);
      }
    } else if (e.key === "Escape" && idxRef >= 0) {
      e.preventDefault();
      setIdx(-1);
    } else if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      e.stopPropagation();
      addFn();
    }
  }

  if (activeTab === "shortcuts") {
    const formCard = document.getElementById("form-card");
    if (formCard && !formCard.hidden) {
      if (e.key === "Escape") { e.preventDefault(); closeShortcutForm(); }
    } else if (formCard && formCard.hidden) {
      const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
      navigateList(
        items, focusedItemIdx,
        (i) => { focusedItemIdx = i; updateListFocus(items, focusedItemIdx); },
        openShortcutEditForm, openShortcutAddForm
      );
    }
  }

  if (activeTab === "engines") {
    const engineFormCard = document.getElementById("engine-form-card");
    if (engineFormCard && !engineFormCard.hidden) {
      if (e.key === "Escape") { e.preventDefault(); closeEngineForm(); }
    } else if (engineFormCard && engineFormCard.hidden) {
      const items = engineList.querySelectorAll(".engine-item[data-key]");
      navigateList(
        items, focusedEngineIdx,
        (i) => { focusedEngineIdx = i; updateListFocus(items, focusedEngineIdx); },
        openEngineEditForm, openEngineAddForm
      );
    }
  }
});

function updateListFocus(items, activeIdx) {
  items.forEach((item, i) => {
    item.classList.toggle("keyboard-focused", i === activeIdx);
  });
  if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block: "nearest" });
}

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 1 — SHORTCUTS
 * ══════════════════════════════════════════════════════════════════════════ */

const shortcutList = document.getElementById("shortcut-list");
const filterInput  = document.getElementById("filter-input");
const formCard     = document.getElementById("form-card");
const formTitle    = document.getElementById("form-title");
const fKey         = document.getElementById("f-key");
const fName        = document.getElementById("f-name");
const fUrl         = document.getElementById("f-url");
const fCategory    = document.getElementById("f-category");

function renderShortcutList(restoreFocusKey) {
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

  // Restore focus to previously selected/edited item
  if (restoreFocusKey) {
    const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
    const idx   = Array.from(items).findIndex(el => el.dataset.key === restoreFocusKey);
    if (idx >= 0) {
      focusedItemIdx = idx;
      updateListFocus(items, focusedItemIdx);
    }
  }
}

function createShortcutItem(sc) {
  const item = document.createElement("div");
  item.className = "shortcut-item";
  item.setAttribute("role", "listitem");
  item.dataset.key = sc.key;

  const favWrap = document.createElement("div");
  favWrap.className = "item-favicon-wrap";
  const fav   = document.createElement("img");
  fav.className = "item-favicon"; fav.src = createFaviconUrl(sc.url);
  fav.alt = ""; fav.width = 20; fav.height = 20; fav.loading = "lazy";
  const favFb = document.createElement("span");
  favFb.className   = "item-favicon-fallback";
  favFb.textContent = sc.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display = "none"; favFb.style.display = "flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";    keyEl.textContent = sc.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name";   nameEl.textContent = sc.name;
  const domEl  = document.createElement("span"); domEl.className  = "item-domain"; domEl.textContent = getDomain(sc.url);
  const catEl  = document.createElement("span"); catEl.className  = "item-category"; catEl.textContent = sc.category || "—";

  const acts    = document.createElement("div"); acts.className = "item-actions";
  const editBtn = makeIconBtn(editSvg, "Edit", "Edit " + sc.name);
  editBtn.addEventListener("click", () => openShortcutEditForm(sc));
  const delBtn  = makeIconBtn(deleteSvg, "Delete", "Delete " + sc.name, true);
  delBtn.addEventListener("click", () => doDeleteShortcut(sc));
  acts.append(editBtn, delBtn);

  item.append(favWrap, keyEl, nameEl, domEl, catEl, acts);
  return item;
}

/* ─── Delete with confirm modal ──────────────────────────────────────────── */

function doDeleteShortcut(sc) {
  // Determine which item to focus after deletion (sibling in the current list)
  const currentItems = Array.from(shortcutList.querySelectorAll(".shortcut-item[data-key]"));
  const idx = currentItems.findIndex(el => el.dataset.key === sc.key);
  const nextKey = currentItems[idx + 1]?.dataset.key
    || currentItems[idx - 1]?.dataset.key
    || null;

  showDeleteConfirm(sc.name, () => {
    deleteShortcut(sc.key).then(u => {
      shortcuts = u;
      renderShortcutList(nextKey);
      if (editingKey === sc.key) closeShortcutForm();
      showStatus(`"${sc.name}" deleted.`);
    });
  });
}

function doDeleteEngine(eng) {
  const currentItems = Array.from(engineList.querySelectorAll(".engine-item[data-key]"));
  const idx = currentItems.findIndex(el => el.dataset.key === eng.key);
  const nextKey = currentItems[idx + 1]?.dataset.key
    || currentItems[idx - 1]?.dataset.key
    || null;

  showDeleteConfirm(eng.name, () => {
    engines = engines.filter(e => e.key !== eng.key);
    saveSearchEngines(engines).then(() => {
      renderEngineList(nextKey);
      if (editingEngKey === eng.key) closeEngineForm();
      showStatus(`"${eng.name}" removed.`);
    });
  });
}

/* ─── Shortcut form ──────────────────────────────────────────────────────── */

function openShortcutAddForm() {
  editingKey = null;
  _preFormFocusKey = focusedItemIdx >= 0
    ? shortcutList.querySelectorAll(".shortcut-item[data-key]")[focusedItemIdx]?.dataset.key ?? null
    : null;
  formTitle.textContent = "Add shortcut";
  fKey.value = ""; fName.value = ""; fUrl.value = ""; fCategory.value = "";
  setFieldError("form-error", "");
  hideDupDialogs();
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openShortcutEditForm(sc) {
  editingKey = sc.key;
  _preFormFocusKey = sc.key;
  formTitle.textContent = "Edit shortcut";
  fKey.value = sc.key; fName.value = sc.name; fUrl.value = sc.url; fCategory.value = sc.category || "";
  setFieldError("form-error", "");
  hideDupDialogs();
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeShortcutForm() {
  formCard.hidden = true;
  editingKey      = null;
  setFieldError("form-error", "");
  hideDupDialogs();
  // Restore focus to the list item that was active before the form opened
  renderShortcutList(_preFormFocusKey);
  _preFormFocusKey = null;
}

/* ─── Inline duplicate dialogs ───────────────────────────────────────────── */

function hideDupDialogs() {
  document.getElementById("form-dup-dialog").hidden = true;
  document.getElementById("form-key-dialog").hidden = true;
}

let _pendingDupResolve = null;

function showUrlDupDialog(dupEntry, callback) {
  hideDupDialogs();
  setFieldError("form-error", "");
  const dialog   = document.getElementById("form-dup-dialog");
  const textEl   = document.getElementById("form-dup-text");
  const btnUpdate = document.getElementById("form-dup-update");
  const btnDup    = document.getElementById("form-dup-duplicate");
  const btnCancel = document.getElementById("form-dup-cancel");

  textEl.textContent =
    `This URL already belongs to "${dupEntry.name}" (key: ${dupEntry.key}). What would you like to do?`;
  dialog.hidden = false;

  // One-time click handlers — always clean up
  const cleanup = () => {
    btnUpdate.onclick = null;
    btnDup.onclick    = null;
    btnCancel.onclick = null;
    dialog.hidden     = true;
  };
  btnUpdate.onclick = () => { cleanup(); callback("update"); };
  btnDup.onclick    = () => { cleanup(); callback("duplicate"); };
  btnCancel.onclick = () => { cleanup(); callback("cancel"); fUrl.focus(); };
}

function showKeyDupDialog(dupEntry, dialogId, textId, replaceId, cancelId, callback) {
  hideDupDialogs();
  setFieldError("form-error", "");
  const dialog     = document.getElementById(dialogId);
  const textEl     = document.getElementById(textId);
  const btnReplace = document.getElementById(replaceId);
  const btnCancel  = document.getElementById(cancelId);

  textEl.textContent =
    `Key "${dupEntry.key}" is already used by "${dupEntry.name}". Replace it with the new entry?`;
  dialog.hidden = false;

  const cleanup = () => {
    btnReplace.onclick = null;
    btnCancel.onclick  = null;
    dialog.hidden      = true;
  };
  btnReplace.onclick = () => { cleanup(); callback("replace"); };
  btnCancel.onclick  = () => { cleanup(); callback("cancel"); };
}

/* ─── Save shortcut ──────────────────────────────────────────────────────── */

function handleShortcutSave() {
  hideDupDialogs();

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
    showKeyDupDialog(
      keyDup,
      "form-key-dialog", "form-key-text", "form-key-replace", "form-key-cancel",
      (choice) => {
        if (choice === "replace") commitShortcutSave(key, name, url, category, { replaceKey: keyDup.key });
      }
    );
    return;
  }

  // URL duplicate check
  const normNew = normalizeUrlForCompare(url);
  const urlDup  = shortcuts.find(s => s.key !== editingKey && normalizeUrlForCompare(s.url) === normNew);
  if (urlDup) {
    showUrlDupDialog(urlDup, (choice) => {
      if (choice === "update")    commitShortcutSave(key, name, url, category, { replaceKey: urlDup.key });
      if (choice === "duplicate") commitShortcutSave(key, name, url, category, {});
    });
    return;
  }

  commitShortcutSave(key, name, url, category, {});
}

function commitShortcutSave(key, name, url, category, { replaceKey } = {}) {
  setFieldError("form-error", "");
  const sc = { key, name, url, category: category || "Other" };

  let p;
  if (replaceKey && replaceKey !== editingKey) {
    // Replace an existing entry (key collision resolution)
    p = getShortcuts().then(list => {
      const filtered = list.filter(s => s.key !== replaceKey && s.key !== editingKey);
      filtered.push(sc);
      return saveShortcuts(filtered).then(() => filtered);
    });
  } else if (editingKey !== null) {
    p = updateShortcut(editingKey, sc);
  } else {
    p = addShortcut(sc);
  }

  p.then(u => {
    shortcuts = u;
    const savedKey = key;
    closeShortcutForm();
    // closeShortcutForm restores _preFormFocusKey; override to highlight the saved item
    renderShortcutList(savedKey);
    showStatus(editingKey !== null || replaceKey ? "Shortcut saved." : "Shortcut added.");
  }).catch(err => {
    showStatus("Save failed: " + err.message, "error");
  });
}

document.getElementById("btn-add").addEventListener("click", openShortcutAddForm);
document.getElementById("btn-cancel").addEventListener("click", closeShortcutForm);
document.getElementById("btn-save").addEventListener("click", handleShortcutSave);
filterInput.addEventListener("input", renderShortcutList);

filterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); e.stopPropagation();
    const items = shortcutList.querySelectorAll(".shortcut-item[data-key]");
    if (items.length > 0) {
      focusedItemIdx = 0;
      updateListFocus(items, focusedItemIdx);
      filterInput.blur();
    }
  } else if (e.key === "Escape") {
    e.preventDefault(); e.stopPropagation();
    filterInput.value = "";
    renderShortcutList();
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
    if (e.key === "Enter")  { handleShortcutSave(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeShortcutForm(); }
  });
});

document.getElementById("btn-reset-shortcuts").addEventListener("click", () => {
  if (!window.confirm("Reset all shortcuts to factory defaults? This cannot be undone.")) return;
  resetShortcuts().then(d => {
    shortcuts = d; renderShortcutList(); closeShortcutForm(); showStatus("Shortcuts reset.");
  });
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

function renderEngineList(restoreFocusKey) {
  engineList.innerHTML = "";
  focusedEngineIdx = -1;
  if (engines.length === 0) {
    const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "No search engines.";
    engineList.appendChild(p); return;
  }
  engines.forEach(e => engineList.appendChild(createEngineItem(e)));

  if (restoreFocusKey) {
    const items = engineList.querySelectorAll(".engine-item[data-key]");
    const idx   = Array.from(items).findIndex(el => el.dataset.key === restoreFocusKey);
    if (idx >= 0) {
      focusedEngineIdx = idx;
      updateListFocus(items, focusedEngineIdx);
    }
  }
}

function createEngineItem(eng) {
  const item = document.createElement("div");
  item.className = "engine-item";
  item.setAttribute("role", "listitem");
  item.dataset.key = eng.key;

  const favWrap = document.createElement("div"); favWrap.className = "item-favicon-wrap";
  const fav = document.createElement("img");
  fav.className = "item-favicon";
  fav.src = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(eng.domain)}`;
  fav.alt = ""; fav.width = 20; fav.height = 20;
  const favFb = document.createElement("span"); favFb.className = "item-favicon-fallback"; favFb.textContent = eng.name.charAt(0).toUpperCase();
  fav.addEventListener("error", () => { fav.style.display = "none"; favFb.style.display = "flex"; });
  favWrap.append(fav, favFb);

  const keyEl  = document.createElement("span"); keyEl.className  = "item-key";  keyEl.textContent = eng.key;
  const nameEl = document.createElement("span"); nameEl.className = "item-name"; nameEl.textContent = eng.name;

  const toggleWrap  = document.createElement("label"); toggleWrap.className = "toggle-wrap item-toggle";
  const toggleInput = document.createElement("input"); toggleInput.type = "checkbox"; toggleInput.className = "toggle-input"; toggleInput.checked = eng.enabled;
  const toggleTrack = document.createElement("span"); toggleTrack.className = "toggle-track";
  toggleInput.addEventListener("change", () => {
    eng.enabled = toggleInput.checked;
    saveSearchEngines(engines).then(() =>
      showStatus(eng.enabled ? `${eng.name} enabled.` : `${eng.name} disabled.`)
    );
  });
  toggleWrap.append(toggleInput, toggleTrack);

  const acts    = document.createElement("div"); acts.className = "item-actions";
  const editBtn = makeIconBtn(editSvg, "Edit", "Edit " + eng.name);
  editBtn.addEventListener("click", () => openEngineEditForm(eng));
  const delBtn  = makeIconBtn(deleteSvg, "Delete", "Delete " + eng.name, true);
  delBtn.addEventListener("click", () => doDeleteEngine(eng));
  acts.append(editBtn, delBtn);

  item.append(favWrap, keyEl, nameEl, toggleWrap, acts);
  return item;
}

function openEngineAddForm() {
  editingEngKey = null;
  _preEngFormFocusKey = focusedEngineIdx >= 0
    ? engineList.querySelectorAll(".engine-item[data-key]")[focusedEngineIdx]?.dataset.key ?? null
    : null;
  engineFormTitle.textContent = "Add search engine";
  efKey.value = ""; efName.value = ""; efUrl.value = "";
  setFieldError("engine-form-error", "");
  document.getElementById("engine-key-dialog").hidden = true;
  engineFormCard.hidden = false;
  efKey.focus();
  engineFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openEngineEditForm(eng) {
  editingEngKey = eng.key;
  _preEngFormFocusKey = eng.key;
  engineFormTitle.textContent = "Edit search engine";
  efKey.value = eng.key; efName.value = eng.name; efUrl.value = eng.searchUrl;
  setFieldError("engine-form-error", "");
  document.getElementById("engine-key-dialog").hidden = true;
  engineFormCard.hidden = false;
  efKey.focus();
  engineFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEngineForm() {
  engineFormCard.hidden = true;
  editingEngKey         = null;
  setFieldError("engine-form-error", "");
  document.getElementById("engine-key-dialog").hidden = true;
  renderEngineList(_preEngFormFocusKey);
  _preEngFormFocusKey = null;
}

function handleEngineSave() {
  document.getElementById("engine-key-dialog").hidden = true;

  const key    = efKey.value.trim();
  const name   = efName.value.trim();
  const rawUrl = efUrl.value.trim();

  if (!key)  { setFieldError("engine-form-error", "Prefix key is required."); return; }
  if (!name) { setFieldError("engine-form-error", "Name is required."); return; }
  if (!rawUrl.includes("{query}")) {
    setFieldError("engine-form-error", "Search URL must contain {query} as a placeholder."); return;
  }

  const dup = engines.find(e => e.key === key && e.key !== editingEngKey);
  if (dup) {
    showKeyDupDialog(
      dup,
      "engine-key-dialog", "engine-key-text", "engine-key-replace", "engine-key-cancel",
      (choice) => {
        if (choice === "replace") commitEngineSave(key, name, rawUrl, { replaceKey: dup.key });
      }
    );
    return;
  }

  commitEngineSave(key, name, rawUrl, {});
}

function commitEngineSave(key, name, rawUrl, { replaceKey } = {}) {
  setFieldError("engine-form-error", "");
  let domain = "google.com";
  try { domain = new URL(rawUrl.replace("{query}", "test")).hostname.replace(/^www\./, ""); } catch (_) {}

  const eng = { key, name, searchUrl: rawUrl, domain, enabled: true };

  if (replaceKey && replaceKey !== editingEngKey) {
    engines = engines.filter(e => e.key !== replaceKey && e.key !== editingEngKey);
    engines.push(eng);
  } else if (editingEngKey !== null) {
    const i = engines.findIndex(e => e.key === editingEngKey);
    if (i !== -1) engines[i] = eng; else engines.push(eng);
  } else {
    engines.push(eng);
  }

  saveSearchEngines(engines).then(() => {
    closeEngineForm();
    renderEngineList(key);
    showStatus(editingEngKey !== null || replaceKey ? "Engine saved." : "Engine added.");
  }).catch(err => showStatus("Save failed: " + err.message, "error"));
}

document.getElementById("btn-add-engine").addEventListener("click", openEngineAddForm);
document.getElementById("btn-engine-save").addEventListener("click", handleEngineSave);
document.getElementById("btn-engine-cancel").addEventListener("click", closeEngineForm);
[efKey, efName, efUrl].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter")  { handleEngineSave(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeEngineForm(); }
  });
});
document.getElementById("btn-reset-engines").addEventListener("click", () => {
  if (!window.confirm("Reset search engines to factory defaults?")) return;
  resetSearchEngines().then(d => {
    engines = d; renderEngineList(); closeEngineForm(); showStatus("Search engines reset.");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 3 — APPEARANCE
 * ══════════════════════════════════════════════════════════════════════════ */

function renderAppearance() {
  // Theme swatches
  document.querySelectorAll(".theme-swatch").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === appearance.theme);
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

  // Glow mode buttons (Off / Static / Pulse)
  document.querySelectorAll(".glow-mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.glowMode === (appearance.glowMode || "off"));
    btn.onclick = () => {
      appearance.glowMode = btn.dataset.glowMode;
      applyGlow(appearance.glowMode, appearance.glowColor, appearance.glowIntensity);
      renderAppearance();
      saveAppearance(appearance).then(() => showStatus("Glow mode saved."));
    };
  });
  renderGlowOptions();

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

  // Boolean toggles
  const setToggle = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked  = !!appearance[key];
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

function renderGlowOptions() {
  const opts = document.getElementById("glow-options");
  if (!opts) return;
  const active = (appearance.glowMode || "off") !== "off";
  opts.classList.toggle("glow-options--disabled", !active);

  // Color buttons
  document.querySelectorAll(".glow-color-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.glowColor === (appearance.glowColor || "blue"));
    btn.onclick = () => {
      if (!active) return;
      appearance.glowColor = btn.dataset.glowColor;
      applyGlow(appearance.glowMode, appearance.glowColor, appearance.glowIntensity);
      renderGlowOptions();
      saveAppearance(appearance);
    };
  });

  // Intensity buttons
  document.querySelectorAll(".glow-intensity-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.intensity === (appearance.glowIntensity || "subtle"));
    btn.onclick = () => {
      if (!active) return;
      appearance.glowIntensity = btn.dataset.intensity;
      applyGlow(appearance.glowMode, appearance.glowColor, appearance.glowIntensity);
      renderGlowOptions();
      saveAppearance(appearance);
    };
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 *  TAB 4 — BOOKMARKS
 * ══════════════════════════════════════════════════════════════════════════ */

async function renderBookmarksTab() {
  const toggleEl = document.getElementById("toggle-bookmarks");
  const statusEl = document.getElementById("bookmark-permission-status");
  toggleEl.checked = !!appearance.showBookmarks;
  const hasPerm = await hasBookmarkPermission();
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
 *  TAB 5 — DATA (Sync · Import / Export · Reset)
 * ══════════════════════════════════════════════════════════════════════════ */

/* ─── Chrome Sync ────────────────────────────────────────────────────────── */

async function renderSyncTab() {
  const toggleEl  = document.getElementById("toggle-sync");
  const statusEl  = document.getElementById("sync-status");
  const migration = document.getElementById("sync-migration");

  const enabled = await isSyncEnabled();
  toggleEl.checked = enabled;
  updateSyncStatus(enabled, statusEl);

  toggleEl.onchange = async () => {
    migration.hidden = true;
    if (toggleEl.checked) {
      await handleEnableSync(statusEl, migration, toggleEl);
    } else {
      await handleDisableSync(statusEl);
    }
  };
}

function updateSyncStatus(enabled, el) {
  el.hidden    = false;
  el.className = enabled
    ? "permission-status permission-status--ok"
    : "permission-status";
  el.textContent = enabled
    ? "Sync active — shortcuts and settings are shared across your Chrome devices."
    : "Sync off — data stored locally on this device.";
}

async function handleEnableSync(statusEl, migrationEl, toggleEl) {
  try {
    const localData = await readLocalSyncableData();
    const syncData  = await readSyncData();
    const hasSyncData  = syncDataHasContent(syncData);
    const hasLocalData = SYNCABLE_KEYS.some(k => localData[k] !== undefined);

    if (hasSyncData && hasLocalData) {
      // Both sides have data — ask user what to do
      const migText = document.getElementById("sync-migration-text");
      migText.textContent =
        "Synced data and local data both exist. Which should be kept?";
      migrationEl.hidden = false;

      const btnUpload   = document.getElementById("sync-btn-upload");
      const btnDownload = document.getElementById("sync-btn-download");
      const btnCancel   = document.getElementById("sync-btn-cancel");

      const cleanup = () => {
        migrationEl.hidden = true;
        btnUpload.onclick = btnDownload.onclick = btnCancel.onclick = null;
      };

      btnUpload.onclick = async () => {
        cleanup();
        try {
          await copyLocalToSync(localData);
          await setSyncEnabledFlag(true);
          updateSyncStatus(true, statusEl);
          reloadData();
          showStatus("Sync enabled — local data uploaded.");
        } catch (err) {
          toggleEl.checked = false;
          statusEl.className = "permission-status permission-status--error";
          statusEl.textContent = "Sync quota exceeded — data too large. Staying local.";
          showStatus("Sync quota exceeded.", "error");
        }
      };

      btnDownload.onclick = async () => {
        cleanup();
        await copySyncToLocal(syncData);
        await setSyncEnabledFlag(true);
        updateSyncStatus(true, statusEl);
        reloadData();
        showStatus("Sync enabled — synced data applied.");
      };

      btnCancel.onclick = () => {
        cleanup();
        toggleEl.checked = false;
        statusEl.textContent = "Sync off — data stored locally on this device.";
        statusEl.className   = "permission-status";
      };
    } else if (hasSyncData) {
      // Only sync has data — use it
      await copySyncToLocal(syncData);
      await setSyncEnabledFlag(true);
      updateSyncStatus(true, statusEl);
      reloadData();
      showStatus("Sync enabled — synced data loaded.");
    } else {
      // Sync is empty — upload local data
      try {
        await copyLocalToSync(localData);
        await setSyncEnabledFlag(true);
        updateSyncStatus(true, statusEl);
        showStatus("Sync enabled — local data uploaded.");
      } catch (err) {
        toggleEl.checked = false;
        statusEl.className   = "permission-status permission-status--error";
        statusEl.textContent = "Sync quota exceeded — data too large. Staying local.";
        showStatus("Sync quota exceeded.", "error");
      }
    }
  } catch (err) {
    toggleEl.checked = false;
    showStatus("Sync error: " + err.message, "error");
  }
}

async function handleDisableSync(statusEl) {
  // Copy current sync data to local so nothing is lost
  const syncData = await readSyncData();
  if (syncDataHasContent(syncData)) {
    await copySyncToLocal(syncData);
  }
  await setSyncEnabledFlag(false);
  updateSyncStatus(false, statusEl);
  reloadData();
  showStatus("Sync disabled — data stored locally.");
}

/** Re-loads shortcuts, engines, and appearance after a sync migration. */
async function reloadData() {
  const [sc, eng, ap] = await Promise.all([getShortcuts(), getSearchEngines(), getAppearance()]);
  shortcuts  = sc;
  engines    = eng;
  appearance = ap;
  // Apply visual styles from the newly loaded appearance AND update localStorage mirror,
  // so subsequent main-page loads pick up the synced theme without FOUC.
  applyTheme(ap.theme, ap.accent);
  applyFontSize(ap.fontSize || "medium");
  applyGlow(ap.glowMode, ap.glowColor, ap.glowIntensity);
  renderShortcutList();
  renderEngineList();
  renderAppearance();
}

/* ─── Export ─────────────────────────────────────────────────────────────── */

document.getElementById("btn-export").addEventListener("click", () => {
  const data = {
    version:       "1",
    exported:      new Date().toISOString(),
    shortcuts, searchEngines: engines, appearance,
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

/* ─── Import ─────────────────────────────────────────────────────────────── */

const importFileInput   = document.getElementById("import-file-input");
const importModeDialog  = document.getElementById("import-mode-dialog");
let   _pendingImportData = null;

document.getElementById("btn-import").addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;
  importFileInput.value = "";

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    showStatus("Import failed — file is not valid JSON.", "error"); return;
  }

  const errors = validateImportData(data);
  if (errors.length > 0) {
    showStatus("Import failed — " + errors.join("; "), "error"); return;
  }

  // Show inline mode-choice dialog instead of window.confirm
  _pendingImportData = data;
  importModeDialog.hidden = false;
});

function validateImportData(data) {
  if (!data || typeof data !== "object") return ["unexpected format"];
  const errors = [];
  if (data.shortcuts !== undefined) {
    if (!Array.isArray(data.shortcuts)) errors.push("shortcuts must be an array");
    else data.shortcuts.forEach((s, i) => {
      if (!s.key || !s.name || !s.url) errors.push(`shortcuts[${i}]: missing key, name, or url`);
    });
  }
  if (data.searchEngines !== undefined) {
    if (!Array.isArray(data.searchEngines)) errors.push("searchEngines must be an array");
    else data.searchEngines.forEach((e, i) => {
      if (!e.searchUrl?.includes("{query}")) errors.push(`searchEngines[${i}]: searchUrl must contain {query}`);
    });
  }
  return errors;
}

document.getElementById("import-btn-replace").addEventListener("click", async () => {
  importModeDialog.hidden = true;
  await processImport(_pendingImportData, true);
  _pendingImportData = null;
});
document.getElementById("import-btn-merge").addEventListener("click", async () => {
  importModeDialog.hidden = true;
  await processImport(_pendingImportData, false);
  _pendingImportData = null;
});
document.getElementById("import-btn-cancel").addEventListener("click", () => {
  importModeDialog.hidden = true;
  _pendingImportData = null;
});

async function processImport(data, doReplace) {
  if (doReplace) {
    if (data.shortcuts)     { shortcuts = data.shortcuts; await saveShortcuts(shortcuts); }
    if (data.searchEngines) { engines   = data.searchEngines; await saveSearchEngines(engines); }
    if (data.appearance)    { appearance = { ...appearance, ...data.appearance }; await saveAppearance(appearance); applyTheme(appearance.theme, appearance.accent); applyFontSize(appearance.fontSize); applyGlow(appearance.glowMode, appearance.glowColor, appearance.glowIntensity); }
  } else {
    if (data.shortcuts) {
      const existingKeys = new Set(shortcuts.map(s => s.key));
      shortcuts = [...shortcuts, ...data.shortcuts.filter(s => !existingKeys.has(s.key))];
      await saveShortcuts(shortcuts);
    }
    if (data.searchEngines) {
      const existingKeys = new Set(engines.map(e => e.key));
      engines = [...engines, ...data.searchEngines.filter(e => !existingKeys.has(e.key))];
      await saveSearchEngines(engines);
    }
  }
  renderShortcutList(); renderEngineList(); renderAppearance();
  showStatus("Import complete.");
}

/* ─── Reset buttons ──────────────────────────────────────────────────────── */

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
    glowMode: "off", glowColor: "blue", glowIntensity: "subtle",
  };
  appearance = { ...appearance, ...defaults };
  applyTheme(appearance.theme, appearance.accent);
  applyFontSize(appearance.fontSize);
  applyGlow("off", "blue", "subtle");
  saveAppearance(appearance).then(() => { renderAppearance(); showStatus("Appearance settings reset."); });
});

/* ─── Icon SVG helpers ───────────────────────────────────────────────────── */

const editSvg   = `<svg viewBox="0 0 16 16" fill="none"><path d="M2 14l1.5-4.5 8-8 3 3-8 8L2 14z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const deleteSvg = `<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function makeIconBtn(svg, title, ariaLabel, isDanger = false) {
  const btn = document.createElement("button");
  btn.className = isDanger ? "btn-icon btn-icon--danger" : "btn-icon";
  btn.title     = title;
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
  applyGlow(ap.glowMode, ap.glowColor, ap.glowIntensity);

  renderShortcutList();
  renderEngineList();
  renderAppearance();
  renderBookmarksTab();
  renderSyncTab();
});

/* ─── Bidirectional live sync ────────────────────────────────────────────────
 *
 * Listens for storage changes in the ACTIVE area (sync or local).
 *
 * WHY THIS IS NEEDED FOR BIDIRECTIONAL SYNC:
 *   Without this listener, Device A's in-memory state is never updated when
 *   Device B writes to chrome.storage.sync.  The next time Device A saves
 *   anything, it writes its STALE in-memory state back to sync — silently
 *   overwriting Device B's changes (classic "lost update" problem).
 *
 *   With the listener, every write by any device immediately updates the
 *   in-memory state of all other open pages, so the next save from any device
 *   starts from the current truth in sync.
 *
 * SAME-DEVICE WRITES:
 *   When this page itself writes, onChanged fires here too.  The handler
 *   re-reads the same newValue and re-renders — harmless idempotent operation.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

chrome.storage.onChanged.addListener((changes, areaName) => {
  isSyncEnabled().then(syncEnabled => {
    const expected = syncEnabled ? "sync" : "local";
    if (areaName !== expected) return;

    if (changes[STORAGE_KEY]) {
      const v = changes[STORAGE_KEY].newValue;
      if (Array.isArray(v)) {
        shortcuts = v;
        renderShortcutList();
      }
    }

    if (changes[SE_STORAGE_KEY]) {
      const v = changes[SE_STORAGE_KEY].newValue;
      if (Array.isArray(v)) {
        engines = v;
        renderEngineList();
      }
    }

    if (changes[APPEARANCE_KEY]) {
      const v = changes[APPEARANCE_KEY].newValue;
      if (v && typeof v === "object") {
        appearance = { ...DEFAULT_APPEARANCE, ...v };
        applyTheme(appearance.theme, appearance.accent);
        applyFontSize(appearance.fontSize);
        applyGlow(appearance.glowMode, appearance.glowColor, appearance.glowIntensity);
        renderAppearance();
      }
    }
  });
});
