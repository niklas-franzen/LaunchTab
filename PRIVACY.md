# Privacy Policy — LaunchTab

_Last updated: 2026-05-09_

## Overview

LaunchTab is a Chrome Extension that replaces the default new tab page with a minimal shortcut launcher. This policy describes what data LaunchTab does and does not collect.

**Short version: LaunchTab collects nothing. Zero.**

---

## Data Collection

LaunchTab does **not** collect, store, transmit, or share any personal data of any kind.

This includes, but is not limited to:

- Browsing history
- Search queries entered into the launcher
- Shortcuts clicked or URLs visited
- IP addresses or location data
- Device identifiers
- Crash reports or analytics events
- Any other personally identifiable information (PII)

---

## Local Storage

All shortcuts are hardcoded directly in `script.js` and shipped with the extension. No data is written to `chrome.storage`, `localStorage`, `sessionStorage`, cookies, or any other persistence mechanism.

---

## Network Requests

LaunchTab makes **zero** network requests. The extension operates entirely offline once installed. No data is sent to any server — Anthropic, the developer's, or any third party.

---

## Third-Party Services

LaunchTab does not use:

- Analytics (Google Analytics, Mixpanel, Amplitude, etc.)
- Error tracking (Sentry, Bugsnag, etc.)
- Advertising networks
- CDNs or external script hosts
- Any embedded third-party code

All code is self-contained in the extension package.

---

## Permissions

LaunchTab requests **no Chrome permissions** beyond what is required to override the new tab page (`chrome_url_overrides`). It cannot access your browsing history, open tabs, bookmarks, or any other browser data.

---

## Children's Privacy

LaunchTab does not target children and collects no data from anyone, regardless of age.

---

## Changes to This Policy

Any future changes to this policy will be reflected in an updated `PRIVACY.md` file committed to the public repository, and in an incremented version number in `manifest.json` and `CHANGELOG.md`.

---

## Contact

For questions about this privacy policy, please open an issue on the project's GitHub repository.
