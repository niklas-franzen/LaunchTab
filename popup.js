/* ─── popup.js ───────────────────────────────────────────────────────────────
 *
 * Handles the toolbar popup: reads the active tab URL/title, pre-fills the
 * form, validates input, and saves the new shortcut via storage.js.
 *
 * Requires themes.js + defaults.js + storage.js to be loaded first.
 * Uses activeTab permission to access the current tab's URL and title.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

getAppearance().then(ap => applyTheme(ap.theme, ap.accent)).catch(() => {});

/* ─── DOM refs ───────────────────────────────────────────────────────────── */

const viewForm    = document.getElementById("view-form");
const viewSuccess = document.getElementById("view-success");
const viewError   = document.getElementById("view-error");
const pName       = document.getElementById("p-name");
const pKey        = document.getElementById("p-key");
const pUrl        = document.getElementById("p-url");
const pCategory   = document.getElementById("p-category");
const pError      = document.getElementById("p-error");
const btnAdd      = document.getElementById("btn-add");
const successMsg  = document.getElementById("success-msg");

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function showError(msg) {
  pError.textContent = msg;
  pError.hidden      = !msg;
}

function hideAllDialogs() {
  document.getElementById("p-dup-dialog").hidden = true;
  document.getElementById("p-key-dialog").hidden = true;
  showError("");
}

function suggestKey(title, url) {
  const fromTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3);
  if (fromTitle.length >= 2) return fromTitle;
  return getDomain(url).split(".")[0].slice(0, 3).toLowerCase();
}

function normUrl(u) {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.hostname.toLowerCase()}${x.pathname.replace(/\/+$/, "") || "/"}${x.search}`;
  } catch { return u.toLowerCase().replace(/\/+$/, ""); }
}

/* ─── State ──────────────────────────────────────────────────────────────── */

let existingShortcuts = [];

/* ─── Init ───────────────────────────────────────────────────────────────── */

Promise.all([
  new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  }),
  getShortcuts(),
]).then(([tab, shortcuts]) => {
  existingShortcuts = shortcuts;

  if (!tab || !tab.url ||
      (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
    viewForm.hidden  = true;
    viewError.hidden = false;
    return;
  }

  const url   = tab.url;
  const title = tab.title || getDomain(url);
  pUrl.value      = url;
  pName.value     = title;
  pKey.value      = suggestKey(title, url);
  pCategory.value = "";
  setTimeout(() => pKey.select(), 80);
});

/* ─── Inline duplicate dialogs ───────────────────────────────────────────── */

function showUrlDupDialog(dupEntry, onUpdate, onDuplicate) {
  hideAllDialogs();
  const dialog    = document.getElementById("p-dup-dialog");
  const textEl    = document.getElementById("p-dup-text");
  const btnUpdate = document.getElementById("p-dup-update");
  const btnDup    = document.getElementById("p-dup-duplicate");
  const btnCancel = document.getElementById("p-dup-cancel");

  textEl.textContent =
    `URL already belongs to "${dupEntry.name}" (key: ${dupEntry.key}). What would you like to do?`;
  dialog.hidden = false;

  const cleanup = () => {
    btnUpdate.onclick = btnDup.onclick = btnCancel.onclick = null;
    dialog.hidden = true;
  };
  btnUpdate.onclick    = () => { cleanup(); onUpdate(); };
  btnDup.onclick       = () => { cleanup(); onDuplicate(); };
  btnCancel.onclick    = () => { cleanup(); pUrl.focus(); };
}

function showKeyDupDialog(dupEntry, onReplace) {
  hideAllDialogs();
  const dialog     = document.getElementById("p-key-dialog");
  const textEl     = document.getElementById("p-key-text");
  const btnReplace = document.getElementById("p-key-replace");
  const btnCancel  = document.getElementById("p-key-cancel");

  textEl.textContent =
    `Key "${dupEntry.key}" is already used by "${dupEntry.name}". Replace it?`;
  dialog.hidden = false;

  const cleanup = () => {
    btnReplace.onclick = btnCancel.onclick = null;
    dialog.hidden = true;
  };
  btnReplace.onclick = () => { cleanup(); onReplace(); };
  btnCancel.onclick  = () => { cleanup(); pKey.focus(); };
}

/* ─── Core save ──────────────────────────────────────────────────────────── */

function commitSave(key, name, url, category) {
  hideAllDialogs();
  addShortcut({ key, name, url, category }).then(() => {
    successMsg.textContent = `"${name}" added with key "${key}".`;
    viewForm.hidden    = true;
    viewSuccess.hidden = false;
  }).catch(err => {
    showError("Save failed: " + err.message);
  });
}

function commitUpdate(existingKey, key, name, url, category) {
  hideAllDialogs();
  getShortcuts().then(list => {
    const filtered = list.filter(s => s.key !== existingKey);
    filtered.push({ key, name, url, category });
    return saveShortcuts(filtered);
  }).then(() => {
    successMsg.textContent = `"${name}" saved with key "${key}".`;
    viewForm.hidden    = true;
    viewSuccess.hidden = false;
  }).catch(err => {
    showError("Save failed: " + err.message);
  });
}

/* ─── Validate & save ────────────────────────────────────────────────────── */

function handleAdd() {
  hideAllDialogs();

  const key      = pKey.value.trim();
  const name     = pName.value.trim();
  const rawUrl   = pUrl.value.trim();
  const category = pCategory.value.trim() || "Other";

  if (!key)    { showError("Shortcut key is required."); pKey.focus();  return; }
  if (!name)   { showError("Name is required.");         pName.focus(); return; }
  if (!rawUrl) { showError("URL is required.");          pUrl.focus();  return; }

  const url = normalizeUrl(rawUrl);
  try { new URL(url); }
  catch { showError("Enter a valid URL."); pUrl.focus(); return; }

  // Key conflict
  const keyDup = existingShortcuts.find(s => s.key === key);
  if (keyDup) {
    showKeyDupDialog(keyDup, () => {
      commitUpdate(keyDup.key, key, name, url, category);
    });
    return;
  }

  // URL duplicate
  const urlDup = existingShortcuts.find(s => normUrl(s.url) === normUrl(url));
  if (urlDup) {
    showUrlDupDialog(
      urlDup,
      () => commitUpdate(urlDup.key, key, name, url, category),  // Update existing
      () => commitSave(key, name, url, category)                  // Save as duplicate
    );
    return;
  }

  commitSave(key, name, url, category);
}

/* ─── Events ─────────────────────────────────────────────────────────────── */

btnAdd.addEventListener("click", handleAdd);

[pKey, pName, pUrl, pCategory].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") handleAdd(); });
});
