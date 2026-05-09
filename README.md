# LaunchTab

> A minimal, Apple-inspired fuzzy shortcut launcher for your new tab.

![LaunchTab Screenshot Placeholder](assets/screenshot-placeholder.png)

LaunchTab replaces Chrome's default new tab page with a clean, keyboard-first shortcut launcher. Type a shortcut key or name, hit Enter, and you're there instantly. No mouse required.

---

## Features

- **Fuzzy search** — type `gma` to find Gmail, `git` to find GitHub, `cal` for Calendar
- **Keyboard-first** — full navigation via `↑ ↓ Enter Esc` and `⌘K`
- **Exact key priority** — short aliases (`gh`, `yt`, `chat`) always surface first
- **Live highlighting** — matching characters are highlighted as you type
- **Empty-state grid** — your most-used shortcuts at a glance when the input is blank
- **Minimal design** — dark, focused, distraction-free — no widgets, no ads, no noise
- **No permissions required** — no access to your browsing data or history
- **No network requests** — fully offline, zero external dependencies
- **Responsive** — works on any screen size

---

## Screenshots

> _Add screenshots to `assets/` after your first install._

---

## Local Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `launchtab/` folder (this project's root directory)
5. Open a new tab — LaunchTab is live

> **Note on icons:** Before loading the extension, open `generate-icons.html` in any browser, click **Download all icons**, and save the four PNG files into `assets/icons/`. The extension works without them (Chrome will show a blank icon), but proper icons are required for Chrome Web Store submission.

---

## Adding or Editing Shortcuts

Open `script.js` and find the `SHORTCUTS` array at the top of the file:

```js
const SHORTCUTS = [
  { key: "gh",  name: "GitHub",  url: "https://github.com",  category: "Dev"   },
  { key: "yt",  name: "YouTube", url: "https://youtube.com", category: "Media" },
  // Add your own here ↓
  { key: "tw",  name: "Twitter", url: "https://twitter.com", category: "Social" },
];
```

| Field      | Description                              |
|------------|------------------------------------------|
| `key`      | Short alias you type (keep it ≤ 6 chars) |
| `name`     | Display name shown in results            |
| `url`      | Full URL including `https://`            |
| `category` | Label tag (use consistent names)         |

After saving, reload the extension at `chrome://extensions` → click the reload icon (↺) next to LaunchTab.

---

## Keyboard Shortcuts

| Key          | Action                          |
|--------------|---------------------------------|
| (auto-focus) | Search input is focused on load |
| `↓ / ↑`      | Navigate through results        |
| `Enter`      | Open highlighted result         |
| `Esc`        | Clear the search input          |
| `⌘K / Ctrl+K`| Focus search from anywhere      |

---

## Project Structure

```
launchtab/
├── manifest.json         Chrome Extension manifest (MV3)
├── newtab.html           New tab page markup
├── styles.css            All styles — design tokens at the top
├── script.js             Shortcuts data + fuzzy search + UI logic
├── generate-icons.html   One-time helper to create PNG icon assets
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
├── README.md
├── PRIVACY.md
├── CHANGELOG.md
└── LICENSE
```

---

## Roadmap

- [ ] Persistent custom shortcuts via `chrome.storage.sync`
- [ ] Settings page for managing shortcuts without editing code
- [ ] Favicon loading for each shortcut
- [ ] Most-visited / frecency-based sorting
- [ ] Dark/light mode auto-switch
- [ ] Command palette style commands (e.g. `:search query` → Google search)
- [ ] Import / export shortcuts as JSON

---

## Publishing to the Chrome Web Store

1. Zip the project folder: `zip -r launchtab.zip launchtab/ --exclude "*.DS_Store"`
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer registration fee (if not already done)
4. Click **New item** and upload the zip
5. Fill in the store listing:
   - Screenshots (1280×800 or 640×400)
   - Description
   - Category: **Productivity**
   - Privacy practices: no user data collected (see PRIVACY.md)
6. Submit for review (typically 1–3 business days)

> Ensure `manifest.json` has a unique version string for each submission.

---

## License

MIT — see [LICENSE](LICENSE)
