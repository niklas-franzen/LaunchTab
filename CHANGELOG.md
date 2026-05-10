# Changelog

All notable changes are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.4.0] — 2025

### Added
- **Font size setting** (Small / Medium / Large) via `--font-scale` CSS variable; applied instantly alongside theme/accent with no FOUC
- **Show/hide toggles** for clock, date, weather, keyboard hints, most-visited tiles, visit counts, settings button — full "minimal mode" support
- **Visit count badges** on most-visited grid tiles (optional; `showVisitCounts`)
- **Temperature unit selector** (°C / °F) in Appearance; Open-Meteo API natively supports both so no client-side conversion needed; cache invalidated on unit change
- **JSON Export** — full data download (shortcuts, search engines, appearance)
- **JSON Import** — with validation, replace-or-merge choice, and duplicate-key warnings
- **Data tab** in Settings — Import / Export / Reset usage / Reset appearance
- **About tab** in Settings — version, GitHub link, Privacy link, Buy Me a Coffee
- **Restore default theme** button in Appearance
- **URL duplicate detection** in Add/Edit shortcut form (normalises trailing slash, case) — warns and asks for confirmation before proceeding
- **URL duplicate check** in the toolbar popup as well
- **Keyboard navigation in shortcut list** — ArrowUp/Down to highlight items, Enter to open edit form, Escape to deselect, A to open Add form (when no input is focused)
- **Cmd/Ctrl+S** saves the active form from anywhere on the settings page
- Settings list now annotated with `data-key` for robust keyboard targeting

### Changed
- `themes.js` — added `applyFontSize()` + `FONT_SCALES`; IIFE now applies font size alongside theme on every page load
- `storage.js` — `DEFAULT_APPEARANCE` extended with `fontSize`, `showTime`, `showDate`, `tempUnit`, `showVisitCounts`, `showSettingsBtn`
- `weather.js` — temperature unit passed to API (`temperature_unit` param); cache is unit-aware
- `script.js` — `renderDefaultGrid` supports `showMostVisited` toggle and optional visit-count badges; init applies all new appearance fields
- `styles.css` — `--font-scale` variable; greeting and search input use `calc()`; `.grid-card-count` and `.keyboard-focused` added
- `options.html/css/js` — two new tabs (Data, About); Appearance tab extended; keyboard navigation; Cmd+S; URL dup check; import/export
- `popup.js` — URL duplicate warning on "Add to LaunchTab"
- `manifest.json` — version `0.4.0`

### Docs
- `README.md` — icon generation instructions (`sips` / ImageMagick), all new features, Buy Me a Coffee section
- `PRIVACY.md` — import/export section, visit-count tracking note, Buy Me a Coffee note

---

## [0.3.0] — 2025

### Added
- Themes (Graphite, Midnight, Slate, Warm Gray, Pure Black) with no-FOUC localStorage mirror
- Accent colors (Blue, Purple, Green, Orange, Pink, Neutral)
- Weather widget using Open-Meteo + Nominatim (no API key)
- Search engine prefix system (14 defaults; fully manageable)
- Chrome Bookmarks integration (`optional_permissions`)
- Most-visited tiles (sorted by local usage count)
- Options page restructured with 4 tabs; Back-to-LaunchTab button
- `themes.js`, `search-engines.js`, `weather.js`, `bookmarks.js`
- `storage.js` — appearance settings, usage tracking

---

## [0.2.0] — 2025

### Added
- `chrome.storage.local` for persistent shortcuts
- Options page and toolbar popup
- Google fallback search + `g query` bang
- Settings gear icon on new tab page
- Improved ranking — single-char keys no longer hijack longer queries

---

## [0.1.0] — 2025

### Added
- New-tab override with redirect for reliable autofocus
- Fuzzy search with multi-tier ranking
- Result list with favicons and letter fallbacks
- First result auto-selected; Enter opens immediately
- Arrow keys, Escape, ⌘K
- Fixed keyboard hints bar
- Clock + date widget
- Dark, Apple-inspired design
- CSP-compliant — no inline scripts
