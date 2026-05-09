/* ─── options.js ─────────────────────────────────────────────────────────────
 *
 * Manages the LaunchTab settings page.
 * Requires defaults.js + storage.js to be loaded before this file.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

/* ─── DOM refs ───────────────────────────────────────────────────────────── */

const shortcutList  = document.getElementById("shortcut-list");
const filterInput   = document.getElementById("filter-input");
const formCard      = document.getElementById("form-card");
const formTitle     = document.getElementById("form-title");
const fKey          = document.getElementById("f-key");
const fName         = document.getElementById("f-name");
const fUrl          = document.getElementById("f-url");
const fCategory     = document.getElementById("f-category");
const formError     = document.getElementById("form-error");
const btnSave       = document.getElementById("btn-save");
const btnCancel     = document.getElementById("btn-cancel");
const btnAdd        = document.getElementById("btn-add");
const btnReset      = document.getElementById("btn-reset");
const statusBanner  = document.getElementById("status-banner");

/* ─── State ──────────────────────────────────────────────────────────────── */

let shortcuts  = [];
let editingKey = null;   // null = adding new, string = key of shortcut being edited

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showStatus(msg, type = "ok") {
  statusBanner.textContent = msg;
  statusBanner.className   = `status-banner status-banner--${type}`;
  statusBanner.hidden      = false;
  setTimeout(() => { statusBanner.hidden = true; }, 3000);
}

function setFormError(msg) {
  formError.textContent = msg;
  formError.hidden      = !msg;
}

/* ─── Render list ────────────────────────────────────────────────────────── */

function renderList() {
  shortcutList.innerHTML = "";
  const q = filterInput.value.toLowerCase().trim();

  const visible = q
    ? shortcuts.filter(s =>
        s.key.toLowerCase().includes(q)  ||
        s.name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        getDomain(s.url).toLowerCase().includes(q))
    : shortcuts;

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className   = "empty-state";
    empty.textContent = shortcuts.length === 0
      ? "No shortcuts yet. Click \"+ Add shortcut\" to get started."
      : "No shortcuts match your filter.";
    shortcutList.appendChild(empty);
    return;
  }

  visible.forEach(s => shortcutList.appendChild(createItem(s)));
}

function createItem(shortcut) {
  const item = document.createElement("div");
  item.className  = "shortcut-item";
  item.setAttribute("role", "listitem");
  item.dataset.key = shortcut.key;

  // Favicon
  const favWrap   = document.createElement("div");
  favWrap.className = "item-favicon-wrap";
  const favicon   = document.createElement("img");
  favicon.className = "item-favicon";
  favicon.src     = createFaviconUrl(shortcut.url);
  favicon.alt     = "";
  favicon.width   = 20;
  favicon.height  = 20;
  favicon.loading = "lazy";
  const favFallback = document.createElement("span");
  favFallback.className   = "item-favicon-fallback";
  favFallback.textContent = shortcut.name.charAt(0).toUpperCase();
  favicon.addEventListener("error", () => {
    favicon.style.display      = "none";
    favFallback.style.display  = "flex";
  });
  favWrap.append(favicon, favFallback);

  // Key badge
  const keyBadge = document.createElement("span");
  keyBadge.className   = "item-key";
  keyBadge.textContent = shortcut.key;

  // Name
  const nameEl = document.createElement("span");
  nameEl.className   = "item-name";
  nameEl.textContent = shortcut.name;

  // Domain
  const domainEl = document.createElement("span");
  domainEl.className   = "item-domain";
  domainEl.textContent = getDomain(shortcut.url);

  // Category
  const catEl = document.createElement("span");
  catEl.className   = "item-category";
  catEl.textContent = shortcut.category || "—";

  // Actions
  const actionsEl = document.createElement("div");
  actionsEl.className = "item-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon";
  editBtn.title     = "Edit";
  editBtn.setAttribute("aria-label", `Edit ${shortcut.name}`);
  editBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none"><path d="M2 14l1.5-4.5 8-8 3 3-8 8L2 14z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  editBtn.addEventListener("click", () => openEditForm(shortcut));

  const delBtn = document.createElement("button");
  delBtn.className = "btn-icon btn-icon--danger";
  delBtn.title     = "Delete";
  delBtn.setAttribute("aria-label", `Delete ${shortcut.name}`);
  delBtn.innerHTML  = `<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  delBtn.addEventListener("click", () => showDeleteConfirm(shortcut, actionsEl));

  actionsEl.append(editBtn, delBtn);
  item.append(favWrap, keyBadge, nameEl, domainEl, catEl, actionsEl);
  return item;
}

/* ─── Delete confirmation (inline, no modal) ─────────────────────────────── */

function showDeleteConfirm(shortcut, actionsEl) {
  actionsEl.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "confirm-wrap";

  const label = document.createElement("span");
  label.className   = "confirm-label";
  label.textContent = "Delete?";

  const yesBtn = document.createElement("button");
  yesBtn.className   = "btn-confirm-yes";
  yesBtn.textContent = "Yes";
  yesBtn.addEventListener("click", () => {
    deleteShortcut(shortcut.key).then(updated => {
      shortcuts = updated;
      renderList();
      showStatus(`"${shortcut.name}" deleted.`);
      if (editingKey === shortcut.key) closeForm();
    });
  });

  const noBtn = document.createElement("button");
  noBtn.className   = "btn-confirm-no";
  noBtn.textContent = "No";
  noBtn.addEventListener("click", () => renderList());   // restore

  wrap.append(label, yesBtn, noBtn);
  actionsEl.appendChild(wrap);
}

/* ─── Form open / close ──────────────────────────────────────────────────── */

function openAddForm() {
  editingKey     = null;
  formTitle.textContent = "Add shortcut";
  fKey.value     = "";
  fName.value    = "";
  fUrl.value     = "";
  fCategory.value = "";
  setFormError("");
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openEditForm(shortcut) {
  editingKey     = shortcut.key;
  formTitle.textContent = "Edit shortcut";
  fKey.value      = shortcut.key;
  fName.value     = shortcut.name;
  fUrl.value      = shortcut.url;
  fCategory.value = shortcut.category || "";
  setFormError("");
  formCard.hidden = false;
  fKey.focus();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  formCard.hidden = true;
  editingKey      = null;
  setFormError("");
}

/* ─── Validation & save ──────────────────────────────────────────────────── */

function validateForm() {
  const key      = fKey.value.trim();
  const name     = fName.value.trim();
  const rawUrl   = fUrl.value.trim();
  const category = fCategory.value.trim();

  if (!key)  { setFormError("Shortcut key is required."); return null; }
  if (!name) { setFormError("Name is required."); return null; }
  if (!rawUrl) { setFormError("URL is required."); return null; }

  const url = normalizeUrl(rawUrl);
  try { new URL(url); }
  catch { setFormError("Please enter a valid URL."); return null; }

  // Key uniqueness: duplicate only fails when adding new OR when changing the key
  const duplicate = shortcuts.find(s => s.key === key && s.key !== editingKey);
  if (duplicate) {
    setFormError(`Key "${key}" is already used by "${duplicate.name}".`);
    return null;
  }

  setFormError("");
  return { key, name, url, category: category || "Other" };
}

function handleSave() {
  const shortcut = validateForm();
  if (!shortcut) return;

  const promise = editingKey !== null
    ? updateShortcut(editingKey, shortcut)
    : addShortcut(shortcut);

  promise.then(updated => {
    shortcuts = updated;
    renderList();
    closeForm();
    showStatus(editingKey !== null ? "Shortcut updated." : "Shortcut added.");
  });
}

/* ─── Wire up events ─────────────────────────────────────────────────────── */

btnAdd.addEventListener("click",    openAddForm);
btnCancel.addEventListener("click", closeForm);
btnSave.addEventListener("click",   handleSave);

filterInput.addEventListener("input", renderList);

// Save on Enter inside any form field
[fKey, fName, fUrl, fCategory].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") handleSave(); });
});

btnReset.addEventListener("click", () => {
  if (!window.confirm("Reset all shortcuts to the factory defaults? This cannot be undone.")) return;
  resetShortcuts().then(defaults => {
    shortcuts = defaults;
    renderList();
    closeForm();
    showStatus("Shortcuts reset to defaults.");
  });
});

/* ─── Init ───────────────────────────────────────────────────────────────── */

getShortcuts().then(list => {
  shortcuts = list;
  renderList();
});
