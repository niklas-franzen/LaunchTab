/* ─── script.js ─────────────────────────────────────────────────────────────
 *
 * Requires (loaded before this file in app.html):
 *   themes.js          — applyTheme()
 *   defaults.js        — DEFAULT_SHORTCUTS
 *   storage.js         — getDomain, createFaviconUrl, getShortcuts,
 *                        getAppearance, getUsageData, incrementUsage
 *   search-engines.js  — getSearchEngines, matchSearchEngine
 *   weather.js         — initWeather
 *   bookmarks.js       — searchBookmarks
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const MAX_RESULTS        = 7;
const DEFAULT_GRID_COUNT = 6;

/* ─── State ──────────────────────────────────────────────────────────────── */

let SHORTCUTS       = [];
let SEARCH_ENGINES  = [];
let APPEARANCE      = { theme: "graphite", accent: "blue", showWeather: false,
                        showHints: true, showMostVisited: true, showBookmarks: false };
let activeIndex     = -1;
let currentResults  = [];

/* ─── DOM References ─────────────────────────────────────────────────────── */

const searchInput      = document.getElementById("search");
const resultsContainer = document.getElementById("results-container");
const resultsList      = document.getElementById("results");
const noResults        = document.getElementById("no-results");
const defaultGrid      = document.getElementById("default-grid");
const clearBtn         = document.getElementById("search-clear");
const timeEl           = document.getElementById("time");
const dateEl           = document.getElementById("date");
const hintsEl          = document.getElementById("kbd-hints");

/* ─── Focus Management ───────────────────────────────────────────────────────
 *
 * Multiple attempts to win the focus race against Chrome's omnibox.
 * app.html is loaded via a redirect from newtab.html → app.html?x which
 * already avoids most of Chrome's new-tab focus logic.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

function focusSearch() {
  searchInput.focus({ preventScroll: true });
  if (searchInput.value) searchInput.select();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", focusSearch);
} else {
  focusSearch();
}

requestAnimationFrame(focusSearch);
setTimeout(focusSearch, 0);
setTimeout(focusSearch, 50);
setTimeout(focusSearch, 150);
setTimeout(() => { if (document.activeElement !== searchInput) focusSearch(); }, 300);

window.addEventListener("pageshow", () => focusSearch());

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && searchInput.value === "") focusSearch();
});

document.addEventListener("click", (e) => {
  const hit = e.target.closest("input, button, a, [role='option'], [role='button'], [tabindex='0']");
  if (!hit) focusSearch();
});

// Any printable key typed outside the search → route to search
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.activeElement === searchInput) return;
  if (e.key.length !== 1) return;

  e.preventDefault();
  focusSearch();
  const start = searchInput.selectionStart ?? searchInput.value.length;
  const end   = searchInput.selectionEnd   ?? searchInput.value.length;
  searchInput.value =
    searchInput.value.slice(0, start) + e.key + searchInput.value.slice(end);
  searchInput.selectionStart = searchInput.selectionEnd = start + 1;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
}, true);

/* ─── Clock ──────────────────────────────────────────────────────────────── */

function updateClock() {
  const now = new Date();
  const hh  = now.getHours().toString().padStart(2, "0");
  const mm  = now.getMinutes().toString().padStart(2, "0");
  timeEl.textContent = `${hh}:${mm}`;
  timeEl.setAttribute("datetime", now.toISOString());
  dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
  dateEl.setAttribute("datetime", now.toISOString().slice(0, 10));
}

/* ─── Utilities ──────────────────────────────────────────────────────────── */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function highlightSubstring(text, query) {
  if (!query) return escapeHTML(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHTML(text);
  return (
    escapeHTML(text.slice(0, idx)) +
    "<mark>" + escapeHTML(text.slice(idx, idx + query.length)) + "</mark>" +
    escapeHTML(text.slice(idx + query.length))
  );
}

/* ─── Fuzzy Search & Ranking ─────────────────────────────────────────────────
 *
 * Scoring tiers (higher = better match):
 *
 *  10 000  Exact key match             "gh"     → GitHub
 *   9 500  Exact name match            "github" → GitHub
 *   9 200  Exact domain match          "github.com"
 *   8 000  Name starts-with            "git"    → GitHub
 *   7 500  Domain starts-with
 *   7 000  Key starts-with (user still typing key, e.g. "g" → "gh")
 *   6 500  Query starts-with key — only multi-char keys (≥2 chars)
 *            Prevents single-char key "g" from hijacking "github" search
 *   5 000  Name contains
 *   4 500  Domain contains
 *   3 500  Category starts-with
 *   3 000  Category contains
 *   2 500  URL contains
 *   2 000  Fuzzy name
 *   1 500  Fuzzy domain
 *   1 000  Fuzzy key
 *     500  Fuzzy category
 *
 * ─────────────────────────────────────────────────────────────────────────── */

function scoreShortcut(query, shortcut) {
  const q  = query.toLowerCase().trim();
  const fk = shortcut.key.toLowerCase();
  const fn = shortcut.name.toLowerCase();
  const fc = (shortcut.category || "").toLowerCase();
  const fd = getDomain(shortcut.url).toLowerCase();
  const fu = shortcut.url.toLowerCase();

  if (fk === q) return 10000;
  if (fn === q) return 9500;
  if (fd === q) return 9200;

  if (fn.startsWith(q)) return 8000 + Math.max(0, 50 - fn.length);
  if (fd.startsWith(q)) return 7500 + Math.max(0, 50 - fd.length);

  if (fk.startsWith(q) && q.length < fk.length) return 7000 - fk.length;
  if (q.startsWith(fk) && fk.length >= 2) return 6500 - q.length;

  if (fn.includes(q)) return 5000 + Math.max(0, 50 - fn.indexOf(q));
  if (fd.includes(q)) return 4500 + Math.max(0, 50 - fd.indexOf(q));

  if (fc.startsWith(q)) return 3500 - fc.length;
  if (fc.includes(q))   return 3000;

  if (fu.includes(q)) return 2500;

  const fzName = fuzzyMatch(q, fn);
  if (fzName   > 0) return 2000 + fzName;
  const fzDom  = fuzzyMatch(q, fd);
  if (fzDom    > 0) return 1500 + fzDom;
  const fzKey  = fuzzyMatch(q, fk);
  if (fzKey    > 0) return 1000 + fzKey;
  const fzCat  = fuzzyMatch(q, fc);
  if (fzCat    > 0) return  500 + fzCat;

  return 0;
}

function fuzzyMatch(query, text) {
  let qi = 0, score = 0, consecutive = 0, lastIdx = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      consecutive = lastIdx === ti - 1 ? consecutive + 1 : 0;
      score += (text.length - ti) + consecutive * 8;
      lastIdx = ti;
      qi++;
    }
  }
  return qi === query.length ? score : 0;
}

function search(query) {
  if (!query.trim() || SHORTCUTS.length === 0) return [];
  return SHORTCUTS
    .map(s => ({ shortcut: s, score: scoreShortcut(query, s) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ shortcut }) => shortcut);
}

/* ─── Search / Bookmark Fallback Results ─────────────────────────────────── */

function createFallbackSearchResult(query) {
  const q = query.trim();
  return {
    type:     "search",
    name:     "Search Google",
    query:    q,
    url:      q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : "",
    category: "Search",
    icon:     "https://www.google.com",
  };
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function buildIconElement(shortcut, wrapperClass) {
  const wrapper = document.createElement("span");
  wrapper.className = `site-icon ${wrapperClass}`;
  wrapper.setAttribute("aria-hidden", "true");

  const { icon, name, url } = shortcut;

  if (icon && !icon.startsWith("http") && !icon.startsWith("/") && !icon.includes(".")) {
    const emoji = document.createElement("span");
    emoji.className = "icon-emoji";
    emoji.textContent = icon;
    wrapper.appendChild(emoji);
    return wrapper;
  }

  const img      = document.createElement("img");
  img.className  = "icon-img";
  img.src        = icon || createFaviconUrl(url);
  img.alt        = "";
  img.width      = 22;
  img.height     = 22;

  const fallback = document.createElement("span");
  fallback.className   = "icon-fallback";
  fallback.textContent = (name || "?").charAt(0).toUpperCase();

  img.addEventListener("error", () => {
    img.style.display      = "none";
    fallback.style.display = "flex";
  });

  wrapper.appendChild(img);
  wrapper.appendChild(fallback);
  return wrapper;
}

/* ─── Render: Result Item ────────────────────────────────────────────────── */

function createResultItem(item, index, query) {
  const li = document.createElement("li");
  li.className = "result-item";
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", "false");
  li.style.setProperty("--item-index", index);

  if (item.type === "search") {
    // ── Search engine result (engine prefix or Google fallback)
    const iconSrc = item.icon || "https://www.google.com";
    li.appendChild(buildIconElement({ url: iconSrc, name: item.name }, "result-icon"));

    const searchKey = document.createElement("span");
    searchKey.className = "result-key result-key--search";
    searchKey.setAttribute("aria-hidden", "true");
    searchKey.innerHTML =
      `<svg viewBox="0 0 14 14" fill="none" width="12" height="12">` +
      `<circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.5"/>` +
      `<path d="M9 9l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` +
      `</svg>`;
    li.appendChild(searchKey);

    const mainSpan   = document.createElement("span");
    mainSpan.className = "result-main";
    const nameSpan   = document.createElement("span");
    nameSpan.className   = "result-name";
    nameSpan.textContent = item.name;
    const subSpan    = document.createElement("span");
    subSpan.className   = "result-domain";
    subSpan.textContent = item.query ? `for "${item.query}"` : "Type to search…";
    mainSpan.append(nameSpan, subSpan);
    li.appendChild(mainSpan);

    const catSpan = document.createElement("span");
    catSpan.className   = "result-category";
    catSpan.textContent = "Search";
    li.appendChild(catSpan);

    if (item.url) li.addEventListener("click", () => navigateTo(item.url));
    li.addEventListener("mouseenter", () => setActiveIndex(index));
    return li;
  }

  if (item.type === "bookmark") {
    // ── Chrome Bookmark result
    li.appendChild(buildIconElement({ url: item.url, name: item.name }, "result-icon"));

    const bmKey = document.createElement("span");
    bmKey.className = "result-key result-key--search";
    bmKey.setAttribute("aria-hidden", "true");
    bmKey.innerHTML =
      `<svg viewBox="0 0 14 14" fill="none" width="12" height="12">` +
      `<path d="M3 1h8a1 1 0 0 1 1 1v10l-4.5-2.5L3 12V2a1 1 0 0 1 1-1z"` +
      ` stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>` +
      `</svg>`;
    li.appendChild(bmKey);

    const mainSpan   = document.createElement("span");
    mainSpan.className = "result-main";
    const nameSpan   = document.createElement("span");
    nameSpan.className = "result-name";
    nameSpan.innerHTML = highlightSubstring(item.name, query);
    const domainSpan = document.createElement("span");
    domainSpan.className   = "result-domain";
    domainSpan.textContent = getDomain(item.url);
    mainSpan.append(nameSpan, domainSpan);
    li.appendChild(mainSpan);

    const catSpan = document.createElement("span");
    catSpan.className   = "result-category";
    catSpan.textContent = "Bookmark";
    li.appendChild(catSpan);

    li.addEventListener("click", () => navigateTo(item.url));
    li.addEventListener("mouseenter", () => setActiveIndex(index));
    return li;
  }

  // ── Regular shortcut
  li.appendChild(buildIconElement(item, "result-icon"));

  const keySpan = document.createElement("span");
  keySpan.className = "result-key";
  keySpan.setAttribute("aria-label", `Shortcut: ${item.key}`);
  keySpan.innerHTML = highlightSubstring(item.key, query);
  li.appendChild(keySpan);

  const mainSpan    = document.createElement("span");
  mainSpan.className = "result-main";
  const nameSpan    = document.createElement("span");
  nameSpan.className = "result-name";
  nameSpan.innerHTML = highlightSubstring(item.name, query);
  const domainSpan  = document.createElement("span");
  domainSpan.className   = "result-domain";
  domainSpan.textContent = getDomain(item.url);
  mainSpan.append(nameSpan, domainSpan);
  li.appendChild(mainSpan);

  const catSpan = document.createElement("span");
  catSpan.className   = "result-category";
  catSpan.textContent = item.category;
  li.appendChild(catSpan);

  li.addEventListener("click",      () => navigateTo(item.url));
  li.addEventListener("mouseenter", () => setActiveIndex(index));
  return li;
}

/* ─── Render: Results List ───────────────────────────────────────────────── */

function renderResults(items, query) {
  resultsList.innerHTML = "";
  activeIndex = -1;

  if (items.length === 0) {
    noResults.hidden = false;
    return;
  }

  noResults.hidden = true;
  items.forEach((item, i) => {
    resultsList.appendChild(createResultItem(item, i, query));
  });

  searchInput.setAttribute("aria-expanded", "true");
  setActiveIndex(0);
}

/* ─── Render: Default Grid (most visited) ────────────────────────────────── */

function renderDefaultGrid() {
  defaultGrid.innerHTML = "";
  if (!APPEARANCE.showMostVisited && SHORTCUTS.length === 0) return;

  getUsageData().then(usage => {
    // Sort shortcuts by usage count (desc); ties keep original order
    const sorted = [...SHORTCUTS].sort((a, b) =>
      (usage[b.key] || 0) - (usage[a.key] || 0)
    );
    const items = sorted.slice(0, DEFAULT_GRID_COUNT);

    items.forEach((shortcut, i) => {
      const card = document.createElement("button");
      card.className = "grid-card";
      card.style.setProperty("--item-index", i);
      card.setAttribute("aria-label", `${shortcut.name} — ${getDomain(shortcut.url)}`);
      card.type = "button";

      card.appendChild(buildIconElement(shortcut, "grid-card-icon"));

      const keySpan       = document.createElement("span");
      keySpan.className   = "grid-card-key";
      keySpan.textContent = shortcut.key;
      const nameSpan       = document.createElement("span");
      nameSpan.className   = "grid-card-name";
      nameSpan.textContent = shortcut.name;
      const catSpan        = document.createElement("span");
      catSpan.className    = "grid-card-category";
      catSpan.textContent  = shortcut.category;

      card.append(keySpan, nameSpan, catSpan);
      card.addEventListener("click", () => navigateTo(shortcut.url));
      defaultGrid.appendChild(card);
    });
  });
}

/* ─── Show / Hide UI Layers ──────────────────────────────────────────────── */

function showResults(items, query) {
  currentResults = items;
  renderResults(items, query);
  resultsContainer.hidden = false;
  defaultGrid.classList.add("hidden");
}

function showDefaultGrid() {
  currentResults = [];
  resultsContainer.hidden = true;
  noResults.hidden         = true;
  resultsList.innerHTML    = "";
  defaultGrid.classList.remove("hidden");
  searchInput.setAttribute("aria-expanded", "false");
}

/* ─── Keyboard Navigation ────────────────────────────────────────────────── */

function setActiveIndex(index) {
  const items = resultsList.querySelectorAll(".result-item");
  if (!items.length) return;
  if (index < 0)             index = items.length - 1;
  if (index >= items.length) index = 0;
  items.forEach((el, i) => el.setAttribute("aria-selected", String(i === index)));
  activeIndex = index;
  items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function navigateTo(url) {
  // Track usage for shortcut opens
  const sc = SHORTCUTS.find(s => s.url === url);
  if (sc) incrementUsage(sc.key);
  window.location.href = url;
}

function openActive() {
  const pick = activeIndex >= 0 ? currentResults[activeIndex] : currentResults[0];
  if (pick && pick.url) navigateTo(pick.url);
}

/* ─── Event: Search Input ────────────────────────────────────────────────── */

searchInput.addEventListener("input", () => {
  const raw = searchInput.value;
  clearBtn.hidden = raw.length === 0;

  if (!raw.trim()) { showDefaultGrid(); return; }

  // 1. Bookmark prefix: "b [query]"
  if (/^b\s/.test(raw) && APPEARANCE.showBookmarks) {
    const q = raw.slice(2).trim();
    if (q) {
      searchBookmarks(q).then(bmarks => {
        if (bmarks.length > 0) {
          showResults(bmarks.slice(0, MAX_RESULTS), q);
        } else {
          showResults([createFallbackSearchResult(q)], q);
        }
      });
    } else {
      showResults([createFallbackSearchResult("")], "");
    }
    return;
  }

  // 2. Search engine prefix: "[engine-key] [query]"  (e.g. "yt deadlift")
  const seResult = matchSearchEngine(raw, SEARCH_ENGINES);
  if (seResult) {
    showResults([seResult], "");
    return;
  }

  // 3. Normal shortcut fuzzy search
  const results = search(raw);

  if (results.length === 0) {
    // No shortcuts matched — try bookmarks, then fall back to Google
    if (APPEARANCE.showBookmarks) {
      searchBookmarks(raw).then(bmarks => {
        if (bmarks.length > 0) {
          showResults(bmarks.slice(0, MAX_RESULTS), raw);
        } else {
          showResults([createFallbackSearchResult(raw)], raw);
        }
      });
    } else {
      showResults([createFallbackSearchResult(raw)], raw);
    }
    return;
  }

  // Mix in bookmarks if enabled and query is specific enough (≥3 chars)
  if (APPEARANCE.showBookmarks && raw.length >= 3) {
    searchBookmarks(raw).then(bmarks => {
      const merged = [...results, ...bmarks.slice(0, 2)].slice(0, MAX_RESULTS);
      showResults(merged, raw);
    });
  } else {
    showResults(results, raw);
  }
});

/* ─── Event: Keyboard ────────────────────────────────────────────────────── */

searchInput.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (!resultsContainer.hidden) setActiveIndex(activeIndex + 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      if (!resultsContainer.hidden) setActiveIndex(activeIndex - 1);
      break;
    case "Enter":
      e.preventDefault();
      openActive();
      break;
    case "Escape":
      e.preventDefault();
      searchInput.value = "";
      clearBtn.hidden   = true;
      showDefaultGrid();
      focusSearch();
      break;
  }
});

// ⌘K / Ctrl+K — focus from anywhere
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    searchInput.focus({ preventScroll: true });
    searchInput.select();
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.hidden   = true;
  showDefaultGrid();
  focusSearch();
});

/* ─── Settings Button ────────────────────────────────────────────────────── */

document.getElementById("settings-btn").addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
});

/* ─── Init ───────────────────────────────────────────────────────────────── */

updateClock();
setInterval(updateClock, 60_000);

Promise.all([
  getShortcuts(),
  getSearchEngines(),
  getAppearance(),
]).then(([shortcuts, engines, appearance]) => {
  SHORTCUTS      = shortcuts;
  SEARCH_ENGINES = engines;
  APPEARANCE     = appearance;

  // Confirm/reapply theme from storage (localStorage mirror already applied in themes.js)
  applyTheme(appearance.theme, appearance.accent);

  // Apply UI visibility settings
  if (hintsEl) hintsEl.hidden = !appearance.showHints;

  // Most-visited grid
  renderDefaultGrid();

  // Weather widget
  if (appearance.showWeather) {
    initWeather(document.getElementById("weather-widget"));
  }
});
