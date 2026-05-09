/* ─── Configuration ──────────────────────────────────────────────────────────
 *
 *  To add a shortcut, append an object to SHORTCUTS:
 *
 *    { key, name, url, category }          — favicon auto-fetched from url
 *    { key, name, url, category, icon }    — icon overrides the favicon:
 *                                             • emoji string: "🎵"
 *                                             • https URL to any image
 *                                             • relative path: "assets/icons/gh.png"
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const SHORTCUTS = [
  { key: "g",      name: "Google",          url: "https://www.google.com",       category: "Search"       },
  { key: "yt",     name: "YouTube",         url: "https://www.youtube.com",      category: "Media"        },
  { key: "gm",     name: "Gmail",           url: "https://mail.google.com",      category: "Google"       },
  { key: "cal",    name: "Google Calendar", url: "https://calendar.google.com",  category: "Google"       },
  { key: "drive",  name: "Google Drive",    url: "https://drive.google.com",     category: "Google"       },
  { key: "gh",     name: "GitHub",          url: "https://github.com",           category: "Dev"          },
  { key: "chat",   name: "ChatGPT",         url: "https://chatgpt.com",          category: "AI"           },
  { key: "claude", name: "Claude",          url: "https://claude.ai",            category: "AI"           },
  { key: "li",     name: "LinkedIn",        url: "https://www.linkedin.com",     category: "Career"       },
  { key: "maps",   name: "Google Maps",     url: "https://maps.google.com",      category: "Google"       },
  { key: "notion", name: "Notion",          url: "https://www.notion.so",        category: "Productivity" },
];

const MAX_RESULTS       = 7;
const DEFAULT_GRID_COUNT = 6;

/* ─── DOM References ─────────────────────────────────────────────────────── */

const searchInput      = document.getElementById("search");
const resultsContainer = document.getElementById("results-container");
const resultsList      = document.getElementById("results");
const noResults        = document.getElementById("no-results");
const defaultGrid      = document.getElementById("default-grid");
const clearBtn         = document.getElementById("search-clear");
const timeEl           = document.getElementById("time");
const dateEl           = document.getElementById("date");

/* ─── State ──────────────────────────────────────────────────────────────── */

let activeIndex    = -1;
let currentResults = [];

/* ─── Focus Management ───────────────────────────────────────────────────────
 *
 * Chrome overrides autofocus on new-tab pages by returning focus to the
 * omnibox (address bar) after the page loads. The strategy here is to attempt
 * focus several times over ~300 ms to win the race condition.
 *
 * - Attempt 1 (0 ms)   : immediately after script execution
 * - Attempt 2 (RAF)    : after the first browser paint
 * - Attempt 3 (100 ms) : short delay — Chrome usually takes ~50-150 ms
 * - Attempt 4 (300 ms) : safety net; only runs if focus wasn't captured yet
 *
 * ─────────────────────────────────────────────────────────────────────────── */

function focusSearch() {
  searchInput.focus({ preventScroll: true });
  if (searchInput.value) searchInput.select();
}

// DOMContentLoaded — safe even when script is at the bottom of <body>
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", focusSearch);
} else {
  focusSearch();
}

// Staggered attempts to win the race against Chrome's omnibox, which claims
// focus after the page loads. Each attempt checks whether we already won.
requestAnimationFrame(focusSearch);
setTimeout(focusSearch, 0);
setTimeout(focusSearch, 50);
setTimeout(focusSearch, 150);
setTimeout(() => {
  if (document.activeElement !== searchInput) focusSearch();
}, 300);

// Re-focus when the tab becomes active after being in the background
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && searchInput.value === "") focusSearch();
});

// Click anywhere on non-interactive background → re-focus the search field
document.addEventListener("click", (e) => {
  const isInteractive = e.target.closest(
    "input, button, a, [role='option'], [role='button'], [tabindex='0']"
  );
  if (!isInteractive) focusSearch();
});

/*
 * Keydown capture handler — "last resort" focus fallback.
 *
 * If a printable character is typed while focus is outside the search field
 * (e.g. a grid card button is focused, or document.body has focus), we grab
 * focus and route that character into the search field.
 *
 * IMPORTANT: keystrokes typed into Chrome's omnibox never reach the page DOM
 * at all, so this handler cannot intercept them. It only helps when the page
 * itself has focus somewhere other than the search input.
 */
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;    // ignore modifier combos
  if (document.activeElement === searchInput) return; // already in search
  if (e.key.length !== 1) return;                    // skip Enter, Escape, F-keys, etc.

  e.preventDefault();
  focusSearch();

  // Manually insert the character; the keydown was on a different element so
  // the browser won't route it to the input automatically.
  const start = searchInput.selectionStart ?? searchInput.value.length;
  const end   = searchInput.selectionEnd   ?? searchInput.value.length;
  searchInput.value =
    searchInput.value.slice(0, start) + e.key + searchInput.value.slice(end);
  searchInput.selectionStart = searchInput.selectionEnd = start + 1;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
}, true); // capture phase — fires before any element-level handlers

/* ─── Clock ──────────────────────────────────────────────────────────────── */

function updateClock() {
  const now = new Date();

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  timeEl.textContent = `${hh}:${mm}`;
  timeEl.setAttribute("datetime", now.toISOString());

  dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  dateEl.setAttribute("datetime", now.toISOString().slice(0, 10));
}

/* ─── Utilities ──────────────────────────────────────────────────────────── */

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ─── Icons ──────────────────────────────────────────────────────────────────
 *
 * Each result can have an optional `icon` field:
 *   - Omitted / falsy    → Google Favicon API (easy to swap for local assets)
 *   - Emoji string       → rendered as text
 *   - URL or local path  → loaded as <img>
 *
 * On <img> load failure the fallback letter circle is revealed.
 * To switch to local icons later, replace the FAVICON_URL with a local path.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const FAVICON_URL = (domain) =>
  `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;

function buildIconElement(shortcut, wrapperClass) {
  const wrapper = document.createElement("span");
  wrapper.className = `site-icon ${wrapperClass}`;
  wrapper.setAttribute("aria-hidden", "true");

  const { icon, name, url } = shortcut;

  // Emoji: short string that is neither a URL nor a local path
  if (icon && !icon.startsWith("http") && !icon.startsWith("/") && !icon.includes(".")) {
    const emoji = document.createElement("span");
    emoji.className = "icon-emoji";
    emoji.textContent = icon;
    wrapper.appendChild(emoji);
    return wrapper;
  }

  // Image — either an explicit icon URL/path, or the auto favicon
  const imgSrc = icon || FAVICON_URL(getDomain(url));

  const img = document.createElement("img");
  img.className = "icon-img";
  img.src = imgSrc;
  img.alt = "";
  img.width = 22;
  img.height = 22;

  // Fallback letter circle — displayed if the image fails to load
  const fallback = document.createElement("span");
  fallback.className = "icon-fallback";
  fallback.textContent = name.charAt(0).toUpperCase();

  img.addEventListener("error", () => {
    img.style.display = "none";
    fallback.style.display = "flex";
  });

  wrapper.appendChild(img);
  wrapper.appendChild(fallback);
  return wrapper;
}

/* ─── Fuzzy Search ───────────────────────────────────────────────────────── */

/**
 * Returns a relevance score for a single shortcut against the query.
 * Higher = better match. Returns 0 if no match.
 */
function scoreShortcut(query, shortcut) {
  const q  = query.toLowerCase().trim();
  const fk = shortcut.key.toLowerCase();
  const fn = shortcut.name.toLowerCase();
  const fc = shortcut.category.toLowerCase();
  const fu = shortcut.url.toLowerCase();

  if (fk === q)         return 10000;                    // exact key
  if (fk.startsWith(q)) return 9000 - fk.length;        // key starts-with
  if (q.startsWith(fk)) return 8500 - q.length;         // typed past key ("gma" for "gm")
  if (fn === q)         return 8000;                     // exact name
  if (fn.startsWith(q)) return 7000 - fn.length;        // name starts-with
  if (fn.includes(q))   return 6000 - fn.indexOf(q);    // name contains
  if (fc.startsWith(q)) return 5000 - fc.length;        // category starts-with
  if (fc.includes(q))   return 4000;                    // category contains
  if (fu.includes(q))   return 3000;                    // URL contains

  const fuzzyKey  = fuzzyMatch(q, fk);
  if (fuzzyKey  > 0) return 2000 + fuzzyKey;

  const fuzzyName = fuzzyMatch(q, fn);
  if (fuzzyName > 0) return 1000 + fuzzyName;

  const fuzzyCat  = fuzzyMatch(q, fc);
  if (fuzzyCat  > 0) return 500  + fuzzyCat;

  return 0;
}

/**
 * Checks whether all characters of `query` appear in order inside `text`.
 * Returns a quality score (higher = more consecutive / front-loaded), or 0.
 */
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

/** Returns scored shortcuts sorted by relevance, capped at MAX_RESULTS. */
function search(query) {
  if (!query.trim()) return [];

  return SHORTCUTS
    .map(s => ({ shortcut: s, score: scoreShortcut(query, s) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ shortcut }) => shortcut);
}

/* ─── Highlighting ───────────────────────────────────────────────────────── */

/** Wraps the first occurrence of `query` in `text` with a <mark> element. */
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

/* ─── Render: Result Item ────────────────────────────────────────────────── */

/**
 * Builds a single <li> result item using DOM APIs (not innerHTML) so that
 * the icon element — which needs an error event listener — can be attached
 * before it's inserted into the document.
 */
function createResultItem(shortcut, index, query) {
  const li = document.createElement("li");
  li.className = "result-item";
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", "false");
  li.style.setProperty("--item-index", index);

  // ── Icon
  li.appendChild(buildIconElement(shortcut, "result-icon"));

  // ── Key badge
  const keySpan = document.createElement("span");
  keySpan.className = "result-key";
  keySpan.setAttribute("aria-label", `Shortcut: ${shortcut.key}`);
  keySpan.innerHTML = highlightSubstring(shortcut.key, query);
  li.appendChild(keySpan);

  // ── Name + domain
  const mainSpan   = document.createElement("span");
  mainSpan.className = "result-main";

  const nameSpan   = document.createElement("span");
  nameSpan.className = "result-name";
  nameSpan.innerHTML = highlightSubstring(shortcut.name, query);

  const domainSpan = document.createElement("span");
  domainSpan.className = "result-domain";
  domainSpan.textContent = getDomain(shortcut.url);

  mainSpan.append(nameSpan, domainSpan);
  li.appendChild(mainSpan);

  // ── Category badge
  const catSpan = document.createElement("span");
  catSpan.className = "result-category";
  catSpan.textContent = shortcut.category;
  li.appendChild(catSpan);

  li.addEventListener("click", () => navigateTo(shortcut.url));
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
  // Auto-select the first result so Enter opens it immediately without arrow navigation
  setActiveIndex(0);
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

    const keySpan = document.createElement("span");
    keySpan.className = "grid-card-key";
    keySpan.textContent = shortcut.key;

    const nameSpan = document.createElement("span");
    nameSpan.className = "grid-card-name";
    nameSpan.textContent = shortcut.name;

    const catSpan = document.createElement("span");
    catSpan.className = "grid-card-category";
    catSpan.textContent = shortcut.category;

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
  noResults.hidden = true;
  resultsList.innerHTML = "";
  defaultGrid.classList.remove("hidden");
  searchInput.setAttribute("aria-expanded", "false");
}

/* ─── Keyboard Navigation ────────────────────────────────────────────────── */

function setActiveIndex(index) {
  const items = resultsList.querySelectorAll(".result-item");
  if (!items.length) return;

  if (index < 0)             index = items.length - 1;
  if (index >= items.length) index = 0;

  items.forEach((el, i) => {
    el.setAttribute("aria-selected", String(i === index));
  });

  activeIndex = index;
  items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function navigateTo(url) {
  window.location.href = url;
}

function openActive() {
  if (activeIndex >= 0 && currentResults[activeIndex]) {
    navigateTo(currentResults[activeIndex].url);
    return;
  }
  if (currentResults.length > 0) {
    navigateTo(currentResults[0].url);
  }
}

/* ─── Event: Search Input ────────────────────────────────────────────────── */

searchInput.addEventListener("input", () => {
  const query = searchInput.value;
  clearBtn.hidden = query.length === 0;

  if (!query.trim()) {
    showDefaultGrid();
    return;
  }

  showResults(search(query), query);
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
      clearBtn.hidden = true;
      showDefaultGrid();
      // Keep focus in the search field so the user can type immediately
      focusSearch();
      break;
  }
});

// ⌘K / Ctrl+K — focus the search input from anywhere on the page
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

/* ─── Event: Clear Button ────────────────────────────────────────────────── */

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.hidden = true;
  showDefaultGrid();
  focusSearch();
});

/* ─── Init ───────────────────────────────────────────────────────────────── */

updateClock();
setInterval(updateClock, 60_000);

renderDefaultGrid();
