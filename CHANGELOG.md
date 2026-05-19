# Changelog

All notable changes are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.6.0] — 2026

### Added
- **Chrome Sync (optional)** — Settings → Data → "Sync shortcuts & settings". When enabled, shortcuts, search engines, and appearance are stored in `chrome.storage.sync` and shared across Chrome devices. Usage data and weather cache remain local. Migration flow on first enable: auto-upload if sync is empty, or choose between local/synced data when both exist. Quota errors are caught gracefully with a fallback to local storage.
- **Improved duplicate handling** — fully inline, no `window.confirm()` dialogs:
  - *URL duplicate:* three-option inline dialog — "Update existing" / "Save as duplicate" / "Cancel"
  - *Key conflict:* two-option inline dialog — "Replace existing" / "Cancel"
  - Consistent between toolbar popup, Settings → Shortcuts, and Settings → Search
  - URL normalisation (trailing slash, case) for reliable detection
- **Undo toast for delete** — clicking Delete immediately removes the entry and shows a sticky toast "… deleted · Undo" for 5 seconds. No inline confirm overlay that covers other elements. Works for both shortcuts and search engines, including keyboard-triggered deletes.
- **Escape closes Add/Edit forms** — pressing Escape in any form input cancels the form without saving. Focus returns to the list, restoring the previously highlighted item (or the item that was just saved). Priority: filter field → form → list navigation.
- **Ambient search glow** — Settings → Appearance → Ambient Glow. Soft radial gradient behind the search bar; CSS-only, no blur filter, zero cost when disabled. Options: toggle on/off, color (Blue/Purple/Green/Neutral), intensity (Subtle/Medium/Strong). Applied via `--glow-bg` CSS custom property set by `themes.js`. Saved to appearance and mirrored to `localStorage` for no-FOUC on next load. Respects `prefers-reduced-motion`.
- **Responsive equal-width top-cards grid** — `grid-template-columns: repeat(3, minmax(0, 1fr))` ensures all 6 tiles are strictly equal width on any viewport. Card names use `-webkit-line-clamp: 2` for clean two-line truncation. Breakpoints: 3 × 2 (≥ 600 px) → 2 × 3 → 1 column.
- **Inline import mode dialog** — replaces `window.confirm()` in the import flow with an inline "Replace all / Merge / Cancel" panel.

### Changed
- `storage.js` — central sync abstraction: `getStore()`, `isSyncEnabled()`, `setSyncEnabledFlag()`, `storeSet()`, `storeGet()`, sync migration helpers. All CRUD functions route through `getStore()`. Usage/weather always local. `DEFAULT_APPEARANCE` extended with `glowEnabled`, `glowColor`, `glowIntensity`.
- `themes.js` — added `applyGlow(enabled, color, intensity)` with `GLOW_COLORS` and `GLOW_INTENSITY` maps. IIFE now applies glow alongside theme/font on every page load.
- `styles.css` — `body::before` ambient glow layer (`--glow-bg` variable, `z-index: 0`); launcher/hints/settings-btn lifted to `z-index: 1`; `default-grid` uses `minmax(0, 1fr)`; `.grid-card` gets `min-width: 0`; `.grid-card-name` uses `line-clamp: 2`.
- `options.html` — Data tab: sync toggle + migration panel + inline import dialog. Appearance tab: Ambient Glow section with color/intensity pickers.
- `options.js` — `renderShortcutList` / `renderEngineList` accept `restoreFocusKey` param; `openShortcutAddForm` / `openShortcutEditForm` save `_preFormFocusKey`; `closeShortcutForm` / `closeEngineForm` restore focus. `doDeleteShortcut` / `doDeleteEngine` use undo toast. `handleShortcutSave` / `handleEngineSave` use inline dup dialogs. Full sync UI: `renderSyncTab`, `handleEnableSync`, `handleDisableSync`, `reloadData`. Import uses inline dialog. `renderAppearance` wires glow toggle and `renderGlowOptions`.
- `options.css` — `.dup-dialog` inline conflict panel; `.sync-migration` panel; `.status-banner` now sticky with `status-text` + `.status-undo-btn`; `.glow-options`, `.glow-color-btn`, `.glow-intensity-btn`; removed old `.confirm-wrap`/`.btn-confirm-yes`/`.btn-confirm-no`.
- `popup.html` — inline `p-dup-dialog` (URL dup) and `p-key-dialog` (key conflict) panels.
- `popup.js` — `handleAdd` uses `showUrlDupDialog` / `showKeyDupDialog`; `commitSave` / `commitUpdate` helpers.
- `popup.css` — `.dup-dialog`, `.dup-dialog--warn`, `.btn-action`, `.btn-action--ghost`.
- `manifest.json` — version `0.6.0`. No new permissions required (`storage` already covers sync).

### Docs
- `README.md` — Chrome Sync, Ambient Glow, duplicate handling, responsive tiles, Undo toast, updated file structure.
- `PRIVACY.md` — Chrome Sync section explaining what is and is not synced; updated third-party services table.

---

## [0.4.0] — 2025

### Added
- **Font size setting** (Small / Medium / Large) via `--font-scale` CSS variable
- **Show/hide toggles** for clock, date, weather, keyboard hints, most-visited tiles, visit counts, settings button
- **Visit count badges** on most-visited grid tiles (optional)
- **Temperature unit selector** (°C / °F)
- **JSON Export / Import** with validation and replace-or-merge choice
- **Data tab** in Settings
- **About tab** in Settings
- **URL duplicate detection** in Add/Edit shortcut form and toolbar popup
- **Keyboard navigation** in shortcut list — ArrowUp/Down, Enter, Escape, A, Cmd+S

### Changed
- `themes.js` — added `applyFontSize()`
- `storage.js` — `DEFAULT_APPEARANCE` extended
- `options.html/css/js` — two new tabs, Appearance extended, keyboard navigation

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
