# LaunchTab

> A minimal, Apple-inspired fuzzy shortcut launcher for your new tab.

---

## Features

### Core launcher
- **Fuzzy search** over shortcuts by key, name, domain, or category
- **First result auto-selected** — press Enter to open immediately
- **Arrow keys** navigate; **Escape** clears; **⌘K** re-focuses
- Reliable autofocus on every new tab via smart redirect

### Search engine prefixes
Type `[key] [query]` to search any engine directly:

| Type | Result |
|------|--------|
| `g tee` | Google: "tee" |
| `yt deadlift` | YouTube: "deadlift" |
| `wiki thermodynamik` | Wikipedia DE |
| `maps essen rüttenscheid` | Google Maps |
| `gh launchtab` | GitHub |
| `so javascript map` | Stack Overflow |
| `deepl hello` | DeepL translator |

`key` alone (no space) still opens the normal shortcut.

### Google fallback
When nothing matches, a Google search result appears automatically. Press Enter to search.

### Bookmarks (optional)
Enable in Settings → Bookmarks. Type `b query` to search bookmarks only.

### Weather widget
Minimal `17°C · Duisburg` display. Celsius or Fahrenheit. Uses Open-Meteo (free, no API key).

### Themes & accent colors
- **Themes:** Graphite · Midnight · Slate · Warm Gray · Pure Black
- **Accents:** Blue · Purple · Green · Orange · Pink · Neutral
- **Font sizes:** Small · Medium · Large

### Most visited tiles
The 6 quick-access tiles re-sort automatically by how often you open each shortcut.
Optional: show/hide visit counts (e.g. `12×`).

### Flexible display
Toggle individually: clock, date, weather, keyboard hints, tiles, settings button.

### JSON Import / Export
Back up and restore all your shortcuts, search engines, and appearance settings.

---

## Installation (local / development)

1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** → select the project folder
5. Open a new tab — LaunchTab replaces it

### Icon generation from `icons/logo.png`

Run once in your project folder (requires macOS with `sips`):

```bash
sips -z  16  16 icons/logo.png --out assets/icons/icon16.png
sips -z  32  32 icons/logo.png --out assets/icons/icon32.png
sips -z  48  48 icons/logo.png --out assets/icons/icon48.png
sips -z 128 128 icons/logo.png --out assets/icons/icon128.png
```

Or with ImageMagick (cross-platform):
```bash
for s in 16 32 48 128; do
  convert icons/logo.png -resize ${s}x${s} assets/icons/icon${s}.png
done
```

---

## Settings

Open Settings via the ⚙ icon on the new tab page, or right-click the extension icon → **Options**.

### Shortcuts
Add, edit, delete, filter. Keyboard navigation: ↑↓ to highlight, Enter to edit, A to add, Cmd+S to save.

### Search
Manage search engine prefixes — toggle, add, edit, delete, reset.

### Appearance
Theme · Accent color · Font size · Clock/date · Weather (°C/°F) · Hints · Tiles · Visit counts · Restore defaults.

### Bookmarks
Enable Chrome bookmark search (requests `bookmarks` permission on first enable).

### Data
Export JSON · Import JSON (replace or merge) · Reset usage data · Reset appearance.

### About
Version info · GitHub link · Privacy policy · Buy Me a Coffee.

---

## Adding a shortcut via the toolbar

Click the LaunchTab icon in Chrome's toolbar. The current page URL and title are pre-filled. Enter a shortcut key and click **Add to LaunchTab**.

---

## Permissions

| Permission | Why |
|-----------|-----|
| `storage` | Saves shortcuts, settings, and usage data locally |
| `activeTab` | Reads current tab URL/title in the popup |
| `bookmarks` *(optional)* | Only requested when you enable bookmark search |

Geolocation is requested through the browser's normal permission dialog when you enable the weather widget — no manifest entry needed.

No data is transmitted to any server operated by this extension.

---

## Privacy

All data stays on your device. See [PRIVACY.md](PRIVACY.md) for the full policy.

---

## Support

If you enjoy LaunchTab and want to support development:

**[Buy Me a Coffee ☕](https://www.buymeacoffee.com/YOURNAME)**
*(Replace with your actual link)*

No ads, no analytics, always free.

---

## File structure

```
LaunchTab/
├── newtab.html          New-tab redirect stub
├── newtab-redirect.js   Redirects to app.html?x
├── newtab.css
├── app.html             Main launcher UI
├── script.js            Core logic
├── styles.css
├── themes.js            Theme / accent / font-size system
├── defaults.js          Factory-default shortcuts
├── storage.js           chrome.storage helpers + appearance + usage
├── search-engines.js    Search-engine prefix system
├── weather.js           Weather widget (Open-Meteo + Nominatim)
├── bookmarks.js         Optional bookmark search
├── options.html/css/js  Settings page (6 tabs)
├── popup.html/css/js    Toolbar popup
└── assets/icons/        Extension icons
```
