# Changelog

All notable changes to LaunchTab are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-09

### Added
- Initial release — MVP
- New tab override via `chrome_url_overrides` (Manifest V3)
- Fuzzy search across shortcut key, name, category, and URL
- Exact key match priority (e.g. `gh` → GitHub ranks above all other gh-prefixed results)
- Live result highlighting — matching characters marked in results
- Keyboard navigation: `↑ ↓ Enter Esc ⌘K`
- Empty-state grid showing the first 6 shortcuts at a glance
- Clock and date widget (top-right, updates every minute)
- Auto-focus on the search input when the tab opens
- Clear button appears when the input has content
- Responsive layout (desktop, tablet, mobile)
- `prefers-reduced-motion` support
- Semantic HTML with ARIA roles and labels for accessibility
- 11 built-in shortcuts: Google, YouTube, Gmail, Google Calendar, Google Drive,
  GitHub, ChatGPT, Claude, LinkedIn, Google Maps, Notion
- Icon generator helper (`generate-icons.html`) using Canvas API
- MIT License
- Privacy policy (no data collected)
- README with installation guide and roadmap
