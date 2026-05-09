/* themes.js — Theme and accent color system for LaunchTab.
 *
 * The IIFE at the bottom applies the saved theme from localStorage IMMEDIATELY
 * on script load (before the first paint), eliminating any flash of the
 * default Graphite theme when a different theme is selected.
 *
 * chrome.storage is async — localStorage serves as a synchronous mirror that
 * is kept in sync by saveAppearance() in storage.js.
 * ─────────────────────────────────────────────────────────────────────────── */

const THEME_DEFINITIONS = {
  graphite: {
    "--bg":             "#1c1c1e",
    "--surface":        "rgba(44,44,46,.78)",
    "--surface-hover":  "rgba(58,58,60,.9)",
    "--surface-active": "rgba(72,72,74,.95)",
    "--text-primary":   "#f5f5f7",
    "--text-secondary": "#a1a1a6",
    "--text-muted":     "#6e6e73",
    "--border":         "rgba(255,255,255,.08)",
    "--shadow-sm":      "0 2px 8px rgba(0,0,0,.3)",
    "--shadow-md":      "0 8px 32px rgba(0,0,0,.4)",
  },
  midnight: {
    "--bg":             "#0d0f1a",
    "--surface":        "rgba(22,26,50,.85)",
    "--surface-hover":  "rgba(32,38,68,.9)",
    "--surface-active": "rgba(44,50,82,.95)",
    "--text-primary":   "#e8eaf6",
    "--text-secondary": "#9fa8da",
    "--text-muted":     "#5c6a9e",
    "--border":         "rgba(200,210,255,.08)",
    "--shadow-sm":      "0 2px 12px rgba(0,0,30,.5)",
    "--shadow-md":      "0 8px 40px rgba(0,0,30,.6)",
  },
  slate: {
    "--bg":             "#161920",
    "--surface":        "rgba(34,38,50,.85)",
    "--surface-hover":  "rgba(46,52,68,.9)",
    "--surface-active": "rgba(58,64,82,.95)",
    "--text-primary":   "#e2e4eb",
    "--text-secondary": "#94a3b8",
    "--text-muted":     "#64748b",
    "--border":         "rgba(200,220,255,.07)",
    "--shadow-sm":      "0 2px 8px rgba(0,0,0,.35)",
    "--shadow-md":      "0 8px 32px rgba(0,0,0,.45)",
  },
  warmgray: {
    "--bg":             "#1a1814",
    "--surface":        "rgba(42,38,32,.85)",
    "--surface-hover":  "rgba(56,50,42,.9)",
    "--surface-active": "rgba(70,62,52,.95)",
    "--text-primary":   "#f0ede8",
    "--text-secondary": "#a8a09a",
    "--text-muted":     "#6e6760",
    "--border":         "rgba(255,240,220,.07)",
    "--shadow-sm":      "0 2px 8px rgba(0,0,0,.3)",
    "--shadow-md":      "0 8px 32px rgba(0,0,0,.4)",
  },
  pureblack: {
    "--bg":             "#000000",
    "--surface":        "rgba(16,16,16,.98)",
    "--surface-hover":  "rgba(26,26,26,.98)",
    "--surface-active": "rgba(36,36,36,1)",
    "--text-primary":   "#ffffff",
    "--text-secondary": "#ababab",
    "--text-muted":     "#6e6e6e",
    "--border":         "rgba(255,255,255,.06)",
    "--shadow-sm":      "0 2px 8px rgba(0,0,0,.5)",
    "--shadow-md":      "0 8px 32px rgba(0,0,0,.7)",
  },
};

const ACCENT_DEFINITIONS = {
  blue:    { "--accent": "#0a84ff", "--accent-dim": "rgba(10,132,255,.18)",  "--accent-glow": "rgba(10,132,255,.12)",  "--border-focus": "rgba(10,132,255,.5)"  },
  purple:  { "--accent": "#bf5af2", "--accent-dim": "rgba(191,90,242,.18)",  "--accent-glow": "rgba(191,90,242,.12)",  "--border-focus": "rgba(191,90,242,.5)"  },
  green:   { "--accent": "#30d158", "--accent-dim": "rgba(48,209,88,.18)",   "--accent-glow": "rgba(48,209,88,.12)",   "--border-focus": "rgba(48,209,88,.5)"   },
  orange:  { "--accent": "#ff9f0a", "--accent-dim": "rgba(255,159,10,.18)",  "--accent-glow": "rgba(255,159,10,.12)",  "--border-focus": "rgba(255,159,10,.5)"  },
  pink:    { "--accent": "#ff375f", "--accent-dim": "rgba(255,55,95,.18)",   "--accent-glow": "rgba(255,55,95,.12)",   "--border-focus": "rgba(255,55,95,.5)"   },
  neutral: { "--accent": "#e0e0e5", "--accent-dim": "rgba(224,224,229,.12)", "--accent-glow": "rgba(224,224,229,.08)", "--border-focus": "rgba(224,224,229,.35)" },
};

/**
 * Applies theme + accent CSS variables to document root via inline styles.
 * Inline styles override the stylesheet defaults, so no CSS specificity tricks needed.
 */
function applyTheme(themeName, accentName) {
  const root   = document.documentElement;
  const theme  = THEME_DEFINITIONS[themeName]   || THEME_DEFINITIONS.graphite;
  const accent = ACCENT_DEFINITIONS[accentName] || ACCENT_DEFINITIONS.blue;

  Object.entries({ ...theme, ...accent }).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });

  root.dataset.theme  = themeName;
  root.dataset.accent = accentName;

  // Mirror to localStorage so the next page load can apply instantly (no flash)
  try {
    localStorage.setItem("lt_theme",  themeName);
    localStorage.setItem("lt_accent", accentName);
  } catch (_) { /* ignore if storage is blocked */ }
}

// Apply immediately from localStorage — zero async latency, no FOUC
(function applyThemeFromLocalStorage() {
  const t = localStorage.getItem("lt_theme")  || "graphite";
  const a = localStorage.getItem("lt_accent") || "blue";
  applyTheme(t, a);
}());
