/* bookmarks.js — Optional Chrome Bookmarks integration.
 *
 * Requires the "bookmarks" permission, listed under optional_permissions in
 * manifest.json and requested dynamically via chrome.permissions.request()
 * when the user first enables the feature in Settings → Bookmarks.
 *
 * All operations are local (chrome.bookmarks API reads from the user's own
 * browser). No data leaves the device.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Returns true when the bookmarks API is available (permission granted). */
function bookmarksAvailable() {
  return typeof chrome !== "undefined" && !!chrome.bookmarks;
}

/**
 * Searches Chrome bookmarks for `query`.
 * Returns an array of synthetic result objects in score order.
 * Returns an empty array if the API is unavailable or query is empty.
 */
function searchBookmarks(query) {
  if (!bookmarksAvailable() || !query.trim()) {
    return Promise.resolve([]);
  }

  return new Promise(resolve => {
    chrome.bookmarks.search(query.trim(), results => {
      if (!results || results.length === 0) { resolve([]); return; }

      const q      = query.toLowerCase();
      const scored = results
        .filter(b => b.url)                        // skip folders
        .map(b => {
          const title = (b.title || "").toLowerCase();
          const url   = (b.url   || "").toLowerCase();
          let score = 0;
          if (title === q)              score = 900;
          else if (title.startsWith(q)) score = 700 + (50 - Math.min(title.length, 50));
          else if (title.includes(q))   score = 500;
          else if (url.includes(q))     score = 300;
          else                          score = 100;
          return { bookmark: b, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(({ bookmark: b }) => ({
          type:     "bookmark",
          name:     b.title || getDomain(b.url),   // getDomain from storage.js
          url:      b.url,
          key:      "bm",
          category: "Bookmark",
        }));

      resolve(scored);
    });
  });
}

/** Requests the "bookmarks" optional permission. Resolves to true/false. */
function requestBookmarkPermission() {
  return new Promise(resolve => {
    chrome.permissions.request({ permissions: ["bookmarks"] }, resolve);
  });
}

/** Checks whether the bookmarks permission is currently granted. */
function hasBookmarkPermission() {
  return new Promise(resolve => {
    chrome.permissions.contains({ permissions: ["bookmarks"] }, resolve);
  });
}
