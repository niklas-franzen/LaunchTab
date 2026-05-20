/* ─── Storage & URL Utilities ────────────────────────────────────────────────
 *
 * Shared across app.html, options.html, and popup.html.
 * Requires defaults.js to be loaded first (provides DEFAULT_SHORTCUTS).
 *
 * Sync support: when the user enables "Sync across Chrome devices", shortcuts,
 * search engines, and appearance are stored in chrome.storage.sync instead of
 * chrome.storage.local.  Usage/weather data is always local.
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

/* ─── Sync abstraction ───────────────────────────────────────────────────── */

const SYNC_ENABLED_KEY = "launchtab_sync_enabled";

// The sync flag itself ALWAYS lives in local storage — never in sync.
function isSyncEnabled() {
  return new Promise(resolve => {
    chrome.storage.local.get([SYNC_ENABLED_KEY], r => resolve(!!r[SYNC_ENABLED_KEY]));
  });
}

function setSyncEnabledFlag(enabled) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SYNC_ENABLED_KEY]: !!enabled }, resolve);
  });
}

/** Returns the appropriate storage area (sync or local) as a Promise. */
function getStore() {
  return isSyncEnabled().then(enabled =>
    enabled ? chrome.storage.sync : chrome.storage.local
  );
}

/**
 * Writes data to a storage area and returns a Promise.
 * Rejects with a quota error when chrome.storage.sync is full.
 */
function storeSet(store, data) {
  return new Promise((resolve, reject) => {
    store.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Storage quota exceeded"));
      } else {
        resolve();
      }
    });
  });
}

function storeGet(store, keys) {
  return new Promise(resolve => store.get(keys, resolve));
}

/* ─── Sync migration helpers ─────────────────────────────────────────────── */

const SYNCABLE_KEYS = [STORAGE_KEY, "launchtab_search_engines", "launchtab_appearance"];

/** Reads all syncable data from local storage. */
function readLocalSyncableData() {
  return new Promise(resolve => {
    chrome.storage.local.get(SYNCABLE_KEYS, resolve);
  });
}

/** Reads all syncable data from sync storage. */
function readSyncData() {
  return new Promise(resolve => {
    chrome.storage.sync.get(SYNCABLE_KEYS, resolve);
  });
}

/** Copies data from local to sync. Returns a Promise; rejects on quota error. */
function copyLocalToSync(localData) {
  const payload = {};
  SYNCABLE_KEYS.forEach(k => { if (localData[k] !== undefined) payload[k] = localData[k]; });
  return storeSet(chrome.storage.sync, payload);
}

/** Copies data from sync to local. */
function copySyncToLocal(syncData) {
  const payload = {};
  SYNCABLE_KEYS.forEach(k => { if (syncData[k] !== undefined) payload[k] = syncData[k]; });
  return new Promise(resolve => chrome.storage.local.set(payload, resolve));
}

/** Returns true when the sync data object has at least one syncable key. */
function syncDataHasContent(syncData) {
  return SYNCABLE_KEYS.some(k => syncData[k] !== undefined && syncData[k] !== null);
}

/* ─── Shortcuts CRUD ─────────────────────────────────────────────────────── */

function getShortcuts() {
  return getStore().then(store => storeGet(store, [STORAGE_KEY])).then(result => {
    const stored = result[STORAGE_KEY];
    if (stored && stored.length > 0) return stored;
    // No data in current store — initialise defaults in local (safe baseline)
    const defaults = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
    return new Promise(resolve => {
      chrome.storage.local.set({ [STORAGE_KEY]: defaults }, () => resolve(defaults));
    });
  });
}

function saveShortcuts(shortcuts) {
  return getStore().then(store => storeSet(store, { [STORAGE_KEY]: shortcuts }));
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
 * Stored in chrome.storage.local (or sync when enabled). Theme + accent are
 * also mirrored to localStorage (by themes.js#applyTheme) for instant no-flash
 * application on next page load.
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
  // Ambient glow
  glowMode:        "off",         // "off" | "static" | "pulse"
  glowColor:       "blue",        // "blue" | "purple" | "green" | "neutral"
  glowIntensity:   "subtle",      // "subtle" | "medium" | "strong"
  // Motion
  respectReducedMotion: true,     // honour prefers-reduced-motion OS setting
};

function getAppearance() {
  return getStore().then(store => storeGet(store, [APPEARANCE_KEY])).then(r => {
    const stored = r[APPEARANCE_KEY] || {};
    // Migrate old glowEnabled (boolean) → glowMode (string)
    if (stored.glowEnabled !== undefined && stored.glowMode === undefined) {
      stored.glowMode = stored.glowEnabled ? "static" : "off";
      delete stored.glowEnabled;
    }
    return { ...DEFAULT_APPEARANCE, ...stored };
  });
}

function saveAppearance(settings) {
  // Mirror theme+accent+glow to localStorage for instant no-flash application
  try {
    localStorage.setItem("lt_theme",                  settings.theme                        || "graphite");
    localStorage.setItem("lt_accent",                 settings.accent                       || "blue");
    localStorage.setItem("lt_glow_mode",              settings.glowMode                     || "off");
    localStorage.setItem("lt_glow_color",             settings.glowColor                    || "blue");
    localStorage.setItem("lt_glow_intensity",         settings.glowIntensity                || "subtle");
    localStorage.setItem("lt_respect_reduced_motion", settings.respectReducedMotion !== false ? "true" : "false");
  } catch (_) { /* ignore */ }
  return getStore().then(store => storeSet(store, { [APPEARANCE_KEY]: settings }));
}

/* ─── Usage Tracking ─────────────────────────────────────────────────────────
 *
 * Always local — visit counts are device-specific and should not sync.
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
