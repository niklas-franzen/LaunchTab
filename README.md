# LaunchTab

> A minimal, Apple-inspired fuzzy shortcut launcher for your new tab — with search engines, bookmarks, weather, and themes.

---

## Features

### Core launcher
- **Fuzzy search** over all your shortcuts by key, name, domain, or category
- **First result auto-selected** — press Enter to open immediately
- **Arrow keys** navigate; **Escape** clears the input
- **Keyboard hints** fixed at the bottom (toggleable)
- **Settings gear** bottom-right links to the options page
- Reliable autofocus on every new tab

### Search engine prefixes
Type `[key] [query]` to search any engine directly:

| Type | Result |
|------|--------|
| `g tee` | Google search for "tee" |
| `yt deadlift` | YouTube search |
| `wiki thermodynamik` | Wikipedia DE search |
| `maps essen rüttenscheid` | Google Maps search |
| `gh launchtab` | GitHub search |
| `so javascript map` | Stack Overflow search |

`key` alone (no space) still opens the normal shortcut.

### Google fallback
When no shortcut matches, a Google search result appears automatically. Press Enter to search.

### Chrome Bookmarks *(optional)*
Enable in Settings → Bookmarks. Type `b query` to search bookmarks only.

### Weather widget
Minimal temperature + city in the top-right corner. Uses Open-Meteo (no API key needed).

### Themes & accent colors
- **Themes:** Graphite · Midnight · Slate · Warm Gray · Pure Black
- **Accents:** Blue · Purple · Green · Orange · Pink · Neutral

### Most visited tiles
The 6 quick-access tiles re-sort automatically by how often you open each shortcut. No counters shown.

---

## Installation (local / development)

1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the project folder
5. Open a new tab — LaunchTab replaces it

---

## Settings

Open Settings via the gear icon on the new tab page, or right-click the extension icon → **Options**.

### Shortcuts tab
Add, edit, delete, and filter your shortcuts. Each shortcut has a **key** (what you type), **name**, **URL**, and **category**.

### Search tab
Manage search engine prefixes. Toggle individual engines, add custom ones, or reset to defaults.

### Appearance tab
- Choose a **theme** and **accent color** — applied instantly with no page reload
- Toggle the **weather widget** (requires location permission)
- Toggle **keyboard hints** and **most visited tiles**

### Bookmarks tab
- Enable Chrome bookmark search (requests the `bookmarks` permission on first enable)
- Reset usage data for the most-visited grid

---

## Adding a shortcut via the toolbar

Click the LaunchTab icon in Chrome's toolbar to open a quick-add popup. The current page's URL and title are pre-filled. Enter a shortcut key and click **Add to LaunchTab**.

---

## Permissions explained

| Permission | Why |
|-----------|-----|
| `storage` | Saves shortcuts, settings, and usage data locally |
| `activeTab` | Reads the current tab URL/title in the popup |
| `bookmarks` *(optional)* | Search Chrome bookmarks; only requested when you enable the feature |

No data is transmitted to any server operated by this extension.

---

## Privacy

All data stays on your device. See [PRIVACY.md](PRIVACY.md) for the full policy.

---

## File structure

```
LaunchTab/
├── newtab.html          Minimal redirect stub (new-tab override)
├── newtab-redirect.js   Redirects to app.html?x
├── newtab.css
├── app.html             Main launcher UI
├── script.js            Core logic
├── styles.css
├── themes.js            Theme/accent system
├── defaults.js          Factory-default shortcuts
├── storage.js           All chrome.storage helpers
├── search-engines.js    Search engine prefixes
├── weather.js           Weather widget
├── bookmarks.js         Bookmark search
├── options.html/css/js  Settings page
├── popup.html/css/js    Toolbar popup
└── assets/icons/        Extension icons
```
