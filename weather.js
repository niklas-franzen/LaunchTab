/* weather.js — Minimalist weather widget using Open-Meteo + Nominatim.
 *
 * Both APIs are completely free and require no API key.
 *   Open-Meteo: https://open-meteo.com/  (weather data)
 *   Nominatim:  https://nominatim.org/   (reverse geocoding, OSM data)
 *
 * Coordinates from the browser's native Geolocation API.
 * Result is cached in chrome.storage.local for 30 minutes.
 *
 * CSP note: fetch() to external HTTPS domains is allowed by default in
 * Manifest V3 extension pages (no additional permissions required for
 * fetch; only host_permissions if needed — not needed here since both
 * Open-Meteo and Nominatim serve open, CORS-enabled endpoints).
 * ─────────────────────────────────────────────────────────────────────────── */

const WEATHER_STORAGE_KEY = "launchtab_weather";
const WEATHER_TTL_MS      = 30 * 60 * 1000;   // 30 minutes

/**
 * Main entry point. Fetches (or loads from cache) weather and populates `el`.
 * Silently does nothing on any error — weather is purely decorative.
 */
async function initWeather(el) {
  if (!el) return;
  try {
    const data = await loadWeather();
    if (data && data.temp !== undefined && data.city !== undefined) {
      el.textContent = `${data.temp}° · ${data.city}`;
      el.hidden = false;
    }
  } catch (_) {
    // Geolocation denied, network failure, API error — all silently ignored
  }
}

async function loadWeather() {
  const cached = await readWeatherCache();
  if (cached) return cached;

  const pos = await getGeolocation();
  const lat = pos.coords.latitude.toFixed(4);
  const lon = pos.coords.longitude.toFixed(4);

  const [temp, city] = await Promise.all([
    fetchTemperature(lat, lon),
    reverseGeocode(lat, lon),
  ]);

  const result = { temp, city, ts: Date.now() };
  await writeWeatherCache(result);
  return result;
}

function readWeatherCache() {
  return new Promise(resolve => {
    chrome.storage.local.get([WEATHER_STORAGE_KEY], r => {
      const c = r[WEATHER_STORAGE_KEY];
      resolve(c && (Date.now() - c.ts < WEATHER_TTL_MS) ? c : null);
    });
  });
}

function writeWeatherCache(data) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [WEATHER_STORAGE_KEY]: data }, resolve);
  });
}

function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout:     8000,
      maximumAge:  600_000,   // accept a cached position up to 10 minutes old
    });
  });
}

async function fetchTemperature(lat, lon) {
  const url  = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`;
  const res  = await fetch(url);
  const json = await res.json();
  return Math.round(json.current.temperature_2m);
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=de`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LaunchTab/0.3 (Chrome Extension; open-source)" },
  });
  const json = await res.json();
  // Prefer city > town > village > county as fallback
  return json.address?.city
      || json.address?.town
      || json.address?.village
      || json.address?.county
      || "";
}
