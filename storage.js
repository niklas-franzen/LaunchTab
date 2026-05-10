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

/* ─── Shortcuts CRUD ─────────────────────────────────────────────────────── */

function getShortcuts() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      const stored = result[STORAGE_KEY];
      if (stored && stored.length > 0) {
        resolve(stored);
      } else {
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

/* ─── Appearance Settings ────────────────────────────────────────────────────
 *
 * Stored in chrome.storage.local. Theme + accent are also mirrored to
 * localStorage (by themes.js#applyTheme) for instant no-flash application
 * on the next page load.
 * ─────────────────────────────────────────────────────────────────────────── */

const APPEARANCE_KEY = "launchtab_appearance";

const DEFAULT_APPEARANCE = {
  // Visual theme
  theme:           "graphite",
  accent:          "blue",
  fontSize:        "medium",      // "small" | "medium" | "large"
  // Clock & weather
  showTime:        true,
  showDate:        true,
  showWeather:     false,
  tempUnit:        "C",           // "C" | "F"
  // Main-page UI
  showHints:       true,
  showMostVisited: true,
  showVisitCounts: false,
  showSettingsBtn: true,
  // Bookmarks
  showBookmarks:   false,
};

function getAppearance() {
  return new Promise(resolve => {
    chrome.storage.local.get([APPEARANCE_KEY], r => {
      resolve({ ...DEFAULT_APPEARANCE, ...(r[APPEARANCE_KEY] || {}) });
    });
  });
}

function saveAppearance(settings) {
  // Mirror theme+accent to localStorage for instant no-flash application
  try {
    localStorage.setItem("lt_theme",  settings.theme  || "graphite");
    localStorage.setItem("lt_accent", settings.accent || "blue");
  } catch (_) { /* ignore */ }
  return new Promise(resolve => {
    chrome.storage.local.set({ [APPEARANCE_KEY]: settings }, resolve);
  });
}

/* ─── Usage Tracking ─────────────────────────────────────────────────────────
 *
 * Tracks how many times each shortcut key has been opened. Used to sort the
 * default grid ("most visited"). No data leaves the device.
 * ─────────────────────────────────────────────────────────────────────────── */

const USAGE_KEY = "launchtab_usage";

function getUsageData() {
  return new Promise(resolve => {
    chrome.storage.local.get([USAGE_KEY], r => resolve(r[USAGE_KEY] || {}));
  });
}

function incrementUsage(shortcutKey) {
  return getUsageData().then(data => {
    data[shortcutKey] = (data[shortcutKey] || 0) + 1;
    return new Promise(resolve => {
      chrome.storage.local.set({ [USAGE_KEY]: data }, resolve);
    });
  });
}

function resetUsageData() {
  return new Promise(resolve => {
    chrome.storage.local.set({ [USAGE_KEY]: {} }, resolve);
  });
}
