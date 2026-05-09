/* search-engines.js — Search-engine prefix system for LaunchTab.
 *
 * When the user types "[key] [query]" (key + space + text), LaunchTab
 * intercepts and opens the search engine's URL with the query encoded.
 * The key alone (without a space) still opens the normal shortcut if one
 * exists, keeping exact-key shortcut matches as the highest priority.
 * ─────────────────────────────────────────────────────────────────────────── */

const DEFAULT_SEARCH_ENGINES = [
  { key: "g",       name: "Google",          searchUrl: "https://www.google.com/search?q={query}",                domain: "google.com",         enabled: true  },
  { key: "yt",      name: "YouTube",          searchUrl: "https://www.youtube.com/results?search_query={query}",   domain: "youtube.com",        enabled: true  },
  { key: "maps",    name: "Google Maps",      searchUrl: "https://www.google.com/maps/search/{query}",             domain: "maps.google.com",    enabled: true  },
  { key: "wiki",    name: "Wikipedia DE",     searchUrl: "https://de.wikipedia.org/w/index.php?search={query}",    domain: "de.wikipedia.org",   enabled: true  },
  { key: "gh",      name: "GitHub",           searchUrl: "https://github.com/search?q={query}",                    domain: "github.com",         enabled: true  },
  { key: "so",      name: "Stack Overflow",   searchUrl: "https://stackoverflow.com/search?q={query}",             domain: "stackoverflow.com",  enabled: true  },
  { key: "reddit",  name: "Reddit",           searchUrl: "https://www.reddit.com/search/?q={query}",               domain: "reddit.com",         enabled: true  },
  { key: "amazon",  name: "Amazon DE",        searchUrl: "https://www.amazon.de/s?k={query}",                      domain: "amazon.de",          enabled: true  },
  { key: "deepl",   name: "DeepL",            searchUrl: "https://www.deepl.com/translator#en/de/{query}",         domain: "deepl.com",          enabled: true  },
  { key: "scholar", name: "Google Scholar",   searchUrl: "https://scholar.google.com/scholar?q={query}",           domain: "scholar.google.com", enabled: false },
  { key: "leo",     name: "Leo Dictionary",   searchUrl: "https://dict.leo.org/englisch-deutsch/{query}",          domain: "dict.leo.org",       enabled: false },
  { key: "duden",   name: "Duden",            searchUrl: "https://www.duden.de/suchen/dudenonline/{query}",        domain: "duden.de",           enabled: false },
  { key: "ddg",     name: "DuckDuckGo",       searchUrl: "https://duckduckgo.com/?q={query}",                      domain: "duckduckgo.com",     enabled: false },
  { key: "imdb",    name: "IMDb",             searchUrl: "https://www.imdb.com/find?q={query}",                    domain: "imdb.com",           enabled: false },
];

const SE_STORAGE_KEY = "launchtab_search_engines";

function getSearchEngines() {
  return new Promise(resolve => {
    chrome.storage.local.get([SE_STORAGE_KEY], r => {
      const stored = r[SE_STORAGE_KEY];
      if (stored && stored.length > 0) {
        resolve(stored);
      } else {
        const d = DEFAULT_SEARCH_ENGINES.map(e => ({ ...e }));
        chrome.storage.local.set({ [SE_STORAGE_KEY]: d }, () => resolve(d));
      }
    });
  });
}

function saveSearchEngines(engines) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SE_STORAGE_KEY]: engines }, resolve);
  });
}

function resetSearchEngines() {
  const d = DEFAULT_SEARCH_ENGINES.map(e => ({ ...e }));
  return saveSearchEngines(d).then(() => d);
}

/** Builds the final navigation URL by substituting the encoded query. */
function buildSearchUrl(engine, query) {
  return engine.searchUrl.replace("{query}", encodeURIComponent(query.trim()));
}

/**
 * Tries to parse raw input as "[engine-key] [query]".
 *
 * Returns a synthetic result object when an enabled engine matches, or null.
 *
 * Matching rule:
 *   - There must be a space in the input (otherwise it's a normal shortcut lookup)
 *   - Everything before the first space is the candidate key
 *   - Everything after is the query (may be empty — user still typing)
 */
function matchSearchEngine(raw, engines) {
  const spaceIdx = raw.indexOf(" ");
  if (spaceIdx < 1) return null;               // no space → normal shortcut mode

  const prefix = raw.slice(0, spaceIdx).toLowerCase();
  const query  = raw.slice(spaceIdx + 1);      // may be empty string

  const engine = engines.find(e => e.enabled && e.key === prefix);
  if (!engine) return null;

  const q = query.trim();
  return {
    type:     "search",
    name:     engine.name,
    query:    q,
    url:      q ? buildSearchUrl(engine, q) : "",
    category: "Search",
    icon:     `https://${engine.domain}`,       // used for favicon in result rendering
  };
}
