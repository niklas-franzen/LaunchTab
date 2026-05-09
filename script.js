/* ─── script.js ─────────────────────────────────────────────────────────────
 *
 * Requires (loaded before this file in app.html):
 *   defaults.js  — DEFAULT_SHORTCUTS constant
 *   storage.js   — getDomain, createFaviconUrl, getShortcuts, normalizeUrl
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const MAX_RESULTS        = 7;
const DEFAULT_GRID_COUNT = 6;

/* ─── State ──────────────────────────────────────────────────────────────── */

let SHORTCUTS      = [];   // populated asynchronously from chrome.storage.local
let activeIndex    = -1;
let currentResults = [];

/* ─── DOM References ─────────────────────────────────────────────────────── */

const searchInput      = document.getElementById("search");
const resultsContainer = document.getElementById("results-container");
const resultsList      = document.getElementById("results");
const noResults        = document.getElementById("no-results");
const defaultGrid      = document.getElementById("default-grid");
const clearBtn         = document.getElementById("search-clear");
const timeEl           = document.getElementById("time");
const dateEl           = document.getElementById("date");

/* ─── Focus Management ───────────────────────────────────────────────────────
 *
 * Chrome overrides autofocus on new-tab pages by refocusing the omnibox
 * after the page loads. We make multiple attempts over ~300 ms to win
 * that race. The app is loaded via a redirect from newtab.html → app.html?x
 * which already avoids most of Chrome's new-tab focus logic.
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

// Any printable key typed outside the search input → route to search
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
 *  10 000  Exact key match         "gh"     → GitHub
 *   9 500  Exact name match        "github" → GitHub
 *   9 200  Exact domain match      "github.com" → GitHub
 *   8 000  Name starts-with        "git"    → GitHub
 *   7 500  Domain starts-with      "git"    → github.com
 *   7 000  Key starts-with         "g"      → still typing key, e.g. "g" → Google
 *   6 500  Query starts-with key   "gmail"  → key "gm" is a prefix (multi-char keys only)
 *            Single-char keys (like "g") are excluded from this tier to prevent
 *            "github" from scoring Google highly just because "g" is a prefix.
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
  const fc = shortcut.category.toLowerCase();
  const fd = getDomain(shortcut.url).toLowerCase();  // getDomain from storage.js
  const fu = shortcut.url.toLowerCase();

  // Tier 1 — exact matches
  if (fk === q) return 10000;
  if (fn === q) return 9500;
  if (fd === q) return 9200;

  // Tier 2 — starts-with on name/domain (most useful for natural search)
  if (fn.startsWith(q)) return 8000 + Math.max(0, 50 - fn.length);
  if (fd.startsWith(q)) return 7500 + Math.max(0, 50 - fd.length);

  // Tier 3 — key prefix logic
  // 3a: user is still typing the key ("g" when key is "gh")
  if (fk.startsWith(q) && q.length < fk.length) return 7000 - fk.length;
  // 3b: user typed past a multi-char key ("gmail" starts with key "gm")
  //     Excluded for single-char keys: "g" must NOT pull Google up for "github"
  if (q.startsWith(fk) && fk.length >= 2) return 6500 - q.length;

  // Tier 4 — substring contains
  if (fn.includes(q)) return 5000 + Math.max(0, 50 - fn.indexOf(q));
  if (fd.includes(q)) return 4500 + Math.max(0, 50 - fd.indexOf(q));

  // Tier 5 — category
  if (fc.startsWith(q)) return 3500 - fc.length;
  if (fc.includes(q))   return 3000;

  // Tier 6 — raw URL
  if (fu.includes(q)) return 2500;

  // Tier 7 — fuzzy (lowest priority)
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

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function buildIconElement(shortcut, wrapperClass) {
  const wrapper = document.createElement("span");
  wrapper.className = `site-icon ${wrapperClass}`;
  wrapper.setAttribute("aria-hidden", "true");

  const { icon, name, url } = shortcut;

  // Emoji: short string, not a URL and not a path
  if (icon && !icon.startsWith("http") && !icon.startsWith("/") && !icon.includes(".")) {
    const emoji = document.createElement("span");
    emoji.className = "icon-emoji";
    emoji.textContent = icon;
    wrapper.appendChild(emoji);
    return wrapper;
  }

  const img      = document.createElement("img");
  img.className  = "icon-img";
  img.src        = icon || createFaviconUrl(url);  // createFaviconUrl from storage.js
  img.alt        = "";
  img.width      = 22;
  img.height     = 22;

  const fallback = document.createElement("span");
  fallback.className   = "icon-fallback";
  fallback.textContent = name.charAt(0).toUpperCase();

  img.addEventListener("error", () => {
    img.style.display      = "none";
    fallback.style.display = "flex";
  });

  wrapper.appendChild(img);
  wrapper.appendChild(fallback);
  return wrapper;
}

/* ─── Render: Result Item ────────────────────────────────────────────────── */

function createResultItem(shortcut, index, query) {
  const li = document.createElement("li");
  li.className = "result-item";
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", "false");
  li.style.setProperty("--item-index", index);

  li.appendChild(buildIconElement(shortcut, "result-icon"));

  const keySpan = document.createElement("span");
  keySpan.className = "result-key";
  keySpan.setAttribute("aria-label", `Shortcut: ${shortcut.key}`);
  keySpan.innerHTML = highlightSubstring(shortcut.key, query);
  li.appendChild(keySpan);

  const mainSpan    = document.createElement("span");
  mainSpan.className = "result-main";
  const nameSpan    = document.createElement("span");
  nameSpan.className = "result-name";
  nameSpan.innerHTML = highlightSubstring(shortcut.name, query);
  const domainSpan  = document.createElement("span");
  domainSpan.className   = "result-domain";
  domainSpan.textContent = getDomain(shortcut.url);
  mainSpan.append(nameSpan, domainSpan);
  li.appendChild(mainSpan);

  const catSpan = document.createElement("span");
  catSpan.className   = "result-category";
  catSpan.textContent = shortcut.category;
  li.appendChild(catSpan);

  li.addEventListener("click",      () => navigateTo(shortcut.url));
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
  items.forEach((shortcut, i) => {
    resultsList.appendChild(createResultItem(shortcut, i, query));
  });

  searchInput.setAttribute("aria-expanded", "true");
  setActiveIndex(0);  // first result pre-selected
}

/* ─── Render: Default Grid ───────────────────────────────────────────────── */

function renderDefaultGrid() {
  defaultGrid.innerHTML = "";
  SHORTCUTS.slice(0, DEFAULT_GRID_COUNT).forEach((shortcut, i) => {
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

function navigateTo(url) { window.location.href = url; }

function openActive() {
  if (activeIndex >= 0 && currentResults[activeIndex]) {
    navigateTo(currentResults[activeIndex].url);
    return;
  }
  if (currentResults.length > 0) navigateTo(currentResults[0].url);
}

/* ─── Events ─────────────────────────────────────────────────────────────── */

searchInput.addEventListener("input", () => {
  const query = searchInput.value;
  clearBtn.hidden = query.length === 0;
  if (!query.trim()) { showDefaultGrid(); return; }
  showResults(search(query), query);
});

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

/* ─── Init ───────────────────────────────────────────────────────────────── */

updateClock();
setInterval(updateClock, 60_000);

// Load shortcuts from storage, then render the grid
getShortcuts().then(shortcuts => {
  SHORTCUTS = shortcuts;
  renderDefaultGrid();
});
