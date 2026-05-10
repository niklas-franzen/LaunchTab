/* weather.js — Minimalist weather widget using Open-Meteo + Nominatim.
 *
 * Both APIs are completely free, require no API key, and are GDPR-compliant.
 *   Open-Meteo: https://open-meteo.com/  (supports temperature_unit param)
 *   Nominatim:  https://nominatim.org/   (OpenStreetMap reverse geocoding)
 *
 * The cache is invalidated if the temperature unit changes, so switching
 * between °C and °F always fetches fresh data.
 * ─────────────────────────────────────────────────────────────────────────── */

const WEATHER_STORAGE_KEY = "launchtab_weather";
const WEATHER_TTL_MS      = 30 * 60 * 1000;  // 30 minutes

/**
 * Main entry point. Fetches (or loads from cache) weather and populates `el`.
 * @param {HTMLElement} el - target element to render into
 * @param {string} tempUnit - "C" or "F"
 */
async function initWeather(el, tempUnit = "C") {
  if (!el) return;
  try {
    const data = await loadWeather(tempUnit);
    if (data && data.temp !== undefined) {
      const label = data.unit === "F" ? "°F" : "°C";
      el.textContent = `${data.temp}${label} · ${data.city}`;
      el.hidden = false;
    }
  } catch (_) {
    // Geolocation denied, network failure, API error — silently ignored
  }
}

async function loadWeather(tempUnit) {
  const cached = await readWeatherCache(tempUnit);
  if (cached) return cached;

  const pos  = await getGeolocation();
  const lat  = pos.coords.latitude.toFixed(4);
  const lon  = pos.coords.longitude.toFixed(4);

  const [temp, city] = await Promise.all([
    fetchTemperature(lat, lon, tempUnit),
    reverseGeocode(lat, lon),
  ]);

  const result = { temp, city, unit: tempUnit, ts: Date.now() };
  await writeWeatherCache(result);
  return result;
}

function readWeatherCache(tempUnit) {
  return new Promise(resolve => {
    chrome.storage.local.get([WEATHER_STORAGE_KEY], r => {
      const c = r[WEATHER_STORAGE_KEY];
      // Invalidate if expired OR if the unit has changed since last fetch
      if (c && c.unit === tempUnit && (Date.now() - c.ts < WEATHER_TTL_MS)) {
        resolve(c);
      } else {
        resolve(null);
      }
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
      timeout:    8000,
      maximumAge: 600_000,  // accept a cached position up to 10 min old
    });
  });
}

async function fetchTemperature(lat, lon, unit) {
  // Open-Meteo natively supports both units via the temperature_unit param
  const unitParam = unit === "F" ? "fahrenheit" : "celsius";
  const url  = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=${unitParam}`;
  const res  = await fetch(url);
  const json = await res.json();
  return Math.round(json.current.temperature_2m);
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=de`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LaunchTab/0.4 (Chrome Extension; open-source)" },
  });
  const json = await res.json();
  return json.address?.city
      || json.address?.town
      || json.address?.village
      || json.address?.county
      || "";
}
