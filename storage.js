/* ─── Storage & URL Utilities ────────────────────────────────────────────────
 *
 * Shared across app.html, options.html, and popup.html.
 * Requires defaults.js to be loaded first (provides DEFAULT_SHORTCUTS).
 *
 * All async functions return Promises.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "launchtab_shortcuts";

/* ─── URL helpers ────────────────────────────────────────────────────────── */

function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  try { return new URL(url).href; }
  catch { return url; }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function createFaviconUrl(url) {
  return "https://www.google.com/s2/favicons?sz=64&domain=" +
    encodeURIComponent(getDomain(url));
}

/* ─── CRUD ───────────────────────────────────────────────────────────────── */

function getShortcuts() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      const stored = result[STORAGE_KEY];
      if (stored && stored.length > 0) {
        resolve(stored);
      } else {
        // First run — seed from defaults
        const defaults = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
        chrome.storage.local.set({ [STORAGE_KEY]: defaults }, () => resolve(defaults));
      }
    });
  });
}

function saveShortcuts(shortcuts) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: shortcuts }, resolve);
  });
}

function addShortcut(shortcut) {
  return getShortcuts().then(list => {
    list.push(shortcut);
    return saveShortcuts(list).then(() => list);
  });
}

function updateShortcut(originalKey, updated) {
  return getShortcuts().then(list => {
    const i = list.findIndex(s => s.key === originalKey);
    if (i !== -1) list[i] = updated;
    return saveShortcuts(list).then(() => list);
  });
}

function deleteShortcut(key) {
  return getShortcuts().then(list => {
    const filtered = list.filter(s => s.key !== key);
    return saveShortcuts(filtered).then(() => filtered);
  });
}

function resetShortcuts() {
  const defaults = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
  return saveShortcuts(defaults).then(() => defaults);
}
