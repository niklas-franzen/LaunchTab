# Changelog

All notable changes are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.0] — 2025

### Added
- **Themes** — Graphite, Midnight, Slate, Warm Gray, Pure Black; applied instantly via CSS custom properties with no flash on load (localStorage mirror)
- **Accent colors** — Blue, Purple, Green, Orange, Pink, Neutral
- **Weather widget** — minimal temperature + city display using Open-Meteo and Nominatim (both free, no API key); cached 30 min in chrome.storage.local
- **Search engine prefixes** — `yt deadlift`, `wiki thermodynamik`, `maps essen`, `gh launchtab`, `so javascript map`, and 10+ more defaults; fully manageable in Settings
- **Chrome Bookmarks integration** — optional; `b query` prefix for bookmark-only search; uses `optional_permissions` so the permission is only requested when the user enables the feature
- **Most visited tiles** — default grid now sorts by local usage count (no numbers shown); usage tracked per shortcut on each open
- **Settings tabs** — options page restructured into four tabs: Shortcuts / Search / Appearance / Bookmarks
- **Back to LaunchTab** button in the settings header
- **Usage data reset** button in Settings → Bookmarks
- `themes.js` — new shared theme/accent utility loaded before first paint
- `search-engines.js` — search engine definitions and prefix matching
- `weather.js` — weather fetching with caching
- `bookmarks.js` — bookmark search and optional permission helpers

### Changed
- `storage.js` — added `getAppearance`, `saveAppearance`, `getUsageData`, `incrementUsage`, `resetUsageData`
- `script.js` — extended input handler for search engine prefixes, bookmark prefix (`b `), usage tracking, appearance-driven UI (hints visibility, most-visited grid, weather)
- `manifest.json` — version `0.3.0`; added `optional_permissions: ["bookmarks"]`
- `app.html` — loads new utility scripts; weather widget container added
- `popup.html/js` — theme applied on load for visual consistency

### Fixed
- `position: fixed` on keyboard hints now works correctly after moving the element outside the `transform`-ed launcher container

---

## [0.2.0] — 2025

### Added
- `chrome.storage.local` for persistent shortcuts (replacing hard-coded array)
- `defaults.js` — factory default shortcuts
- `storage.js` — shared CRUD utilities
- Options page (Settings) — add, edit, delete, filter shortcuts; reset to defaults
- Toolbar popup — add current page to LaunchTab with one click
- Google fallback search — shows "Search Google" when no shortcuts match
- `g query` bang — type `g tee` to Google-search "tee" directly
- Settings gear icon on new tab page
- `optional_permissions: ["bookmarks"]` groundwork

### Changed
- `manifest.json` — `action`, `options_page`, `permissions: ["storage", "activeTab"]`
- Ranking improved — single-char keys no longer hijack longer queries

---

## [0.1.0] — 2025

### Added
- New-tab override with redirect (`newtab.html` → `app.html?x`) for reliable autofocus
- Fuzzy search with multi-tier ranking
- Result list with Google favicons and fallback letters
- First result auto-selected; Enter opens immediately
- Keyboard navigation (↑↓ Enter Escape ⌘K)
- Fixed keyboard hints bar
- Clock + date widget
- Dark, Apple-inspired design with CSS custom properties
- CSP-compliant structure — no inline scripts or event handlers
