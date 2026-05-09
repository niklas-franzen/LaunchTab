/* ─── popup.js ───────────────────────────────────────────────────────────────
 *
 * Handles the toolbar popup: reads the active tab URL/title, pre-fills the
 * form, validates input, and saves the new shortcut via storage.js.
 *
 * Requires defaults.js + storage.js to be loaded first.
 * Uses activeTab permission to access the current tab's URL and title.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

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

function suggestKey(title, url) {
  // Try first 2–3 meaningful characters from the page title
  const fromTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3);
  if (fromTitle.length >= 2) return fromTitle;
  // Fallback: first letters of the domain (e.g. "github" → "git")
  const domain = getDomain(url);
  return domain.split(".")[0].slice(0, 3).toLowerCase();
}

/* ─── State ──────────────────────────────────────────────────────────────── */

let existingShortcuts = [];

/* ─── Init: get tab info + existing shortcuts ────────────────────────────── */

Promise.all([
  new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  }),
  getShortcuts(),
]).then(([tab, shortcuts]) => {
  existingShortcuts = shortcuts;

  if (!tab || !tab.url ||
      (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
    // Restricted page (chrome://, extension page, etc.)
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

  // Focus the key field — that's what the user most needs to set
  setTimeout(() => pKey.select(), 80);
});

/* ─── Validate & save ────────────────────────────────────────────────────── */

function handleAdd() {
  const key      = pKey.value.trim();
  const name     = pName.value.trim();
  const rawUrl   = pUrl.value.trim();
  const category = pCategory.value.trim() || "Other";

  if (!key)  { showError("Shortcut key is required."); pKey.focus();  return; }
  if (!name) { showError("Name is required."); pName.focus(); return; }
  if (!rawUrl) { showError("URL is required."); pUrl.focus(); return; }

  const url = normalizeUrl(rawUrl);
  try { new URL(url); }
  catch { showError("Enter a valid URL."); pUrl.focus(); return; }

  const duplicate = existingShortcuts.find(s => s.key === key);
  if (duplicate) {
    showError(`Key "${key}" is already used by "${duplicate.name}". Choose a different key.`);
    pKey.focus();
    return;
  }

  showError("");

  addShortcut({ key, name, url, category }).then(() => {
    successMsg.textContent = `"${name}" added with key "${key}".`;
    viewForm.hidden    = true;
    viewSuccess.hidden = false;
  });
}

/* ─── Events ─────────────────────────────────────────────────────────────── */

btnAdd.addEventListener("click", handleAdd);

[pKey, pName, pUrl, pCategory].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") handleAdd(); });
});
