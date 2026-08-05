/**
 * HA-OS – Theme-Modul
 *
 * Eigener Namespace (--haos-*, window.HaOsTheme, eigener localStorage-Key),
 * damit das alte Glass-Dashboard parallel geladen werden kann ohne Kollision.
 *
 * Alle Werte sind projektintern. Das Home-Assistant-Theme wird NICHT umgeschaltet.
 */

const STORAGE_KEY = "ha-os-theme-v1";

export const THEME_DEFAULTS = Object.freeze({
  mode: "dark",
  accent: "#0a84ff",
  margin: 25,

  // Hintergrundkarte = die grosse Glasflaeche der Shell
  cardSurface: "#ffffff",
  cardOpacity: 10,
  cardBlur: 16,
  cardSaturation: 160,
  cardRadius: 14,
  cardBorder: "#ffffff",
  cardBorderOpacity: 25,

  // Entitaetskarte = die einzelnen Karten darin
  entitySurface: "#ffffff",
  entityOpacity: 10,
  entityBlur: 16,
  entitySaturation: 160,
  entityRadius: 14,
  entityBorder: "#ffffff",
  entityBorderOpacity: 25,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const color = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;

const hexToRgb = (hex) => {
  const value = String(hex).replace("#", "");
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16)).join(", ");
};

export const normalizeTheme = (settings = {}) => ({
  mode: settings.mode === "light" ? "light" : "dark",
  accent: color(settings.accent, THEME_DEFAULTS.accent),
  margin: clamp(settings.margin, 0, 60, THEME_DEFAULTS.margin),

  cardSurface: color(settings.cardSurface, THEME_DEFAULTS.cardSurface),
  cardOpacity: clamp(settings.cardOpacity, 0, 95, THEME_DEFAULTS.cardOpacity),
  cardBlur: clamp(settings.cardBlur, 0, 50, THEME_DEFAULTS.cardBlur),
  cardSaturation: clamp(settings.cardSaturation, 50, 240, THEME_DEFAULTS.cardSaturation),
  cardRadius: clamp(settings.cardRadius, 0, 40, THEME_DEFAULTS.cardRadius),
  cardBorder: color(settings.cardBorder, THEME_DEFAULTS.cardBorder),
  cardBorderOpacity: clamp(settings.cardBorderOpacity, 0, 80, THEME_DEFAULTS.cardBorderOpacity),

  entitySurface: color(settings.entitySurface, THEME_DEFAULTS.entitySurface),
  entityOpacity: clamp(settings.entityOpacity, 0, 95, THEME_DEFAULTS.entityOpacity),
  entityBlur: clamp(settings.entityBlur, 0, 50, THEME_DEFAULTS.entityBlur),
  entitySaturation: clamp(settings.entitySaturation, 50, 240, THEME_DEFAULTS.entitySaturation),
  entityRadius: clamp(settings.entityRadius, 0, 40, THEME_DEFAULTS.entityRadius),
  entityBorder: color(settings.entityBorder, THEME_DEFAULTS.entityBorder),
  entityBorderOpacity: clamp(settings.entityBorderOpacity, 0, 80, THEME_DEFAULTS.entityBorderOpacity),
});

const read = () => {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return normalizeTheme(stored ? JSON.parse(stored) : THEME_DEFAULTS);
  } catch (_error) {
    return normalizeTheme(THEME_DEFAULTS);
  }
};

/**
 * Setzt die CSS-Variablen auf <html>.
 *
 * Die Karten lesen ausschliesslich diese Variablen. Dadurch erfordert eine
 * Theme-Aenderung KEIN Neu-Rendern der Karten – der Browser rechnet neu,
 * nicht JavaScript. Das war einer der Ausloeser der alten Render-Schleife.
 */
const apply = (settings) => {
  const t = normalizeTheme(settings);
  if (typeof document === "undefined") return t;

  const light = t.mode === "light";

  // Light braucht hoehere Mindestwerte, sonst verschwindet der Glaseffekt.
  const cardOpacity = light ? Math.max(t.cardOpacity, 26) : t.cardOpacity;
  const entityOpacity = light ? Math.max(t.entityOpacity, 20) : t.entityOpacity;
  const cardBorderOpacity = light ? Math.max(t.cardBorderOpacity, 46) : t.cardBorderOpacity;
  const entityBorderOpacity = light ? Math.max(t.entityBorderOpacity, 38) : t.entityBorderOpacity;

  const values = {
    "--haos-color-scheme": t.mode,
    "--haos-text": light ? "#18212a" : "#ffffff",
    "--haos-text-rgb": light ? "24, 33, 42" : "255, 255, 255",
    "--haos-text-inverse": light ? "#ffffff" : "#18212a",
    "--haos-font-family":
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
    "--haos-font-weight-normal": "450",
    "--haos-font-weight-semibold": "650",

    "--haos-card-shadow": light
      ? "0 18px 48px rgba(38, 48, 58, .18), inset 0 1px 0 rgba(255, 255, 255, .55)"
      : "0 24px 70px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 255, 255, .10)",
    "--haos-entity-shadow": light
      ? "0 10px 28px rgba(38, 48, 58, .14), inset 0 1px 0 rgba(255, 255, 255, .58)"
      : "0 12px 30px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .08)",
    "--haos-user-shadow": light
      ? "0 6px 18px rgba(25, 34, 44, .24), inset 0 1px 0 rgba(255, 255, 255, .76)"
      : "0 6px 18px rgba(0, 0, 0, .38), inset 0 1px 0 rgba(255, 255, 255, .28)",

    "--haos-accent": t.accent,
    "--haos-status-on": t.accent,
    "--haos-status-off": light ? "#66717c" : "#a8b0b8",
    "--haos-status-unavailable": light ? "#c2413b" : "#ff6961",
    "--haos-status-home": light ? "#168a4a" : "#32d583",
    "--haos-status-away": light ? "#a06a10" : "#f7b955",

    "--haos-margin": `${t.margin}px`,

    "--haos-card-surface-rgb": hexToRgb(t.cardSurface),
    "--haos-card-opacity": String(cardOpacity / 100),
    "--haos-card-blur": `${t.cardBlur}px`,
    "--haos-card-saturation": `${t.cardSaturation}%`,
    "--haos-card-radius": `${t.cardRadius}px`,
    "--haos-card-border-rgb": hexToRgb(t.cardBorder),
    "--haos-card-border-opacity": String(cardBorderOpacity / 100),

    "--haos-entity-surface-rgb": hexToRgb(t.entitySurface),
    "--haos-entity-opacity": String(entityOpacity / 100),
    "--haos-entity-blur": `${t.entityBlur}px`,
    "--haos-entity-saturation": `${t.entitySaturation}%`,
    "--haos-entity-radius": `${t.entityRadius}px`,
    "--haos-entity-border-rgb": hexToRgb(t.entityBorder),
    "--haos-entity-border-opacity": String(entityBorderOpacity / 100),
  };

  const root = document.documentElement;
  root.dataset.haosTheme = t.mode;
  Object.entries(values).forEach(([key, value]) => root.style.setProperty(key, value));
  return t;
};

let active = apply(read());

export const HaOsTheme = {
  defaults: THEME_DEFAULTS,

  get: () => ({ ...active }),

  save(changes = {}) {
    active = apply({ ...active, ...changes });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(active));
    } catch (_error) {
      /* Private Mode o.ae. – Theme gilt dann nur fuer diese Sitzung. */
    }
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    return { ...active };
  },

  toggleMode() {
    return HaOsTheme.save({ mode: active.mode === "light" ? "dark" : "light" });
  },

  reset() {
    active = apply(THEME_DEFAULTS);
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch (_error) {
      /* ignoriert */
    }
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    return { ...active };
  },
};

window.HaOsTheme = HaOsTheme;
