# LaunchTab — Privacy Policy

*Last updated: 2025*

LaunchTab is a Chrome browser extension. This document explains clearly what data the extension accesses, stores, and transmits.

---

## Data collected and stored

All data is stored **locally on your device** using Chrome's `chrome.storage.local` API. Nothing is transmitted to external servers operated by us.

| What | Where | Why |
|------|-------|-----|
| Shortcuts (key, name, URL, category) | `chrome.storage.local` | Core launcher functionality |
| Search engine definitions | `chrome.storage.local` | Search prefix feature |
| Appearance settings (theme, accent, toggles) | `chrome.storage.local` | Personalised look & feel |
| Usage counts per shortcut | `chrome.storage.local` | Sort "most visited" tiles; no counts shown to the user |
| Weather cache (temperature, city, timestamp) | `chrome.storage.local` | Avoid repeated API calls; expires after 30 minutes |
| Theme mirror (theme name, accent name) | `localStorage` | Instant no-flash theme on page load |

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
| `storage` | Save shortcuts, settings, and usage data locally |
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

LaunchTab loads **no external JavaScript**. All JS runs from within the extension bundle.

---

## Data deletion

Remove the extension via `chrome://extensions` to delete all stored data. Use **Reset to defaults** buttons in Settings to reset individual data sets without uninstalling.

---

*LaunchTab is open-source. Issues and questions can be raised on the project repository.*
