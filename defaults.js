/* ─── Default Shortcuts ───────────────────────────────────────────────────────
 *
 * Central definition of the factory defaults. Loaded before storage.js.
 * Changing this array only affects new installs or users who click
 * "Reset to defaults" in Settings — existing saved shortcuts are untouched.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

const DEFAULT_SHORTCUTS = [
  { key: "g",      name: "Google",          url: "https://www.google.com",       category: "Search"       },
  { key: "yt",     name: "YouTube",         url: "https://www.youtube.com",      category: "Media"        },
  { key: "gm",     name: "Gmail",           url: "https://mail.google.com",      category: "Google"       },
  { key: "cal",    name: "Google Calendar", url: "https://calendar.google.com",  category: "Google"       },
  { key: "drive",  name: "Google Drive",    url: "https://drive.google.com",     category: "Google"       },
  { key: "gh",     name: "GitHub",          url: "https://github.com",           category: "Dev"          },
  { key: "chat",   name: "ChatGPT",         url: "https://chatgpt.com",          category: "AI"           },
  { key: "claude", name: "Claude",          url: "https://claude.ai",            category: "AI"           },
  { key: "li",     name: "LinkedIn",        url: "https://www.linkedin.com",     category: "Career"       },
  { key: "maps",   name: "Google Maps",     url: "https://maps.google.com",      category: "Google"       },
  { key: "notion", name: "Notion",          url: "https://www.notion.so",        category: "Productivity" },
];
