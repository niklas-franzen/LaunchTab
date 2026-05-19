# LaunchTab — Privacy Policy

*Last updated: 2026*

LaunchTab is a Chrome browser extension. This document explains clearly what data the extension accesses, stores, and transmits.

---

## Data collected and stored

By default, all data is stored **locally on your device** using Chrome's `chrome.storage.local` API. If you opt into Chrome Sync (see below), selected data is additionally stored in `chrome.storage.sync`.

| What | Where | Why |
|------|-------|-----|
| Shortcuts (key, name, URL, category) | `chrome.storage.local` or `.sync` | Core launcher functionality |
| Search engine definitions | `chrome.storage.local` or `.sync` | Search prefix feature |
| Appearance settings (theme, accent, toggles) | `chrome.storage.local` or `.sync` | Personalised look & feel |
| Usage counts per shortcut | `chrome.storage.local` only | Sort "most visited" tiles; never synced |
| Weather cache (temperature, city, timestamp) | `chrome.storage.local` only | Avoid repeated API calls; expires after 30 minutes; never synced |
| Theme mirror (theme name, accent name, glow) | `localStorage` | Instant no-flash theme on page load |

---

## Chrome Sync (optional)

Settings → Data → "Sync shortcuts & settings" lets you sync shortcuts, search engines, and appearance settings between Chrome devices.

When Sync is enabled:
- Shortcuts, search engines, and appearance settings are written to `chrome.storage.sync`.
- Chrome transmits this data between your devices via your Google Account, subject to Google's Privacy Policy.
- **LaunchTab does not operate its own sync servers** — the data flows directly through Chrome's built-in sync infrastructure.
- **Usage data, weather cache, and location data are never synced** — they remain device-local at all times.

When Sync is disabled (default):
- All data stays in `chrome.storage.local` on the current device only.
- Any previously synced data remains in Chrome Sync until you sign out of Chrome or clear it manually.

---

## Data NOT collected

- No analytics or usage tracking to external services
- No advertising networks
- No telemetry
- No user identifiers
- No browsing history sent anywhere

---

## Permissions used

| Permission | Reason |
|-----------|--------|
| `storage` | Save shortcuts, settings, and usage data locally; optionally sync via Chrome Sync |
| `activeTab` | Read the current tab URL and title when you click the toolbar icon |
| `bookmarks` *(optional)* | Search Chrome bookmarks — only requested when you explicitly enable the feature |

### Optional permission: `bookmarks`

Not requested at install time. Only requested when you enable *"Include bookmarks in search"* in Settings → Bookmarks. Bookmark data is read locally and never transmitted.

---

## Weather widget

If you enable the weather widget in Settings → Appearance:

1. The browser's Geolocation API obtains approximate GPS coordinates.
2. Coordinates are sent to **[Open-Meteo](https://open-meteo.com/)** (free, GDPR-compliant, no API key) for the current temperature.
3. Coordinates are sent to **[Nominatim](https://nominatim.openstreetmap.org/)** (OpenStreetMap) for reverse geocoding (coordinates → city name).
4. The result (temperature + city) is cached for 30 minutes. Raw coordinates are **not** stored persistently by LaunchTab.

If you deny location permission or disable weather, no location data is accessed.

---

## Third-party services

| Service | Purpose | Data sent |
|---------|---------|-----------|
| Google Favicon API | Shortcut / engine icons | Domain name only |
| Open-Meteo | Weather temperature | Approximate GPS coordinates |
| Nominatim (OSM) | City name | Approximate GPS coordinates |
| Chrome Sync (Google) | Device sync (opt-in only) | Shortcuts, search engines, appearance settings |

LaunchTab loads **no external JavaScript**. All JS runs from within the extension bundle.

---

## Data deletion

Remove the extension via `chrome://extensions` to delete all locally stored data. Use **Reset to defaults** buttons in Settings to reset individual data sets without uninstalling.

To remove synced data: disable Sync in Settings → Data, then sign out of Chrome or clear Chrome Sync data via your Google Account settings.

---

*LaunchTab is open-source. Issues and questions can be raised on the project repository.*
