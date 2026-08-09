/* HA-OS 0.30.0 – erzeugt aus src/, nicht von Hand bearbeiten. */

// src/shared/theme.js
var STORAGE_KEY = "ha-os-theme-v1";
var THEME_DEFAULTS = Object.freeze({
  mode: "dark",
  accent: "#0a84ff",
  // Farben von Home Assistant uebernehmen.
  //
  // HA legt sein Theme als CSS-Variablen auf <html> ab. Ist das hier an,
  // holt sich HA-OS Akzent, Text, Statusfarben und Hintergrund von dort -
  // und folgt damit automatisch jedem Themewechsel, auf jedem Geraet.
  // Glas (Unschaerfe, Deckkraft, Glanz, Rundung) bleibt in jedem Fall hier:
  // dafuer kennt Home Assistant keine Entsprechung.
  follow_ha: false,
  margin: 25,
  // Hintergrundbilder, getrennt fuer Hell und Dunkel. Leer = kein Bild.
  backgroundLight: "",
  backgroundDark: "",
  backgroundDim: 0,
  // Textfarbe, getrennt fuer Hell und Dunkel. Sie gilt fuer ALLE Karten:
  // Beschriftungen, Werte und Symbole leiten ihre Abstufungen davon ab, damit
  // nicht jede Karte ihre eigene Graustufe mitbringt.
  textLight: "#18212a",
  textDark: "#ffffff",
  // Statusfarben, getrennt fuer Hell und Dunkel.
  //
  // Getrennt, weil ein Gruen, das auf dunklem Glas gut aussieht, auf hellem
  // Glas nicht mehr lesbar ist - genau daran ist der Rueckfallwert #7ee0b0
  // gescheitert. Im Hellen deshalb deutlich dunklere Toene.
  statusGoodLight: "#1e8e5a",
  statusGoodDark: "#7ee0b0",
  statusOffLight: "#66717c",
  statusOffDark: "#a8b0b8",
  statusBadLight: "#c2413b",
  statusBadDark: "#ff6961",
  // Hintergrundkarte = die grosse Glasflaeche der Shell
  cardSurface: "#ffffff",
  cardOpacity: 10,
  cardBlur: 14,
  cardSaturation: 180,
  cardRadius: 24,
  cardBorder: "#ffffff",
  cardBorderOpacity: 22,
  cardSheen: 55,
  // Entitaetskarte = die einzelnen Karten darin
  entitySurface: "#ffffff",
  entityOpacity: 10,
  entityBlur: 12,
  entitySaturation: 180,
  entityRadius: 20,
  entityBorder: "#ffffff",
  entityBorderOpacity: 20,
  entitySheen: 65
});
var clamp = (value, min, max, fallback) => {
  const number2 = Number(value);
  return Number.isFinite(number2) ? Math.min(max, Math.max(min, number2)) : fallback;
};
var color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
var imageUrl = (value) => {
  const text2 = String(value || "").trim();
  if (!text2) return "";
  return /^\/(local|api|media|hacsfiles)\//.test(text2) ? text2 : "";
};
var readHaColor = (name) => {
  const view = typeof document !== "undefined" ? document.defaultView : null;
  if (!view || !document.body) return "";
  const raw = view.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return "";
  const probe = document.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  document.body.append(probe);
  const computed = view.getComputedStyle(probe).color;
  probe.remove();
  const parts = computed.match(/\d+(\.\d+)?/g);
  return parts && parts.length >= 3 ? parts.slice(0, 3).map((n) => Math.round(Number(n))).join(", ") : "";
};
var hexToRgb = (hex) => {
  const value = String(hex).replace("#", "");
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16)).join(", ");
};
var sheenShadow = (strength, light) => {
  const s = clamp(strength, 0, 100, 0) / 100;
  if (s === 0) return "0 0 0 0 rgba(0,0,0,0)";
  const top = (light ? 0.85 : 0.5) * s;
  const bottom = (light ? 0.1 : 0.3) * s;
  const inner = (light ? 0.3 : 0.14) * s;
  return [
    `inset 0 1px 0 rgba(255, 255, 255, ${top.toFixed(3)})`,
    `inset 0 -1px 0 rgba(0, 0, 0, ${bottom.toFixed(3)})`,
    `inset 0 22px 34px -26px rgba(255, 255, 255, ${inner.toFixed(3)})`
  ].join(", ");
};
var glossLayer = (strength, light) => {
  const s = clamp(strength, 0, 100, 0) / 100;
  if (s === 0) return "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))";
  const bright = (light ? 0.55 : 0.2) * s;
  const faint = (light ? 0.14 : 0.05) * s;
  return `linear-gradient(148deg, rgba(255, 255, 255, ${bright.toFixed(3)}) 0%, rgba(255, 255, 255, ${faint.toFixed(3)}) 38%, rgba(255, 255, 255, 0) 62%)`;
};
var normalizeTheme = (settings = {}) => ({
  mode: settings.mode === "light" ? "light" : "dark",
  accent: color(settings.accent, THEME_DEFAULTS.accent),
  follow_ha: Boolean(settings.follow_ha),
  margin: clamp(settings.margin, 0, 60, THEME_DEFAULTS.margin),
  backgroundLight: imageUrl(settings.backgroundLight),
  backgroundDark: imageUrl(settings.backgroundDark),
  backgroundDim: clamp(settings.backgroundDim, 0, 80, THEME_DEFAULTS.backgroundDim),
  textLight: color(settings.textLight, THEME_DEFAULTS.textLight),
  textDark: color(settings.textDark, THEME_DEFAULTS.textDark),
  statusGoodLight: color(settings.statusGoodLight, THEME_DEFAULTS.statusGoodLight),
  statusGoodDark: color(settings.statusGoodDark, THEME_DEFAULTS.statusGoodDark),
  statusOffLight: color(settings.statusOffLight, THEME_DEFAULTS.statusOffLight),
  statusOffDark: color(settings.statusOffDark, THEME_DEFAULTS.statusOffDark),
  statusBadLight: color(settings.statusBadLight, THEME_DEFAULTS.statusBadLight),
  statusBadDark: color(settings.statusBadDark, THEME_DEFAULTS.statusBadDark),
  cardSurface: color(settings.cardSurface, THEME_DEFAULTS.cardSurface),
  cardOpacity: clamp(settings.cardOpacity, 0, 95, THEME_DEFAULTS.cardOpacity),
  cardBlur: clamp(settings.cardBlur, 0, 50, THEME_DEFAULTS.cardBlur),
  cardSaturation: clamp(settings.cardSaturation, 50, 240, THEME_DEFAULTS.cardSaturation),
  cardRadius: clamp(settings.cardRadius, 0, 48, THEME_DEFAULTS.cardRadius),
  cardBorder: color(settings.cardBorder, THEME_DEFAULTS.cardBorder),
  cardBorderOpacity: clamp(settings.cardBorderOpacity, 0, 80, THEME_DEFAULTS.cardBorderOpacity),
  cardSheen: clamp(settings.cardSheen, 0, 100, THEME_DEFAULTS.cardSheen),
  entitySurface: color(settings.entitySurface, THEME_DEFAULTS.entitySurface),
  entityOpacity: clamp(settings.entityOpacity, 0, 95, THEME_DEFAULTS.entityOpacity),
  entityBlur: clamp(settings.entityBlur, 0, 50, THEME_DEFAULTS.entityBlur),
  entitySaturation: clamp(settings.entitySaturation, 50, 240, THEME_DEFAULTS.entitySaturation),
  entityRadius: clamp(settings.entityRadius, 0, 48, THEME_DEFAULTS.entityRadius),
  entityBorder: color(settings.entityBorder, THEME_DEFAULTS.entityBorder),
  entityBorderOpacity: clamp(settings.entityBorderOpacity, 0, 80, THEME_DEFAULTS.entityBorderOpacity),
  entitySheen: clamp(settings.entitySheen, 0, 100, THEME_DEFAULTS.entitySheen)
});
var read = () => {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return normalizeTheme(stored ? JSON.parse(stored) : THEME_DEFAULTS);
  } catch (_error) {
    return normalizeTheme(THEME_DEFAULTS);
  }
};
var backgroundOf = (t, mode) => t[`background${mode}`] || fallbacks[`background${mode}`] || "";
var apply = (settings) => {
  const t = normalizeTheme(settings);
  if (typeof document === "undefined") return t;
  const light = t.mode === "light";
  const cardOpacity = light ? Math.max(t.cardOpacity, 26) : t.cardOpacity;
  const entityOpacity = light ? Math.max(t.entityOpacity, 20) : t.entityOpacity;
  const cardBorderOpacity = light ? Math.max(t.cardBorderOpacity, 46) : t.cardBorderOpacity;
  const entityBorderOpacity = light ? Math.max(t.entityBorderOpacity, 38) : t.entityBorderOpacity;
  const values = {
    "--haos-color-scheme": t.mode,
    // Die Zahlen einzeln – fuer rgba(...)-Abstufungen, etwa den Farbschleier
    // des Medienspielers, wenn sich aus dem Titelbild nichts lesen laesst.
    "--haos-accent-rgb": hexToRgb(t.accent),
    "--haos-text": light ? t.textLight : t.textDark,
    "--haos-text-rgb": hexToRgb(light ? t.textLight : t.textDark),
    "--haos-text-inverse": light ? t.textDark : t.textLight,
    /*
     * Abdeckung fuer Fenster ueber einer Karte.
     *
     * Bewusst GEGENLAEUFIG zur Schrift: im dunklen Modus dunkel, im hellen
     * hell. Die Kartenfarbe taugt dafuer nicht - sie ist in beiden Modi
     * weiss, und ein weisser Schleier vor weisser Schrift laesst diese
     * lesbar. Genau daran ist die erste Fassung des Weckerfensters
     * gescheitert.
     */
    "--haos-scrim": light ? "rgba(244, 246, 249, .93)" : "rgba(14, 18, 24, .90)",
    "--haos-font-family": "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
    "--haos-font-weight-normal": "450",
    "--haos-font-weight-semibold": "650",
    // Schlagschatten und Glanz sind bewusst getrennt: der Glanz sitzt als
    // inset-Schatten IN der Fläche, der Schlagschatten darunter. Zusammen in
    // einer Variablen liessen sie sich nicht einzeln regeln.
    "--haos-card-shadow": light ? "0 18px 48px rgba(38, 48, 58, .18)" : "0 24px 70px rgba(0, 0, 0, .30)",
    // Der Schlagschatten der Karten muss in den Abstand zwischen ihnen
    // passen. Die Shell hat runde Ecken und deshalb `overflow: hidden` –
    // was darueber hinausragt, wird abgeschnitten, und an den Ecken sah man
    // eine gerade Kante. Bei 16 px Abstand ist knapp die Haelfte davon als
    // Weichzeichnung sinnvoll; der Rest kommt aus dem Versatz nach unten.
    "--haos-entity-shadow": light ? "0 4px 12px rgba(38, 48, 58, .13)" : "0 5px 14px rgba(0, 0, 0, .22)",
    "--haos-card-sheen": sheenShadow(t.cardSheen, light),
    "--haos-entity-sheen": sheenShadow(t.entitySheen, light),
    "--haos-card-gloss": glossLayer(t.cardSheen, light),
    "--haos-entity-gloss": glossLayer(t.entitySheen, light),
    "--haos-user-shadow": light ? "0 6px 18px rgba(25, 34, 44, .24), inset 0 1px 0 rgba(255, 255, 255, .76)" : "0 6px 18px rgba(0, 0, 0, .38), inset 0 1px 0 rgba(255, 255, 255, .28)",
    "--haos-accent": t.accent,
    // Das Leuchten aktiver Kacheln folgt weiterhin der Akzentfarbe - die ist
    // schon einstellbar. Die drei Statusfarben hier faerben Texte und Zeichen
    // in den Karten: "ok", "verriegelt", "Warnung", "nicht erreichbar".
    "--haos-status-on": t.accent,
    "--haos-status-off": light ? t.statusOffLight : t.statusOffDark,
    "--haos-status-unavailable": light ? t.statusBadLight : t.statusBadDark,
    // Diese beiden gab es bisher NICHT. Die Karten benutzten
    // var(--haos-good, #7ee0b0) - und dieser Rueckfallwert war auf hellem
    // Glas nicht zu lesen.
    "--haos-good": light ? t.statusGoodLight : t.statusGoodDark,
    "--haos-bad": light ? t.statusBadLight : t.statusBadDark,
    "--haos-status-home": light ? "#168a4a" : "#32d583",
    "--haos-status-away": light ? "#a06a10" : "#f7b955",
    "--haos-margin": `${t.margin}px`,
    "--haos-background-image": (light ? backgroundOf(t, "Light") : backgroundOf(t, "Dark")) ? `url("${light ? backgroundOf(t, "Light") : backgroundOf(t, "Dark")}")` : "none",
    "--haos-background-dim": String((t.backgroundDim || fallbacks.backgroundDim || 0) / 100),
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
    "--haos-entity-border-opacity": String(entityBorderOpacity / 100)
  };
  const root = document.documentElement;
  root.dataset.haosTheme = t.mode;
  if (t.follow_ha) {
    const uebernehmen = (ziel, quelle) => {
      const rgb = readHaColor(quelle);
      if (rgb) values[ziel] = `rgb(${rgb})`;
      return rgb;
    };
    uebernehmen("--haos-accent", "--primary-color");
    uebernehmen("--haos-status-on", "--primary-color");
    uebernehmen("--haos-good", "--success-color");
    uebernehmen("--haos-bad", "--error-color");
    uebernehmen("--haos-status-unavailable", "--error-color");
    uebernehmen("--haos-status-off", "--disabled-text-color");
    const textRgb = readHaColor("--primary-text-color");
    if (textRgb) {
      values["--haos-text"] = `rgb(${textRgb})`;
      values["--haos-text-rgb"] = textRgb;
    }
    const view = typeof document !== "undefined" ? document.defaultView : null;
    const haBackground = view ? view.getComputedStyle(document.documentElement).getPropertyValue("--lovelace-background").trim() : "";
    if (haBackground && !(light ? t.backgroundLight : t.backgroundDark) && /url\(|gradient\(/i.test(haBackground)) {
      values["--haos-background-image"] = haBackground;
    }
  }
  Object.entries(values).forEach(([key, value]) => root.style.setProperty(key, value));
  return t;
};
var fallbacks = {};
var active = apply(read());
if (typeof MutationObserver === "function" && typeof document !== "undefined") {
  let pending = false;
  new MutationObserver(() => {
    if (!active.follow_ha || pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      active = apply(active);
      window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    }, 60);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
}
var HaOsTheme = {
  defaults: THEME_DEFAULTS,
  /**
   * Vorgaben aus der Kartenkonfiguration setzen.
   *
   * Sie überschreiben nichts: was auf diesem Gerät eingestellt wurde, bleibt.
   * Sie füllen nur die Lücke – und genau dadurch wirkt ein im Editor
   * gesetztes Hintergrundbild auf allen Geräten, ohne dass jemand die
   * Einstellungen jedes Tablets anfassen muss.
   */
  setFallbacks(values = {}) {
    const next = {
      backgroundLight: imageUrl(values.background_light),
      backgroundDark: imageUrl(values.background_dark),
      backgroundDim: clamp(values.background_dim, 0, 80, 0)
    };
    if (JSON.stringify(next) === JSON.stringify(fallbacks)) return;
    fallbacks = next;
    active = apply(active);
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
  },
  get: () => ({ ...active }),
  save(changes = {}) {
    active = apply({ ...active, ...changes });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(active));
    } catch (_error) {
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
    }
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    return { ...active };
  }
};
window.HaOsTheme = HaOsTheme;

// src/shared/utils.js
var clampNumber = (value, min, max, fallback) => {
  const number2 = Number(value);
  return Number.isFinite(number2) ? Math.min(max, Math.max(min, number2)) : fallback;
};
var deepClone = (value) => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
var isEqualConfig = (a, b) => {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_error) {
    return false;
  }
};
var LEGACY_GROUPS = ["darstellung", "aktion"];
var flattenLegacyGroups = (config) => {
  if (!config || typeof config !== "object") return config;
  let touched = false;
  const flat = { ...config };
  LEGACY_GROUPS.forEach((group) => {
    const nested = flat[group];
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return;
    Object.entries(nested).forEach(([key, value]) => {
      if (flat[key] === void 0) flat[key] = value;
    });
    delete flat[group];
    touched = true;
  });
  return touched ? flat : config;
};
var fireEvent = (node, type, detail = {}) => {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
};
var showMoreInfo = (node, entityId) => {
  if (entityId) fireEvent(node, "hass-more-info", { entityId });
};
var navigate = (path) => {
  const value = String(path || "").trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value)) {
    window.open(value, "_blank", "noopener");
    return;
  }
  history.pushState(null, "", value.startsWith("/") ? value : `/${value}`);
  window.dispatchEvent(new CustomEvent("location-changed"));
};
var DOMAIN_ICONS = {
  light: "mdi:lightbulb",
  switch: "mdi:power",
  climate: "mdi:thermostat",
  weather: "mdi:weather-partly-cloudy",
  lock: "mdi:lock",
  cover: "mdi:window-shutter",
  fan: "mdi:fan",
  person: "mdi:account",
  device_tracker: "mdi:account",
  sensor: "mdi:gauge",
  binary_sensor: "mdi:checkbox-marked-circle-outline",
  media_player: "mdi:speaker",
  calendar: "mdi:calendar",
  select: "mdi:form-dropdown",
  input_select: "mdi:form-dropdown",
  input_boolean: "mdi:toggle-switch-outline",
  scene: "mdi:palette",
  script: "mdi:script-text",
  automation: "mdi:robot",
  vacuum: "mdi:robot-vacuum",
  lawn_mower: "mdi:robot-mower",
  number: "mdi:ray-vertex",
  input_number: "mdi:ray-vertex"
};
var domainOf = (entityId) => String(entityId || "").split(".")[0];
var domainIcon = (entityId, state) => {
  if (state?.attributes?.icon) return state.attributes.icon;
  return DOMAIN_ICONS[domainOf(entityId)] || "mdi:circle-outline";
};
var friendlyName = (entityId, state) => state?.attributes?.friendly_name || String(entityId || "").split(".").slice(1).join(".") || entityId || "";
var ON_STATES = /* @__PURE__ */ new Set([
  "on",
  "open",
  "opening",
  "home",
  "playing",
  "heat",
  "cool",
  "heat_cool",
  "fan_only",
  "dry",
  "auto",
  "cleaning",
  "mowing",
  "unlocked",
  "active"
]);
var isUnavailable = (state) => !state || ["unavailable", "unknown"].includes(state.state);
var isActive = (state) => !isUnavailable(state) && ON_STATES.has(state.state);
var statusClass = (state) => {
  if (isUnavailable(state)) return "is-unavailable";
  return isActive(state) ? "is-on" : "is-off";
};
var formatState = (hass, entityId) => {
  const state = hass?.states?.[entityId];
  if (!state) return "Nicht verfügbar";
  if (hass.formatEntityState) {
    try {
      return hass.formatEntityState(state);
    } catch (_error) {
    }
  }
  const unit = state.attributes?.unit_of_measurement;
  return unit ? `${state.state} ${unit}` : state.state;
};
var handleAction = (node, hass, config = {}, entityId) => {
  const action = config.action || "more-info";
  const target = config.entity || entityId;
  switch (action) {
    case "none":
      return;
    case "toggle":
      if (target) hass?.callService?.("homeassistant", "toggle", { entity_id: target });
      return;
    case "navigate":
      navigate(config.navigation_path);
      return;
    case "url":
      navigate(config.url_path);
      return;
    case "call-service":
    case "perform-action": {
      const service = config.service || config.perform_action;
      if (!service || !service.includes(".")) return;
      const [domain, name] = service.split(".");
      hass?.callService?.(domain, name, config.data || config.service_data || {}, config.target);
      return;
    }
    case "more-info":
    default:
      showMoreInfo(node, target);
  }
};
var helpersPromise;
var cardHelpers = () => {
  if (!helpersPromise) helpersPromise = window.loadCardHelpers?.() ?? Promise.resolve(null);
  return helpersPromise;
};
var createCardElement = async (config) => {
  const helpers = await cardHelpers();
  if (helpers?.createCardElement) return helpers.createCardElement(config);
  const tag = String(config?.type || "").replace(/^custom:/, "");
  const element = document.createElement(tag || "hui-error-card");
  element.setConfig?.(config);
  return element;
};
var ENTITY_SURFACE_CSS = `
  border: 1px solid rgba(var(--haos-entity-border-rgb, 255,255,255), var(--haos-entity-border-opacity, .20));
  border-radius: var(--haos-entity-radius, 20px);
  background:
    var(--haos-entity-gloss, linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))),
    rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10));
  box-shadow:
    var(--haos-entity-shadow, 0 12px 30px rgba(0,0,0,.20)),
    var(--haos-entity-sheen, inset 0 1px 0 rgba(255,255,255,.32));
  backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
`;
var CONTROL_SURFACE_CSS = `
  border: 1px solid rgba(var(--haos-entity-border-rgb, 255,255,255), calc(var(--haos-entity-border-opacity, .20) * .8));
  background:
    var(--haos-entity-gloss, linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))),
    rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .04));
  box-shadow: var(--haos-entity-sheen, inset 0 1px 0 rgba(255,255,255,.32));
  backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
`;
var CARD_SURFACE_CSS = `
  border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), var(--haos-card-border-opacity, .22));
  border-radius: var(--haos-card-radius, 24px);
  background:
    var(--haos-card-gloss, linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))),
    rgba(var(--haos-card-surface-rgb, 255,255,255), var(--haos-card-opacity, .10));
  box-shadow:
    var(--haos-card-shadow, 0 24px 70px rgba(0,0,0,.30)),
    var(--haos-card-sheen, inset 0 1px 0 rgba(255,255,255,.28));
  backdrop-filter: blur(var(--haos-card-blur, 14px)) saturate(var(--haos-card-saturation, 180%));
  -webkit-backdrop-filter: blur(var(--haos-card-blur, 14px)) saturate(var(--haos-card-saturation, 180%));
`;
var registerCard = (entry) => {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === entry.type)) window.customCards.push(entry);
};
var UPLOAD_TYPES = ["image/jpeg", "image/png", "image/gif"];
var uploadImage = async (hass, file) => {
  const token = hass?.auth?.data?.access_token || hass?.connection?.options?.auth?.accessToken;
  if (!token) throw new Error("kein Zugangstoken im hass-Objekt");
  if (file?.type && !UPLOAD_TYPES.includes(file.type)) {
    throw new Error(`${file.type} wird nicht angenommen. Home Assistant nimmt nur JPEG, PNG und GIF.`);
  }
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/image/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body
  });
  if (!response.ok) {
    let reason = "";
    try {
      const text2 = await response.text();
      reason = (JSON.parse(text2)?.message ?? text2 ?? "").toString().trim().slice(0, 160);
    } catch (_error) {
      reason = "";
    }
    throw new Error([`${response.status} ${response.statusText || ""}`.trim(), reason].filter(Boolean).join(" – "));
  }
  const data = await response.json();
  if (!data?.id) throw new Error("Antwort ohne Bild-Kennung");
  return `/api/image/serve/${data.id}/original`;
};
var createImageField = ({ getHass, getValue, onChange, placeholder = "/local/bild.jpg" }) => {
  const wrap = document.createElement("div");
  wrap.className = "haos-image";
  const row = document.createElement("div");
  row.className = "haos-image-row";
  const preview = document.createElement("div");
  preview.className = "haos-image-preview";
  row.append(preview);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = UPLOAD_TYPES.join(",");
  fileInput.className = "haos-image-file";
  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.className = "haos-image-btn";
  uploadButton.textContent = "Bild hochladen";
  uploadButton.addEventListener("click", () => fileInput.click());
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "haos-image-btn ghost";
  clearButton.textContent = "Entfernen";
  clearButton.addEventListener("click", () => set(""));
  const buttons = document.createElement("div");
  buttons.className = "haos-image-buttons";
  buttons.append(uploadButton, clearButton);
  row.append(buttons);
  const pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.className = "path";
  pathInput.placeholder = placeholder;
  const status = document.createElement("span");
  status.className = "haos-image-status";
  const paint = () => {
    const value = getValue() || "";
    pathInput.value = value;
    if (!value) {
      preview.replaceChildren();
      preview.classList.add("empty");
      return;
    }
    preview.classList.remove("empty");
    let img = preview.firstElementChild;
    if (img?.tagName !== "IMG") {
      img = document.createElement("img");
      img.alt = "";
      preview.replaceChildren(img);
    }
    img.src = value;
  };
  const set = (value) => {
    onChange(value);
    paint();
  };
  pathInput.addEventListener("change", () => set(pathInput.value.trim()));
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    status.textContent = `${file.name} wird hochgeladen …`;
    status.classList.remove("bad");
    try {
      set(await uploadImage(getHass(), file));
      status.textContent = "Hochgeladen.";
    } catch (error) {
      status.textContent = `Upload fehlgeschlagen: ${error.message}`;
      status.classList.add("bad");
    }
  });
  wrap.append(row, fileInput, pathInput, status);
  paint();
  return { element: wrap, refresh: paint };
};
var IMAGE_FIELD_CSS = `
  .haos-image { display: flex; flex-direction: column; gap: 8px; }
  .haos-image-row { display: flex; align-items: center; gap: 12px; }
  .haos-image-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .haos-image-preview {
    width: 84px; height: 52px; flex: 0 0 84px; border-radius: 8px; overflow: hidden;
    background: rgba(127,127,127,.15); border: 1px solid rgba(127,127,127,.35);
  }
  .haos-image-preview.empty { border-style: dashed; }
  .haos-image-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .haos-image-file { display: none; }
  .haos-image-btn {
    font: inherit; font-size: 12px; padding: 7px 12px; border-radius: 8px; cursor: pointer;
    color: inherit; background: none; border: 1px solid rgba(127,127,127,.35);
  }
  .haos-image-btn.ghost { opacity: .7; }
  .haos-image-status { font-size: 11px; opacity: .7; }
  .haos-image-status.bad { color: var(--haos-bad, #ff6b6b); opacity: 1; }
`;
var nextFrame = (callback) => {
  const raf = globalThis.requestAnimationFrame;
  if (typeof raf === "function") raf(callback);
  else setTimeout(callback, 0);
};
var createSegmented = ({ options = [], value = "", onChange, ariaLabel = "" } = {}) => {
  const wrap = document.createElement("div");
  wrap.className = "haos-seg";
  wrap.setAttribute("role", "radiogroup");
  if (ariaLabel) wrap.setAttribute("aria-label", ariaLabel);
  const pill = document.createElement("span");
  pill.className = "haos-seg-pill";
  wrap.append(pill);
  let current = value;
  let buttons = [];
  const place = () => {
    const active2 = buttons.find((button) => button.dataset.value === current);
    if (!active2) {
      pill.style.opacity = "0";
      return;
    }
    if (!active2.offsetWidth) return;
    pill.style.opacity = "1";
    pill.style.width = `${active2.offsetWidth}px`;
    pill.style.transform = `translateX(${active2.offsetLeft}px)`;
  };
  const render = (nextOptions) => {
    buttons.forEach((button) => button.remove());
    buttons = nextOptions.map((option) => {
      const { value: optionValue, label } = typeof option === "string" ? { value: option, label: option } : option;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "haos-seg-option";
      button.dataset.value = optionValue;
      button.textContent = label;
      button.setAttribute("role", "radio");
      button.addEventListener("click", () => {
        if (optionValue === current) return;
        current = optionValue;
        sync();
        onChange?.(optionValue);
      });
      wrap.append(button);
      return button;
    });
  };
  const sync = () => {
    buttons.forEach((button) => {
      const active2 = button.dataset.value === current;
      button.classList.toggle("active", active2);
      button.setAttribute("aria-checked", active2 ? "true" : "false");
    });
    place();
  };
  render(options);
  sync();
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => place());
    observer.observe(wrap);
  }
  return {
    element: wrap,
    /** Wert und – falls nötig – die Optionen nachziehen. */
    update(nextValue, nextOptions) {
      if (nextOptions && nextOptions.join("|") !== buttons.map((b) => b.dataset.value).join("|")) {
        render(nextOptions);
      }
      current = nextValue;
      sync();
    },
    /** Nach dem Einhängen einmal aufrufen, damit die Pille sitzt. */
    place
  };
};
var SEGMENTED_CSS = `
  .haos-seg {
    position: relative; display: inline-flex; align-items: center; gap: 2px; padding: 3px;
    border-radius: 999px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .10);
    border: 1px solid rgba(var(--haos-entity-border-rgb, 255,255,255), var(--haos-entity-border-opacity, .20));
    backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
    -webkit-backdrop-filter: blur(var(--haos-entity-blur, 12px)) saturate(var(--haos-entity-saturation, 180%));
  }
  .haos-seg-pill {
    position: absolute; top: 3px; bottom: 3px; left: 0; width: 0;
    border-radius: 999px; pointer-events: none; opacity: 0;
    background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .16));
    border: 1px solid rgba(var(--haos-entity-border-rgb, 255,255,255), calc(var(--haos-entity-border-opacity, .20) + .18));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.42), 0 3px 10px rgba(0,0,0,.18);
    transition: transform .22s cubic-bezier(.32,.72,0,1), width .22s cubic-bezier(.32,.72,0,1), opacity .16s ease;
  }
  .haos-seg-option {
    position: relative; z-index: 1; border: 0; background: none; cursor: pointer;
    padding: 6px 14px; border-radius: 999px; font: inherit; font-size: 12px;
    color: rgba(var(--haos-text-rgb, 255,255,255), .55);
    transition: color .16s ease;
    white-space: nowrap;
  }
  .haos-seg-option.active { color: var(--haos-text, #fff); }
  .haos-seg-option:hover { color: rgba(var(--haos-text-rgb, 255,255,255), .85); }
`;

// src/shared/config.js
var SETTINGS_PAGE_ID = "__haos_settings";
var DEFAULT_GRID_WIDTHS = [1, 1.55, 1.05];
var SHELL_DEFAULTS = Object.freeze({
  gap: 16,
  row_height: 125,
  users: [],
  fullscreen_entity: "",
  show_settings_button: true,
  show_theme_button: true,
  quick_actions: [],
  pages: []
});
var DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
var UMLAUTS = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" };
var slugify = (value, fallback = "seite") => String(value || "").toLowerCase().replace(/[äöüß]/g, (char) => UMLAUTS[char]).normalize("NFD").replace(DIACRITICS, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
var uniqueId = (candidate, used, fallback) => {
  const base = slugify(candidate, fallback);
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
};
var normalizeAction = (action, fallbackAction = "more-info") => {
  if (!action || typeof action !== "object") return { action: fallbackAction };
  return { ...action, action: action.action || fallbackAction };
};
var BADGE_KINDS = ["entity", "link", "sum"];
var normalizeBadge = (source, index, used) => {
  const raw = typeof source === "string" ? { entity: source } : source || {};
  const kind = BADGE_KINDS.includes(raw.kind) ? raw.kind : "entity";
  return {
    id: uniqueId(raw.id || `badge-${index + 1}`, used, `badge-${index + 1}`),
    kind,
    entity: kind === "entity" ? raw.entity || "" : "",
    name: raw.name || "",
    icon: raw.icon || "",
    url: kind === "link" ? raw.url || "" : "",
    // Summen-Badge: mehrere Zaehler zusammengerechnet. Ohne feste Auswahl
    // nimmt es alle Sensoren mit device_class energy, wahlweise auf eine
    // Endung eingegrenzt - dieselbe Regel wie in der Energieliste.
    entities: kind === "sum" && Array.isArray(raw.entities) ? raw.entities.filter(Boolean) : [],
    suffix: kind === "sum" ? raw.suffix || "" : "",
    unit: kind === "sum" ? raw.unit || "kWh" : "",
    show_state: raw.show_state !== false,
    tap_action: normalizeAction(raw.tap_action, kind === "link" ? "url" : kind === "sum" ? "none" : "toggle")
  };
};
var normalizeQuickAction = (source, index, used) => {
  const raw = source || {};
  return {
    id: uniqueId(raw.id || `action-${index + 1}`, used, `action-${index + 1}`),
    icon: raw.icon || "mdi:star-outline",
    name: raw.name || "",
    entity: raw.entity || "",
    tap_action: normalizeAction(raw.tap_action, raw.entity ? "toggle" : "none")
  };
};
var normalizeCard = (card) => {
  const config = card && typeof card === "object" ? { ...card } : { type: "" };
  config.haos_weight = clampNumber(config.haos_weight, 0.1, 6, 1);
  return config;
};
var normalizeGrid = (grid) => ({
  name: grid?.name || "",
  cards: Array.isArray(grid?.cards) ? grid.cards.map(normalizeCard) : []
});
var MIN_GRIDS = 1;
var MAX_GRIDS = 5;
var DEFAULT_GRIDS = 3;
var createEmptyGrids = (count = DEFAULT_GRIDS) => Array.from({ length: count }, (_, index) => ({ name: `Grid ${index + 1}`, cards: [] }));
var normalizeGrids = (grids, count) => Array.from({ length: count }, (_, index) => normalizeGrid(grids?.[index] ?? { name: `Grid ${index + 1}` }));
var normalizePage = (page, index, used) => {
  const raw = page || {};
  const isFirst = index === 0;
  const kind = raw.kind === "iframe" ? "iframe" : "page";
  const badgeIds = /* @__PURE__ */ new Set();
  const gridCount = clampNumber(
    raw.grid_count ?? (Array.isArray(raw.grids) && raw.grids.length ? raw.grids.length : DEFAULT_GRIDS),
    MIN_GRIDS,
    MAX_GRIDS,
    DEFAULT_GRIDS
  );
  return {
    id: isFirst ? "home" : uniqueId(raw.id || raw.name || `seite-${index + 1}`, used, `seite-${index + 1}`),
    name: raw.name || (isFirst ? "Home" : `Seite ${index + 1}`),
    icon: raw.icon || (isFirst ? "mdi:home" : "mdi:circle-outline"),
    kind,
    url: kind === "iframe" ? raw.url || "" : "",
    hide_ha_chrome: kind === "iframe" && Boolean(raw.hide_ha_chrome),
    // Höhe des Rahmens in Pixeln. 0 heisst: volle Höhe der Seite. Ohne diese
    // Angabe füllte der Rahmen immer die ganze Seite, und eine eingebettete
    // Ansicht mit einer einzigen Karte wurde dadurch übermässig hoch.
    frame_height: kind === "iframe" ? clampNumber(raw.frame_height, 0, 2e3, 0) : 0,
    badges: (Array.isArray(raw.badges) ? raw.badges : []).map(
      (badge, badgeIndex) => normalizeBadge(badge, badgeIndex, badgeIds)
    ),
    grid_count: gridCount,
    // Über die dritte Spalte hinaus gibt es keine Vorgabe mehr – dort ist
    // gleich breit die vernünftigste Annahme.
    grid_widths: Array.from(
      { length: gridCount },
      (_, widthIndex) => clampNumber(raw.grid_widths?.[widthIndex], 0.3, 4, DEFAULT_GRID_WIDTHS[widthIndex] ?? 1)
    ),
    grids: normalizeGrids(raw.grids, gridCount)
  };
};
var normalizeShellConfig = (config = {}) => {
  const usedPageIds = /* @__PURE__ */ new Set(["home", SETTINGS_PAGE_ID]);
  const usedActionIds = /* @__PURE__ */ new Set();
  const sourcePages = Array.isArray(config.pages) && config.pages.length ? config.pages : [{ id: "home", name: "Home" }];
  return {
    type: config.type,
    gap: clampNumber(config.gap, 0, 48, SHELL_DEFAULTS.gap),
    // Hintergrundbild auf Ebene der Karte: gilt fuer ALLE Geraete. Die
    // Einstellungsseite schreibt dagegen in den localStorage des jeweiligen
    // Browsers und bleibt damit geraetespezifisch.
    background_dark: imageUrl(config.background_dark),
    background_light: imageUrl(config.background_light),
    background_dim: clampNumber(config.background_dim, 0, 80, 0),
    row_height: clampNumber(config.row_height, 60, 320, SHELL_DEFAULTS.row_height),
    users: (Array.isArray(config.users) ? config.users : []).map((entry) => typeof entry === "string" ? entry : entry?.entity).filter(Boolean),
    fullscreen_entity: config.fullscreen_entity || "",
    show_settings_button: config.show_settings_button !== false,
    show_theme_button: config.show_theme_button !== false,
    // Seiten sind ab 0.5.0 zusätzlich über die Seitenleiste erreichbar.
    // Beide Wege bleiben standardmäßig an: wer die Reiter oben gewohnt ist,
    // soll sie nach dem Update nicht plötzlich vermissen.
    sidebar_pages: config.sidebar_pages !== false,
    topbar_tabs: config.topbar_tabs !== false,
    quick_actions: (Array.isArray(config.quick_actions) ? config.quick_actions : []).map(
      (action, index) => normalizeQuickAction(action, index, usedActionIds)
    ),
    pages: sourcePages.map((page, index) => normalizePage(page, index, usedPageIds))
  };
};
var stripHaOsKeys = (cardConfig) => {
  const clean = { ...cardConfig };
  delete clean.haos_weight;
  return clean;
};

// src/cards/shell-card.js
var TAG = "ha-os-shell";
var EDITOR_TAG = "ha-os-shell-editor";
var TOPBAR_HEIGHT = 62;
var STYLES = `
  :host {
    display: block;
    position: relative;
    /* Eigener Stapelkontext.
       Ohne ihn rutscht die Bildschicht (z-index: -1) unter den Hintergrund
       uebergeordneter Elemente - und damit unter ein Hintergrundbild, das
       ein Home-Assistant-Theme setzt. Genau so verschwand das Wallpaper auf
       dem Tablet: sichtbar war HAs Bild, unseres lag darunter.
       Mit isolation gilt das negative z-index nur innerhalb dieser Karte:
       hinter dem Glas, aber vor allem, was HA darunter malt. */
    isolation: isolate;
    margin: var(--haos-margin, 25px);
    width: calc(100% - 2 * var(--haos-margin, 25px));
  }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; }

  /* Hintergrundbild.
     Liegt fest hinter dem gesamten Fenster, nicht in der Shell: das Glas soll
     etwas haben, wodurch es hindurchschaut. Eine Flaeche innerhalb der Shell
     waere von ihr selbst verdeckt.
     pointer-events: none, damit die Schicht keine Klicks abfaengt. */
  .wallpaper {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background-image: var(--haos-background-image, none);
    background-size: cover; background-position: center; background-repeat: no-repeat;
  }
  /* In der Vorschau des Karteneditors bleibt das Bild INNERHALB der Karte.
     Mit position:fixed legte es sich sonst hinter den ganzen Dialog - man sah
     Einstellungen auf dem eigenen Hintergrundbild statt auf dem Dialog. */
  .wallpaper.contained { position: absolute; }
  .wallpaper::after {
    content: ""; position: absolute; inset: 0;
    background: rgba(0, 0, 0, var(--haos-background-dim, 0));
  }
  .wallpaper[hidden] { display: none; }

  .shell {
    min-height: var(--haos-shell-height, 480px);
    padding: var(--haos-shell-gap, 16px);
    display: grid;
    gap: var(--haos-shell-gap, 16px);
    grid-template-columns: 72px minmax(0, 1fr);
    grid-template-rows: ${TOPBAR_HEIGHT}px minmax(0, 1fr);
    grid-template-areas: "sidebar topbar" "sidebar content";
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    font-weight: var(--haos-font-weight-normal, 450);
    border-radius: calc(var(--haos-card-radius, 14px) + 8px);
    overflow: hidden;
    ${CARD_SURFACE_CSS}
  }

  /* ---------- Seitenleiste ---------- */
  .sidebar { grid-area: sidebar; min-width: 0; min-height: 0; ${ENTITY_SURFACE_CSS} }
  .sidebar nav { height: 100%; padding: 7px 6px; display: flex; flex-direction: column; align-items: center; }
  /* Etwas Luft nach beiden Seiten, damit der Rand des aktiven Knopfes nicht
     direkt an der Scroll-Kante klebt. */
  .side-top { width: 100%; flex: 1; min-height: 0; padding: 2px 3px; display: flex; flex-direction: column; align-items: center; gap: 7px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
  .side-top::-webkit-scrollbar { display: none; }
  .side-bottom { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 7px; }
  .side-divider { width: 28px; height: 1px; margin: 3px 0; background: rgba(var(--haos-text-rgb, 255,255,255), .18); }

  .icon-button {
    position: relative; width: 44px; height: 44px; flex: 0 0 44px;
    border: 1px solid transparent; border-radius: 14px;
    display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .68);
    background: transparent; cursor: pointer;
    transition: transform .16s ease, color .16s ease, background .16s ease, box-shadow .16s ease;
  }
  .icon-button:hover { color: var(--haos-text, #fff); background: rgba(var(--haos-text-rgb, 255,255,255), .09); transform: translateY(-1px); }
  .icon-button:active { transform: scale(.96); }
  .icon-button:disabled { opacity: .34; cursor: default; transform: none; }
  .icon-button ha-icon { --mdc-icon-size: 20px; }
  .icon-button.active {
    color: var(--haos-text, #fff);
    border-color: rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .20));
    background: linear-gradient(145deg, rgba(var(--haos-card-border-rgb, 255,255,255), .18), rgba(var(--haos-card-surface-rgb, 255,255,255), .07));
    /* Schatten bewusst flach: die Leiste scrollt (overflow-y: auto) und
       schneidet alles ab, was über den aktiven Knopf hinausragt. Ein weiter
       Schlagschatten wirkte dadurch abgeschnitten statt weich. */
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.38),
      inset 0 -10px 22px color-mix(in srgb, var(--haos-accent, #0a84ff) 18%, transparent),
      0 2px 6px rgba(0,0,0,.14),
      0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 16%, transparent);
  }
  .icon-button.active ha-icon { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent)); }

  /* ---------- Kopfzeile ---------- */
  .topbar {
    grid-area: topbar; min-width: 0; height: ${TOPBAR_HEIGHT}px;
    padding: 7px 12px; display: flex; align-items: center; gap: 12px;
    ${ENTITY_SURFACE_CSS}
  }
  .tabs { min-width: 0; flex: 1; display: flex; align-items: center; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  ${SEGMENTED_CSS}
  /* Die Reiter tragen denselben Umschalter wie die Karten, nur groesser. */
  .tabs .haos-seg-option { font-size: 15px; padding: 8px 16px; }

  .badges { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; }
  .badge {
    height: 44px; max-width: 210px; flex: 0 0 auto; padding: 5px 12px 5px 9px;
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    ${ENTITY_SURFACE_CSS}
  }
  .badge.icon-only { width: 44px; padding: 0; justify-content: center; }
  .badge:hover { background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .08)); }
  .badge ha-icon { --mdc-icon-size: 19px; }
  .badge .badge-text { min-width: 0; display: grid; text-align: left; }
  .badge b, .badge small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge b { font-size: 11px; }
  .badge small { margin-top: 2px; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .58); }
  .badge.is-on { box-shadow: var(--haos-entity-shadow), var(--haos-entity-sheen), inset 0 0 24px color-mix(in srgb, var(--haos-status-on, #0a84ff) 28%, transparent); }
  .badge.is-on ha-icon { color: var(--haos-status-on, #0a84ff); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-status-on, #0a84ff) 48%, transparent)); }
  .badge.is-off ha-icon { color: var(--haos-status-off, #a8b0b8); opacity: .72; }
  .badge.is-unavailable { opacity: .68; }
  .badge.is-unavailable ha-icon { color: var(--haos-status-unavailable, #ff6961); }

  .users { flex: 0 0 auto; display: flex; align-items: center; padding-left: 4px; }
  .user {
    position: relative; width: 42px; height: 42px; margin-left: -10px; padding: 3px;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .18));
    border-radius: 50%; overflow: hidden; display: grid; place-items: center; cursor: pointer;
    color: var(--haos-text, #fff);
    background: rgba(var(--haos-card-surface-rgb, 255,255,255), calc(var(--haos-card-opacity, .10) + .14));
    box-shadow: var(--haos-user-shadow);
    backdrop-filter: blur(var(--haos-card-blur, 16px)) saturate(var(--haos-card-saturation, 160%));
    font-size: 11px; font-weight: 800;
  }
  .user:first-child { margin-left: 0; }
  .user img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .user .initials { width: 100%; height: 100%; border-radius: 50%; display: grid; place-items: center; background: rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10)); }
  .user.is-home { box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-home, #32d583) 72%, transparent), 0 0 12px color-mix(in srgb, var(--haos-status-home, #32d583) 24%, transparent); }
  .user.is-away { opacity: .68; box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-away, #f7b955) 58%, transparent); }
  .user.is-unavailable { opacity: .42; filter: saturate(.25); box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-unavailable, #ff6961) 62%, transparent); }

  /* ---------- Inhalt ---------- */
  .content { grid-area: content; min-width: 0; min-height: 0; display: grid; }
  .page { grid-area: 1 / 1; min-width: 0; min-height: 0; display: grid; gap: var(--haos-shell-gap, 16px); grid-template-columns: var(--haos-grid-template, 1fr 1.55fr 1.05fr); }
  .page[hidden] { display: none; }
  .grid-column { min-width: 0; min-height: 0; display: grid; gap: var(--haos-shell-gap, 16px); align-content: start; }
  .slot { min-width: 0; min-height: 0; height: var(--slot-height, 125px); }
  .slot > * { display: block; height: 100%; }

  .grid-empty {
    min-height: 90px; display: grid; place-content: center; gap: 8px; text-align: center;
    border: 1px dashed rgba(var(--haos-text-rgb, 255,255,255), .22);
    border-radius: var(--haos-entity-radius, 14px);
    background: rgba(var(--haos-text-rgb, 255,255,255), .035);
    color: rgba(var(--haos-text-rgb, 255,255,255), .5); font-size: 12px;
  }
  .grid-empty ha-icon { margin: auto; --mdc-icon-size: 20px; }

  /* ---------- iFrame-Seite ---------- */
  .frame-page { grid-column: 1 / -1; min-width: 0; min-height: 0; overflow: hidden; ${ENTITY_SURFACE_CSS} }
  /* Ohne feste Höhe füllt der Rahmen die Seite. Ist eine Höhe eingestellt,
     wird er genau so hoch und richtet sich oben aus – die frühere
     frühere Mindesthöhe hätte jede kleinere Angabe überstimmt. */
  .frame-page { align-content: start; }
  .frame-page iframe { width: 100%; height: 100%; min-height: 0; border: 0; display: block; background: #fff; }
  .frame-page.fixed { height: auto; }
  .frame-empty { display: grid; place-content: center; gap: 8px; text-align: center; padding: 40px; color: rgba(var(--haos-text-rgb, 255,255,255), .68); }
  .frame-empty ha-icon { margin: auto; --mdc-icon-size: 30px; }

  /* ---------- Einstellungsseite ---------- */
  .settings { grid-column: 1 / -1; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; ${ENTITY_SURFACE_CSS} }
  .settings > header, .settings > footer { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .settings > header { border-bottom: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .settings > footer { border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .settings .eyebrow { color: var(--haos-accent, #0a84ff); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .settings h2 { margin: 3px 0 0; font-size: 23px; }
  .settings-body { min-height: 0; padding: 16px 20px; display: grid; align-content: start; gap: 14px; overflow-y: auto; overscroll-behavior: contain; }

  .group { border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .12); border-radius: 15px; overflow: hidden; background: rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10)); }
  .group > button { width: 100%; min-height: 52px; padding: 12px 14px; border: 0; background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; text-align: left; }
  .group > button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .06); }
  .group h3 { margin: 0; font-size: 13px; }
  .group-body { padding: 0 14px 14px; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .08); }
  .group-body[hidden] { display: none; }

  .control { min-height: 58px; padding: 9px 4px; display: grid; grid-template-columns: minmax(140px, 1fr) 60px minmax(140px, 1.2fr); align-items: center; gap: 12px; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .08); }
  .group-body > .control:first-child { border-top: 0; }
  .control.color { grid-template-columns: 1fr 58px; }
  /* Bildauswahl braucht die volle Breite – Vorschau und Uploadfläche passen
     nicht in eine Rasterspalte. */
  .control.stacked { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .control.stacked input.path {
    width: 100%; padding: 8px 10px; font: inherit; font-size: 12px;
    color: var(--haos-text, #fff);
    background: rgba(var(--haos-text-rgb, 255,255,255), .08);
    border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .16); border-radius: 8px;
  }
  ${IMAGE_FIELD_CSS}
  .control.dimmed { opacity: .45; }
  .switch {
    position: relative; width: 46px; height: 27px; flex: 0 0 46px; justify-self: end;
    border-radius: 999px; cursor: pointer;
    background: rgba(var(--haos-text-rgb, 255,255,255), .18);
    transition: background .18s ease;
  }
  .switch::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px;
    border-radius: 50%; background: #fff; transition: transform .18s ease;
  }
  .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .switch:has(input:checked) { background: var(--haos-accent, #0a84ff); }
  .switch:has(input:checked)::after { transform: translateX(19px); }
  .control b { display: block; font-size: 12px; }
  .control small { display: block; margin-top: 3px; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .53); }
  .control output { text-align: right; font-size: 11px; font-weight: 750; color: rgba(var(--haos-text-rgb, 255,255,255), .82); }
  .control input[type="range"] { width: 100%; accent-color: var(--haos-accent, #0a84ff); }
  /* Farbwähler.
     Der native Farbfleck laesst sich nicht zuverlaessig rund bekommen – die
     Regeln fuer ::-webkit-color-swatch greifen je nach Browserversion nicht,
     dann sitzt ein abgerundetes Quadrat im Kreis. Deshalb wird der Kreis
     selbst gezeichnet und das Bedienelement unsichtbar darübergelegt. Optik
     wie die Knoepfe der Seitenleiste: 44 px, Rand, Glanzkante, Schatten. */
  .swatch {
    position: relative; width: 44px; height: 44px; justify-self: end;
    border-radius: 50%; cursor: pointer;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .18));
    background: var(--swatch-color, #0a84ff);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.42), 0 7px 18px rgba(0,0,0,.15);
    transition: transform .16s ease, box-shadow .16s ease;
  }
  .swatch:hover { transform: translateY(-1px); }
  .swatch:active { transform: scale(.96); }
  .swatch input[type="color"] {
    position: absolute; inset: 0; width: 100%; height: 100%;
    opacity: 0; border: 0; padding: 0; cursor: pointer;
  }

  .settings footer button {
    min-height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 7px; cursor: pointer;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .14));
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(var(--haos-card-border-rgb, 255,255,255), .16), rgba(var(--haos-card-surface-rgb, 255,255,255), .06));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.34), 0 7px 18px rgba(0,0,0,.13);
  }
  .settings footer .primary {
    border-color: color-mix(in srgb, var(--haos-accent, #0a84ff) 34%, rgba(var(--haos-card-border-rgb, 255,255,255), .35));
    background: linear-gradient(145deg, color-mix(in srgb, var(--haos-accent, #0a84ff) 24%, rgba(var(--haos-card-border-rgb, 255,255,255), .13)), color-mix(in srgb, var(--haos-accent, #0a84ff) 12%, rgba(var(--haos-card-surface-rgb, 255,255,255), .05)));
    font-weight: 750;
  }
  .settings footer ha-icon { --mdc-icon-size: 17px; }

  button:focus-visible { outline: 2px solid color-mix(in srgb, var(--haos-accent, #0a84ff) 70%, #fff); outline-offset: 3px; }

  /* ---------- Responsiv ---------- */
  @media (max-width: 1050px) {
    .page { grid-template-columns: 1fr 1fr; }
    .grid-column:nth-child(3) { grid-column: 1 / -1; }
  }
  @media (max-width: 720px) {
    :host { margin: 8px; width: calc(100% - 16px); }
    .shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto; grid-template-areas: "topbar" "sidebar" "content"; }
    .sidebar nav { flex-direction: row; padding: 5px 7px; }
    .side-top { flex-direction: row; overflow-x: auto; overflow-y: hidden; }
    .side-bottom { width: auto; flex-direction: row; }
    .side-divider { width: 1px; height: 28px; margin: 0 3px; }
    .icon-button { width: 38px; height: 38px; flex-basis: 38px; border-radius: 11px; }
    .page { grid-template-columns: minmax(0, 1fr); }
    .grid-column:nth-child(3) { grid-column: auto; }
    .badge .badge-text { display: none; }
    .badge { width: 42px; padding: 0; justify-content: center; }
  }
`;
var THEME_CONTROLS = [
  {
    group: "general",
    key: "follow_ha",
    label: "Farben von Home Assistant",
    hint: "Akzent, Text, Statusfarben und Hintergrund folgen dem HA-Theme. Glas bleibt hier einstellbar.",
    type: "switch"
  },
  { group: "general", key: "accent", label: "Akzentfarbe", hint: "Aktive Elemente", type: "color" },
  { group: "general", key: "margin", label: "Außenabstand", hint: "Abstand um die Shell", min: 0, max: 60, step: 1, unit: "px" },
  // Gilt für alle Karten: sämtliche Beschriftungen und Werte leiten ihre
  // Abstufungen von dieser einen Farbe ab.
  { group: "general", key: "textDark", label: "Textfarbe Dunkel", hint: "Schrift im dunklen Modus", type: "color" },
  { group: "general", key: "textLight", label: "Textfarbe Hell", hint: "Schrift im hellen Modus", type: "color" },
  // Getrennt für Hell und Dunkel: ein Grün, das auf dunklem Glas leuchtet,
  // ist auf hellem nicht mehr zu lesen. Genau daran ist der frühere feste
  // Wert gescheitert.
  { group: "status", key: "statusGoodDark", label: "Aktiv · Dunkel", hint: "„ok“, „verriegelt“, „geschlossen“", type: "color" },
  { group: "status", key: "statusGoodLight", label: "Aktiv · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "status", key: "statusOffDark", label: "Inaktiv · Dunkel", hint: "Ausgeschaltet, ohne Meldung", type: "color" },
  { group: "status", key: "statusOffLight", label: "Inaktiv · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "status", key: "statusBadDark", label: "Nicht erreichbar · Dunkel", hint: "Warnung, offen, Fehler", type: "color" },
  { group: "status", key: "statusBadLight", label: "Nicht erreichbar · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "background", key: "backgroundDark", label: "Bild für Dunkel", hint: "Hintergrund im dunklen Modus", type: "image" },
  { group: "background", key: "backgroundLight", label: "Bild für Hell", hint: "Hintergrund im hellen Modus", type: "image" },
  { group: "background", key: "backgroundDim", label: "Abdunkeln", hint: "Schwarze Schicht über dem Bild", min: 0, max: 80, step: 1, unit: "%" },
  { group: "card", key: "cardSurface", label: "Grundfarbe", hint: "Farbe der Glasfläche", type: "color" },
  { group: "card", key: "cardOpacity", label: "Transparenz", hint: "Hintergrundkarte", min: 0, max: 95, step: 1, unit: "%" },
  { group: "card", key: "cardBlur", label: "Unschärfe", hint: "Hintergrundkarte", min: 0, max: 50, step: 1, unit: "px" },
  { group: "card", key: "cardSaturation", label: "Sättigung", hint: "Hintergrundkarte", min: 50, max: 240, step: 5, unit: "%" },
  { group: "card", key: "cardRadius", label: "Rundung", hint: "Hintergrundkarte", min: 0, max: 48, step: 1, unit: "px" },
  { group: "card", key: "cardBorder", label: "Rahmenfarbe", hint: "Kontur", type: "color" },
  { group: "card", key: "cardBorderOpacity", label: "Rahmenstärke", hint: "Hintergrundkarte", min: 0, max: 80, step: 1, unit: "%" },
  { group: "card", key: "cardSheen", label: "Glanz", hint: "Helle Kante oben, Schimmer über der Fläche", min: 0, max: 100, step: 1, unit: "%" },
  { group: "entity", key: "entitySurface", label: "Grundfarbe", hint: "Farbe der Kartenfläche", type: "color" },
  { group: "entity", key: "entityOpacity", label: "Transparenz", hint: "Entitätskarte", min: 0, max: 95, step: 1, unit: "%" },
  { group: "entity", key: "entityBlur", label: "Unschärfe", hint: "Entitätskarte", min: 0, max: 50, step: 1, unit: "px" },
  { group: "entity", key: "entitySaturation", label: "Sättigung", hint: "Entitätskarte", min: 50, max: 240, step: 5, unit: "%" },
  { group: "entity", key: "entityRadius", label: "Rundung", hint: "Entitätskarte", min: 0, max: 48, step: 1, unit: "px" },
  { group: "entity", key: "entityBorder", label: "Rahmenfarbe", hint: "Kontur", type: "color" },
  { group: "entity", key: "entityBorderOpacity", label: "Rahmenstärke", hint: "Entitätskarte", min: 0, max: 80, step: 1, unit: "%" },
  { group: "entity", key: "entitySheen", label: "Glanz", hint: "Helle Kante oben, Schimmer über der Fläche", min: 0, max: 100, step: 1, unit: "%" }
];
var GROUP_TITLES = {
  general: "Allgemein",
  status: "Statusfarben",
  background: "Hintergrundbild",
  card: "Hintergrundkarte",
  entity: "Entitätskarten"
};
var el = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var iconEl = (icon6) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", icon6);
  return node;
};
var HaOsShell = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._built = false;
    this._activePageId = "home";
    this._returnPageId = "home";
    this._fullscreenOptimistic = void 0;
    this._openGroups = /* @__PURE__ */ new Set(["general"]);
    this._pages = /* @__PURE__ */ new Map();
    this._badges = /* @__PURE__ */ new Map();
    this._users = /* @__PURE__ */ new Map();
    this._tabs = /* @__PURE__ */ new Map();
    this._frameObservers = /* @__PURE__ */ new Set();
    this._onThemeChanged = () => {
      this._syncMetrics();
      if (this._activePageId === SETTINGS_PAGE_ID) this._syncSettingsValues();
    };
    this._onKeyDown = (event) => {
      if (event.key === "Escape" && this._activePageId === SETTINGS_PAGE_ID) this._closeSettings();
    };
  }
  // ---------------------------------------------------------------- Lovelace
  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }
  static getStubConfig() {
    return {
      type: `custom:${TAG}`,
      gap: 16,
      row_height: 125,
      pages: [{ id: "home", name: "Home", icon: "mdi:home", grid_widths: DEFAULT_GRID_WIDTHS, grids: createEmptyGrids() }]
    };
  }
  connectedCallback() {
    window.addEventListener("haos-theme-changed", this._onThemeChanged);
    window.addEventListener("keydown", this._onKeyDown);
    this._syncWallpaperScope();
  }
  /**
   * Steckt die Karte in einer Vorschau des Karteneditors?
   *
   * Der Weg nach oben führt durch Shadow-Grenzen, deshalb wird bei jedem
   * Wurzelknoten auf dessen `host` gewechselt. Gesucht sind HAs
   * Vorschau-Elemente – findet sich eines, bleibt das Hintergrundbild
   * innerhalb der Karte.
   */
  _inPreview() {
    const marker = ["HUI-CARD-PREVIEW", "HUI-DIALOG-EDIT-CARD", "HUI-CARD-ELEMENT-EDITOR"];
    let node = this;
    for (let step = 0; step < 40 && node; step += 1) {
      if (node.tagName && marker.includes(node.tagName)) return true;
      node = node.parentNode?.host || node.parentNode || node.host;
    }
    return false;
  }
  _syncWallpaperScope() {
    if (!this._wallpaper) return;
    this._wallpaper.classList.toggle("contained", this._inPreview());
  }
  disconnectedCallback() {
    window.removeEventListener("haos-theme-changed", this._onThemeChanged);
    window.removeEventListener("keydown", this._onKeyDown);
    this._disconnectFrameObservers();
  }
  setConfig(config) {
    const next = normalizeShellConfig(config);
    const previous = this._config;
    this._config = next;
    if (!this._built) this._build();
    if (!next.pages.some((page) => page.id === this._activePageId) && this._activePageId !== SETTINGS_PAGE_ID) {
      this._activePageId = next.pages[0]?.id || "home";
    }
    HaOsTheme.setFallbacks(next);
    this._syncSidebar();
    this._syncTabs();
    this._dropRemovedPages(previous);
    this._syncActivePage();
    this._syncMetrics();
    this._updateStates();
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._built) return;
    if (first || this._watchedChanged(hass)) this._updateStates();
    this._pages.forEach((page) => {
      page.entries.forEach((entry) => {
        if (entry.element) entry.element.hass = hass;
      });
    });
  }
  get hass() {
    return this._hass;
  }
  /** Entitäten, die in Seitenleiste, Badges und Benutzerleiste vorkommen. */
  _watchedEntities() {
    const users = this._config.users.length ? this._config.users : Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));
    const badges = (this._activePage()?.badges || []).filter((badge) => badge.entity).map((badge) => badge.entity);
    const actions = this._config.quick_actions.filter((action) => action.entity).map((action) => action.entity);
    const fullscreen = this._config.fullscreen_entity ? [this._config.fullscreen_entity] : [];
    return [...users, ...badges, ...actions, ...fullscreen];
  }
  _watchedChanged(hass) {
    const watched = this._watchedEntities();
    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;
    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) {
      if (previous.get(id) !== state) return true;
    }
    return false;
  }
  /** Höhe in HA-Section-Rasterzeilen, damit die Shell mit den Karten wächst. */
  getCardSize() {
    return Math.max(4, Math.ceil(this._measureHeight() / 60));
  }
  getGridOptions() {
    return { rows: this.getCardSize(), columns: "full", min_rows: 6, min_columns: 6 };
  }
  getLayoutOptions() {
    return { grid_rows: this.getCardSize(), grid_columns: "full" };
  }
  // ---------------------------------------------------------------- Aufbau
  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES;
    this._shell = el("section", "shell");
    this._sidebar = el("aside", "sidebar");
    this._sidebarNav = el("nav");
    this._sidebarNav.setAttribute("aria-label", "Seitenleiste");
    this._sideTop = el("div", "side-top");
    this._sideBottom = el("div", "side-bottom");
    this._sidebarNav.append(this._sideTop, this._sideBottom);
    this._sidebar.append(this._sidebarNav);
    this._topbar = el("header", "topbar");
    this._tabList = el("div", "tabs");
    this._tabList.setAttribute("role", "tablist");
    this._badgeList = el("div", "badges");
    this._userList = el("div", "users");
    this._userList.setAttribute("aria-label", "Personen");
    this._topbar.append(this._tabList, this._badgeList, this._userList);
    this._content = el("main", "content");
    this._wallpaper = el("div", "wallpaper");
    this._wallpaper.setAttribute("aria-hidden", "true");
    this._shell.append(this._sidebar, this._topbar, this._content);
    this.shadowRoot.append(style, this._wallpaper, this._shell);
    this._built = true;
    this._syncWallpaperScope();
  }
  // ---------------------------------------------------------------- Seitenleiste
  _syncSidebar() {
    const config = this._config;
    this._sideTop.replaceChildren();
    this._sidebarPages = /* @__PURE__ */ new Map();
    if (config.sidebar_pages) {
      config.pages.forEach((page) => {
        const button = el("button", "icon-button");
        button.title = page.name;
        button.setAttribute("aria-label", page.name);
        button.append(iconEl(page.icon || "mdi:view-dashboard-outline"));
        button.addEventListener("click", () => this._selectPage(page.id));
        this._sidebarPages.set(page.id, button);
        this._sideTop.append(button);
      });
      if (config.pages.length && config.quick_actions.length) {
        this._sideTop.append(el("div", "side-divider"));
      }
    }
    this._quickActions = /* @__PURE__ */ new Map();
    config.quick_actions.forEach((action) => {
      const button = el("button", "icon-button");
      button.title = action.name || action.entity || "Aktion";
      button.append(iconEl(action.icon));
      button.addEventListener("click", () => handleAction(this, this._hass, action.tap_action, action.entity));
      this._quickActions.set(action.id, { root: button, action });
      this._sideTop.append(button);
    });
    this._sideBottom.replaceChildren();
    if (config.quick_actions.length) this._sideBottom.append(el("div", "side-divider"));
    if (config.show_settings_button) {
      this._settingsButton = el("button", "icon-button");
      this._settingsButton.title = "Systemeinstellungen";
      this._settingsButton.append(iconEl("mdi:cog-outline"));
      this._settingsButton.addEventListener("click", () => this._toggleSettings());
      this._sideBottom.append(this._settingsButton);
    } else {
      this._settingsButton = null;
    }
    if (config.fullscreen_entity) {
      this._fullscreenButton = el("button", "icon-button");
      this._fullscreenButton.append(iconEl("mdi:fullscreen"));
      this._fullscreenButton.addEventListener("click", () => this._toggleFullscreen());
      this._sideBottom.append(this._fullscreenButton);
    } else {
      this._fullscreenButton = null;
    }
    if (config.show_theme_button) {
      this._themeButton = el("button", "icon-button");
      this._themeButton.append(iconEl("mdi:white-balance-sunny"));
      this._themeButton.addEventListener("click", () => this._toggleMode());
      this._sideBottom.append(this._themeButton);
    } else {
      this._themeButton = null;
    }
  }
  /**
   * Hell/Dunkel umschalten.
   *
   * Wenn die Farben von Home Assistant kommen, muss der Knopf auch **dort**
   * umschalten – sonst aendert er nichts Sichtbares mehr: HA-OS wuerde
   * weiterhin die Farben eines hellen HA-Themes anzeigen, waehrend es sich
   * selbst fuer dunkel haelt.
   *
   * `frontend.set_theme` mit `mode` ist der einzige Weg von aussen. Der Name
   * des Themes bleibt unangetastet; ohne ihn faellt Home Assistant auf seine
   * Vorgabe zurueck und der Anwender verlaere sein gewaehltes Theme.
   */
  _toggleMode() {
    HaOsTheme.toggleMode();
    if (!HaOsTheme.get().follow_ha || !this._hass?.callService) return;
    const mode = HaOsTheme.get().mode === "light" ? "light" : "dark";
    const name = this._hass.themes?.theme || "Backend-selected";
    this._hass.callService("frontend", "set_theme", { name, mode });
  }
  // ---------------------------------------------------------------- Tabs
  /**
   * Reiter als Segmentumschalter – dieselbe Optik wie in den Karten.
   *
   * Der Umschalter wird bei einer Strukturaenderung neu gebaut, nicht bei
   * jedem Seitenwechsel: dort wandert nur die Pille. Sonst spraenge sie
   * statt zu gleiten.
   */
  _syncTabs() {
    this._tabList.replaceChildren();
    this._tabs.clear();
    this._tabSeg = null;
    if (!this._config.topbar_tabs) return;
    this._tabSeg = createSegmented({
      options: this._config.pages.map((page) => ({ value: page.id, label: page.name })),
      value: this._activePageId,
      ariaLabel: "Seiten",
      onChange: (pageId) => this._selectPage(pageId)
    });
    this._tabList.append(this._tabSeg.element);
    nextFrame(() => this._tabSeg?.place());
  }
  // ---------------------------------------------------------------- Seiten
  _dropRemovedPages(previousConfig) {
    if (!previousConfig) return;
    const validIds = /* @__PURE__ */ new Set([...this._config.pages.map((page) => page.id), SETTINGS_PAGE_ID]);
    [...this._pages.keys()].forEach((pageId) => {
      if (validIds.has(pageId)) return;
      this._pages.get(pageId)?.root.remove();
      this._pages.delete(pageId);
    });
  }
  _selectPage(pageId) {
    if (pageId === this._activePageId) return;
    if (pageId !== SETTINGS_PAGE_ID && !this._config.pages.some((page) => page.id === pageId)) return;
    this._activePageId = pageId;
    this._syncActivePage();
    this._syncMetrics();
    this._updateStates();
  }
  _syncActivePage() {
    const activeId = this._activePageId;
    if (activeId === SETTINGS_PAGE_ID) this._ensureSettingsPage();
    else this._ensurePage(this._config.pages.find((page) => page.id === activeId));
    this._pages.forEach((entry, pageId) => {
      entry.root.hidden = pageId !== activeId;
    });
    this._tabSeg?.update(activeId);
    this._sidebarPages?.forEach((button, pageId) => button.classList.toggle("active", pageId === activeId));
    this._settingsButton?.classList.toggle("active", activeId === SETTINGS_PAGE_ID);
    this._syncBadges();
  }
  _ensurePage(page) {
    if (!page) return;
    let entry = this._pages.get(page.id);
    if (!entry) {
      const root = el("div", "page");
      root.dataset.pageId = page.id;
      entry = { root, columns: [], entries: [], kind: null };
      this._pages.set(page.id, entry);
      this._content.append(root);
    }
    if (page.kind === "iframe") {
      this._buildFramePage(entry, page);
      return;
    }
    if (entry.kind !== "page") {
      entry.root.replaceChildren();
      entry.columns = [];
      entry.entries = [];
      entry.kind = "page";
    }
    const wantedColumns = page.grids.length;
    while (entry.columns.length < wantedColumns) {
      const column = el("section", "grid-column");
      entry.root.append(column);
      entry.columns.push(column);
    }
    while (entry.columns.length > wantedColumns) {
      entry.columns.pop()?.remove();
    }
    entry.root.style.setProperty(
      "--haos-grid-template",
      page.grid_widths.map((width) => `minmax(0, ${width}fr)`).join(" ")
    );
    this._syncPageCards(entry, page);
  }
  /**
   * Gleicht die Kinderkarten einer Seite ab.
   *
   * Karten mit unveränderter Konfiguration werden WIEDERVERWENDET. Nur wirklich
   * geänderte oder neue Karten werden erzeugt. Dadurch verliert eine Änderung an
   * Karte 3 nicht den Zustand von Karte 1 und 2.
   */
  _syncPageCards(entry, page) {
    const wanted = [];
    page.grids.forEach((grid, columnIndex) => {
      grid.cards.forEach((cardConfig, cardIndex) => {
        wanted.push({ columnIndex, cardIndex, config: cardConfig });
      });
    });
    const previous = entry.entries;
    const next = [];
    wanted.forEach((item) => {
      const key = `${item.columnIndex}:${item.cardIndex}`;
      const existing = previous.find((candidate) => candidate.key === key);
      const cleanConfig = stripHaOsKeys(item.config);
      if (existing && isEqualConfig(existing.cleanConfig, cleanConfig)) {
        existing.wrapper.style.setProperty("--slot-height", `${this._slotHeight(item.config)}px`);
        next.push(existing);
        return;
      }
      if (existing) {
        existing.wrapper.remove();
      }
      const wrapper = el("div", "slot");
      wrapper.style.setProperty("--slot-height", `${this._slotHeight(item.config)}px`);
      const record = { key, config: item.config, cleanConfig, wrapper, element: null };
      next.push(record);
      createCardElement(cleanConfig).then((element) => {
        if (!entry.entries.includes(record)) return;
        record.element = element;
        if (this._hass) element.hass = this._hass;
        wrapper.replaceChildren(element);
      }).catch((error) => {
        wrapper.replaceChildren(el("div", "grid-empty", `Karte konnte nicht geladen werden: ${error?.message || error}`));
      });
    });
    previous.forEach((record) => {
      if (!next.includes(record)) record.wrapper.remove();
    });
    entry.entries = next;
    entry.columns.forEach((column, columnIndex) => {
      const slots = wanted.map((item, position) => ({ item, record: next[position] })).filter(({ item }) => item.columnIndex === columnIndex).map(({ record }) => record.wrapper);
      if (!slots.length) {
        const placeholder = el("div", "grid-empty");
        placeholder.append(iconEl("mdi:plus"), el("span", null, "Noch keine Karte"));
        column.replaceChildren(placeholder);
        return;
      }
      column.replaceChildren(...slots);
    });
  }
  _slotHeight(cardConfig) {
    return Math.round((Number(cardConfig.haos_weight) || 1) * this._config.row_height);
  }
  // ---------------------------------------------------------------- iFrame
  _buildFramePage(entry, page) {
    entry.root.replaceChildren();
    entry.columns = [];
    entry.entries = [];
    entry.kind = "iframe";
    const container = el("section", "frame-page");
    if (!page.url) {
      const empty = el("div", "frame-empty");
      empty.append(
        iconEl("mdi:web-off"),
        el("strong", null, "Noch keine Adresse eingetragen"),
        el("span", null, "Die URL wird im Editor unter „Seiten“ konfiguriert.")
      );
      container.append(empty);
      entry.root.append(container);
      return;
    }
    const frame = document.createElement("iframe");
    frame.src = /^https?:\/\//i.test(page.url) || page.url.startsWith("/") ? page.url : `https://${page.url}`;
    frame.title = page.name;
    frame.setAttribute("loading", "eager");
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    if (page.frame_height) {
      container.classList.add("fixed");
      frame.style.height = `${page.frame_height}px`;
    }
    container.append(frame);
    entry.root.append(container);
    if (page.hide_ha_chrome && this._isInternalUrl(frame.src)) {
      frame.addEventListener("load", () => this._applyKiosk(frame));
    }
  }
  _isInternalUrl(url) {
    try {
      return new URL(url, window.location.href).origin === window.location.origin;
    } catch (_error) {
      return false;
    }
  }
  _disconnectFrameObservers() {
    this._frameObservers.forEach((observer) => observer.disconnect());
    this._frameObservers.clear();
  }
  /** Blendet Kopfzeile und Seitenleiste in einem HA-internen iFrame aus. */
  _applyKiosk(frame) {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (_error) {
      return;
    }
    if (!doc?.documentElement || typeof MutationObserver === "undefined") return;
    const css = `
      :host { --app-drawer-width: 0px !important; --ha-sidebar-width: 0px !important; --header-height: 0px !important; }
      ha-sidebar, app-header, ha-menu-button, [slot="app-header"],
      .header, .toolbar, app-toolbar, ha-top-app-bar-fixed .mdc-top-app-bar { display: none !important; }
      #main, #content, main, .mdc-drawer-app-content { margin-left: 0 !important; padding-top: 0 !important; }
      hui-view, #view { padding-top: 0 !important; }
    `;
    const seen = /* @__PURE__ */ new WeakSet();
    const refresh = (root) => {
      if (!root?.querySelectorAll) return;
      if (!root.querySelector?.("style[data-haos-kiosk]")) {
        const style = doc.createElement("style");
        style.dataset.haosKiosk = "true";
        style.textContent = css;
        (root === doc ? doc.head || doc.documentElement : root).append?.(style);
      }
      root.querySelectorAll("ha-sidebar, app-header, ha-menu-button, .header, .toolbar, app-toolbar").forEach(
        (node) => node.style.setProperty("display", "none", "important")
      );
      root.querySelectorAll("*").forEach((node) => node.shadowRoot && observe(node.shadowRoot));
    };
    const observe = (root) => {
      if (seen.has(root)) return;
      seen.add(root);
      refresh(root);
      const observer = new MutationObserver(() => refresh(root));
      observer.observe(root, { childList: true, subtree: true });
      this._frameObservers.add(observer);
    };
    doc.documentElement.dataset.haosKiosk = "true";
    observe(doc);
  }
  // ---------------------------------------------------------------- Zustände
  /** Aktualisiert NUR Text, Klassen und Attribute. Erzeugt keine Karten neu. */
  _updateStates() {
    if (!this._built || !this._config) return;
    this._updateBadgeStates();
    this._updateUsers();
    this._updateFullscreenButton();
    this._updateThemeButton();
    this._updateQuickActions();
  }
  _activePage() {
    return this._config.pages.find((page) => page.id === this._activePageId);
  }
  _syncBadges() {
    const page = this._activePage();
    const badges = page?.badges || [];
    this._badgeList.replaceChildren();
    this._badges.clear();
    badges.forEach((badge) => {
      const root = el("button", "badge");
      const icon6 = iconEl(badge.icon || "mdi:circle-outline");
      root.append(icon6);
      let name = null;
      let state = null;
      if (badge.show_state || badge.name) {
        const text2 = el("div", "badge-text");
        name = el("b");
        text2.append(name);
        if (badge.show_state) {
          state = el("small");
          text2.append(state);
        }
        root.append(text2);
      } else {
        root.classList.add("icon-only");
      }
      root.addEventListener("click", () => handleAction(this, this._hass, badge.tap_action, badge.entity));
      this._badges.set(badge.id, { root, icon: icon6, name, state, badge });
      this._badgeList.append(root);
    });
    this._updateBadgeStates();
  }
  _updateBadgeStates() {
    this._badges.forEach(({ root, icon: icon6, name, state, badge }) => {
      if (badge.kind === "link") {
        root.classList.remove("is-on", "is-off", "is-unavailable");
        if (name) name.textContent = badge.name || "Link";
        if (state) state.textContent = "Öffnen";
        root.title = badge.name || badge.url || "Link";
        return;
      }
      if (badge.kind === "sum") {
        const states = this._hass?.states || {};
        const ids = badge.entities.length ? badge.entities : Object.keys(states).filter((id) => {
          if (!id.startsWith("sensor.")) return false;
          if (states[id].attributes?.device_class !== "energy") return false;
          return !badge.suffix || id.endsWith(badge.suffix);
        });
        let summe = 0;
        let gezaehlt = 0;
        ids.forEach((id) => {
          const zahl = Number(states[id]?.state);
          if (!Number.isFinite(zahl)) return;
          summe += zahl;
          gezaehlt += 1;
        });
        root.classList.remove("is-on", "is-off", "is-unavailable");
        icon6.setAttribute("icon", badge.icon || "mdi:lightning-bolt");
        if (name) name.textContent = badge.name || "Energie";
        if (state) {
          state.textContent = gezaehlt ? `${Math.abs(summe) >= 100 ? Math.round(summe).toLocaleString("de-DE") : summe.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${badge.unit || "kWh"}` : "–";
        }
        root.title = gezaehlt ? `${gezaehlt} Zähler` : "Keine Zähler gefunden";
        return;
      }
      const entityState = this._hass?.states?.[badge.entity];
      const label = badge.name || friendlyName(badge.entity, entityState);
      root.classList.remove("is-on", "is-off", "is-unavailable");
      root.classList.add(statusClass(entityState));
      icon6.setAttribute("icon", badge.icon || domainIcon(badge.entity, entityState));
      if (name) name.textContent = label;
      if (state) state.textContent = formatState(this._hass, badge.entity);
      root.title = label;
    });
  }
  _updateQuickActions() {
    this._quickActions?.forEach(({ root, action }) => {
      if (!action.entity) return;
      const state = this._hass?.states?.[action.entity];
      root.classList.toggle("active", statusClass(state) === "is-on");
    });
  }
  _updateUsers() {
    const ids = this._config.users.length ? this._config.users : Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));
    const currentIds = [...this._users.keys()];
    if (currentIds.join("|") !== ids.join("|")) {
      this._userList.replaceChildren();
      this._users.clear();
      ids.forEach((id) => {
        const root = el("button", "user");
        root.addEventListener("click", () => showMoreInfo(this, id));
        this._users.set(id, { root, picture: null });
        this._userList.append(root);
      });
    }
    this._users.forEach((record, id) => {
      const state = this._hass?.states?.[id];
      const name = friendlyName(id, state);
      const picture = state?.attributes?.entity_picture || "";
      const status = isUnavailable(state) ? "unavailable" : state.state === "home" ? "home" : "away";
      record.root.classList.remove("is-home", "is-away", "is-unavailable");
      record.root.classList.add(`is-${status}`);
      record.root.title = `${name} · ${{ home: "Zuhause", away: "Abwesend", unavailable: "Nicht erreichbar" }[status]}`;
      if (picture !== record.picture) {
        record.picture = picture;
        if (picture) {
          const img = document.createElement("img");
          img.src = picture;
          img.alt = "";
          record.root.replaceChildren(img);
        } else {
          const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
          record.root.replaceChildren(el("span", "initials", initials.toUpperCase() || "?"));
        }
      } else if (!picture) {
        const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
        const span = record.root.querySelector(".initials");
        if (span) span.textContent = initials.toUpperCase() || "?";
      }
    });
  }
  _updateFullscreenButton() {
    if (!this._fullscreenButton) return;
    const state = this._hass?.states?.[this._config.fullscreen_entity];
    if (this._fullscreenOptimistic !== void 0 && state?.state === (this._fullscreenOptimistic ? "on" : "off")) {
      this._fullscreenOptimistic = void 0;
    }
    const active2 = this._fullscreenOptimistic ?? state?.state === "on";
    this._fullscreenButton.disabled = !state;
    this._fullscreenButton.classList.toggle("active", Boolean(active2));
    this._fullscreenButton.title = active2 ? "Vollbild beenden" : "Vollbild aktivieren";
    this._fullscreenButton.querySelector("ha-icon")?.setAttribute("icon", active2 ? "mdi:fullscreen-exit" : "mdi:fullscreen");
  }
  _updateThemeButton() {
    if (!this._themeButton) return;
    const dark = HaOsTheme.get().mode === "dark";
    this._themeButton.title = dark ? "Helles Design aktivieren" : "Dunkles Design aktivieren";
    this._themeButton.querySelector("ha-icon")?.setAttribute("icon", dark ? "mdi:white-balance-sunny" : "mdi:weather-night");
  }
  _toggleFullscreen() {
    const entityId = this._config.fullscreen_entity;
    const state = this._hass?.states?.[entityId];
    if (!state) return;
    this._fullscreenOptimistic = !(this._fullscreenOptimistic ?? state.state === "on");
    this._updateFullscreenButton();
    Promise.resolve(this._hass.callService("input_boolean", "toggle", { entity_id: entityId })).catch(() => {
      this._fullscreenOptimistic = void 0;
      this._updateFullscreenButton();
    });
  }
  // ---------------------------------------------------------------- Maße
  _measureHeight() {
    if (!this._config) return 480;
    if (this._activePageId === SETTINGS_PAGE_ID) return Math.max(720, Math.round((window.innerHeight || 900) - 150));
    const page = this._activePage();
    if (!page) return 480;
    if (page.kind === "iframe") return Math.max(720, Math.round((window.innerHeight || 900) - 150));
    const gap = this._config.gap;
    const columnHeights = page.grids.map((grid) => {
      if (!grid.cards.length) return 0;
      const cards = grid.cards.reduce((sum, card) => sum + this._slotHeight(card), 0);
      return cards + (grid.cards.length - 1) * gap;
    });
    const content = Math.max(360, ...columnHeights);
    return TOPBAR_HEIGHT + gap * 3 + content;
  }
  _syncMetrics() {
    if (!this._built || !this._config) return;
    const height = this._measureHeight();
    this._shell.style.setProperty("--haos-shell-height", `${height}px`);
    this._shell.style.setProperty("--haos-shell-gap", `${this._config.gap}px`);
    this.dispatchEvent(new CustomEvent("card-size-changed", { bubbles: true, composed: true }));
  }
  // ---------------------------------------------------------------- Einstellungen
  _toggleSettings() {
    if (this._activePageId === SETTINGS_PAGE_ID) this._closeSettings();
    else this._openSettings();
  }
  _openSettings() {
    this._returnPageId = this._activePageId;
    this._selectPage(SETTINGS_PAGE_ID);
  }
  _closeSettings() {
    const target = this._config.pages.some((page) => page.id === this._returnPageId) ? this._returnPageId : "home";
    this._selectPage(target);
  }
  _ensureSettingsPage() {
    if (this._pages.has(SETTINGS_PAGE_ID)) {
      this._syncSettingsValues();
      return;
    }
    const root = el("div", "page");
    root.dataset.pageId = SETTINGS_PAGE_ID;
    const section = el("section", "settings");
    const header = document.createElement("header");
    const titleBox = el("div");
    titleBox.append(el("span", "eyebrow", "HA-OS"), el("h2", null, "Systemeinstellungen"));
    const backButton = el("button", "icon-button");
    backButton.append(iconEl("mdi:arrow-left"));
    backButton.title = "Zurück";
    backButton.addEventListener("click", () => this._closeSettings());
    header.append(titleBox, backButton);
    const body = el("div", "settings-body");
    this._settingsInputs = /* @__PURE__ */ new Map();
    this._settingsPaths = /* @__PURE__ */ new Map();
    this._settingsImages = /* @__PURE__ */ new Map();
    this._settingsSwitches = /* @__PURE__ */ new Map();
    Object.keys(GROUP_TITLES).forEach((groupId) => {
      const group = el("section", "group");
      const toggle = document.createElement("button");
      toggle.append(el("h3", null, GROUP_TITLES[groupId]), iconEl("mdi:chevron-down"));
      const groupBody = el("div", "group-body");
      groupBody.hidden = !this._openGroups.has(groupId);
      toggle.addEventListener("click", () => {
        const open = this._openGroups.has(groupId);
        if (open) this._openGroups.delete(groupId);
        else this._openGroups.add(groupId);
        groupBody.hidden = open;
        toggle.querySelector("ha-icon")?.setAttribute("icon", open ? "mdi:chevron-down" : "mdi:chevron-up");
      });
      toggle.querySelector("ha-icon")?.setAttribute("icon", groupBody.hidden ? "mdi:chevron-down" : "mdi:chevron-up");
      THEME_CONTROLS.filter((control) => control.group === groupId).forEach((control) => {
        groupBody.append(this._buildThemeControl(control));
      });
      group.append(toggle, groupBody);
      body.append(group);
    });
    const footer = document.createElement("footer");
    const resetButton = document.createElement("button");
    resetButton.append(iconEl("mdi:restore"), el("span", null, "Standard"));
    resetButton.addEventListener("click", () => {
      HaOsTheme.reset();
      this._syncSettingsValues();
    });
    const doneButton = el("button", "primary", "Fertig");
    doneButton.addEventListener("click", () => this._closeSettings());
    footer.append(resetButton, doneButton);
    section.append(header, body, footer);
    root.append(section);
    this._pages.set(SETTINGS_PAGE_ID, { root, columns: [], entries: [], kind: "settings" });
    this._content.append(root);
    this._syncSettingsValues();
  }
  _buildThemeControl(control) {
    if (control.type === "image") return this._buildImageControl(control);
    if (control.type === "switch") return this._buildSwitchControl(control);
    const label = document.createElement("label");
    label.className = control.type === "color" ? "control color" : "control";
    const text2 = el("span");
    text2.append(el("b", null, control.label), el("small", null, control.hint));
    label.append(text2);
    const input = document.createElement("input");
    input.type = control.type === "color" ? "color" : "range";
    let swatch = null;
    if (control.type !== "color") {
      const output = document.createElement("output");
      label.append(output);
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      this._settingsInputs.set(control.key, { input, output, control });
    } else {
      swatch = el("span", "swatch");
      swatch.append(input);
      this._settingsInputs.set(control.key, { input, output: null, control, swatch });
    }
    input.addEventListener("input", () => {
      const value = control.type === "color" ? input.value : Number(input.value);
      HaOsTheme.save({ [control.key]: value });
      const record = this._settingsInputs.get(control.key);
      if (record?.output) record.output.textContent = `${value}${control.unit || ""}`;
      if (record?.swatch) record.swatch.style.setProperty("--swatch-color", value);
    });
    label.append(swatch || input);
    return label;
  }
  /**
   * Schalter in der Einstellungsseite.
   *
   * Bewusst ein eigenes Element und kein `ha-switch`: die Seite laeuft im
   * Shadow-DOM der Karte, und ob HAs Elemente dort schon geladen sind, ist
   * Zufall - dieselbe Falle wie bei der Bildauswahl.
   */
  _buildSwitchControl(control) {
    const label = document.createElement("label");
    label.className = "control";
    const text2 = el("span");
    text2.append(el("b", null, control.label), el("small", null, control.hint));
    const track = el("span", "switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(HaOsTheme.get()[control.key]);
    track.append(input);
    input.addEventListener("change", () => {
      HaOsTheme.save({ [control.key]: input.checked });
      this._syncSettingsValues();
    });
    label.append(text2, track);
    this._settingsSwitches.set(control.key, input);
    return label;
  }
  /**
   * Bildauswahl mit Upload.
   *
   * Eine Lovelace-Karte darf nicht in `config/www/` schreiben – dafür gibt es
   * keine Schnittstelle. Home Assistant bringt aber eine eigene Bildablage
   * mit, und `createImageField` spricht deren Schnittstelle direkt an.
   *
   * Früher hing das an `ha-selector`. Ob das Element beim Bauen der
   * Einstellungsseite schon geladen ist, ist jedoch Zufall – war es das
   * nicht, fehlte die Bildauswahl **ganz**, ohne jede Meldung. Genau so ist
   * sie zeitweise verschwunden.
   *
   * Das Textfeld darunter bleibt für alle, die ihre Bilder lieber selbst nach
   * `config/www/wallpaper/` legen und `/local/wallpaper/…` eintragen.
   */
  _buildImageControl(control) {
    const wrap = el("div", "control stacked");
    const text2 = el("span");
    text2.append(el("b", null, control.label), el("small", null, control.hint));
    wrap.append(text2);
    const field = createImageField({
      getHass: () => this._hass,
      getValue: () => HaOsTheme.get()[control.key] || "",
      placeholder: "/local/wallpaper/bild.jpg",
      onChange: (value) => {
        HaOsTheme.save({ [control.key]: value });
      }
    });
    wrap.append(field.element);
    this._settingsImages.set(control.key, { field, control });
    return wrap;
  }
  _syncSettingsValues() {
    if (!this._settingsInputs) return;
    const theme = HaOsTheme.get();
    this._settingsInputs.forEach(({ input, output, control, swatch }, key) => {
      const value = theme[key];
      if (value === void 0) return;
      input.value = value;
      if (output) output.textContent = `${value}${control.unit || ""}`;
      if (swatch) swatch.style.setProperty("--swatch-color", value);
    });
    this._settingsPaths?.forEach((input, key) => {
      input.value = theme[key] || "";
    });
    this._settingsImages?.forEach(({ field }) => field.refresh());
    this._settingsSwitches?.forEach((input, key) => {
      input.checked = Boolean(theme[key]);
    });
    const uebernommen = Boolean(theme.follow_ha);
    this._settingsInputs.forEach(({ input, control }) => {
      if (control.type !== "color") return;
      const haGesteuert = [
        "accent",
        "textLight",
        "textDark",
        "statusGoodLight",
        "statusGoodDark",
        "statusOffLight",
        "statusOffDark",
        "statusBadLight",
        "statusBadDark"
      ].includes(control.key);
      const feld = input.closest(".control");
      if (feld) feld.classList.toggle("dimmed", uebernommen && haGesteuert);
    });
  }
};
if (!customElements.get(TAG)) customElements.define(TAG, HaOsShell);
registerCard({
  type: TAG,
  name: "HA-OS Shell",
  description: "Grundgerüst mit Glasfläche, Seitenleiste, Kopfzeile und drei Rastern.",
  preview: false,
  documentationURL: "https://github.com/"
});

// src/shared/card-catalog.js
var STANDARD_CARDS = [
  { type: "tile", name: "Kachel", description: "Kompakte Kachel mit Symbol, Name und Zustand.", icon: "mdi:card-outline" },
  { type: "entities", name: "Entitäten", description: "Liste mehrerer Entitäten untereinander.", icon: "mdi:format-list-bulleted" },
  { type: "button", name: "Schaltfläche", description: "Großer Knopf mit Symbol.", icon: "mdi:gesture-tap-button" },
  { type: "light", name: "Licht", description: "Helligkeitsregler mit Farbwahl.", icon: "mdi:lightbulb" },
  { type: "thermostat", name: "Thermostat", description: "Temperaturregler mit Drehknopf.", icon: "mdi:thermostat" },
  { type: "weather-forecast", name: "Wetter", description: "Aktuelles Wetter mit Vorhersage.", icon: "mdi:weather-partly-cloudy" },
  { type: "media-control", name: "Medien", description: "Steuerung eines Media Players.", icon: "mdi:speaker" },
  { type: "history-graph", name: "Verlauf", description: "Verlaufskurve über die Zeit.", icon: "mdi:chart-line" },
  { type: "statistic", name: "Statistik", description: "Ein einzelner statistischer Wert.", icon: "mdi:chart-box-outline" },
  { type: "gauge", name: "Messuhr", description: "Rundanzeige für einen Messwert.", icon: "mdi:gauge" },
  { type: "picture-entity", name: "Bild mit Entität", description: "Bild, das auf einen Zustand reagiert.", icon: "mdi:image" },
  { type: "map", name: "Karte", description: "Standorte auf einer Landkarte.", icon: "mdi:map" },
  { type: "markdown", name: "Text", description: "Freier Text mit Vorlagen.", icon: "mdi:text" },
  { type: "iframe", name: "Webseite", description: "Eingebettete Webseite.", icon: "mdi:web" },
  { type: "calendar", name: "Kalender", description: "Termine aus Kalender-Entitäten.", icon: "mdi:calendar" },
  { type: "conditional", name: "Bedingt", description: "Zeigt eine Karte nur unter einer Bedingung.", icon: "mdi:eye-check-outline" },
  { type: "vertical-stack", name: "Stapel senkrecht", description: "Mehrere Karten untereinander.", icon: "mdi:view-sequential" },
  { type: "horizontal-stack", name: "Stapel waagerecht", description: "Mehrere Karten nebeneinander.", icon: "mdi:view-column" },
  { type: "grid", name: "Raster", description: "Karten in einem Raster.", icon: "mdi:view-grid" }
];
var cardCatalog = () => {
  const custom = (window.customCards || []).filter((entry) => entry?.type && String(entry.type).replace(/^custom:/, "") !== "ha-os-shell").map((entry) => ({
    type: `custom:${String(entry.type).replace(/^custom:/, "")}`,
    name: entry.name || entry.type,
    description: entry.description || "",
    icon: "mdi:puzzle-outline",
    custom: true
  }));
  const seen = /* @__PURE__ */ new Set();
  return [...STANDARD_CARDS, ...custom].filter((entry) => {
    if (seen.has(entry.type)) return false;
    seen.add(entry.type);
    return true;
  });
};
var stubConfigFor = async (type) => {
  const bare = String(type).replace(/^custom:/, "");
  const element = customElements.get(bare);
  try {
    const stub = await element?.getStubConfig?.();
    if (stub) return { ...stub, type };
  } catch (_error) {
  }
  if (type === "entities") return { type, entities: [] };
  if (type === "markdown") return { type, content: "Text hier eintragen." };
  if (["vertical-stack", "horizontal-stack", "grid"].includes(type)) return { type, cards: [] };
  return { type };
};
var createHaCardEditor = ({ hass, value, onChange }) => {
  if (!customElements.get("hui-card-element-editor")) return null;
  const editor = document.createElement("hui-card-element-editor");
  editor.hass = hass;
  editor.GUImode = true;
  editor.lovelace = { config: { views: [] }, editMode: true, saveConfig: async () => {
  } };
  editor.value = value;
  editor.addEventListener("config-changed", (event) => {
    event.stopPropagation();
    const next = event.detail?.config;
    if (next) onChange(next);
  });
  return editor;
};
var createCardEditorWithCode = ({ hass, value, onChange, codeMode, onToggleCode, el: el7 }) => {
  const wrap = el7("div");
  const gui = codeMode ? null : createHaCardEditor({ hass, value, onChange });
  if (gui) {
    wrap.append(gui);
  } else {
    if (!codeMode) {
      wrap.append(
        el7(
          "p",
          "hint",
          "Der Karteneditor von Home Assistant steht hier nicht zur Verfuegung - Konfiguration als YAML."
        )
      );
    }
    const yaml = document.createElement("ha-yaml-editor");
    yaml.defaultValue = value;
    yaml.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      if (event.detail.isValid === false) return;
      onChange(event.detail.value);
    });
    wrap.append(yaml);
  }
  const toggle = el7("button", "linkish", codeMode ? "Eingabemaske anzeigen" : "Code-Editor anzeigen");
  toggle.addEventListener("click", onToggleCode);
  wrap.append(toggle);
  return wrap;
};

// src/cards/shell-editor.js
var EDITOR_TAG2 = "ha-os-shell-editor";
var LABELS = {
  gap: "Abstand zwischen Karten",
  row_height: "Kartenhöhe in px",
  background_dark: "Hintergrundbild Dunkel",
  background_light: "Hintergrundbild Hell",
  background_dim: "Hintergrund abdunkeln",
  users: "Benutzer in der Kopfzeile",
  fullscreen_entity: "Vollbild-Schalter",
  sidebar_pages: "Seiten in der Seitenleiste",
  topbar_tabs: "Seiten als Reiter oben",
  show_settings_button: "Einstellungsknopf anzeigen",
  show_theme_button: "Hell/Dunkel-Knopf anzeigen",
  name: "Name",
  icon: "Symbol",
  kind: "Seitentyp",
  url: "Adresse",
  hide_ha_chrome: "HA-Kopfzeile im Rahmen ausblenden",
  frame_height: "Höhe des Rahmens in px",
  entity: "Entität",
  show_state: "Zustand anzeigen",
  tap_action: "Tippen",
  entities: "Zähler",
  suffix: "Endung der Entitäts-ID",
  unit: "Einheit"
};
var HELPERS = {
  sidebar_pages: "Jede Seite bekommt ein Symbol in der linken Leiste.",
  topbar_tabs: "Ausschalten, wenn die Seitenleiste reichen soll – bei vielen Seiten läuft die Kopfzeile sonst über.",
  gap: "Gilt gleichmäßig waagerecht und senkrecht.",
  row_height: "Grundhöhe einer Karte mit Höhenfaktor 1.",
  background_dim: "Schwarze Schicht über dem Bild. Gilt für alle Geräte.",
  fullscreen_entity: "Ein input_boolean, das den Vollbildmodus schaltet. Leer lassen, um den Knopf auszublenden.",
  users: "Leer lassen, um automatisch alle person-Entitäten anzuzeigen.",
  frame_height: "0 füllt die ganze Seite. Für eine eingebettete Ansicht mit einer einzigen Karte ist ein fester Wert meist besser – sonst wird die Karte über die volle Höhe gezogen.",
  hide_ha_chrome: "Blendet Kopfzeile und Seitenleiste von Home Assistant im Rahmen aus.",
  entities: "Leer lassen, um alle Sensoren mit Geräteklasse „Energie“ zu nehmen.",
  suffix: "Grenzt die automatische Auswahl ein, etwa _today für die Tageswerte. Ohne sie werden Tages- und Gesamtwerte desselben Geräts doppelt gezählt."
};
var APPEARANCE_SCHEMA = [
  { name: "gap", selector: { number: { min: 0, max: 48, step: 1, mode: "slider" } } },
  { name: "row_height", selector: { number: { min: 60, max: 320, step: 5, mode: "slider" } } },
  { name: "background_dim", selector: { number: { min: 0, max: 80, step: 1, mode: "slider" } } }
];
var BARS_SCHEMA = [
  { name: "users", selector: { entity: { domain: ["person", "device_tracker"], multiple: true } } },
  { name: "topbar_tabs", selector: { boolean: {} } },
  { name: "sidebar_pages", selector: { boolean: {} } },
  { name: "show_settings_button", selector: { boolean: {} } },
  { name: "show_theme_button", selector: { boolean: {} } },
  { name: "fullscreen_entity", selector: { entity: { domain: ["input_boolean"] } } }
];
var PAGE_SCHEMA = [
  { name: "name", required: true, selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  {
    name: "kind",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "page", label: "Interne Seite mit Rastern" },
          { value: "iframe", label: "Externe Seite / iFrame" }
        ]
      }
    }
  }
];
var IFRAME_SCHEMA = [
  { name: "url", selector: { text: {} } },
  { name: "hide_ha_chrome", selector: { boolean: {} } },
  { name: "frame_height", selector: { number: { min: 0, max: 2e3, step: 10, mode: "box" } } }
];
var BADGE_SCHEMA = [
  {
    name: "kind",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "entity", label: "Entität" },
          { value: "sum", label: "Summe mehrerer Zähler" },
          { value: "link", label: "Link" }
        ]
      }
    }
  },
  { name: "entity", selector: { entity: {} } },
  { name: "entities", selector: { entity: { multiple: true } } },
  { name: "suffix", selector: { text: {} } },
  { name: "unit", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "show_state", selector: { boolean: {} } },
  { name: "tap_action", selector: { ui_action: {} } }
];
var QUICK_ACTION_SCHEMA = [
  { name: "icon", selector: { icon: {} } },
  { name: "name", selector: { text: {} } },
  { name: "entity", selector: { entity: {} } },
  { name: "tap_action", selector: { ui_action: {} } }
];
var TABS = [
  ["appearance", "Aussehen"],
  ["bars", "Leisten"],
  ["pages", "Seiten"]
];
var LEVELS = ["page", "section", "card", "detail"];
var STYLES2 = `
  :host { display: block; }
  * { box-sizing: border-box; }

  .tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.3)); }
  .tab {
    padding: 10px 14px; border: 0; background: none; cursor: pointer; font: inherit;
    color: var(--secondary-text-color); border-bottom: 2px solid transparent;
  }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }

  .panel { display: grid; gap: 12px; }
  .panel[hidden] { display: none; }

  .block { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; overflow: hidden; }
  .block > header {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: var(--secondary-background-color, rgba(127,127,127,.08));
  }
  .block > header .label { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .block > header .sub { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
  .block > .body { padding: 10px; }
  .block > .body[hidden] { display: none; }

  .mini { width: 32px; height: 32px; flex: 0 0 32px; border: 0; border-radius: 8px; background: none; cursor: pointer; color: var(--secondary-text-color); display: grid; place-items: center; }
  .mini:hover { background: rgba(127,127,127,.16); color: var(--primary-text-color); }
  .mini:disabled { opacity: .3; cursor: default; }
  .mini ha-icon { --mdc-icon-size: 18px; }
  .mini.danger:hover { color: var(--error-color, #db4437); }

  .add-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .add {
    padding: 9px 14px; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px;
    background: none; cursor: pointer; font: inherit; color: var(--primary-color); display: flex; align-items: center; gap: 6px;
  }
  .add:hover { background: rgba(127,127,127,.08); }
  .add ha-icon { --mdc-icon-size: 18px; }

  /* Umschalter auf den Code-Editor – wie in HAs eigenem Kartendialog unten. */
  .linkish {
    margin-top: 10px; padding: 6px 0; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 13px; color: var(--primary-color);
  }

  /* Der offene Block hebt sich ab – bei vier Ebenen ist das die zweite
     Orientierungshilfe neben der Pfadzeile. */
  .block.is-open { border-color: var(--primary-color); }
  .block.is-open > header { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }

  .hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
  ${IMAGE_FIELD_CSS}
  .empty { padding: 14px; text-align: center; font-size: 12px; color: var(--secondary-text-color); }

  select.plain, input.plain {
    width: 100%; padding: 9px 10px; font: inherit; color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(127,127,127,.08));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 8px;
  }
  .field { display: grid; gap: 5px; margin-bottom: 10px; }
  .field > label { font-size: 12px; color: var(--secondary-text-color); }
  /* Die Anzahl der Raster ist je Seite einstellbar – die Breitenfelder
     verteilen sich deshalb automatisch, statt auf drei festgenagelt zu sein. */
  .widths { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 8px; }

  /* --- Kartenauswahl --- */
  .picker { display: grid; gap: 8px; }
  .picker-list {
    max-height: 320px; overflow-y: auto; display: grid; gap: 4px;
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; padding: 6px;
  }
  .picker-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    border: 0; border-radius: 8px; background: none; cursor: pointer; font: inherit;
    color: var(--primary-text-color); text-align: left;
  }
  .picker-item:hover { background: rgba(127,127,127,.14); }
  .picker-item ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: 0 0 20px; }
  .picker-item .pi-text { min-width: 0; }
  .picker-item .pi-name { font-size: 13px; font-weight: 600; }
  .picker-item .pi-desc {
    font-size: 11px; color: var(--secondary-text-color);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .picker-item .pi-tag {
    margin-left: auto; flex: 0 0 auto; font-size: 10px; padding: 2px 6px; border-radius: 6px;
    background: rgba(127,127,127,.18); color: var(--secondary-text-color);
  }
`;
var el2 = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var icon = (name) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", name);
  return node;
};
var miniButton = (iconName, title, handler, className = "mini") => {
  const button = el2("button", className);
  button.title = title;
  button.append(icon(iconName));
  button.addEventListener("click", handler);
  return button;
};
var HaOsShellEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._built = false;
    this._tab = "appearance";
    this._openAt = /* @__PURE__ */ new Map();
    this._openPicker = null;
    this._forms = /* @__PURE__ */ new Map();
  }
  setConfig(config) {
    const next = normalizeShellConfig(config);
    const structureChanged = this._structureSignature(next) !== this._structureSignature(this._config);
    this._config = next;
    if (!this._built) {
      this._build();
      return;
    }
    if (structureChanged) this._renderPanels();
    else this._refreshForms();
  }
  set hass(hass) {
    this._hass = hass;
    this._forms.forEach((form) => {
      form.hass = hass;
    });
  }
  get hass() {
    return this._hass;
  }
  /** Ändert sich diese Signatur, muss das DOM neu aufgebaut werden. */
  _structureSignature(config) {
    if (!config) return "";
    return JSON.stringify(
      config.pages.map((page) => ({
        id: page.id,
        kind: page.kind,
        badges: page.badges.length,
        cards: page.grids.map((grid) => grid.cards.map((card) => card.type))
      }))
    ) + `|${config.quick_actions.length}|${this._tab}`;
  }
  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })
    );
  }
  /** Nimmt eine Änderung vor und meldet sie. `structural` erzwingt Neuaufbau. */
  _mutate(mutator, structural = false) {
    const draft = deepClone(this._config);
    mutator(draft);
    this._config = normalizeShellConfig(draft);
    this._emit();
    if (structural) this._renderPanels();
  }
  // ---------------------------------------------------------------- Aufbau
  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES2;
    this._tabBar = el2("div", "tabs");
    TABS.forEach(([id, label]) => {
      const tab = el2("button", "tab", label);
      tab.addEventListener("click", () => {
        this._tab = id;
        this._renderPanels();
      });
      this._tabBar.append(tab);
    });
    this._panel = el2("div", "panel");
    this.shadowRoot.replaceChildren(style, this._tabBar, this._panel);
    this._built = true;
    this._renderPanels();
  }
  _renderPanels() {
    [...this._tabBar.children].forEach((tab, index) => {
      tab.classList.toggle("active", TABS[index][0] === this._tab);
    });
    this._forms.clear();
    this._panel.replaceChildren();
    if (this._tab === "appearance") this._renderAppearance();
    else if (this._tab === "bars") this._renderBars();
    else this._renderPages();
  }
  _refreshForms() {
    this._forms.forEach((form, key) => {
      const data = this._formData(key);
      if (data && !isEqualConfig(form.data, data)) form.data = data;
    });
  }
  /** Liefert die aktuellen Daten für ein gecachtes Formular. */
  _formData(key) {
    const [kind, a, b] = key.split(":");
    if (kind === "general" || kind === "bars") return this._config;
    if (kind === "page") return this._config.pages[Number(a)];
    if (kind === "iframe") return this._config.pages[Number(a)];
    if (kind === "badge") return this._config.pages[Number(a)].badges[Number(b)];
    if (kind === "action") return this._config.quick_actions[Number(a)];
    return null;
  }
  _form(key, schema, data, onChange) {
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = data;
    form.schema = schema;
    form.computeLabel = (field) => LABELS[field.name] || field.name;
    form.computeHelper = (field) => HELPERS[field.name] || "";
    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      onChange(event.detail.value);
    });
    this._forms.set(key, form);
    return form;
  }
  /** Ist auf dieser Ebene genau dieser Block offen? */
  _isOpen(level, openKey) {
    return this._openAt?.get(level) === openKey;
  }
  /**
   * Oeffnet einen Block und schliesst alles Tiefere.
   *
   * Ohne das Schliessen der tieferen Ebenen bliebe beim Wechsel von Raster 1
   * nach Raster 2 die Karte aus Raster 1 aufgeklappt stehen - man saehe
   * Felder, die zu etwas anderem gehoeren.
   */
  _toggleOpen(level, openKey) {
    this._openAt = this._openAt || /* @__PURE__ */ new Map();
    const wasOpen = this._openAt.get(level) === openKey;
    const from = LEVELS.indexOf(level);
    LEVELS.slice(from).forEach((deeper) => this._openAt.delete(deeper));
    if (!wasOpen) this._openAt.set(level, openKey);
    this._renderPanels();
  }
  /**
   * Aufklappbarer Block.
   *
   * @param level Ebene aus LEVELS - bestimmt, was beim Oeffnen zuklappt.
   * @param path  Pfadzeile wie "Home > Raster 1 > Karte 1". Bei vier Ebenen
   *              ist sie das Einzige, woran man noch erkennt, wo man ist.
   */
  _block(labelText, path, bodyBuilder, openKey, headerExtras = [], level = "section") {
    const open = this._isOpen(level, openKey);
    const block = el2("div", `block${open ? " is-open" : ""}`);
    const header = document.createElement("header");
    const text2 = el2("div");
    text2.style.cssText = "flex:1;min-width:0";
    text2.append(el2("div", "label", labelText));
    if (path) text2.append(el2("div", "sub", path));
    header.append(text2);
    const toggle = miniButton(
      open ? "mdi:chevron-up" : "mdi:chevron-down",
      "Aufklappen",
      () => this._toggleOpen(level, openKey)
    );
    header.append(...headerExtras, toggle);
    header.style.cursor = "pointer";
    header.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      this._toggleOpen(level, openKey);
    });
    block.append(header);
    if (open) {
      const body = el2("div", "body");
      body.append(bodyBuilder());
      block.append(body);
    }
    return block;
  }
  // ---------------------------------------------------------------- Allgemein
  _renderAppearance() {
    this._panel.append(
      el2(
        "p",
        "hint",
        "Masse der Shell und das Hintergrundbild. Farben und Glas stehen in der internen Einstellungsseite – die gilt pro Geraet, das Bild hier fuer alle."
      )
    );
    this._panel.append(
      this._form("general", APPEARANCE_SCHEMA, this._config, (value) => {
        this._config = normalizeShellConfig({ ...this._config, ...value });
        this._emit();
      })
    );
    [
      ["background_dark", "Hintergrundbild Dunkel"],
      ["background_light", "Hintergrundbild Hell"]
    ].forEach(([key, label]) => {
      const wrap = el2("div", "field");
      wrap.append(el2("label", null, label));
      const field = createImageField({
        getHass: () => this._hass,
        getValue: () => this._config[key] || "",
        placeholder: "/local/wallpaper/bild.jpg",
        onChange: (value) => {
          this._config = normalizeShellConfig({ ...this._config, [key]: value });
          this._emit();
        }
      });
      wrap.append(field.element);
      this._panel.append(wrap);
    });
    const theme = HaOsTheme.get();
    const uebertragbar = ["backgroundDark", "backgroundLight"].some(
      (key) => theme[key] && theme[key] !== this._config[key === "backgroundDark" ? "background_dark" : "background_light"]
    );
    if (uebertragbar) {
      const knopf = el2("button", "add");
      knopf.append(icon("mdi:content-copy"), el2("span", null, "Bild dieses Geräts übernehmen"));
      knopf.addEventListener("click", () => {
        const current = HaOsTheme.get();
        this._config = normalizeShellConfig({
          ...this._config,
          background_dark: current.backgroundDark || this._config.background_dark,
          background_light: current.backgroundLight || this._config.background_light,
          background_dim: current.backgroundDim || this._config.background_dim
        });
        this._emit();
        this._renderPanels();
      });
      this._panel.append(knopf);
    }
    this._panel.append(
      el2(
        "p",
        "hint",
        "Ein hier gesetztes Bild erscheint auf jedem Geraet. Wer auf einem Tablet in den Einstellungen ein eigenes Bild waehlt, behaelt seines."
      )
    );
  }
  _renderBars() {
    this._panel.append(
      el2("p", "hint", "Kopfzeile oben und Seitenleiste links – alles, was am Rand der Shell sitzt.")
    );
    this._panel.append(
      this._form("bars", BARS_SCHEMA, this._config, (value) => {
        this._config = normalizeShellConfig({ ...this._config, ...value });
        this._emit();
      })
    );
    const actions = el2("div", "panel");
    actions.append(el2("p", "hint", "Schnellaktionen erscheinen als Symbole in der Seitenleiste."));
    this._config.quick_actions.forEach((action, index) => {
      const extras = [
        miniButton("mdi:arrow-up", "Nach oben", () => this._moveQuickAction(index, -1)),
        miniButton("mdi:arrow-down", "Nach unten", () => this._moveQuickAction(index, 1)),
        miniButton(
          "mdi:delete-outline",
          "Entfernen",
          () => this._mutate((draft) => draft.quick_actions.splice(index, 1), true),
          "mini danger"
        )
      ];
      actions.append(
        this._block(
          action.name || action.entity || `Aktion ${index + 1}`,
          `Seitenleiste › Aktion ${index + 1}`,
          () => this._form(
            `action:${index}`,
            QUICK_ACTION_SCHEMA,
            action,
            (value) => this._mutate((draft) => Object.assign(draft.quick_actions[index], value))
          ),
          `action-${index}`,
          extras,
          "page"
        )
      );
    });
    const add = el2("button", "add");
    add.append(icon("mdi:plus"), el2("span", null, "Schnellaktion hinzufügen"));
    add.addEventListener(
      "click",
      () => this._mutate((draft) => draft.quick_actions.push({ icon: "mdi:star-outline" }), true)
    );
    const addRow = el2("div", "add-row");
    addRow.append(add);
    actions.append(addRow);
    this._panel.append(actions);
  }
  _moveQuickAction(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= this._config.quick_actions.length) return;
    this._mutate((draft) => {
      const [item] = draft.quick_actions.splice(index, 1);
      draft.quick_actions.splice(target, 0, item);
    }, true);
  }
  // ---------------------------------------------------------------- Seiten
  _renderPages() {
    this._panel.append(
      el2(
        "p",
        "hint",
        "Alles zu einer Seite steckt in ihr drin: Name, Badges und die Raster mit ihren Karten. Ob Seiten in der Seitenleiste oder als Reiter oben erscheinen, steht unter Leisten."
      )
    );
    this._config.pages.forEach((page, index) => {
      const extras = [];
      if (index > 0) {
        extras.push(
          miniButton("mdi:arrow-up", "Nach oben", () => this._movePage(index, -1)),
          miniButton("mdi:arrow-down", "Nach unten", () => this._movePage(index, 1)),
          miniButton("mdi:delete-outline", "Seite entfernen", () => this._mutate((draft) => draft.pages.splice(index, 1), true), "mini danger")
        );
      }
      this._panel.append(
        this._block(
          page.name,
          index === 0 ? "Startseite" : page.kind === "iframe" ? "Externe Seite" : "Interne Seite",
          () => this._pageBody(page, index),
          `page-${index}`,
          extras,
          "page"
        )
      );
    });
    const add = el2("button", "add");
    add.append(icon("mdi:plus"), el2("span", null, "Neue Seite"));
    add.addEventListener(
      "click",
      () => this._mutate((draft) => {
        draft.pages.push({
          name: `Seite ${draft.pages.length + 1}`,
          icon: "mdi:circle-outline",
          kind: "page",
          grid_widths: [...DEFAULT_GRID_WIDTHS],
          grids: createEmptyGrids()
        });
      }, true)
    );
    const addProgram = el2("button", "add");
    addProgram.append(icon("mdi:application-outline"), el2("span", null, "Programm einbinden"));
    addProgram.addEventListener("click", () => {
      this._pickingProgram = !this._pickingProgram;
      this._renderPanels();
    });
    const addRow = el2("div", "add-row");
    addRow.append(add, addProgram);
    this._panel.append(addRow);
    if (this._pickingProgram) this._panel.append(this._programPicker());
  }
  /**
   * Auswahl eines vorhandenen Home-Assistant-Programms.
   *
   * "Programm" meint hier alles, was Home Assistant selbst in seiner
   * Seitenleiste führt – Add-ons wie ESPHome, Studio Code Server oder der
   * Terminal, aber auch eigene Dashboards. Diese Liste steht in `hass.panels`.
   * Ausgewählt wird daraus eine iFrame-Seite; das erspart das Abtippen von
   * Adressen und trifft genau die Fälle wie 3D-Drucker oder CNC.
   */
  _programPicker() {
    const wrap = el2("div", "picker");
    wrap.append(
      el2(
        "p",
        "hint",
        "Programme sind die Einträge aus Home Assistants eigener Seitenleiste – Add-ons, Dashboards, Einstellungen. Sie werden als Seite im Rahmen geöffnet."
      )
    );
    const search = el2("input", "plain");
    search.type = "search";
    search.placeholder = "Programm suchen …";
    const list = el2("div", "picker-list");
    const panels = Object.values(this._hass?.panels || {}).filter((panel) => panel?.url_path).map((panel) => ({
      name: panel.title || panel.url_path,
      url: `/${panel.url_path}`,
      icon: panel.icon || "mdi:application-outline"
    })).sort((a, b) => a.name.localeCompare(b.name, "de"));
    const addPage = (entry) => this._mutate((draft) => {
      draft.pages.push({
        name: entry.name,
        icon: entry.icon,
        kind: "iframe",
        url: entry.url,
        hide_ha_chrome: true
      });
    }, true);
    const fill = (term) => {
      const needle = term.trim().toLowerCase();
      const hits = panels.filter(
        (entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle)
      );
      list.replaceChildren();
      const own = el2("button", "picker-item");
      const ownText = el2("div");
      ownText.append(
        el2("div", "pi-name", "Eigene Adresse"),
        el2("div", "pi-desc", "Beliebige Webseite oder HA-Pfad, danach im Feld Adresse eintragen")
      );
      own.append(icon("mdi:link-variant"), ownText);
      own.addEventListener("click", () => {
        this._pickingProgram = false;
        addPage({ name: "Programm", icon: "mdi:application-outline", url: "" });
      });
      list.append(own);
      if (!hits.length) {
        list.append(el2("div", "empty", "Kein Programm gefunden."));
        return;
      }
      hits.forEach((entry) => {
        const item = el2("button", "picker-item");
        const text2 = el2("div");
        text2.append(el2("div", "pi-name", entry.name), el2("div", "pi-desc", entry.url));
        item.append(icon(entry.icon), text2);
        item.addEventListener("click", () => {
          this._pickingProgram = false;
          addPage(entry);
        });
        list.append(item);
      });
    };
    search.addEventListener("input", () => fill(search.value));
    fill("");
    wrap.append(search, list);
    return wrap;
  }
  _movePage(index, delta) {
    const target = index + delta;
    if (target < 1 || target >= this._config.pages.length) return;
    this._mutate((draft) => {
      const [item] = draft.pages.splice(index, 1);
      draft.pages.splice(target, 0, item);
    }, true);
  }
  _pageBody(page, index) {
    const wrap = el2("div");
    wrap.append(
      this._block(
        "Allgemein",
        `${page.name} › Allgemein`,
        () => {
          const box = el2("div");
          box.append(
            this._form(
              `page:${index}`,
              PAGE_SCHEMA,
              page,
              (value) => this._mutate((draft) => Object.assign(draft.pages[index], value), value.kind !== page.kind)
            )
          );
          if (page.kind === "iframe") {
            box.append(
              this._form(
                `iframe:${index}`,
                IFRAME_SCHEMA,
                page,
                (value) => this._mutate((draft) => Object.assign(draft.pages[index], value))
              )
            );
          } else {
            const count = el2("div", "field");
            const countLabel = el2("label", null, `Anzahl der Raster: ${page.grids.length}`);
            count.append(countLabel);
            const countInput = el2("input", "plain");
            countInput.type = "range";
            countInput.min = String(MIN_GRIDS);
            countInput.max = String(MAX_GRIDS);
            countInput.step = "1";
            countInput.value = String(page.grids.length);
            countInput.addEventListener("input", () => {
              countLabel.textContent = `Anzahl der Raster: ${countInput.value}`;
            });
            countInput.addEventListener(
              "change",
              () => this._mutate((draft) => {
                draft.pages[index].grid_count = Number(countInput.value);
              }, true)
            );
            count.append(countInput);
            count.append(
              el2(
                "small",
                "hint",
                "Weniger Raster entfernen die hinteren samt der Karten darin."
              )
            );
            box.append(count);
            const widths = el2("div", "field");
            widths.append(el2("label", null, `Spaltenbreiten (Verhältnis der ${page.grids.length} Raster)`));
            const row = el2("div", "widths");
            page.grid_widths.forEach((width, columnIndex) => {
              const input = el2("input", "plain");
              input.type = "number";
              input.min = "0.3";
              input.max = "4";
              input.step = "0.05";
              input.value = width;
              input.addEventListener(
                "change",
                () => this._mutate((draft) => {
                  draft.pages[index].grid_widths[columnIndex] = Number(input.value);
                })
              );
              row.append(input);
            });
            widths.append(row);
            box.append(widths);
          }
          return box;
        },
        `page-${index}-general`,
        [],
        "section"
      )
    );
    wrap.append(
      this._block(
        "Badges",
        `${page.name} › Badges · ${page.badges.length}`,
        () => this._badgeList(page, index),
        `page-${index}-badges`,
        [],
        "section"
      )
    );
    if (page.kind === "iframe") return wrap;
    page.grids.forEach((grid, columnIndex) => {
      wrap.append(
        this._block(
          `Raster ${columnIndex + 1}`,
          `${page.name} › Raster ${columnIndex + 1} · ${grid.cards.length} ${grid.cards.length === 1 ? "Karte" : "Karten"} · Breite ${page.grid_widths[columnIndex]}`,
          () => this._gridBody(page, index, columnIndex, grid),
          `page-${index}-grid-${columnIndex}`,
          [],
          "section"
        )
      );
    });
    return wrap;
  }
  _badgeList(page, index) {
    const wrap = el2("div");
    wrap.append(el2("p", "hint", "Badges stehen oben in der Kopfzeile dieser Seite."));
    page.badges.forEach((badge, badgeIndex) => {
      const extras = [
        miniButton(
          "mdi:delete-outline",
          "Badge entfernen",
          () => this._mutate((draft) => draft.pages[index].badges.splice(badgeIndex, 1), true),
          "mini danger"
        )
      ];
      wrap.append(
        this._block(
          badge.name || badge.entity || `Badge ${badgeIndex + 1}`,
          `${page.name} › Badges › ${badgeIndex + 1}`,
          () => this._form(
            `badge:${index}:${badgeIndex}`,
            BADGE_SCHEMA,
            badge,
            (value) => this._mutate((draft) => Object.assign(draft.pages[index].badges[badgeIndex], value))
          ),
          `page-${index}-badge-${badgeIndex}`,
          extras,
          "card"
        )
      );
    });
    const addBadge = el2("button", "add");
    addBadge.append(icon("mdi:plus"), el2("span", null, "Badge hinzufügen"));
    addBadge.addEventListener(
      "click",
      () => this._mutate((draft) => draft.pages[index].badges.push({ entity: "", tap_action: { action: "toggle" } }), true)
    );
    const addRow = el2("div", "add-row");
    addRow.append(addBadge);
    wrap.append(addRow);
    return wrap;
  }
  /** Ebene 3: die Karten eines Rasters, jede wiederum aufklappbar. */
  _gridBody(page, pageIndex, columnIndex, grid) {
    const wrap = el2("div");
    if (!grid.cards.length) {
      wrap.append(el2("div", "empty", "Noch keine Karte in diesem Raster."));
    }
    grid.cards.forEach((card, cardIndex) => {
      const extras = [
        miniButton("mdi:arrow-up", "Nach oben", () => this._moveCard(pageIndex, columnIndex, cardIndex, -1)),
        miniButton("mdi:arrow-down", "Nach unten", () => this._moveCard(pageIndex, columnIndex, cardIndex, 1)),
        miniButton(
          "mdi:delete-outline",
          "Karte entfernen",
          () => this._mutate((draft) => draft.pages[pageIndex].grids[columnIndex].cards.splice(cardIndex, 1), true),
          "mini danger"
        )
      ];
      wrap.append(
        this._block(
          `Karte ${cardIndex + 1} · ${this._cardLabel(card)}`,
          `${page.name} › Raster ${columnIndex + 1} › Karte ${cardIndex + 1}`,
          () => this._cardBody(pageIndex, columnIndex, cardIndex, card),
          `page-${pageIndex}-grid-${columnIndex}-card-${cardIndex}`,
          extras,
          "card"
        )
      );
    });
    const addRow = el2("div", "add-row");
    const addOwn = el2("button", "add");
    addOwn.append(icon("mdi:plus"), el2("span", null, "HA-OS Karte"));
    addOwn.addEventListener(
      "click",
      () => this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-card",
          card_type: "button",
          haos_weight: 1
        });
      }, true)
    );
    const addGrid = el2("button", "add");
    addGrid.append(icon("mdi:view-grid-outline"), el2("span", null, "2×2-Raster"));
    addGrid.addEventListener(
      "click",
      () => this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-grid",
          column_widths: [1, 1],
          gap: 12,
          cards: [],
          haos_weight: 2
        });
      }, true)
    );
    const addVehicle = el2("button", "add");
    addVehicle.append(icon("mdi:car"), el2("span", null, "Fahrzeug"));
    addVehicle.addEventListener(
      "click",
      () => this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-vehicle",
          entity: "",
          haos_weight: 3
        });
      }, true)
    );
    const addPrinter = el2("button", "add");
    addPrinter.append(icon("mdi:printer-3d"), el2("span", null, "Drucker"));
    addPrinter.addEventListener(
      "click",
      () => this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-printer",
          haos_weight: 3
        });
      }, true)
    );
    const addOther = el2("button", "add");
    addOther.append(icon("mdi:view-dashboard-outline"), el2("span", null, "Andere Karte wählen"));
    addOther.addEventListener("click", () => {
      const key = `picker-${pageIndex}-${columnIndex}`;
      this._openPicker = this._openPicker === key ? null : key;
      this._renderPanels();
    });
    addRow.append(addOwn, addGrid, addVehicle, addPrinter, addOther);
    wrap.append(addRow);
    if (this._openPicker === `picker-${pageIndex}-${columnIndex}`) {
      wrap.append(
        this._cardPicker(async (type) => {
          const card = await stubConfigFor(type);
          this._openPicker = null;
          this._mutate((draft) => {
            draft.pages[pageIndex].grids[columnIndex].cards.push({ ...card, haos_weight: 1 });
          }, true);
        })
      );
    }
    return wrap;
  }
  _cardPicker(onPick) {
    const wrap = el2("div", "picker");
    const search = document.createElement("input");
    search.className = "plain";
    search.type = "search";
    search.placeholder = "Karte suchen …";
    const list = el2("div", "picker-list");
    const entries = cardCatalog();
    const fill = (term) => {
      const needle = term.trim().toLowerCase();
      const hits = entries.filter(
        (entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.type.toLowerCase().includes(needle) || entry.description.toLowerCase().includes(needle)
      );
      list.replaceChildren();
      if (!hits.length) {
        list.append(el2("div", "empty", "Keine Karte gefunden."));
        return;
      }
      hits.forEach((entry) => {
        const item = el2("button", "picker-item");
        const text2 = el2("div", "pi-text");
        text2.append(el2("div", "pi-name", entry.name), el2("div", "pi-desc", entry.description || entry.type));
        item.append(icon(entry.icon), text2);
        if (entry.custom) item.append(el2("span", "pi-tag", "installiert"));
        item.addEventListener("click", () => onPick(entry.type));
        list.append(item);
      });
    };
    search.addEventListener("input", () => fill(search.value));
    fill("");
    wrap.append(search, list);
    return wrap;
  }
  /**
   * Beschriftung einer Karte in der Liste.
   *
   * Ohne Namen sehen vier Taster nebeneinander alle gleich aus – „HA-OS ·
   * button", viermal. Deshalb kommt dahinter, was die Karte tatsächlich
   * bedient: der eingetragene Name, sonst der Name der Entität aus Home
   * Assistant, sonst die Entitäts-ID. Erst dann ist die Liste zu gebrauchen.
   */
  _cardLabel(card) {
    const base = card.type === "custom:ha-os-card" ? `HA-OS · ${card.card_type || "unbestimmt"}` : card.type || "Karte";
    const entity = card.entity || card.entities?.[0];
    const named = card.name || (entity ? this._hass?.states?.[entity]?.attributes?.friendly_name || entity : "");
    return named ? `${base} · ${named}` : base;
  }
  _moveCard(pageIndex, columnIndex, cardIndex, delta) {
    const cards = this._config.pages[pageIndex].grids[columnIndex].cards;
    const target = cardIndex + delta;
    if (target < 0 || target >= cards.length) return;
    this._mutate((draft) => {
      const list = draft.pages[pageIndex].grids[columnIndex].cards;
      const [item] = list.splice(cardIndex, 1);
      list.splice(target, 0, item);
    }, true);
  }
  _cardBody(pageIndex, columnIndex, cardIndex, card) {
    const wrap = el2("div");
    const write = (value) => this._mutate((draft) => {
      draft.pages[pageIndex].grids[columnIndex].cards[cardIndex] = value;
    });
    if (card.type === "custom:ha-os-card") {
      const editor = document.createElement("ha-os-card-editor");
      editor.hass = this._hass;
      editor.setConfig(card);
      editor.addEventListener("config-changed", (event) => {
        event.stopPropagation();
        write({ ...event.detail.config, type: "custom:ha-os-card" });
      });
      wrap.append(editor);
      return wrap;
    }
    const codeKey = `${pageIndex}-${columnIndex}-${cardIndex}`;
    this._codeMode = this._codeMode || /* @__PURE__ */ new Set();
    wrap.append(
      createCardEditorWithCode({
        hass: this._hass,
        value: card,
        onChange: (next) => write({ ...next, haos_weight: card.haos_weight }),
        codeMode: this._codeMode.has(codeKey),
        onToggleCode: () => {
          if (this._codeMode.has(codeKey)) this._codeMode.delete(codeKey);
          else this._codeMode.add(codeKey);
          this._renderPanels();
        },
        el: el2
      })
    );
    wrap.append(this._weightField(card, write));
    return wrap;
  }
  _weightField(card, write) {
    const weight = el2("div", "field");
    weight.append(el2("label", null, "Höhenfaktor (1 = Standardhöhe)"));
    const input = el2("input", "plain");
    input.type = "number";
    input.min = "0.1";
    input.max = "6";
    input.step = "0.05";
    input.value = card.haos_weight ?? 1;
    input.addEventListener("change", () => write({ ...card, haos_weight: Number(input.value) }));
    weight.append(input);
    return weight;
  }
};
if (!customElements.get(EDITOR_TAG2)) customElements.define(EDITOR_TAG2, HaOsShellEditor);

// src/cards/haos-card.js
var TAG2 = "ha-os-card";
var EDITOR_TAG3 = "ha-os-card-editor";
var CARD_TYPES = [
  { value: "button", label: "Button / Kachel", icon: "mdi:gesture-tap-button" },
  { value: "slider", label: "Slider", icon: "mdi:tune-vertical" },
  { value: "thermostat", label: "Thermostat", icon: "mdi:thermostat" },
  { value: "weather", label: "Wetter", icon: "mdi:weather-partly-cloudy" },
  { value: "energy", label: "Energie", icon: "mdi:lightning-bolt" },
  { value: "media", label: "Media Player", icon: "mdi:speaker" },
  { value: "members", label: "Mitglieder", icon: "mdi:account-group" },
  { value: "calendar", label: "Kalender", icon: "mdi:calendar" },
  { value: "select", label: "Auswahl", icon: "mdi:form-dropdown" },
  { value: "clock", label: "Uhr", icon: "mdi:clock-outline" },
  { value: "camera", label: "Kamera", icon: "mdi:cctv" },
  { value: "separator", label: "Trenner", icon: "mdi:format-horizontal-align-center" },
  { value: "energy_list", label: "Energieliste", icon: "mdi:format-list-numbered" }
];
var el3 = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var icon2 = (name) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", name);
  return node;
};
var STYLES3 = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }

  .card {
    height: 100%; padding: 16px; overflow: hidden;
    display: flex; flex-direction: column; gap: 10px;
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    font-weight: var(--haos-font-weight-normal, 450);
    ${ENTITY_SURFACE_CSS}
  }
  .card.interactive { cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; }
  .card.interactive:hover { transform: translateY(-1px); }

  /* Aktiv = neutraler Glasrahmen + inneres Akzentleuchten, KEIN blauer Aussenrahmen */
  .card.is-on {
    box-shadow:
      var(--haos-entity-shadow),
      var(--haos-entity-sheen),
      inset 0 0 40px color-mix(in srgb, var(--haos-accent, #0a84ff) 20%, transparent);
  }
  .card.is-unavailable { opacity: .55; }

  .row { display: flex; align-items: center; gap: 10px; }
  .spacer { flex: 1; }
  .title { font-size: 15px; font-weight: var(--haos-font-weight-semibold, 650); }
  .subtitle { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .muted { color: rgba(var(--haos-text-rgb, 255,255,255), .55); font-size: 11px; }

  .chip {
    width: 38px; height: 38px; flex: 0 0 38px; border-radius: 12px;
    display: grid; place-items: center;
    background: rgba(var(--haos-text-rgb, 255,255,255), .08);
  }
  .chip ha-icon { --mdc-icon-size: 20px; }
  .is-on .chip ha-icon { color: var(--haos-accent, #0a84ff); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent)); }
  .is-off .chip ha-icon { color: var(--haos-status-off, #a8b0b8); }
  .is-unavailable .chip ha-icon { color: var(--haos-status-unavailable, #ff6961); }

  /* --- Schalter --- */
  .switch {
    width: 46px; height: 27px; flex: 0 0 46px; border-radius: 999px; position: relative;
    background: rgba(var(--haos-text-rgb, 255,255,255), .18); transition: background .18s ease;
  }
  .switch::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform .18s ease;
  }
  .is-on .switch { background: var(--haos-accent, #0a84ff); }
  .is-on .switch::after { transform: translateX(19px); }

  /* Ohne !important gewinnen die display-Regeln der Bedienelemente. */
  [hidden] { display: none !important; }

  /* --- Taster (button, input_button, scene, script) ---
     Diese Entitäten haben keinen Zustand, den man umschalten könnte. Sie
     brauchen einen Druckknopf mit sichtbarer Rückmeldung, weil sonst nichts
     erkennen lässt, ob der Druck angekommen ist. */
  .press-btn {
    width: 46px; height: 46px; flex: 0 0 46px; border-radius: 50%;
    display: grid; place-items: center;
    transition: transform .12s ease, background .18s ease, color .18s ease;
    ${CONTROL_SURFACE_CSS}
  }
  .press-btn:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .press-btn:active, .press-btn.is-pressed {
    transform: scale(.88);
    background: var(--haos-accent, #0a84ff);
    color: #fff;
    box-shadow: 0 0 18px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent);
  }
  .press-btn ha-icon { --mdc-icon-size: 22px; }

  /* --- Rollo/Tor (cover) --- */
  .cover-ctrl { display: flex; gap: 6px; }
  .cover-ctrl button {
    width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
    transition: background .18s ease;
    ${CONTROL_SURFACE_CSS}
  }
  .cover-ctrl button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .cover-ctrl button:active { background: var(--haos-accent, #0a84ff); color: #fff; }
  .cover-ctrl ha-icon { --mdc-icon-size: 18px; }

  /* --- Slider --- */
  .slider-track { position: relative; height: 40px; border-radius: 14px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .slider-fill { position: absolute; inset: 0 auto 0 0; width: 0%; background: color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent); transition: width .12s ease; }
  .slider-track input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .slider-value { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 12px; font-size: 12px; font-weight: 650; pointer-events: none; }

  /* --- Thermostat --- */
  .dial-wrap { flex: 1; min-height: 0; display: grid; place-items: center; }
  .dial { position: relative; width: 100%; max-width: 220px; aspect-ratio: 1; }
  .dial svg { width: 100%; height: 100%; transform: rotate(135deg); }
  .dial .track { fill: none; stroke: rgba(var(--haos-text-rgb, 255,255,255), .14); stroke-linecap: round; }
  .dial .value { fill: none; stroke: var(--haos-accent, #0a84ff); stroke-linecap: round; transition: stroke-dashoffset .25s ease; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 60%, transparent)); }
  .dial-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .dial-temp { font-size: 34px; font-weight: 700; letter-spacing: -.02em; }
  .dial-label { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .stepper { display: flex; justify-content: center; gap: 14px; }
  .stepper button { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; ${CONTROL_SURFACE_CSS} }
  .stepper button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .16); }
  .modes { display: flex; justify-content: space-around; gap: 6px; }
  .mode { display: grid; justify-items: center; gap: 5px; font-size: 10px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .mode .dot { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; ${CONTROL_SURFACE_CSS} }
  .mode.active { color: var(--haos-text, #fff); }
  /* Die aktive Betriebsart bleibt kraeftig – sie soll sich von den uebrigen
     abheben, nicht mit ihnen verschwimmen. */
  .mode.active .dot {
    background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .55));
    color: #18212a;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 4px 14px rgba(0,0,0,.18);
  }

  /* --- Wetter --- */
  .weather-head { display: flex; align-items: flex-start; gap: 10px; }
  .weather-icon { margin-left: auto; flex: 0 0 auto; --mdc-icon-size: 46px; color: rgba(var(--haos-text-rgb, 255,255,255), .85); }
  .weather-icon[hidden] { display: none; }
  .weather-now { font-size: 40px; font-weight: 300; letter-spacing: -.03em; line-height: 1; }
  .weather-now sup { font-size: 18px; vertical-align: super; }
  .weather-bottom { margin-top: auto; display: grid; gap: 2px; }

  /* Verlaufskurve: gleiche Spalteneinteilung wie die Vorhersagezeile darunter,
     damit jeder Kurvenpunkt über seinem Wert sitzt. */
  .weather-graph { height: 54px; }
  .weather-graph.is-hidden { display: none; }
  .weather-graph svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .weather-graph .area { stroke: none; fill: url(#haos-weather-fade); }
  .weather-graph .line {
    fill: none; stroke: var(--haos-accent, #0a84ff); stroke-width: 2;
    stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke;
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent));
  }

  .forecast { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
  .forecast-item { display: grid; justify-items: center; gap: 4px; font-size: 10px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .forecast-item b { font-size: 13px; color: var(--haos-text, #fff); font-weight: 600; }
  .forecast-item ha-icon { --mdc-icon-size: 17px; }

  /* --- Balkendiagramm (Energie) --- */
  .bars { flex: 1; min-height: 60px; display: flex; align-items: flex-end; gap: 6px; }
  .bar-col { flex: 1; display: grid; grid-template-rows: 1fr auto; gap: 6px; height: 100%; }
  .bar { align-self: end; width: 100%; border-radius: 6px 6px 3px 3px; background: rgba(var(--haos-text-rgb, 255,255,255), .22); min-height: 3px; transition: height .3s ease; }
  .bar.peak { background: var(--haos-accent, #0a84ff); }
  .bar-label { text-align: center; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  /* --- Media --- */
  .media-head { display: flex; gap: 12px; align-items: center; }
  /* --- Farbschleier hinter dem Medienspieler ---
     Drei weiche Kreise, gefaerbt aus dem Titelbild. Sie liegen im
     Karteninneren und werden vom Glas darueber aufgenommen. */
  .media-body { position: relative; flex: 1; min-height: 0; display: flex; }
  .media-stack { position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; justify-content: center; }
  .media-glow {
    position: absolute; inset: -18px; z-index: 0; pointer-events: none;
    border-radius: inherit;
    transition: background .6s ease;
    background:
      radial-gradient(circle at 18% 22%, rgba(var(--glow-a, var(--haos-accent-rgb, 10,132,255)), .38), transparent 42%),
      radial-gradient(circle at 82% 30%, rgba(var(--glow-b, var(--haos-accent-rgb, 10,132,255)), .30), transparent 44%),
      radial-gradient(circle at 50% 104%, rgba(var(--glow-a, var(--haos-accent-rgb, 10,132,255)), .22), transparent 52%);
  }
  .media-glow[hidden] { display: none; }

  .media-art { width: 52px; height: 52px; flex: 0 0 52px; border-radius: 10px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .1); display: grid; place-items: center; }
  .media-art img { width: 100%; height: 100%; object-fit: cover; }
  .progress { height: 3px; border-radius: 2px; background: rgba(var(--haos-text-rgb, 255,255,255), .18); overflow: hidden; }
  /* Zum Springen: mehr Hoehe zum Treffen, ohne dass der Balken dicker wirkt. */
  .progress.seekable { cursor: pointer; height: 3px; padding: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; background-clip: padding-box; }
  .media-fav {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .7);
    ${CONTROL_SURFACE_CSS}
  }
  .media-fav[hidden] { display: none; }
  .media-fav:hover { color: var(--haos-bad, #ff6b6b); }
  .media-fav ha-icon { --mdc-icon-size: 17px; }
  .progress span { display: block; height: 100%; width: 0%; background: var(--haos-accent, #0a84ff); transition: width .5s linear; }
  .media-times { display: flex; justify-content: space-between; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .media-controls { display: flex; align-items: center; justify-content: space-between; }
  .media-controls button {
    width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .75);
    ${CONTROL_SURFACE_CSS}
  }
  .media-controls button:hover { color: var(--haos-text, #fff); }
  /* Abspielen ist die Hauptaktion und bleibt deutlich heller als der Rest. */
  .media-controls .play {
    width: 44px; height: 44px; color: #18212a;
    background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .70));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 5px 16px rgba(0,0,0,.20);
  }
  .media-controls button.is-active { color: var(--haos-accent, #0a84ff); }

  /* --- Lautstaerke --- */
  .volume { display: flex; align-items: center; gap: 9px; }
  .volume[hidden] { display: none; }
  .mute {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .75);
    ${CONTROL_SURFACE_CSS}
  }
  .mute[hidden] { display: none; }
  .mute.is-active { color: var(--haos-accent, #0a84ff); }
  .mute ha-icon { --mdc-icon-size: 17px; }
  .volume-track {
    position: relative; flex: 1; height: 10px; border-radius: 99px; overflow: hidden;
    background: rgba(var(--haos-text-rgb, 255,255,255), .16);
  }
  .volume-track[hidden] { display: none; }
  .volume-track span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .18s ease; }
  .volume-track input[type="range"] { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .volume-value { flex: 0 0 auto; font-size: 11px; min-width: 38px; text-align: right; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .volume-value[hidden] { display: none; }
  select.source { font-size: 12px; padding: 7px 10px; }
  select.source[hidden] { display: none; }

  /* --- Mitglieder --- */
  .members { display: flex; align-items: center; }
  .member { width: 40px; height: 40px; margin-left: -10px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(var(--haos-card-surface-rgb, 255,255,255), .35); display: grid; place-items: center; background: rgba(var(--haos-text-rgb, 255,255,255), .12); font-size: 11px; font-weight: 800; }
  .member:first-child { margin-left: 0; }
  .member img { width: 100%; height: 100%; object-fit: cover; }
  .member.is-home { border-color: color-mix(in srgb, var(--haos-status-home, #32d583) 80%, transparent); }
  .member.is-away { opacity: .7; border-color: color-mix(in srgb, var(--haos-status-away, #f7b955) 70%, transparent); }
  .member.is-unavailable { opacity: .45; filter: saturate(.3); }

  /* --- Kalender --- */
  .events { flex: 1; min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 7px; scrollbar-width: thin; }
  .event { display: grid; grid-template-columns: 42px 1fr; gap: 9px; align-items: center; }
  .event .when { font-size: 9px; text-align: center; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .event .when b { display: block; font-size: 14px; color: var(--haos-text, #fff); }
  .event .what { min-width: 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* --- Auswahl --- */
  ${SEGMENTED_CSS}
  select.dropdown { width: 100%; padding: 10px 12px; border-radius: 12px; font: inherit; color: var(--haos-text, #fff); background: rgba(var(--haos-text-rgb, 255,255,255), .09); border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .14); }
  select.dropdown option { color: #18212a; }

  /* --- Uhr --- */
  .clock { flex: 1; display: grid; place-content: center; text-align: center; }
  .clock-time { font-size: 44px; font-weight: 300; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .clock-date { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .clock { position: relative; }
  .clock-timer { margin-top: 6px; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--haos-accent, #0a84ff); }
  /* Die letzte Minute faellt auf – ohne zu blinken, das nervt auf einem
     Geraet, das den ganzen Tag an der Wand haengt. */
  .clock-timer.is-soon { color: var(--haos-bad, #ff6b6b); }
  .clock-timer[hidden] { display: none; }
  .clock-timer-btn {
    position: absolute; top: -4px; right: -4px;
    width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .6);
    ${CONTROL_SURFACE_CSS}
  }
  .clock-timer-btn[hidden] { display: none; }
  .clock-timer-btn.is-active { color: var(--haos-accent, #0a84ff); }
  /* Der Stoppknopf sitzt an derselben Stelle und tritt an die Stelle des
     Weckers, solange es klingelt. */
  .clock-timer-btn.is-ringing { color: var(--haos-bad, #ff6b6b); }
  .clock-timer-btn ha-icon { --mdc-icon-size: 17px; position: relative; z-index: 1; }
  /* Ring um das Symbol. Beginnt oben und laeuft im Uhrzeigersinn ab. */
  .timer-ring { position: absolute; inset: -1px; transform: rotate(-90deg); pointer-events: none; }
  .timer-ring .ring-track { fill: none; stroke: rgba(var(--haos-text-rgb, 255,255,255), .16); stroke-width: 2.5; }
  .timer-ring .ring-value {
    fill: none; stroke: var(--haos-accent, #0a84ff); stroke-width: 2.5; stroke-linecap: round;
    transition: stroke-dashoffset .9s linear;
  }

  /* Echtes Fenster: <dialog> mit showModal(). Es liegt in der Top Layer des
     Browsers, also ueber allem - unabhaengig davon, was die Karte an
     overflow, Stapelkontexten oder backdrop-filter mitbringt. */
  .sheet {
    border: 0; padding: 0; max-width: min(320px, 92vw); width: max-content;
    border-radius: var(--haos-entity-radius, 20px);
    color: var(--haos-text, #fff);
    background: var(--haos-scrim, rgba(14, 18, 24, .92));
    box-shadow: 0 24px 60px rgba(0, 0, 0, .38);
    overflow: visible;
  }
  .sheet::backdrop {
    background: rgba(0, 0, 0, .45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .sheet-inner { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
  .timer-dial {
    flex: 0 0 auto; width: 122px; aspect-ratio: 1;
    cursor: pointer; touch-action: none;
  }
  .timer-dial .dial-temp { font-size: 26px; font-weight: 650; }
  .timer-dial .dial-label { font-size: 10px; }
  .sheet-actions { display: flex; flex-direction: column; gap: 6px; }
  .sheet-btn {
    padding: 7px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
    color: var(--haos-text, #fff);
    ${CONTROL_SURFACE_CSS}
  }
  .sheet-btn.primary { color: var(--haos-accent, #0a84ff); }
  .sheet-btn.danger { color: var(--haos-bad, #ff6b6b); }
  .sheet-btn[hidden] { display: none; }

  /* --- Trenner ---
     Bewusst ohne Glas: ein Trenner soll gliedern, nicht wie eine weitere
     Karte aussehen. Die Klasse plain nimmt der Flaeche Rahmen, Fuellung
     und Schatten.

     Diese Regeln waren beim Umbau des Weckerfensters versehentlich
     mitgeloescht worden - dadurch bekamen alle Trenner ploetzlich einen
     Rahmen. Die Pruefung dazu sah nur die Klasse am Element, nicht ob es
     die Regel noch gibt; genau das prueft sie jetzt auch. */
  .card.plain {
    border: 0; background: none; box-shadow: none; padding: 0 4px;
    backdrop-filter: none; -webkit-backdrop-filter: none;
  }
  .sep { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .sep-text { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; font-size: 13px; color: rgba(var(--haos-text-rgb, 255,255,255), .72); }
  .sep-text[hidden] { display: none; }
  .sep-text ha-icon { --mdc-icon-size: 17px; }
  .sep-line { flex: 1; height: 1px; min-width: 12px; background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .sep-line[hidden] { display: none; }

  /* --- Energieliste --- */
  .energy-list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
  .energy-rows { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 7px; }
  .energy-rows::-webkit-scrollbar { display: none; }
  .energy-row { display: flex; flex-direction: column; gap: 4px; }
  .energy-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px; }
  .energy-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(var(--haos-text-rgb, 255,255,255), .72); }
  .energy-value { flex: 0 0 auto; font-weight: var(--haos-font-weight-medium, 500); font-variant-numeric: tabular-nums; }
  .energy-bar { height: 4px; border-radius: 99px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .12); }
  .energy-bar span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .3s ease; }
  .energy-total { flex: 0 0 auto; padding-top: 6px; font-size: 12px; font-variant-numeric: tabular-nums; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .12); color: rgba(var(--haos-text-rgb, 255,255,255), .8); }
  .energy-total[hidden] { display: none; }
  .energy-empty { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .energy-empty[hidden] { display: none; }

  .error { display: grid; place-content: center; height: 100%; text-align: center; gap: 6px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
`;
var pad = (value) => String(value).padStart(2, "0");
var formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
};
var numeric = (value) => value === null || value === void 0 || value === "" ? NaN : Number(value);
var CONDITION_ICONS = {
  sunny: "mdi:weather-sunny",
  clear: "mdi:weather-sunny",
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  partlycloudy: "mdi:weather-partly-cloudy",
  rainy: "mdi:weather-rainy",
  pouring: "mdi:weather-pouring",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  fog: "mdi:weather-fog",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  hail: "mdi:weather-hail",
  exceptional: "mdi:alert-circle-outline"
};
var formatEnergy = (value) => Math.abs(value) >= 100 ? Math.round(value).toLocaleString("de-DE") : value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
var MEDIA_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  STOP: 4096,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  SELECT_SOURCE: 2048,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  REPEAT_SET: 262144
};
var sliderRange = (entityId, state) => {
  const domain = domainOf(entityId);
  if (domain === "number" || domain === "input_number") {
    const min = Number(state?.attributes?.min);
    const max = Number(state?.attributes?.max);
    const step = Number(state?.attributes?.step);
    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      step: Number.isFinite(step) && step > 0 ? step : 1,
      unit: state?.attributes?.unit_of_measurement || ""
    };
  }
  if (domain === "fan") {
    const step = Number(state?.attributes?.percentage_step);
    return { min: 0, max: 100, step: Number.isFinite(step) && step > 0 ? step : 1, unit: "%" };
  }
  return { min: 0, max: 100, step: 1, unit: "%" };
};
var PRESS_DOMAINS = /* @__PURE__ */ new Set(["button", "input_button", "scene", "script"]);
var buttonKind = (entityId) => {
  const domain = domainOf(entityId);
  if (PRESS_DOMAINS.has(domain)) return "press";
  if (domain === "cover") return "cover";
  return "toggle";
};
var runPress = (ctx) => {
  const entityId = ctx.config.entity;
  if (!entityId) return;
  const domain = domainOf(entityId);
  const service = domain === "button" || domain === "input_button" ? "press" : "turn_on";
  ctx.hass?.callService(domain, service, { entity_id: entityId });
  const node = ctx.nodes.press;
  if (!node) return;
  node.classList.add("is-pressed");
  clearTimeout(ctx.nodes.pressTimer);
  ctx.nodes.pressTimer = setTimeout(() => node.classList.remove("is-pressed"), 350);
};
var forecastLabel = (datetime, forecastType) => {
  const when = new Date(datetime);
  if (Number.isNaN(when.getTime())) return "";
  if (forecastType === "daily" || forecastType === "twice_daily") {
    const today = /* @__PURE__ */ new Date();
    const sameDay = when.getDate() === today.getDate() && when.getMonth() === today.getMonth() && when.getFullYear() === today.getFullYear();
    if (sameDay) return "Heute";
    try {
      return when.toLocaleDateString(void 0, { weekday: "short" });
    } catch (_error) {
      return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][when.getDay()];
    }
  }
  return `${pad(when.getHours())}:${pad(when.getMinutes())}`;
};
var dropPastDays = (forecast, forecastType) => {
  if (forecastType !== "daily" && forecastType !== "twice_daily") return forecast;
  const startOfToday = /* @__PURE__ */ new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const future = forecast.filter((entry) => {
    const when = new Date(entry?.datetime);
    return Number.isNaN(when.getTime()) || when.getTime() >= startOfToday.getTime();
  });
  return future.length ? future : forecast;
};
var drawWeatherGraph = (ctx, items) => {
  const graph = ctx.nodes.graph;
  if (!graph) return;
  const values = (items || []).map((entry) => numeric(entry?.temperature));
  const usable = ctx.config.show_graph !== false && values.length >= 2 && values.every(Number.isFinite);
  graph.classList.toggle("is-hidden", !usable);
  if (!usable) return;
  const count = values.length;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const top = 6;
  const base = 34;
  const points = values.map((value, index) => ({
    x: (index + 0.5) / count * 100,
    y: base - (value - low) / span * (base - top)
  }));
  const round = (value) => Math.round(value * 100) / 100;
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let index = 0; index < count - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const before = points[index - 1] || start;
    const after = points[index + 2] || end;
    const lower = Math.min(start.y, end.y);
    const upper = Math.max(start.y, end.y);
    const clamp2 = (value) => Math.min(upper, Math.max(lower, value));
    const c1x = start.x + (end.x - before.x) / 6;
    const c1y = clamp2(start.y + (end.y - before.y) / 6);
    const c2x = end.x - (after.x - start.x) / 6;
    const c2y = clamp2(end.y - (after.y - start.y) / 6);
    path += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(end.x)} ${round(end.y)}`;
  }
  ctx.nodes.graphLine.setAttribute("d", path);
  ctx.nodes.graphArea.setAttribute(
    "d",
    `${path} L ${round(points[count - 1].x)} 40 L ${round(points[0].x)} 40 Z`
  );
};
var renderers = {
  // ------------------------------------------------------------- Button
  button: {
    build(ctx) {
      const root = el3("div");
      const row = el3("div", "row");
      ctx.nodes.chip = el3("div", "chip");
      ctx.nodes.chipIcon = icon2("mdi:circle-outline");
      ctx.nodes.chip.append(ctx.nodes.chipIcon);
      const text2 = el3("div");
      ctx.nodes.title = el3("div", "title");
      ctx.nodes.subtitle = el3("div", "subtitle");
      text2.append(ctx.nodes.title, ctx.nodes.subtitle);
      row.append(ctx.nodes.chip, text2, el3("div", "spacer"));
      ctx.nodes.toggle = el3("div", "switch");
      ctx.nodes.press = el3("button", "press-btn");
      ctx.nodes.pressIcon = icon2("mdi:gesture-tap-button");
      ctx.nodes.press.append(ctx.nodes.pressIcon);
      ctx.nodes.press.addEventListener("click", (event) => {
        event.stopPropagation();
        runPress(ctx);
      });
      const coverButton = (label, symbol, service) => {
        const node = el3("button");
        node.append(icon2(symbol));
        node.title = label;
        node.setAttribute("aria-label", label);
        node.addEventListener("click", (event) => {
          event.stopPropagation();
          if (ctx.config.entity) ctx.hass?.callService("cover", service, { entity_id: ctx.config.entity });
        });
        return node;
      };
      ctx.nodes.cover = el3("div", "cover-ctrl");
      ctx.nodes.cover.append(
        coverButton("Auf", "mdi:arrow-up", "open_cover"),
        coverButton("Stopp", "mdi:stop", "stop_cover"),
        coverButton("Zu", "mdi:arrow-down", "close_cover")
      );
      row.append(ctx.nodes.toggle, ctx.nodes.press, ctx.nodes.cover);
      root.append(row);
      ctx.card.classList.add("interactive");
      ctx.card.addEventListener("click", () => {
        const kind = buttonKind(ctx.config.entity);
        if (ctx.config.tap_action) {
          handleAction(ctx.host, ctx.hass, ctx.config.tap_action, ctx.config.entity);
          return;
        }
        if (kind === "press") {
          runPress(ctx);
          return;
        }
        handleAction(ctx.host, ctx.hass, { action: kind === "cover" ? "more-info" : "toggle" }, ctx.config.entity);
      });
      return root;
    },
    update(ctx) {
      const entityId = ctx.config.entity;
      const state = ctx.hass?.states?.[entityId];
      const kind = buttonKind(entityId);
      const stateId = ctx.config.state_entity || entityId;
      ctx.nodes.chipIcon.setAttribute("icon", ctx.config.icon || domainIcon(entityId, state));
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(entityId, state);
      ctx.nodes.subtitle.textContent = ctx.config.show_state === false ? "" : formatState(ctx.hass, stateId);
      const visible = ctx.config.show_toggle !== false;
      ctx.nodes.toggle.hidden = !(visible && kind === "toggle");
      ctx.nodes.press.hidden = !(visible && kind === "press");
      ctx.nodes.cover.hidden = !(visible && kind === "cover");
      if (kind === "press") {
        ctx.nodes.pressIcon.setAttribute("icon", ctx.config.press_icon || "mdi:gesture-tap-button");
      }
    },
    disconnect(ctx) {
      clearTimeout(ctx.nodes.pressTimer);
    }
  },
  // ------------------------------------------------------------- Slider
  slider: {
    build(ctx) {
      const root = el3("div");
      const head = el3("div", "row");
      ctx.nodes.chip = el3("div", "chip");
      ctx.nodes.chipIcon = icon2("mdi:brightness-6");
      ctx.nodes.chip.append(ctx.nodes.chipIcon);
      ctx.nodes.title = el3("div", "title");
      head.append(ctx.nodes.chip, ctx.nodes.title);
      const track = el3("div", "slider-track");
      ctx.nodes.fill = el3("div", "slider-fill");
      ctx.nodes.output = el3("div", "slider-value");
      const input = document.createElement("input");
      input.type = "range";
      input.min = 0;
      input.max = 100;
      input.step = 1;
      ctx.nodes.input = input;
      input.addEventListener("pointerdown", () => {
        ctx.nodes.dragging = true;
      });
      const release = () => {
        ctx.nodes.dragging = false;
      };
      input.addEventListener("pointerup", release);
      input.addEventListener("pointercancel", release);
      input.addEventListener("input", () => {
        const { min, max, unit } = ctx.nodes.range || { min: 0, max: 100, unit: "%" };
        const anteil = max > min ? (Number(input.value) - min) / (max - min) * 100 : 0;
        ctx.nodes.fill.style.width = `${anteil}%`;
        ctx.nodes.output.textContent = `${input.value}${unit ? ` ${unit}` : ""}`;
      });
      input.addEventListener("change", () => {
        release();
        renderers.slider.commit(ctx, Number(input.value));
      });
      track.append(ctx.nodes.fill, ctx.nodes.output, input);
      root.append(head, track);
      return root;
    },
    read(ctx) {
      const entityId = ctx.config.entity || "";
      const state = ctx.hass?.states?.[entityId];
      if (!state) return 0;
      const domain = entityId.split(".")[0];
      if (domain === "light") return Math.round((state.attributes.brightness || 0) / 255 * 100);
      if (domain === "cover") return Number(state.attributes.current_position ?? 0);
      if (domain === "fan") return Number(state.attributes.percentage ?? 0);
      if (domain === "media_player") return Math.round((state.attributes.volume_level || 0) * 100);
      const { min, max } = sliderRange(entityId, state);
      return clampNumber(state.state, min, max, min);
    },
    commit(ctx, value) {
      const entityId = ctx.config.entity || "";
      const domain = entityId.split(".")[0];
      const hass = ctx.hass;
      if (!hass || !entityId) return;
      if (domain === "light") {
        hass.callService("light", "turn_on", { entity_id: entityId, brightness_pct: value });
      } else if (domain === "cover") {
        hass.callService("cover", "set_cover_position", { entity_id: entityId, position: value });
      } else if (domain === "fan") {
        hass.callService("fan", "set_percentage", { entity_id: entityId, percentage: value });
      } else if (domain === "media_player") {
        hass.callService("media_player", "volume_set", { entity_id: entityId, volume_level: value / 100 });
      } else if (domain === "number" || domain === "input_number") {
        hass.callService(domain, "set_value", { entity_id: entityId, value });
      }
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.chipIcon.setAttribute("icon", ctx.config.icon || domainIcon(ctx.config.entity, state));
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      const range = sliderRange(ctx.config.entity, state);
      ctx.nodes.range = range;
      ctx.nodes.input.min = range.min;
      ctx.nodes.input.max = range.max;
      ctx.nodes.input.step = range.step;
      if (ctx.nodes.dragging) return;
      const value = renderers.slider.read(ctx);
      ctx.nodes.input.value = value;
      const anteil = range.max > range.min ? (value - range.min) / (range.max - range.min) * 100 : 0;
      ctx.nodes.fill.style.width = `${anteil}%`;
      ctx.nodes.output.textContent = `${value}${range.unit ? ` ${range.unit}` : ""}`;
    }
  },
  // ------------------------------------------------------------- Thermostat
  thermostat: {
    build(ctx) {
      const root = el3("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      const head = el3("div", "row");
      const text2 = el3("div");
      ctx.nodes.title = el3("div", "title");
      ctx.nodes.subtitle = el3("div", "subtitle");
      text2.append(ctx.nodes.title, ctx.nodes.subtitle);
      ctx.nodes.toggle = el3("div", "switch");
      head.append(text2, el3("div", "spacer"), ctx.nodes.toggle);
      ctx.nodes.toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.hass?.callService("climate", "toggle", { entity_id: ctx.config.entity });
      });
      const wrap = el3("div", "dial-wrap");
      const dial = el3("div", "dial");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      const circumference = 2 * Math.PI * 42;
      const arc = circumference * 0.75;
      const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      track.setAttribute("class", "track");
      track.setAttribute("cx", "50");
      track.setAttribute("cy", "50");
      track.setAttribute("r", "42");
      track.setAttribute("stroke-width", "7");
      track.setAttribute("stroke-dasharray", `${arc} ${circumference}`);
      const value = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      value.setAttribute("class", "value");
      value.setAttribute("cx", "50");
      value.setAttribute("cy", "50");
      value.setAttribute("r", "42");
      value.setAttribute("stroke-width", "7");
      value.setAttribute("stroke-dasharray", `${arc} ${circumference}`);
      value.setAttribute("stroke-dashoffset", String(arc));
      ctx.nodes.arcLength = arc;
      ctx.nodes.arc = value;
      svg.append(track, value);
      const center = el3("div", "dial-center");
      ctx.nodes.temp = el3("div", "dial-temp", "--");
      ctx.nodes.tempLabel = el3("div", "dial-label", "Temperatur");
      center.append(ctx.nodes.temp, ctx.nodes.tempLabel);
      dial.append(svg, center);
      wrap.append(dial);
      const stepper = el3("div", "stepper");
      const down = document.createElement("button");
      down.append(icon2("mdi:minus"));
      const up = document.createElement("button");
      up.append(icon2("mdi:plus"));
      down.addEventListener("click", () => renderers.thermostat.step(ctx, -0.5));
      up.addEventListener("click", () => renderers.thermostat.step(ctx, 0.5));
      stepper.append(down, up);
      ctx.nodes.modes = el3("div", "modes");
      root.append(head, wrap, stepper, ctx.nodes.modes);
      return root;
    },
    step(ctx, delta) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      if (!state) return;
      const current = Number(state.attributes.temperature);
      if (!Number.isFinite(current)) return;
      const step = Number(state.attributes.target_temp_step) || Math.abs(delta);
      const next = Math.round((current + Math.sign(delta) * step) * 10) / 10;
      ctx.hass.callService("climate", "set_temperature", { entity_id: ctx.config.entity, temperature: next });
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      ctx.nodes.subtitle.textContent = state?.attributes?.friendly_name || "";
      const target = Number(state?.attributes?.temperature);
      const current = Number(state?.attributes?.current_temperature);
      const min = Number(state?.attributes?.min_temp ?? 7);
      const max = Number(state?.attributes?.max_temp ?? 35);
      const shown = Number.isFinite(target) ? target : current;
      ctx.nodes.temp.textContent = Number.isFinite(shown) ? `${shown}°` : "--";
      ctx.nodes.tempLabel.textContent = Number.isFinite(current) ? `Aktuell ${current}°` : "Temperatur";
      const ratio = Number.isFinite(shown) && max > min ? clampNumber((shown - min) / (max - min), 0, 1, 0) : 0;
      ctx.nodes.arc.setAttribute("stroke-dashoffset", String(ctx.nodes.arcLength * (1 - ratio)));
      const modes = state?.attributes?.hvac_modes || [];
      const labels = { off: "Aus", heat: "Heizen", cool: "Kühlen", auto: "Auto", dry: "Trocken", fan_only: "Lüfter", heat_cool: "Auto" };
      const icons = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew", dry: "mdi:water-percent", fan_only: "mdi:fan", heat_cool: "mdi:sun-snowflake" };
      if (ctx.nodes.modeKey !== modes.join("|")) {
        ctx.nodes.modeKey = modes.join("|");
        ctx.nodes.modes.replaceChildren();
        ctx.nodes.modeButtons = /* @__PURE__ */ new Map();
        modes.forEach((mode) => {
          const button = el3("button", "mode");
          const dot = el3("span", "dot");
          dot.append(icon2(icons[mode] || "mdi:circle-outline"));
          button.append(dot, el3("span", null, labels[mode] || mode));
          button.addEventListener(
            "click",
            () => ctx.hass.callService("climate", "set_hvac_mode", { entity_id: ctx.config.entity, hvac_mode: mode })
          );
          ctx.nodes.modeButtons.set(mode, button);
          ctx.nodes.modes.append(button);
        });
      }
      ctx.nodes.modeButtons?.forEach((button, mode) => button.classList.toggle("active", state?.state === mode));
    }
  },
  // ------------------------------------------------------------- Wetter
  weather: {
    build(ctx) {
      const root = el3("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      const head = el3("div", "weather-head");
      ctx.nodes.now = el3("div", "weather-now");
      const meta = el3("div");
      ctx.nodes.condition = el3("div", "title");
      ctx.nodes.wind = el3("div", "subtitle");
      meta.append(ctx.nodes.condition, ctx.nodes.wind);
      ctx.nodes.nowIcon = icon2("mdi:weather-cloudy");
      ctx.nodes.nowIcon.className = "weather-icon";
      head.append(ctx.nodes.now, meta, ctx.nodes.nowIcon);
      const SVG_NS = "http://www.w3.org/2000/svg";
      ctx.nodes.graph = el3("div", "weather-graph");
      const graphSvg = document.createElementNS(SVG_NS, "svg");
      graphSvg.setAttribute("viewBox", "0 0 100 40");
      graphSvg.setAttribute("preserveAspectRatio", "none");
      const defs = document.createElementNS(SVG_NS, "defs");
      const fade = document.createElementNS(SVG_NS, "linearGradient");
      fade.setAttribute("id", "haos-weather-fade");
      fade.setAttribute("x1", "0");
      fade.setAttribute("y1", "0");
      fade.setAttribute("x2", "0");
      fade.setAttribute("y2", "1");
      [
        ["0%", "currentColor", ".38"],
        ["100%", "currentColor", "0"]
      ].forEach(([offset, color2, opacity]) => {
        const stop = document.createElementNS(SVG_NS, "stop");
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", color2);
        stop.setAttribute("stop-opacity", opacity);
        fade.append(stop);
      });
      defs.append(fade);
      ctx.nodes.graphArea = document.createElementNS(SVG_NS, "path");
      ctx.nodes.graphArea.setAttribute("class", "area");
      ctx.nodes.graphArea.setAttribute("d", "");
      ctx.nodes.graphLine = document.createElementNS(SVG_NS, "path");
      ctx.nodes.graphLine.setAttribute("class", "line");
      ctx.nodes.graphLine.setAttribute("d", "");
      graphSvg.append(defs, ctx.nodes.graphArea, ctx.nodes.graphLine);
      ctx.nodes.graph.append(graphSvg);
      ctx.nodes.graph.style.color = "var(--haos-accent, #0a84ff)";
      ctx.nodes.forecast = el3("div", "forecast");
      const bottom = el3("div", "weather-bottom");
      bottom.append(ctx.nodes.graph, ctx.nodes.forecast);
      root.append(head, bottom);
      return root;
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      if (!state) return;
      const temp = Math.round(numeric(state.attributes.temperature));
      ctx.nodes.now.textContent = Number.isFinite(temp) ? `${temp}°` : "--";
      ctx.nodes.condition.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      const speed = state.attributes.wind_speed;
      ctx.nodes.wind.textContent = speed ? `Wind ${speed} ${state.attributes.wind_speed_unit || "km/h"}` : state.state;
      const symbol = CONDITION_ICONS[state.state];
      ctx.nodes.nowIcon.hidden = !symbol;
      if (symbol) ctx.nodes.nowIcon.setAttribute("icon", symbol);
      const forecast = state.attributes.forecast || ctx.nodes.forecastData || [];
      const items = dropPastDays(forecast, ctx.config.forecast_type).slice(
        0,
        Number(ctx.config.forecast_count) || 5
      );
      if (ctx.nodes.forecast.childElementCount !== items.length) {
        ctx.nodes.forecast.replaceChildren();
        ctx.nodes.forecastNodes = items.map(() => {
          const node = el3("div", "forecast-item");
          const value = el3("b");
          const symbol2 = icon2("mdi:weather-cloudy");
          const label = el3("span");
          node.append(value, symbol2, label);
          ctx.nodes.forecast.append(node);
          return { value, symbol: symbol2, label };
        });
      }
      items.forEach((entry, index) => {
        const node = ctx.nodes.forecastNodes?.[index];
        if (!node) return;
        const value = Math.round(numeric(entry?.temperature));
        node.value.textContent = Number.isFinite(value) ? `${value}°` : "--";
        node.symbol.setAttribute("icon", CONDITION_ICONS[entry.condition] || "mdi:weather-cloudy");
        node.label.textContent = forecastLabel(entry?.datetime, ctx.config.forecast_type);
      });
      drawWeatherGraph(ctx, items);
    },
    /** Holt die Vorhersage einmalig per WebSocket-Abo (HA 2024.x+). */
    async connect(ctx) {
      if (!ctx.hass?.connection || !ctx.config.entity || ctx.nodes.forecastUnsub) return;
      try {
        ctx.nodes.forecastUnsub = await ctx.hass.connection.subscribeMessage(
          (message) => {
            ctx.nodes.forecastData = message.forecast || [];
            renderers.weather.update(ctx);
          },
          { type: "weather/subscribe_forecast", entity_id: ctx.config.entity, forecast_type: ctx.config.forecast_type || "hourly" }
        );
      } catch (_error) {
      }
    },
    disconnect(ctx) {
      ctx.nodes.forecastUnsub?.();
      ctx.nodes.forecastUnsub = null;
    }
  },
  // ------------------------------------------------------------- Energie
  energy: {
    build(ctx) {
      const root = el3("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      const head = el3("div", "row");
      ctx.nodes.title = el3("div", "title");
      ctx.nodes.total = el3("div", "muted");
      head.append(ctx.nodes.title, el3("div", "spacer"), ctx.nodes.total);
      ctx.nodes.bars = el3("div", "bars");
      root.append(head, ctx.nodes.bars);
      return root;
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      const unit = state?.attributes?.unit_of_measurement || "";
      ctx.nodes.total.textContent = state ? `${state.state} ${unit}` : "";
      const values = ctx.nodes.history || [];
      if (!values.length) return;
      const max = Math.max(...values.map((entry) => entry.value), 1);
      if (ctx.nodes.bars.childElementCount !== values.length) {
        ctx.nodes.bars.replaceChildren();
        ctx.nodes.barNodes = values.map(() => {
          const column = el3("div", "bar-col");
          const bar = el3("div", "bar");
          const label = el3("div", "bar-label");
          column.append(bar, label);
          ctx.nodes.bars.append(column);
          return { bar, label };
        });
      }
      const peak = values.reduce((best, entry, index) => entry.value > values[best].value ? index : best, 0);
      values.forEach((entry, index) => {
        const node = ctx.nodes.barNodes?.[index];
        if (!node) return;
        node.bar.style.height = `${Math.max(3, entry.value / max * 100)}%`;
        node.bar.classList.toggle("peak", index === peak);
        node.label.textContent = entry.label;
      });
    },
    /**
     * Holt die Tageswerte.
     *
     * Ueber `recorder/statistics_during_period`, nicht ueber den Verlauf.
     * Zaehler wie ein Energiezaehler laufen monoton hoch; aus dem Verlauf
     * liess sich daraus nur der hoechste Stand des Tages ablesen, nicht der
     * Verbrauch. Home Assistant fuehrt fuer solche Entitaeten Statistiken mit
     * einer Summe je Stunde und Tag - `change` ist genau der Tagesverbrauch.
     *
     * Faellt auf den Verlauf zurueck, wenn keine Statistik vorliegt: nicht
     * jede Entitaet hat eine `state_class` und damit Statistikdaten.
     */
    async connect(ctx) {
      if (!ctx.hass || !ctx.config.entity || ctx.nodes.historyLoaded) return;
      ctx.nodes.historyLoaded = true;
      const days = Number(ctx.config.days) || 7;
      const end = /* @__PURE__ */ new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      const beschriften = (reihen) => reihen.slice(-days).map(([key, value]) => ({ value, label: weekdays[new Date(key).getDay()] }));
      try {
        const statistik = await ctx.hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          statistic_ids: [ctx.config.entity],
          period: "day",
          types: ["change", "state", "sum"]
        });
        const punkte = statistik?.[ctx.config.entity] || [];
        if (punkte.length) {
          const werte = punkte.map((punkt) => {
            const wert = punkt.change ?? punkt.state;
            const zahl = numeric(wert);
            return Number.isFinite(zahl) ? [new Date(punkt.start).toISOString().slice(0, 10), zahl] : null;
          }).filter(Boolean);
          if (werte.length) {
            ctx.nodes.history = beschriften(werte);
            ctx.nodes.historySource = "statistik";
            renderers.energy.update(ctx);
            return;
          }
        }
      } catch (_error) {
      }
      try {
        const pfad = `history/period/${encodeURIComponent(start.toISOString())}?filter_entity_id=${encodeURIComponent(ctx.config.entity)}&end_time=${encodeURIComponent(end.toISOString())}&minimal_response&no_attributes`;
        const ergebnis = await ctx.hass.callApi("GET", pfad);
        const reihe = ergebnis?.[0] || [];
        const eimer = /* @__PURE__ */ new Map();
        reihe.forEach((punkt) => {
          const wert = numeric(punkt.state);
          if (!Number.isFinite(wert)) return;
          const wann = new Date(punkt.last_changed || punkt.last_updated);
          const key = wann.toISOString().slice(0, 10);
          eimer.set(key, Math.max(eimer.get(key) ?? 0, wert));
        });
        ctx.nodes.history = beschriften([...eimer.entries()].sort(([a], [b]) => a.localeCompare(b)));
        ctx.nodes.historySource = "verlauf";
        renderers.energy.update(ctx);
      } catch (_error) {
        ctx.nodes.historyLoaded = false;
      }
    }
  },
  // ------------------------------------------------------------- Media
  media: {
    build(ctx) {
      const root = el3("div", "media-body");
      ctx.nodes.glow = el3("div", "media-glow");
      root.append(ctx.nodes.glow);
      const head = el3("div", "media-head");
      ctx.nodes.art = el3("div", "media-art");
      ctx.nodes.artIcon = icon2("mdi:music");
      ctx.nodes.art.append(ctx.nodes.artIcon);
      const meta = el3("div");
      meta.style.minWidth = "0";
      ctx.nodes.track = el3("div", "title");
      ctx.nodes.artist = el3("div", "subtitle");
      meta.append(ctx.nodes.track, ctx.nodes.artist);
      ctx.nodes.favorite = el3("button", "media-fav");
      ctx.nodes.favorite.append(icon2("mdi:heart-outline"));
      ctx.nodes.favorite.title = "Titel favorisieren";
      ctx.nodes.favorite.addEventListener("click", (event) => {
        event.stopPropagation();
        const ziel = renderers.media._favoriteEntity(ctx);
        if (ziel) ctx.hass?.callService("button", "press", { entity_id: ziel });
      });
      head.append(ctx.nodes.art, meta, ctx.nodes.favorite);
      ctx.nodes.progress = el3("div", "progress");
      ctx.nodes.progressBar = el3("span");
      ctx.nodes.progress.append(ctx.nodes.progressBar);
      ctx.nodes.progress.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!ctx.nodes.canSeek) return;
        const dauer = Number(ctx.hass?.states?.[ctx.config.entity]?.attributes?.media_duration) || 0;
        if (!dauer) return;
        const kasten = ctx.nodes.progress.getBoundingClientRect();
        if (!kasten.width) return;
        const anteil = Math.max(0, Math.min(1, (event.clientX - kasten.left) / kasten.width));
        call("media_seek", { seek_position: Math.round(anteil * dauer) });
      });
      const times = el3("div", "media-times");
      ctx.nodes.elapsed = el3("span", null, "0:00");
      ctx.nodes.duration = el3("span", null, "0:00");
      times.append(ctx.nodes.elapsed, ctx.nodes.duration);
      const controls = el3("div", "media-controls");
      const make = (symbol, feature, onClick, className = "") => {
        const button = el3("button", className);
        button.append(icon2(symbol));
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (ctx.config.entity) onClick();
        });
        return { node: button, feature, symbol };
      };
      const call = (service, data = {}) => ctx.hass?.callService("media_player", service, { entity_id: ctx.config.entity, ...data });
      const shuffle = make("mdi:shuffle-variant", MEDIA_FEATURE.SHUFFLE_SET, () => {
        const on = ctx.hass?.states?.[ctx.config.entity]?.attributes?.shuffle === true;
        call("shuffle_set", { shuffle: !on });
      });
      const repeat = make("mdi:repeat", MEDIA_FEATURE.REPEAT_SET, () => {
        const jetzt = ctx.hass?.states?.[ctx.config.entity]?.attributes?.repeat || "off";
        const naechste = { off: "all", all: "one", one: "off" }[jetzt] || "off";
        call("repeat_set", { repeat: naechste });
      });
      const previous = make(
        "mdi:skip-previous",
        MEDIA_FEATURE.PREVIOUS_TRACK,
        () => call("media_previous_track")
      );
      const next = make("mdi:skip-next", MEDIA_FEATURE.NEXT_TRACK, () => call("media_next_track"));
      const play = make("mdi:pause", MEDIA_FEATURE.PLAY | MEDIA_FEATURE.PAUSE, () => call("media_play_pause"), "play");
      const stop = make("mdi:stop", MEDIA_FEATURE.STOP, () => call("media_stop"));
      ctx.nodes.play = play.node;
      ctx.nodes.shuffle = shuffle;
      ctx.nodes.repeat = repeat;
      ctx.nodes.mediaButtons = [shuffle, previous, play, stop, next, repeat];
      controls.append(...ctx.nodes.mediaButtons.map((b) => b.node));
      const volumeRow = el3("div", "volume");
      ctx.nodes.muteButton = el3("button", "mute");
      ctx.nodes.muteIcon = icon2("mdi:volume-high");
      ctx.nodes.muteButton.append(ctx.nodes.muteIcon);
      ctx.nodes.muteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const muted = ctx.hass?.states?.[ctx.config.entity]?.attributes?.is_volume_muted === true;
        call("volume_mute", { is_volume_muted: !muted });
      });
      const volumeTrack = el3("div", "volume-track");
      ctx.nodes.volumeFill = el3("span");
      ctx.nodes.volumeInput = document.createElement("input");
      ctx.nodes.volumeInput.type = "range";
      ctx.nodes.volumeInput.min = "0";
      ctx.nodes.volumeInput.max = "100";
      ctx.nodes.volumeInput.step = "1";
      volumeTrack.append(ctx.nodes.volumeFill, ctx.nodes.volumeInput);
      ctx.nodes.volumeValue = el3("span", "volume-value", "–");
      ctx.nodes.volumeInput.addEventListener("input", (event) => {
        event.stopPropagation();
        ctx.nodes.volumeFill.style.width = `${ctx.nodes.volumeInput.value}%`;
        ctx.nodes.volumeValue.textContent = `${ctx.nodes.volumeInput.value} %`;
      });
      ctx.nodes.volumeInput.addEventListener("change", (event) => {
        event.stopPropagation();
        call("volume_set", { volume_level: Number(ctx.nodes.volumeInput.value) / 100 });
      });
      volumeRow.append(ctx.nodes.muteButton, volumeTrack, ctx.nodes.volumeValue);
      ctx.nodes.volumeRow = volumeRow;
      ctx.nodes.sourceSelect = document.createElement("select");
      ctx.nodes.sourceSelect.className = "dropdown source";
      ctx.nodes.sourceSelect.addEventListener("click", (event) => event.stopPropagation());
      ctx.nodes.sourceSelect.addEventListener("change", (event) => {
        event.stopPropagation();
        call("select_source", { source: ctx.nodes.sourceSelect.value });
      });
      const inhalt = el3("div", "media-stack");
      inhalt.append(head, ctx.nodes.progress, times, controls, volumeRow, ctx.nodes.sourceSelect);
      root.append(inhalt);
      return root;
    },
    /** Sucht die Favoriten-Knopf-Entitaet zum gewaehlten Player. */
    _favoriteEntity(ctx) {
      if (ctx.config.favorite_entity) return ctx.config.favorite_entity;
      const objectId = String(ctx.config.entity || "").split(".")[1];
      if (!objectId || !ctx.hass?.states) return "";
      return Object.keys(ctx.hass.states).find(
        (id) => id.startsWith(`button.${objectId}_`) && /favorit|favourite|favorisieren/i.test(id)
      ) || "";
    },
    /**
     * Liest zwei kraeftige Farben aus dem Titelbild und faerbt damit die
     * Schleier.
     *
     * Das Bild wird auf 12x12 verkleinert – mehr braucht es nicht, und ein
     * grosses Bild Pixel fuer Pixel zu lesen kostet bei jedem Titelwechsel
     * spuerbar Zeit. Blasse und sehr dunkle Punkte fallen raus, sonst
     * gewinnt bei fast jedem Cover der schwarze Rand.
     *
     * Liegt das Bild auf einer fremden Adresse, verweigert der Browser das
     * Auslesen (der Zeichenbereich gilt dann als "verunreinigt"). Dann bleibt
     * es bei der Akzentfarbe – deshalb der try/catch.
     */
    _glowFromArt(ctx, img) {
      const setzen = (a, b) => {
        ctx.nodes.glow.style.setProperty("--glow-a", a);
        ctx.nodes.glow.style.setProperty("--glow-b", b);
      };
      if (!img || ctx.config.glow === false) {
        setzen("", "");
        return;
      }
      try {
        const size = 12;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(img, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        const kandidaten = [];
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saettigung = max === 0 ? 0 : (max - min) / max;
          if (max < 40 || saettigung < 0.18) continue;
          kandidaten.push({ r, g, b, gewicht: saettigung * max });
        }
        if (!kandidaten.length) {
          setzen("", "");
          return;
        }
        kandidaten.sort((a, b) => b.gewicht - a.gewicht);
        const erste = kandidaten[0];
        const zweite = kandidaten[Math.floor(kandidaten.length * 0.6)] || erste;
        setzen(`${erste.r}, ${erste.g}, ${erste.b}`, `${zweite.r}, ${zweite.g}, ${zweite.b}`);
      } catch (_error) {
        setzen("", "");
      }
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      const attributes = state?.attributes || {};
      ctx.nodes.glow.hidden = ctx.config.glow === false;
      ctx.nodes.track.textContent = attributes.media_title || ctx.config.name || friendlyName(ctx.config.entity, state);
      ctx.nodes.artist.textContent = attributes.media_artist || attributes.media_series_title || state?.state || "";
      const picture = attributes.entity_picture || attributes.entity_picture_local || (attributes.media_image_remotely_accessible ? attributes.media_image_url : "") || "";
      if (picture !== ctx.nodes.artUrl) {
        ctx.nodes.artUrl = picture;
        if (picture) {
          const img = document.createElement("img");
          img.alt = "";
          img.addEventListener("error", () => {
            if (ctx.nodes.artUrl !== picture) return;
            ctx.nodes.artUrl = "";
            ctx.nodes.art.replaceChildren(ctx.nodes.artIcon);
          });
          img.addEventListener("load", () => {
            if (ctx.nodes.artUrl === picture) renderers.media._glowFromArt(ctx, img);
          });
          img.src = picture;
          ctx.nodes.art.replaceChildren(img);
        } else {
          ctx.nodes.art.replaceChildren(ctx.nodes.artIcon);
          renderers.media._glowFromArt(ctx, null);
        }
      }
      const duration = Number(attributes.media_duration) || 0;
      let position = Number(attributes.media_position) || 0;
      if (attributes.media_position_updated_at && state?.state === "playing") {
        position += (Date.now() - new Date(attributes.media_position_updated_at).getTime()) / 1e3;
      }
      const ratio = duration > 0 ? clampNumber(position / duration, 0, 1, 0) : 0;
      ctx.nodes.progressBar.style.width = `${ratio * 100}%`;
      ctx.nodes.elapsed.textContent = formatDuration(position);
      ctx.nodes.duration.textContent = formatDuration(duration);
      ctx.nodes.play.querySelector("ha-icon")?.setAttribute("icon", state?.state === "playing" ? "mdi:pause" : "mdi:play");
      const features = Number(attributes.supported_features) || 0;
      ctx.nodes.mediaButtons?.forEach(({ node, feature }) => {
        node.hidden = !(features & feature);
      });
      ctx.nodes.shuffle?.node.classList.toggle("is-active", attributes.shuffle === true);
      const repeat = attributes.repeat || "off";
      ctx.nodes.repeat?.node.classList.toggle("is-active", repeat !== "off");
      ctx.nodes.repeat?.node.querySelector("ha-icon")?.setAttribute("icon", repeat === "one" ? "mdi:repeat-once" : "mdi:repeat");
      const kann = (bit) => (features & bit) === bit;
      ctx.nodes.volumeRow.hidden = !kann(MEDIA_FEATURE.VOLUME_SET) && !kann(MEDIA_FEATURE.VOLUME_MUTE);
      ctx.nodes.muteButton.hidden = !kann(MEDIA_FEATURE.VOLUME_MUTE);
      ctx.nodes.volumeInput.parentElement.hidden = !kann(MEDIA_FEATURE.VOLUME_SET);
      ctx.nodes.volumeValue.hidden = !kann(MEDIA_FEATURE.VOLUME_SET);
      const muted = attributes.is_volume_muted === true;
      ctx.nodes.muteIcon.icon = muted ? "mdi:volume-off" : "mdi:volume-high";
      ctx.nodes.muteButton.classList.toggle("is-active", muted);
      const level = Number(attributes.volume_level);
      if (Number.isFinite(level)) {
        const prozent = Math.round(level * 100);
        if (document.activeElement !== ctx.nodes.volumeInput) {
          ctx.nodes.volumeInput.value = String(prozent);
          ctx.nodes.volumeFill.style.width = `${prozent}%`;
        }
        ctx.nodes.volumeValue.textContent = muted ? "stumm" : `${prozent} %`;
      } else {
        ctx.nodes.volumeValue.textContent = muted ? "stumm" : "–";
      }
      ctx.nodes.canSeek = kann(MEDIA_FEATURE.SEEK) && Number(attributes.media_duration) > 0;
      ctx.nodes.progress.classList.toggle("seekable", ctx.nodes.canSeek);
      const favorit = renderers.media._favoriteEntity(ctx);
      ctx.nodes.favorite.hidden = !favorit;
      const sources = Array.isArray(attributes.source_list) ? attributes.source_list : [];
      ctx.nodes.sourceSelect.hidden = !sources.length;
      if (!ctx.nodes.sourceSelect.hidden) {
        const schluessel = sources.join("|");
        if (ctx.nodes.sourceKeys !== schluessel) {
          ctx.nodes.sourceKeys = schluessel;
          ctx.nodes.sourceSelect.replaceChildren(
            ...sources.map((quelle) => {
              const option = document.createElement("option");
              option.value = quelle;
              option.textContent = quelle;
              return option;
            })
          );
        }
        const aktuell = attributes.source || "";
        if (aktuell && ctx.nodes.sourceSelect.value !== aktuell) ctx.nodes.sourceSelect.value = aktuell;
      }
    }
  },
  // ------------------------------------------------------------- Mitglieder
  members: {
    build(ctx) {
      const root = el3("div");
      const head = el3("div", "row");
      ctx.nodes.title = el3("div", "title");
      head.append(ctx.nodes.title, el3("div", "spacer"));
      ctx.nodes.list = el3("div", "members");
      root.append(head, ctx.nodes.list);
      return root;
    },
    update(ctx) {
      ctx.nodes.title.textContent = ctx.config.name || "Mitglieder";
      const ids = ctx.config.entities?.length ? ctx.config.entities : Object.keys(ctx.hass?.states || {}).filter((id) => id.startsWith("person."));
      if (ctx.nodes.memberKey !== ids.join("|")) {
        ctx.nodes.memberKey = ids.join("|");
        ctx.nodes.list.replaceChildren();
        ctx.nodes.memberNodes = /* @__PURE__ */ new Map();
        ids.forEach((id) => {
          const node = el3("button", "member");
          node.addEventListener("click", () => showMoreInfo(ctx.host, id));
          ctx.nodes.memberNodes.set(id, { node, picture: null });
          ctx.nodes.list.append(node);
        });
      }
      ctx.nodes.memberNodes?.forEach((record, id) => {
        const state = ctx.hass?.states?.[id];
        const name = friendlyName(id, state);
        const status = isUnavailable(state) ? "unavailable" : state.state === "home" ? "home" : "away";
        record.node.classList.remove("is-home", "is-away", "is-unavailable");
        record.node.classList.add(`is-${status}`);
        record.node.title = name;
        const picture = state?.attributes?.entity_picture || "";
        if (picture !== record.picture) {
          record.picture = picture;
          if (picture) {
            const img = document.createElement("img");
            img.src = picture;
            img.alt = "";
            record.node.replaceChildren(img);
          } else {
            record.node.textContent = (name[0] || "?").toUpperCase();
          }
        }
      });
    }
  },
  // ------------------------------------------------------------- Kalender
  calendar: {
    build(ctx) {
      const root = el3("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      ctx.nodes.title = el3("div", "title");
      ctx.nodes.events = el3("div", "events");
      root.append(ctx.nodes.title, ctx.nodes.events);
      return root;
    },
    update(ctx) {
      ctx.nodes.title.textContent = ctx.config.name || "Kalender";
      const events = ctx.nodes.events_data || [];
      if (!events.length) {
        ctx.nodes.events.replaceChildren(el3("div", "muted", "Keine Termine"));
        return;
      }
      const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      ctx.nodes.events.replaceChildren(
        ...events.slice(0, Number(ctx.config.max_events) || 6).map((event) => {
          const row = el3("div", "event");
          const when = el3("div", "when");
          const date = new Date(event.start?.dateTime || event.start?.date || event.start);
          when.append(el3("b", null, String(date.getDate())), el3("span", null, months[date.getMonth()] || ""));
          row.append(when, el3("div", "what", event.summary || "Termin"));
          return row;
        })
      );
    },
    async connect(ctx) {
      const entities = ctx.config.entities?.length ? ctx.config.entities : [ctx.config.entity].filter(Boolean);
      if (!ctx.hass || !entities.length || ctx.nodes.eventsLoaded) return;
      ctx.nodes.eventsLoaded = true;
      const days = Number(ctx.config.days) || 7;
      const start = /* @__PURE__ */ new Date();
      const end = new Date(start.getTime() + days * 864e5);
      try {
        const lists = await Promise.all(
          entities.map(
            (entityId) => ctx.hass.callApi(
              "GET",
              `calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(
                start.toISOString()
              )}&end=${encodeURIComponent(end.toISOString())}`
            ).catch(() => [])
          )
        );
        ctx.nodes.events_data = lists.flat().sort(
          (a, b) => String(a.start?.dateTime || a.start?.date || "").localeCompare(String(b.start?.dateTime || b.start?.date || ""))
        );
        renderers.calendar.update(ctx);
      } catch (_error) {
        ctx.nodes.eventsLoaded = false;
      }
    }
  },
  // ------------------------------------------------------------- Auswahl
  select: {
    build(ctx) {
      const root = el3("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px";
      ctx.nodes.title = el3("div", "title");
      ctx.nodes.body = el3("div");
      root.append(ctx.nodes.title, ctx.nodes.body);
      return root;
    },
    update(ctx) {
      const entityId = ctx.config.entity;
      const state = ctx.hass?.states?.[entityId];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(entityId, state);
      const options = state?.attributes?.options || [];
      const domain = String(entityId || "").split(".")[0];
      const mode = ctx.config.display === "buttons" ? "buttons" : "dropdown";
      const key = `${mode}|${options.join("|")}`;
      if (ctx.nodes.selectKey !== key) {
        ctx.nodes.selectKey = key;
        ctx.nodes.body.replaceChildren();
        if (mode === "dropdown") {
          const select = document.createElement("select");
          select.className = "dropdown";
          options.forEach((option) => {
            const node = document.createElement("option");
            node.value = option;
            node.textContent = option;
            select.append(node);
          });
          select.addEventListener(
            "change",
            () => ctx.hass?.callService(domain, "select_option", { entity_id: entityId, option: select.value })
          );
          ctx.nodes.select = select;
          ctx.nodes.optionButtons = null;
          ctx.nodes.body.append(select);
        } else {
          ctx.nodes.segmented = createSegmented({
            options,
            value: state?.state ?? "",
            onChange: (option) => ctx.hass?.callService(domain, "select_option", { entity_id: entityId, option })
          });
          ctx.nodes.optionButtons = null;
          ctx.nodes.select = null;
          ctx.nodes.body.append(ctx.nodes.segmented.element);
          nextFrame(() => ctx.nodes.segmented.place());
        }
      }
      if (ctx.nodes.select && ctx.nodes.select.value !== state?.state) ctx.nodes.select.value = state?.state ?? "";
      ctx.nodes.segmented?.update(state?.state ?? "", options);
    }
  },
  // ------------------------------------------------------------- Energieliste
  /**
   * Mehrere Energiezaehler untereinander, nach Verbrauch sortiert.
   *
   * Gedacht fuer eine eigene Seite: wer dreissig Steckdosen misst, will sie
   * nicht als dreissig Karten, sondern als Liste - mit einem Balken, der den
   * Anteil zeigt, und einer Summe unten.
   *
   * Ohne feste Auswahl nimmt die Karte alle Sensoren mit `device_class:
   * energy`. Das sind bei einer gewachsenen Anlage schnell fuenfzig, von
   * denen die meisten Varianten desselben Zaehlers sind (heute, gestern,
   * gesamt) - deshalb das Feld *Endung*: `_today` liefert genau die
   * Tageswerte.
   */
  energy_list: {
    build(ctx) {
      const root = el3("div", "energy-list");
      ctx.nodes.rows = el3("div", "energy-rows");
      ctx.nodes.total = el3("div", "energy-total");
      ctx.nodes.empty = el3("div", "energy-empty", "Keine Energiezähler gefunden.");
      root.append(ctx.nodes.rows, ctx.nodes.empty, ctx.nodes.total);
      ctx.nodes.rowCache = /* @__PURE__ */ new Map();
      return root;
    },
    /** Welche Entitaeten gehoeren in die Liste? */
    _entities(ctx) {
      const gewaehlt = Array.isArray(ctx.config.entities) ? ctx.config.entities.filter(Boolean) : [];
      if (gewaehlt.length) return gewaehlt;
      const states = ctx.hass?.states || {};
      const endung = String(ctx.config.suffix || "").trim();
      return Object.keys(states).filter((id) => {
        if (!id.startsWith("sensor.")) return false;
        const attributes = states[id].attributes || {};
        if (attributes.device_class !== "energy") return false;
        if (endung && !id.endsWith(endung)) return false;
        return true;
      });
    },
    update(ctx) {
      const states = ctx.hass?.states || {};
      const einheit = ctx.config.unit || "kWh";
      const werte = renderers.energy_list._entities(ctx).map((id) => {
        const state = states[id];
        const zahl = numeric(state?.state);
        return {
          id,
          name: ctx.config.use_entity_names === false ? id : friendlyName(id, state),
          wert: Number.isFinite(zahl) ? zahl : null
        };
      }).filter((eintrag) => eintrag.wert !== null).sort((a, b) => b.wert - a.wert);
      const grenze = Number(ctx.config.max_rows) || 0;
      const sichtbar = grenze > 0 ? werte.slice(0, grenze) : werte;
      const summe = werte.reduce((gesamt, eintrag) => gesamt + eintrag.wert, 0);
      const groesster = sichtbar[0]?.wert || 0;
      ctx.nodes.empty.hidden = werte.length > 0;
      const gebraucht = /* @__PURE__ */ new Set();
      sichtbar.forEach((eintrag, index) => {
        let zeile = ctx.nodes.rowCache.get(eintrag.id);
        if (!zeile) {
          const node = el3("div", "energy-row");
          const kopf = el3("div", "energy-head");
          const name = el3("span", "energy-name");
          const wert = el3("span", "energy-value");
          kopf.append(name, wert);
          const bahn = el3("div", "energy-bar");
          const fuellung = el3("span");
          bahn.append(fuellung);
          node.append(kopf, bahn);
          zeile = { node, name, wert, fuellung };
          ctx.nodes.rowCache.set(eintrag.id, zeile);
        }
        gebraucht.add(eintrag.id);
        zeile.name.textContent = eintrag.name;
        zeile.name.title = eintrag.name;
        zeile.wert.textContent = `${formatEnergy(eintrag.wert)} ${einheit}`;
        zeile.fuellung.style.width = groesster > 0 ? `${eintrag.wert / groesster * 100}%` : "0%";
        if (ctx.nodes.rows.children[index] !== zeile.node) {
          ctx.nodes.rows.insertBefore(zeile.node, ctx.nodes.rows.children[index] || null);
        }
      });
      ctx.nodes.rowCache.forEach((zeile, id) => {
        if (gebraucht.has(id)) return;
        zeile.node.remove();
        ctx.nodes.rowCache.delete(id);
      });
      const versteckt = werte.length - sichtbar.length;
      ctx.nodes.total.textContent = werte.length ? `Summe ${formatEnergy(summe)} ${einheit}${versteckt > 0 ? ` · ${versteckt} weitere` : ""}` : "";
      ctx.nodes.total.hidden = !ctx.nodes.total.textContent;
    }
  },
  // ------------------------------------------------------------- Trenner
  /**
   * Eine Beschriftung mit Linie, zum Gliedern eines Rasters.
   *
   * Ohne Entitaet und ohne Glasflaeche – als Karte getarnt waere er genau
   * das, was er nicht sein soll. Ein kleiner Hoehenfaktor (etwa 0,3) passt
   * dazu; der Editor sagt das im Hilfetext.
   */
  separator: {
    build(ctx) {
      ctx.card.classList.add("plain");
      const root = el3("div", "sep");
      ctx.nodes.lineBefore = el3("div", "sep-line");
      ctx.nodes.text = el3("div", "sep-text");
      ctx.nodes.icon = icon2("mdi:tag");
      ctx.nodes.label = el3("span");
      ctx.nodes.text.append(ctx.nodes.icon, ctx.nodes.label);
      ctx.nodes.lineAfter = el3("div", "sep-line");
      root.append(ctx.nodes.lineBefore, ctx.nodes.text, ctx.nodes.lineAfter);
      return root;
    },
    update(ctx) {
      const label = ctx.config.name || "";
      ctx.nodes.label.textContent = label;
      ctx.nodes.label.hidden = !label;
      ctx.nodes.icon.hidden = !ctx.config.icon;
      if (ctx.config.icon) ctx.nodes.icon.icon = ctx.config.icon;
      ctx.nodes.text.hidden = !label && !ctx.config.icon;
      const align = ctx.config.align || "left";
      const showLine = ctx.config.show_line !== false;
      ctx.nodes.lineBefore.hidden = !showLine || align === "left" && ctx.nodes.text.hidden === false;
      ctx.nodes.lineAfter.hidden = !showLine || align === "right" && ctx.nodes.text.hidden === false;
      if (ctx.nodes.text.hidden) {
        ctx.nodes.lineBefore.hidden = !showLine;
        ctx.nodes.lineAfter.hidden = true;
      }
    }
  },
  // ------------------------------------------------------------- Kamera
  /**
   * Zwei Betriebsarten, im Editor je Karte wählbar:
   *
   * - **Standbild**: holt `entity_picture` neu, im eingestellten Takt. Das ist
   *   genau ein Bild pro Intervall, sonst schweigt die Leitung.
   * - **Livebild**: `/api/camera_proxy_stream/` liefert MJPEG. Das läuft in
   *   einem schlichten <img> und braucht kein nachgeladenes HA-Element —
   *   `ha-camera-stream` ist von außen nicht zuverlässig zu bekommen, dieselbe
   *   Falle wie beim Kartenwähler. Dafür überträgt MJPEG dauerhaft.
   *
   * Warum der IntersectionObserver: Die Shell blendet Seiten nur mit
   * `display: none` aus, die Karten bleiben am Leben. Ohne die Prüfung liefe
   * ein Livebild auf einer längst verlassenen Seite endlos weiter.
   */
  camera: {
    build(ctx) {
      const root = el3("div", "camera");
      ctx.nodes.image = el3("img", "camera-image");
      ctx.nodes.image.alt = "";
      ctx.nodes.image.decoding = "async";
      ctx.nodes.note = el3("div", "camera-note");
      ctx.nodes.label = el3("div", "camera-label");
      ctx.nodes.liveDot = el3("span", "camera-live");
      ctx.nodes.labelText = el3("span", null, "");
      ctx.nodes.label.append(ctx.nodes.liveDot, ctx.nodes.labelText);
      root.append(ctx.nodes.image, ctx.nodes.note, ctx.nodes.label);
      ctx.nodes.visible = true;
      ctx.nodes.failed = false;
      ctx.nodes.image.addEventListener("error", () => {
        ctx.nodes.failed = true;
        renderers.camera._paint(ctx);
      });
      ctx.nodes.image.addEventListener("load", () => {
        if (!ctx.nodes.failed) return;
        ctx.nodes.failed = false;
        renderers.camera._paint(ctx);
      });
      ctx.card.classList.add("interactive");
      root.addEventListener(
        "click",
        () => handleAction(ctx.host, ctx.hass, ctx.config.tap_action || { action: "more-info" }, ctx.config.entity)
      );
      if (typeof IntersectionObserver === "function") {
        ctx.nodes.observer = new IntersectionObserver((entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible === ctx.nodes.visible) return;
          ctx.nodes.visible = visible;
          if (visible) renderers.camera.reconnect(ctx);
          else renderers.camera._stop(ctx);
        });
        ctx.nodes.observer.observe(ctx.host);
      }
      return root;
    },
    update(ctx) {
      const wanted = renderers.camera._interval(ctx);
      const modeChanged = ctx.nodes.mode !== renderers.camera._mode(ctx);
      if (modeChanged || ctx.nodes.interval !== wanted) renderers.camera.reconnect(ctx);
      else renderers.camera._paint(ctx);
    },
    reconnect(ctx) {
      if (!ctx.nodes.image) return;
      renderers.camera._stop(ctx);
      if (!ctx.nodes.visible) return;
      ctx.nodes.mode = renderers.camera._mode(ctx);
      ctx.nodes.interval = renderers.camera._interval(ctx);
      renderers.camera._paint(ctx);
      if (ctx.nodes.mode === "still") {
        ctx.nodes.timer = setInterval(() => renderers.camera._paint(ctx), ctx.nodes.interval);
      }
    },
    disconnect(ctx) {
      renderers.camera._stop(ctx);
      ctx.nodes.observer?.disconnect();
      ctx.nodes.observer = null;
    },
    /** Hält den Takt an und kappt eine laufende MJPEG-Verbindung. */
    _stop(ctx) {
      clearInterval(ctx.nodes.timer);
      ctx.nodes.timer = null;
      if (ctx.nodes.image?.getAttribute("src")) ctx.nodes.image.removeAttribute("src");
    },
    _mode(ctx) {
      return ctx.config.camera_mode === "live" ? "live" : "still";
    },
    _interval(ctx) {
      return clampNumber(ctx.config.refresh_interval, 1, 300, 10) * 1e3;
    },
    _paint(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      const picture = state?.attributes?.entity_picture;
      const unavailable = !state || state.state === "unavailable" || !picture;
      const note = ctx.nodes.note;
      if (unavailable) {
        renderers.camera._stop(ctx);
        note.textContent = !ctx.config.entity ? "Keine Kamera gewählt." : !state ? `Unbekannte Entität: ${ctx.config.entity}` : "Kamera nicht erreichbar.";
        note.hidden = false;
        ctx.nodes.image.hidden = true;
        ctx.nodes.label.hidden = true;
        return;
      }
      if (ctx.nodes.failed) {
        note.textContent = "Bild konnte nicht geladen werden.";
        note.hidden = false;
      } else {
        note.hidden = true;
      }
      ctx.nodes.image.hidden = false;
      ctx.nodes.image.src = ctx.nodes.mode === "live" ? picture.replace("/api/camera_proxy/", "/api/camera_proxy_stream/") : `${picture}${picture.includes("?") ? "&" : "?"}_=${Date.now()}`;
      const name = ctx.config.name || state.attributes.friendly_name || "";
      ctx.nodes.labelText.textContent = name;
      ctx.nodes.liveDot.hidden = ctx.nodes.mode !== "live";
      ctx.nodes.label.hidden = !name && ctx.nodes.mode !== "live";
    }
  },
  // ------------------------------------------------------------- Uhr
  clock: {
    build(ctx) {
      const root = el3("div", "clock");
      ctx.nodes.time = el3("div", "clock-time", "--:--");
      ctx.nodes.date = el3("div", "clock-date");
      ctx.nodes.timerLine = el3("div", "clock-timer");
      root.append(ctx.nodes.time, ctx.nodes.date, ctx.nodes.timerLine);
      ctx.nodes.timerButton = el3("button", "clock-timer-btn");
      const RING = "http://www.w3.org/2000/svg";
      const ringSvg = document.createElementNS(RING, "svg");
      ringSvg.setAttribute("viewBox", "0 0 36 36");
      ringSvg.setAttribute("class", "timer-ring");
      const ringUmfang = 2 * Math.PI * 16;
      const ringBahn = document.createElementNS(RING, "circle");
      ringBahn.setAttribute("class", "ring-track");
      ringBahn.setAttribute("cx", "18");
      ringBahn.setAttribute("cy", "18");
      ringBahn.setAttribute("r", "16");
      const ringWert = document.createElementNS(RING, "circle");
      ringWert.setAttribute("class", "ring-value");
      ringWert.setAttribute("cx", "18");
      ringWert.setAttribute("cy", "18");
      ringWert.setAttribute("r", "16");
      ringWert.setAttribute("stroke-dasharray", String(ringUmfang));
      ringWert.setAttribute("stroke-dashoffset", String(ringUmfang));
      ringSvg.append(ringBahn, ringWert);
      ctx.nodes.timerRing = ringWert;
      ctx.nodes.timerRingLength = ringUmfang;
      ctx.nodes.timerButton.append(ringSvg, icon2("mdi:timer-outline"));
      ctx.nodes.silenceButton = el3("button", "clock-timer-btn is-ringing");
      ctx.nodes.silenceButton.append(icon2("mdi:bell-off"));
      ctx.nodes.silenceButton.title = "Ton abstellen";
      ctx.nodes.silenceButton.hidden = true;
      ctx.nodes.silenceButton.addEventListener("click", (event) => {
        event.stopPropagation();
        renderers.clock._silence(ctx);
      });
      ctx.nodes.timerButton.title = "Kurzzeitwecker";
      ctx.nodes.timerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.nodes.minutes = renderers.clock._remaining(ctx) || 5;
        renderers.clock._openSheet(ctx);
        renderers.clock._paintDial(ctx);
      });
      root.append(ctx.nodes.timerButton, ctx.nodes.silenceButton);
      const sheet = document.createElement("dialog");
      sheet.className = "sheet";
      const dial = el3("div", "dial timer-dial");
      const SVG = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      const umfang = 2 * Math.PI * 42;
      const bogen = umfang * 0.75;
      const kreis = (klasse, offset) => {
        const node = document.createElementNS(SVG, "circle");
        node.setAttribute("class", klasse);
        node.setAttribute("cx", "50");
        node.setAttribute("cy", "50");
        node.setAttribute("r", "42");
        node.setAttribute("stroke-width", "7");
        node.setAttribute("stroke-dasharray", `${bogen} ${umfang}`);
        if (offset !== void 0) node.setAttribute("stroke-dashoffset", String(offset));
        return node;
      };
      ctx.nodes.timerArc = kreis("value", bogen);
      ctx.nodes.timerArcLength = bogen;
      svg.append(kreis("track"), ctx.nodes.timerArc);
      const mitte = el3("div", "dial-center");
      ctx.nodes.timerValue = el3("div", "dial-temp", "5");
      ctx.nodes.timerUnit = el3("div", "dial-label", "Minuten");
      mitte.append(ctx.nodes.timerValue, ctx.nodes.timerUnit);
      dial.append(svg, mitte);
      const START = 225;
      const ausZeiger = (event) => {
        const kasten = dial.getBoundingClientRect();
        if (!kasten.width) return null;
        const x = event.clientX - (kasten.left + kasten.width / 2);
        const y = event.clientY - (kasten.top + kasten.height / 2);
        let winkel = Math.atan2(y, x) * 180 / Math.PI + 90;
        if (winkel < 0) winkel += 360;
        let aufBogen = winkel - START;
        if (aufBogen < 0) aufBogen += 360;
        if (aufBogen > 270) return aufBogen < 315 ? 60 : 0;
        return Math.round(aufBogen / 270 * 60);
      };
      const setzen = (event) => {
        const minuten = ausZeiger(event);
        if (minuten === null) return;
        ctx.nodes.minutes = Math.max(0, Math.min(60, minuten));
        renderers.clock._paintDial(ctx);
      };
      let zieht = false;
      dial.addEventListener("pointerdown", (event) => {
        zieht = true;
        dial.setPointerCapture?.(event.pointerId);
        setzen(event);
      });
      dial.addEventListener("pointermove", (event) => {
        if (zieht) setzen(event);
      });
      dial.addEventListener("pointerup", () => {
        zieht = false;
      });
      const knoepfe = el3("div", "sheet-actions");
      ctx.nodes.timerStart = el3("button", "sheet-btn primary", "Starten");
      const abbrechen = el3("button", "sheet-btn", "Schließen");
      ctx.nodes.timerCancel = el3("button", "sheet-btn danger", "Abbrechen");
      knoepfe.append(ctx.nodes.timerCancel, abbrechen, ctx.nodes.timerStart);
      abbrechen.addEventListener("click", (event) => {
        event.stopPropagation();
        renderers.clock._closeSheet(ctx);
      });
      ctx.nodes.timerStart.addEventListener("click", (event) => {
        event.stopPropagation();
        const ziel = ctx.config.timer_entity;
        if (!ziel) return;
        const minuten = Math.max(1, ctx.nodes.minutes || 1);
        ctx.hass?.callService("timer", "start", {
          entity_id: ziel,
          duration: `00:${String(minuten).padStart(2, "0")}:00`
        });
        renderers.clock._closeSheet(ctx);
      });
      ctx.nodes.timerCancel.addEventListener("click", (event) => {
        event.stopPropagation();
        if (ctx.config.timer_entity) ctx.hass?.callService("timer", "cancel", { entity_id: ctx.config.timer_entity });
        renderers.clock._closeSheet(ctx);
      });
      const inhalt = el3("div", "sheet-inner");
      inhalt.append(dial, knoepfe);
      sheet.append(inhalt);
      sheet.addEventListener("click", (event) => {
        if (event.target === sheet) renderers.clock._closeSheet(ctx);
      });
      ctx.nodes.sheet = sheet;
      root.append(sheet);
      ctx.nodes.tick = () => {
        const now = /* @__PURE__ */ new Date();
        const options = {
          hour: "2-digit",
          minute: "2-digit",
          hour12: ctx.config.hour_format === "12"
        };
        if (ctx.config.show_seconds) options.second = "2-digit";
        if (ctx.config.time_zone) options.timeZone = ctx.config.time_zone;
        try {
          ctx.nodes.time.textContent = now.toLocaleTimeString("de-DE", options);
          ctx.nodes.date.textContent = ctx.config.show_date === false ? "" : now.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: ctx.config.time_zone || void 0
          });
        } catch (_error) {
          ctx.nodes.time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
          ctx.nodes.date.textContent = "";
        }
        renderers.clock._maybeChime(ctx);
        renderers.clock._paintRemaining(ctx);
      };
      renderers.clock.reconnect(ctx);
      return root;
    },
    /**
     * Oeffnen und Schliessen.
     *
     * `showModal` gibt es nicht ueberall - in der Testumgebung etwa nicht.
     * Dann wird das `open`-Attribut gesetzt; der Dialog erscheint dadurch
     * ohne Top Layer, aber er erscheint.
     */
    _openSheet(ctx) {
      const sheet = ctx.nodes.sheet;
      if (sheet.open) return;
      try {
        sheet.showModal();
      } catch (_error) {
        sheet.open = true;
      }
    },
    _closeSheet(ctx) {
      const sheet = ctx.nodes.sheet;
      if (!sheet.open) return;
      try {
        sheet.close();
      } catch (_error) {
        sheet.open = false;
      }
    },
    /** Restminuten des laufenden Weckers, aufgerundet – fuer den Drehregler. */
    _remaining(ctx) {
      return Math.ceil(renderers.clock._remainingSeconds(ctx) / 60);
    },
    /**
     * Restsekunden.
     *
     * Home Assistant meldet beim Timer nur Start und Ende, nicht jede
     * Sekunde. Der Rest wird deshalb aus `finishes_at` gegen die aktuelle
     * Zeit gerechnet und vom Takt der Uhr fortgeschrieben – sonst stuende
     * die Zahl still, bis irgendwann eine andere Meldung eintrifft.
     *
     * Im angehaltenen Zustand gibt es kein `finishes_at`; dort steht die
     * verbleibende Dauer im Attribut `remaining` als "H:MM:SS".
     */
    _remainingSeconds(ctx) {
      const state = ctx.hass?.states?.[ctx.config.timer_entity];
      if (!state) return 0;
      if (state.state === "paused") {
        const teile = String(state.attributes?.remaining || "").split(":").map(Number);
        if (teile.length === 3 && teile.every(Number.isFinite)) {
          return teile[0] * 3600 + teile[1] * 60 + teile[2];
        }
        return 0;
      }
      if (state.state !== "active") return 0;
      const ende = Date.parse(state.attributes?.finishes_at || "");
      if (!Number.isFinite(ende)) return 0;
      return Math.max(0, Math.round((ende - Date.now()) / 1e3));
    },
    /** "12:34" – bei ueber einer Stunde mit Stundenanteil. */
    _formatRemaining(sekunden) {
      const gesamt = Math.max(0, Math.round(sekunden));
      const std = Math.floor(gesamt / 3600);
      const min = Math.floor(gesamt % 3600 / 60);
      const sek = gesamt % 60;
      return std ? `${std}:${String(min).padStart(2, "0")}:${String(sek).padStart(2, "0")}` : `${min}:${String(sek).padStart(2, "0")}`;
    },
    /** Schreibt die Restzeit in die Karte. Laeuft im Takt der Uhr mit. */
    _paintRemaining(ctx) {
      if (!ctx.nodes.timerLine) return;
      const state = ctx.config.timer_entity ? ctx.hass?.states?.[ctx.config.timer_entity] : null;
      if (state?.state === "active") {
        ctx.nodes.timerLine.textContent = `Wecker ${renderers.clock._formatRemaining(
          renderers.clock._remainingSeconds(ctx)
        )}`;
      } else if (state?.state === "paused") {
        ctx.nodes.timerLine.textContent = `Wecker angehalten · ${renderers.clock._formatRemaining(
          renderers.clock._remainingSeconds(ctx)
        )}`;
      } else {
        ctx.nodes.timerLine.textContent = "";
      }
      ctx.nodes.timerLine.hidden = !ctx.nodes.timerLine.textContent;
      const rest = renderers.clock._remainingSeconds(ctx);
      ctx.nodes.timerLine.classList.toggle("is-soon", rest <= 60 && state?.state === "active");
      const klingelt = renderers.clock._isRinging(ctx);
      ctx.nodes.silenceButton.hidden = !klingelt;
      ctx.nodes.timerButton.hidden = klingelt || !ctx.config.timer_entity;
      if (klingelt) {
        ctx.nodes.timerLine.textContent = "Wecker abgelaufen";
        ctx.nodes.timerLine.hidden = false;
        ctx.nodes.timerLine.classList.add("is-soon");
      }
      if (ctx.nodes.timerRing) {
        const teile = String(state?.attributes?.duration || "").split(":").map(Number);
        const gesamt = teile.length === 3 && teile.every(Number.isFinite) ? teile[0] * 3600 + teile[1] * 60 + teile[2] : 0;
        const anteil = gesamt > 0 ? Math.max(0, Math.min(1, rest / gesamt)) : 0;
        ctx.nodes.timerRing.setAttribute(
          "stroke-dashoffset",
          String(ctx.nodes.timerRingLength * (1 - anteil))
        );
      }
    },
    /**
     * Ton beim Ablaufen.
     *
     * Abgespielt wird im Browser, sobald der Wecker von "active" auf etwas
     * anderes springt. Das trifft nur zu, wenn dieses Geraet gerade
     * hinsieht – laeuft der Wecker ab, waehrend das Tablet aus ist, hoert
     * niemand etwas. Wer den Ton sicher haben will, laesst ihn per
     * Automation auf `timer.finished` ueber einen Lautsprecher ansagen.
     *
     * Der Browser erlaubt Ton erst nach einer Bedienung durch den Anwender.
     * Das ist hier gegeben: den Wecker startet man mit einem Tipp auf
     * dieselbe Seite.
     */
    _maybeChime(ctx) {
      const jetzt = ctx.hass?.states?.[ctx.config.timer_entity]?.state || "";
      const vorher = ctx.nodes.timerPrevState;
      ctx.nodes.timerPrevState = jetzt;
      if (vorher !== "active" || jetzt === "active" || jetzt === "paused") return;
      ctx.nodes.ringingUntil = Date.now() + 9e4;
      if (!ctx.config.sound) return;
      try {
        const ton = new Audio(ctx.config.sound);
        ton.volume = clampNumber(ctx.config.sound_volume, 0, 100, 80) / 100;
        ton.addEventListener?.("ended", () => {
          if (ctx.nodes.audio === ton) ctx.nodes.audio = null;
        });
        ctx.nodes.audio = ton;
        ton.play?.().catch(() => {
        });
      } catch (_error) {
      }
    },
    /** Klingelt gerade etwas, das sich abstellen laesst? */
    _isRinging(ctx) {
      if (ctx.nodes.audio) return true;
      if (!ctx.config.sound_player) return false;
      return Date.now() < (ctx.nodes.ringingUntil || 0);
    },
    /** Stellt den Ton ab – im Browser und auf dem Lautsprecher. */
    _silence(ctx) {
      const ton = ctx.nodes.audio;
      if (ton) {
        try {
          ton.pause?.();
          ton.currentTime = 0;
        } catch (_error) {
        }
        ctx.nodes.audio = null;
      }
      ctx.nodes.ringingUntil = 0;
      if (ctx.config.sound_player) {
        ctx.hass?.callService("media_player", "media_stop", { entity_id: ctx.config.sound_player });
      }
      renderers.clock._paintRemaining(ctx);
    },
    /** Zeichnet den Ring und die Zahl im Fenster. */
    _paintDial(ctx) {
      const minuten = Math.max(0, Math.min(60, ctx.nodes.minutes ?? 5));
      ctx.nodes.timerValue.textContent = String(minuten);
      ctx.nodes.timerUnit.textContent = minuten === 1 ? "Minute" : "Minuten";
      const anteil = minuten / 60;
      ctx.nodes.timerArc.setAttribute(
        "stroke-dashoffset",
        String(ctx.nodes.timerArcLength * (1 - anteil))
      );
    },
    update(ctx) {
      const timer = ctx.config.timer_entity ? ctx.hass?.states?.[ctx.config.timer_entity] : null;
      if (!ctx.config.timer_entity) renderers.clock._closeSheet(ctx);
      const laeuft = timer?.state === "active";
      ctx.nodes.timerCancel.hidden = !laeuft;
      ctx.nodes.timerButton.classList.toggle("is-active", laeuft);
      renderers.clock._paintRemaining(ctx);
      const wanted = ctx.config.show_seconds || laeuft ? 1e3 : 15e3;
      if (ctx.nodes.interval !== wanted) renderers.clock.reconnect(ctx);
    },
    reconnect(ctx) {
      if (!ctx.nodes.tick) return;
      clearInterval(ctx.nodes.timer);
      ctx.nodes.interval = ctx.config.show_seconds || ctx.hass?.states?.[ctx.config.timer_entity]?.state === "active" ? 1e3 : 15e3;
      ctx.nodes.tick();
      ctx.nodes.timer = setInterval(ctx.nodes.tick, ctx.nodes.interval);
    },
    disconnect(ctx) {
      clearInterval(ctx.nodes.timer);
      ctx.nodes.timer = null;
    }
  }
};
var HaOsCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._ctx = null;
    this._connected = false;
  }
  static getConfigElement() {
    return document.createElement(EDITOR_TAG3);
  }
  static getStubConfig() {
    return { type: `custom:${TAG2}`, card_type: "button", entity: "" };
  }
  setConfig(rawConfig) {
    const config = flattenLegacyGroups(rawConfig);
    if (!config?.card_type) throw new Error("Bitte oben einen Kartentyp auswählen.");
    if (!renderers[config.card_type]) throw new Error(`Unbekannter Kartentyp: ${config.card_type}`);
    const previous = this._config;
    this._config = config;
    const typeChanged = previous?.card_type !== config.card_type;
    if (typeChanged || !this._ctx) {
      this._build();
      return;
    }
    this._ctx.config = config;
    const sourceChanged = previous?.entity !== config.entity || previous?.state_entity !== config.state_entity || String(previous?.entities || "") !== String(config.entities || "") || previous?.days !== config.days;
    if (sourceChanged) {
      renderers[config.card_type].disconnect?.(this._ctx);
      ["forecastData", "forecastUnsub", "history", "historyLoaded", "events_data", "eventsLoaded"].forEach(
        (key) => delete this._ctx.nodes[key]
      );
      this._ctx.connected = false;
    }
    this._safeUpdate();
    if (sourceChanged && this._hass) {
      this._ctx.connected = true;
      renderers[config.card_type].connect?.(this._ctx);
    }
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._ctx) return;
    this._ctx.hass = hass;
    if (first || this._watchedChanged(hass)) this._safeUpdate();
    if (!this._ctx.connected) {
      this._ctx.connected = true;
      renderers[this._config.card_type].connect?.(this._ctx);
    }
  }
  get hass() {
    return this._hass;
  }
  /** Entitäten, auf die diese Karte tatsächlich reagieren muss. */
  _watchedEntities() {
    const config = this._config || {};
    const ids = [config.entity, config.state_entity, config.timer_entity, ...config.entities || []].filter(
      Boolean
    );
    if (config.card_type === "members" && !config.entities?.length) {
      return Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));
    }
    return ids;
  }
  _watchedChanged(hass) {
    const watched = this._watchedEntities();
    if (!watched.length) return false;
    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;
    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) {
      if (previous.get(id) !== state) return true;
    }
    return false;
  }
  connectedCallback() {
    this._connected = true;
    if (this._ctx) renderers[this._config?.card_type]?.reconnect?.(this._ctx);
  }
  disconnectedCallback() {
    this._connected = false;
    if (this._ctx) renderers[this._config?.card_type]?.disconnect?.(this._ctx);
  }
  getCardSize() {
    return 3;
  }
  _build() {
    if (this._ctx) renderers[this._ctx.type]?.disconnect?.(this._ctx);
    const style = document.createElement("style");
    style.textContent = STYLES3;
    const card = el3("div", "card");
    this._ctx = {
      host: this,
      card,
      config: this._config,
      hass: this._hass,
      nodes: {},
      type: this._config.card_type,
      connected: false
    };
    try {
      card.append(renderers[this._config.card_type].build(this._ctx));
    } catch (error) {
      card.replaceChildren(el3("div", "error", `Fehler beim Aufbau: ${error.message}`));
    }
    this.shadowRoot.replaceChildren(style, card);
    this._safeUpdate();
  }
  _safeUpdate() {
    if (!this._ctx || !this._hass) return;
    try {
      renderers[this._config.card_type].update(this._ctx);
    } catch (error) {
      console.error(`[${TAG2}] Update fehlgeschlagen`, error);
      return;
    }
    const statusId = this._config.state_entity || this._config.entity;
    const state = this._hass.states?.[statusId];
    this._ctx.card.classList.remove("is-on", "is-off", "is-unavailable");
    if (statusId) this._ctx.card.classList.add(statusClass(state));
  }
};
if (!customElements.get(TAG2)) customElements.define(TAG2, HaOsCard);
registerCard({
  type: TAG2,
  name: "HA-OS Karte",
  description: "Eine Karte für alle Typen – Button, Slider, Thermostat, Wetter, Energie, Medien und mehr.",
  preview: false
});

// src/cards/haos-card-editor.js
var EDITOR_TAG4 = "ha-os-card-editor";
var TYPE_FIELD = {
  name: "card_type",
  required: true,
  selector: { select: { mode: "dropdown", options: CARD_TYPES.map(({ value, label }) => ({ value, label })) } }
};
var entityField = (domains, multiple = false) => ({
  name: multiple ? "entities" : "entity",
  required: !multiple,
  selector: { entity: domains ? { domain: domains, multiple } : { multiple } }
});
var text = (name) => ({ name, selector: { text: {} } });
var bool = (name) => ({ name, selector: { boolean: {} } });
var number = (name, min, max, step = 1) => ({
  name,
  selector: { number: { min, max, step, mode: "box" } }
});
var APPEARANCE = {
  name: "darstellung",
  type: "expandable",
  flatten: true,
  iconPath: "M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5Z",
  schema: [text("name"), { name: "icon", selector: { icon: {} } }]
};
var ACTION = {
  name: "aktion",
  type: "expandable",
  flatten: true,
  schema: [{ name: "tap_action", selector: { ui_action: {} } }]
};
var SCHEMAS = {
  button: [
    entityField(),
    APPEARANCE,
    { name: "state_entity", selector: { entity: {} } },
    bool("show_state"),
    bool("show_toggle"),
    { name: "press_icon", selector: { icon: {} } },
    ACTION
  ],
  slider: [entityField(["light", "cover", "fan", "media_player", "number", "input_number"]), APPEARANCE],
  thermostat: [entityField(["climate"]), APPEARANCE],
  weather: [
    entityField(["weather"]),
    APPEARANCE,
    {
      name: "forecast_type",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "hourly", label: "Stündlich" },
            { value: "daily", label: "Täglich" }
          ]
        }
      }
    },
    number("forecast_count", 2, 10),
    bool("show_graph")
  ],
  energy: [entityField(["sensor"]), APPEARANCE, number("days", 2, 31)],
  media: [entityField(["media_player"]), APPEARANCE, bool("glow")],
  members: [entityField(["person", "device_tracker"], true), text("name")],
  calendar: [entityField(["calendar"], true), text("name"), number("days", 1, 31), number("max_events", 1, 20)],
  select: [
    entityField(["select", "input_select"]),
    APPEARANCE,
    {
      name: "display",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "dropdown", label: "Aufklappmenü" },
            { value: "buttons", label: "Optionsknöpfe" }
          ]
        }
      }
    }
  ],
  camera: [
    entityField(["camera"]),
    APPEARANCE,
    {
      name: "camera_mode",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "still", label: "Standbild" },
            { value: "live", label: "Livebild" }
          ]
        }
      }
    },
    number("refresh_interval", 1, 300),
    ACTION
  ],
  separator: [
    text("name"),
    { name: "icon", selector: { icon: {} } },
    {
      name: "align",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "left", label: "Links" },
            { value: "center", label: "Mittig" },
            { value: "right", label: "Rechts" }
          ]
        }
      }
    },
    bool("show_line")
  ],
  energy_list: [
    entityField(["sensor"], true),
    text("suffix"),
    text("unit"),
    number("max_rows", 0, 50),
    text("name")
  ],
  clock: [
    text("name"),
    { name: "timer_entity", selector: { entity: { domain: "timer" } } },
    text("sound"),
    number("sound_volume", 0, 100, 5),
    { name: "sound_player", selector: { entity: { domain: "media_player" } } },
    {
      name: "hour_format",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "24", label: "24 Stunden" },
            { value: "12", label: "12 Stunden" }
          ]
        }
      }
    },
    bool("show_seconds"),
    bool("show_date"),
    text("time_zone")
  ]
};
var LABELS2 = {
  card_type: "Kartentyp",
  entity: "Entität",
  entities: "Entitäten",
  name: "Name",
  icon: "Symbol",
  show_state: "Zustand anzeigen",
  show_toggle: "Bedienelement anzeigen",
  state_entity: "Zustand von anderer Entität",
  press_icon: "Symbol im Taster",
  tap_action: "Tippen",
  darstellung: "Darstellung",
  aktion: "Aktion",
  forecast_type: "Vorhersage",
  forecast_count: "Anzahl Vorhersagen",
  show_graph: "Verlaufskurve anzeigen",
  glow: "Farbschleier im Hintergrund",
  days: "Zeitraum in Tagen",
  max_events: "Maximale Termine",
  display: "Anzeigeart",
  hour_format: "Stundenformat",
  show_seconds: "Sekunden anzeigen",
  show_date: "Datum anzeigen",
  time_zone: "Zeitzone",
  timer_entity: "Kurzzeitwecker",
  sound: "Ton beim Ablaufen",
  sound_volume: "Lautstärke des Tons",
  sound_player: "Lautsprecher zum Abstellen",
  haos_weight: "Höhenfaktor",
  suffix: "Endung der Entitäts-ID",
  unit: "Einheit",
  max_rows: "Höchstens so viele Zeilen",
  align: "Ausrichtung",
  show_line: "Linie anzeigen",
  camera_mode: "Bildart",
  refresh_interval: "Auffrischung in Sekunden"
};
var HELPERS2 = {
  haos_weight: "1 entspricht der Standard-Kartenhöhe der Shell. 2 ist doppelt so hoch, 0,4 knapp die Hälfte — für flache Fremdkarten.",
  suffix: "Grenzt die automatische Auswahl ein, etwa _today für die Tageswerte. Ohne sie stehen Tages-, Gestern- und Gesamtwerte desselben Geräts nebeneinander in der Liste.",
  max_rows: "0 zeigt alle. Der Rest wird als „x weitere“ in der Summe genannt.",
  show_line: "Ausschalten für eine reine Überschrift ohne Strich.",
  align: "Mittig setzt die Linie auf beide Seiten. Ein Höhenfaktor um 0,3 passt gut – ein Trenner braucht keine volle Kartenhöhe.",
  camera_mode: "Standbild holt in festem Takt ein einzelnes Bild und schont die Leitung. Livebild überträgt dauerhaft – auf einem Wandtablet mit mehreren Kameras spürbar. Tippen öffnet in beiden Fällen den großen Kameradialog.",
  refresh_interval: "Nur beim Standbild. Wie oft ein neues Bild geholt wird.",
  sound: "Pfad zu einer Tondatei in dieser Installation, etwa /local/gong.mp3. Der Ton kommt aus dem Gerät, das gerade hinsieht — für eine verlässliche Ansage besser eine Automation auf timer.finished.",
  sound_volume: "0 bis 100. Standard ist 80.",
  sound_player: "Spielt eine Automation den Ton über einen Lautsprecher, lässt er sich mit dem Knopf in der Karte abstellen. Derselbe Lautsprecher wie im Blueprint.",
  timer_entity: "Ein Timer-Helfer aus Home Assistant. Ohne ihn erscheint kein Weckersymbol. Anlegen unter Einstellungen → Geräte & Dienste → Helfer → Timer.",
  time_zone: "Leer lassen für die Zeitzone des Browsers, z. B. Europe/Berlin.",
  days: "Zeitraum, der geladen wird.",
  show_graph: "Temperaturverlauf über der Vorhersagezeile. Standardmäßig an.",
  glow: "Weiche Farbflächen hinter dem Glas, gefärbt aus dem Titelbild. Standardmäßig an.",
  press_icon: "Nur bei Tasten, Szenen und Skripten. Standard ist ein Finger.",
  show_toggle: "Die Form richtet sich nach der Entität: Umschalter, Taster oder Auf/Stopp/Zu.",
  state_entity: "Leer lassen, wenn die Entität selbst einen Zustand hat. Tasten (button) haben keinen – hier dann den Sensor eintragen, der den echten Zustand meldet, z. B. den Türkontakt."
};
var HaOsCardEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._form = null;
  }
  setConfig(config) {
    const next = { card_type: "button", ...flattenLegacyGroups(config) };
    if (isEqualConfig(next, this._config) && this._form) return;
    const typeChanged = next.card_type !== this._config?.card_type;
    this._config = next;
    if (!this._form) {
      this._build();
      return;
    }
    if (typeChanged) this._form.schema = this._schema();
    this._form.data = this._config;
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  get hass() {
    return this._hass;
  }
  _schema() {
    return [TYPE_FIELD, ...SCHEMAS[this._config.card_type] || [], { name: "haos_weight", selector: { number: { min: 0.1, max: 6, step: 0.05, mode: "box" } } }];
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      .hint { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
    `;
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Zuerst den Kartentyp wählen – darunter erscheinen nur die passenden Felder.";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema();
    form.computeLabel = (field) => LABELS2[field.name] || field.name;
    form.computeHelper = (field) => HELPERS2[field.name] || "";
    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      const value = { ...event.detail.value };
      if (value.card_type !== this._config.card_type) {
        const keep = /* @__PURE__ */ new Set(["type", "card_type", "haos_weight"]);
        Object.keys(value).forEach((key) => {
          if (!keep.has(key)) delete value[key];
        });
      }
      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === void 0) delete value[key];
      });
      this._config = value;
      this._form.schema = this._schema();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
    });
    this._form = form;
    this.shadowRoot.replaceChildren(style, hint, form);
  }
};
if (!customElements.get(EDITOR_TAG4)) customElements.define(EDITOR_TAG4, HaOsCardEditor);

// src/cards/grid-card.js
var TAG3 = "ha-os-grid";
var EDITOR_TAG5 = "ha-os-grid-editor";
var SLOTS = 4;
var STYLES4 = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }

  .grid {
    height: 100%; display: grid; grid-template-rows: 1fr 1fr;
    padding: var(--haos-grid-padding, 0);
  }
  .grid.framed {
    padding: var(--haos-grid-padding, 12px);
    color: var(--haos-text, #fff);
    ${CARD_SURFACE_CSS}
  }

  .slot { min-width: 0; min-height: 0; display: block; }
  .slot > * { height: 100%; }

  .empty {
    display: grid; place-items: center; gap: 6px; height: 100%;
    border: 1px dashed rgba(var(--haos-text-rgb, 255,255,255), .28);
    border-radius: var(--haos-entity-radius, 14px);
    color: rgba(var(--haos-text-rgb, 255,255,255), .5);
    font-size: 12px; text-align: center; padding: 8px;
  }

  @media (max-width: 600px) {
    /* Zwei Spalten sind auf dem Telefon zu schmal – dort untereinander. */
    .grid.responsive { grid-template-columns: 1fr !important; grid-template-rows: repeat(4, 1fr); }
  }
`;
var clampRatio = (value, fallback) => {
  const number2 = Number(value);
  return Number.isFinite(number2) && number2 > 0 ? number2 : fallback;
};
var HaOsGridCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._slots = [];
    this._elements = [];
    this._configs = [];
  }
  static getConfigElement() {
    return document.createElement(EDITOR_TAG5);
  }
  static getStubConfig() {
    return { type: `custom:${TAG3}`, column_widths: [1, 1], gap: 12, cards: [] };
  }
  setConfig(config) {
    this._config = {
      column_widths: [1, 1],
      gap: 12,
      framed: false,
      responsive: true,
      cards: [],
      ...config
    };
    if (!this._grid) this._build();
    this._applyLayout();
    this._syncCards();
  }
  set hass(hass) {
    this._hass = hass;
    this._elements.forEach((element) => {
      if (element) element.hass = hass;
    });
  }
  get hass() {
    return this._hass;
  }
  getCardSize() {
    return 6;
  }
  getGridOptions() {
    return { columns: "full", rows: 8, min_columns: 6 };
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES4;
    this._grid = document.createElement("div");
    this._grid.className = "grid";
    this._slots = Array.from({ length: SLOTS }, () => {
      const slot = document.createElement("div");
      slot.className = "slot";
      this._grid.append(slot);
      return slot;
    });
    this.shadowRoot.replaceChildren(style, this._grid);
  }
  _applyLayout() {
    const [left, right] = this._config.column_widths || [1, 1];
    this._grid.style.gridTemplateColumns = `${clampRatio(left, 1)}fr ${clampRatio(right, 1)}fr`;
    this._grid.style.gap = `${clampRatio(this._config.gap, 12)}px`;
    this._grid.classList.toggle("framed", this._config.framed === true);
    this._grid.classList.toggle("responsive", this._config.responsive !== false);
  }
  async _syncCards() {
    const wanted = this._config.cards || [];
    for (let index = 0; index < SLOTS; index += 1) {
      const config = wanted[index];
      const slot = this._slots[index];
      if (!config || !config.type) {
        if (this._elements[index]) {
          this._elements[index] = null;
          this._configs[index] = null;
          slot.replaceChildren(this._placeholder(index));
        } else if (!slot.firstElementChild) {
          slot.replaceChildren(this._placeholder(index));
        }
        continue;
      }
      if (this._elements[index] && isEqualConfig(this._configs[index], config)) continue;
      const element = await createCardElement(config);
      if (this._hass) element.hass = this._hass;
      this._elements[index] = element;
      this._configs[index] = config;
      slot.replaceChildren(element);
    }
  }
  _placeholder(index) {
    const node = document.createElement("div");
    node.className = "empty";
    node.textContent = `Platz ${index + 1} – im Editor eine Karte wählen`;
    return node;
  }
};
if (!customElements.get(TAG3)) customElements.define(TAG3, HaOsGridCard);
registerCard({
  type: TAG3,
  name: "HA-OS 2×2-Raster",
  description: "Vier Plätze in zwei Spalten und zwei Reihen, jeder frei mit einer beliebigen Karte belegbar.",
  preview: false
});

// src/cards/grid-editor.js
var STYLES5 = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button { font: inherit; cursor: pointer; }

  .wrap { display: grid; gap: 12px; }
  .hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }

  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { display: grid; gap: 5px; }
  .field > label { font-size: 12px; color: var(--secondary-text-color); }
  input.plain {
    width: 100%; padding: 9px 10px; font: inherit; color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(127,127,127,.08));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 8px;
  }
  .toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; }

  /* Nummerierte Reiter für die Plätze – wie in HAs eigener Raster-Karte.
     Alle vier Editoren untereinander waren unübersichtlich. */
  .slot-tabs {
    display: flex; align-items: center; gap: 2px;
    border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.3));
    margin-bottom: 10px;
  }
  .slot-tab {
    min-width: 40px; height: 40px; padding: 0 10px; border: 0; background: none;
    color: var(--secondary-text-color); font-size: 14px;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  }
  .slot-tab:hover { color: var(--primary-text-color); }
  .slot-tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
  .slot-tab .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-color); opacity: .55; }
  .slot-tab.empty .dot { background: var(--secondary-text-color); opacity: .3; }

  .slot { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; overflow: hidden; }
  .slot > header {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: var(--secondary-background-color, rgba(127,127,127,.08));
  }
  .slot > header .label { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slot > header .pos { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
  .slot > .body { padding: 10px; }
  .slot > .body[hidden] { display: none; }

  .mini { width: 32px; height: 32px; flex: 0 0 32px; border: 0; border-radius: 8px; background: none; color: var(--secondary-text-color); display: grid; place-items: center; }
  .mini:hover { background: rgba(127,127,127,.16); color: var(--primary-text-color); }
  .mini.danger:hover { color: var(--error-color, #db4437); }
  .mini ha-icon { --mdc-icon-size: 18px; }

  .choose {
    width: 100%; padding: 12px; border: 1px dashed var(--divider-color, rgba(127,127,127,.4));
    border-radius: 10px; background: none; color: var(--primary-color);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .choose:hover { background: rgba(127,127,127,.08); }

  /* Umschalter auf den Code-Editor – wie in HAs eigenem Kartendialog unten. */
  .linkish {
    margin-top: 10px; padding: 6px 0; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 13px; color: var(--primary-color);
  }

  .picker { display: grid; gap: 8px; }
  .picker-list {
    max-height: 300px; overflow-y: auto; display: grid; gap: 4px;
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; padding: 6px;
  }
  .picker-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    border: 0; border-radius: 8px; background: none; color: var(--primary-text-color); text-align: left;
  }
  .picker-item:hover { background: rgba(127,127,127,.14); }
  .picker-item ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: 0 0 20px; }
  .picker-item .pi-name { font-size: 13px; font-weight: 600; }
  .picker-item .pi-desc { font-size: 11px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-item .pi-tag { margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(127,127,127,.18); color: var(--secondary-text-color); }

  .empty { padding: 12px; text-align: center; font-size: 12px; color: var(--secondary-text-color); }
`;
var el4 = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var icon3 = (name) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", name);
  return node;
};
var miniButton2 = (symbol, title, onClick, className = "mini") => {
  const node = el4("button", className);
  node.title = title;
  node.setAttribute("aria-label", title);
  node.append(icon3(symbol));
  node.addEventListener("click", onClick);
  return node;
};
var labelFor = (card) => {
  if (!card?.type) return "Leer";
  const entry = cardCatalog().find((item) => item.type === card.type);
  return entry ? entry.name : card.type;
};
var HaOsGridEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._tab = 0;
    this._picking = null;
  }
  setConfig(config) {
    const next = {
      column_widths: [1, 1],
      gap: 12,
      framed: false,
      responsive: true,
      cards: [],
      ...config
    };
    if (isEqualConfig(next, this._config) && this._root) return;
    this._config = next;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._root && this._config) this._render();
  }
  get hass() {
    return this._hass;
  }
  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  /** @param structural true, wenn sich der Aufbau ändert und neu gezeichnet werden muss. */
  _mutate(change, structural = false) {
    const draft = deepClone(this._config);
    change(draft);
    this._config = draft;
    this._emit();
    if (structural) this._render();
  }
  _render() {
    if (!this._root) {
      const style = document.createElement("style");
      style.textContent = STYLES5;
      this._root = el4("div", "wrap");
      this.shadowRoot.replaceChildren(style, this._root);
    }
    this._root.replaceChildren();
    this._root.append(
      el4(
        "p",
        "hint",
        "Vier Plätze in zwei Spalten und zwei Reihen. In jeden Platz passt jede installierte Karte."
      )
    );
    const row = el4("div", "row2");
    row.append(
      this._numberField(
        "Breite linke Spalte",
        this._config.column_widths?.[0] ?? 1,
        (value) => this._mutate((draft) => {
          draft.column_widths = [value, draft.column_widths?.[1] ?? 1];
        })
      ),
      this._numberField(
        "Breite rechte Spalte",
        this._config.column_widths?.[1] ?? 1,
        (value) => this._mutate((draft) => {
          draft.column_widths = [draft.column_widths?.[0] ?? 1, value];
        })
      )
    );
    this._root.append(row);
    this._root.append(
      this._numberField(
        "Abstand in px",
        this._config.gap ?? 12,
        (value) => this._mutate((draft) => {
          draft.gap = value;
        }),
        0,
        60,
        1
      )
    );
    this._root.append(
      this._switchField(
        "Eigene Glasfläche um das Raster",
        this._config.framed === true,
        (checked) => this._mutate((draft) => {
          draft.framed = checked;
        })
      ),
      this._switchField(
        "Auf dem Telefon untereinander",
        this._config.responsive !== false,
        (checked) => this._mutate((draft) => {
          draft.responsive = checked;
        })
      )
    );
    if (this._tab == null || this._tab >= SLOTS) this._tab = 0;
    const tabs = el4("div", "slot-tabs");
    for (let index = 0; index < SLOTS; index += 1) {
      const belegt = Boolean(this._config.cards?.[index]?.type);
      const tab = el4("button", `slot-tab${index === this._tab ? " active" : ""}${belegt ? "" : " empty"}`);
      tab.append(el4("span", null, String(index + 1)), el4("span", "dot"));
      tab.title = belegt ? labelFor(this._config.cards[index]) : "Leer";
      tab.addEventListener("click", () => {
        this._tab = index;
        this._picking = null;
        this._open = null;
        this._render();
      });
      tabs.append(tab);
    }
    this._root.append(tabs);
    this._root.append(this._slotBlock(this._tab));
  }
  _numberField(label, value, onChange, min = 0.25, max = 6, step = 0.25) {
    const field = el4("div", "field");
    field.append(el4("label", null, label));
    const input = el4("input", "plain");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = value;
    input.addEventListener("change", () => onChange(Number(input.value)));
    field.append(input);
    return field;
  }
  _switchField(label, checked, onChange) {
    const wrap = el4("label", "toggle");
    const box = document.createElement("ha-switch");
    box.checked = checked;
    box.addEventListener("change", () => onChange(box.checked));
    wrap.append(box, el4("span", null, label));
    return wrap;
  }
  _slotBlock(index) {
    const card = this._config.cards?.[index];
    const block = el4("div", "slot");
    const header = document.createElement("header");
    header.append(
      el4("span", "label", labelFor(card)),
      el4("span", "pos", `Platz ${index + 1}`)
    );
    if (card?.type) {
      header.append(
        miniButton2("mdi:swap-horizontal", "Andere Karte wählen", () => {
          this._picking = this._picking === index ? null : index;
          this._render();
        }),
        miniButton2(
          "mdi:delete-outline",
          "Karte entfernen",
          () => this._mutate((draft) => {
            draft.cards = draft.cards || [];
            draft.cards[index] = null;
            while (draft.cards.length && draft.cards[draft.cards.length - 1] == null) draft.cards.pop();
          }, true),
          "mini danger"
        )
      );
    }
    block.append(header);
    const body = el4("div", "body");
    if (this._picking === index) {
      body.append(this._picker(index));
    } else if (!card?.type) {
      const choose = el4("button", "choose");
      choose.append(icon3("mdi:plus"), el4("span", null, "Karte wählen"));
      choose.addEventListener("click", () => {
        this._picking = index;
        this._render();
      });
      body.append(choose);
    } else {
      body.append(this._cardEditor(index, card));
    }
    block.append(body);
    return block;
  }
  _picker(index) {
    const wrap = el4("div", "picker");
    const search = el4("input", "plain");
    search.type = "search";
    search.placeholder = "Karte suchen …";
    const list = el4("div", "picker-list");
    const entries = cardCatalog();
    const fill = (term) => {
      const needle = term.trim().toLowerCase();
      const hits = entries.filter(
        (entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.type.toLowerCase().includes(needle) || entry.description.toLowerCase().includes(needle)
      );
      list.replaceChildren();
      if (!hits.length) {
        list.append(el4("div", "empty", "Keine Karte gefunden."));
        return;
      }
      hits.forEach((entry) => {
        const item = el4("button", "picker-item");
        const text2 = el4("div");
        text2.append(el4("div", "pi-name", entry.name), el4("div", "pi-desc", entry.description || entry.type));
        item.append(icon3(entry.icon), text2);
        if (entry.custom) item.append(el4("span", "pi-tag", "installiert"));
        item.addEventListener("click", async () => {
          const stub = await stubConfigFor(entry.type);
          this._picking = null;
          this._mutate((draft) => {
            draft.cards = draft.cards || [];
            while (draft.cards.length < index) draft.cards.push(null);
            draft.cards[index] = stub;
          }, true);
        });
        list.append(item);
      });
    };
    search.addEventListener("input", () => fill(search.value));
    fill("");
    wrap.append(search, list);
    return wrap;
  }
  _cardEditor(index, card) {
    const write = (next) => this._mutate((draft) => {
      draft.cards[index] = next;
    });
    this._codeMode = this._codeMode || /* @__PURE__ */ new Set();
    return createCardEditorWithCode({
      hass: this._hass,
      value: card,
      onChange: write,
      codeMode: this._codeMode.has(index),
      onToggleCode: () => {
        if (this._codeMode.has(index)) this._codeMode.delete(index);
        else this._codeMode.add(index);
        this._render();
      },
      el: el4
    });
  }
};
if (!customElements.get(EDITOR_TAG5)) customElements.define(EDITOR_TAG5, HaOsGridEditor);

// src/cards/vehicle-card.js
var TAG4 = "ha-os-vehicle";
var EDITOR_TAG6 = "ha-os-vehicle-editor";
var DERIVED = {
  range: "sensor.{id}_range_liquid",
  fuel: "sensor.{id}_fuel_level",
  odometer: "sensor.{id}_odometer",
  lock: "sensor.{id}_lock",
  ignition: "sensor.{id}_ignition_state",
  windows: "binary_sensor.{id}_windows_closed",
  battery: "sensor.{id}_starter_battery_state",
  oil: "sensor.{id}_oil_level",
  tire_warning: "binary_sensor.{id}_tire_warning",
  tire_state: "sensor.{id}_tires_rdk_state",
  tire_front_left: "sensor.{id}_tire_pressure_front_left",
  tire_front_right: "sensor.{id}_tire_pressure_front_right",
  tire_rear_left: "sensor.{id}_tire_pressure_rear_left",
  tire_rear_right: "sensor.{id}_tire_pressure_rear_right",
  park_brake: "binary_sensor.{id}_park_brake_status",
  window_front_left: "sensor.{id}_window_status_front_left",
  window_front_right: "sensor.{id}_window_status_front_right",
  window_rear_left: "sensor.{id}_window_status_rear_left",
  window_rear_right: "sensor.{id}_window_status_rear_right",
  distance_start: "sensor.{id}_distance_start",
  distance_reset: "sensor.{id}_distance_reset",
  speed_start: "sensor.{id}_average_speed_start",
  speed_reset: "sensor.{id}_average_speed_reset",
  consumption_start: "sensor.{id}_liquid_consumption_start",
  consumption_reset: "sensor.{id}_liquid_consumption_reset",
  eco_acceleration: "sensor.{id}_eco_score_acceleration",
  eco_constant: "sensor.{id}_eco_score_constant",
  eco_free_wheel: "sensor.{id}_eco_score_free_wheel",
  eco_bonus_range: "sensor.{id}_eco_score_bonus_range"
};
var WARNINGS = [
  ["binary_sensor.{id}_engine_light_warning", "Motorkontrollleuchte"],
  ["binary_sensor.{id}_low_brake_fluid_warning", "Bremsflüssigkeit"],
  ["binary_sensor.{id}_low_coolant_level_warning", "Kühlmittel"],
  ["binary_sensor.{id}_low_wash_water_warning", "Wischwasser"]
];
var vehicleId = (entityId) => String(entityId || "").split(".")[1]?.split("_")[0] || "";
var resolveEntity = (config, key, hass) => {
  if (config?.[`entity_${key}`]) return config[`entity_${key}`];
  const id = vehicleId(config?.entity);
  if (!id || !DERIVED[key]) return "";
  const guess = DERIVED[key].replace("{id}", id);
  if (!hass?.states || hass.states[guess]) return guess;
  const [domain, objectId] = guess.split(".");
  const tail = `_${objectId}`;
  const found = Object.keys(hass.states).find(
    (candidate) => candidate.startsWith(`${domain}.`) && candidate.endsWith(tail)
  );
  return found || guess;
};
var el5 = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var icon4 = (name) => {
  const node = document.createElement("ha-icon");
  node.icon = name;
  return node;
};
var SECTIONS = [
  ["overview", "mdi:car", "Übersicht"],
  ["trip", "mdi:map-marker-path", "Fahrt"],
  ["status", "mdi:shield-check", "Status"],
  ["tires", "mdi:car-tire-alert", "Reifen"],
  ["eco", "mdi:leaf", "Eco"]
];
var STYLES6 = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }

  .card {
    height: 100%; padding: 10px; display: flex; gap: 10px; overflow: hidden;
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    ${CARD_SURFACE_CSS}
  }

  /* --- Symbolleiste links, Vorbild CarPlay --- */
  /* Die inneren Flaechen sind selbst Glas, nicht nur eingefaerbte Rechtecke.
     Dadurch nehmen sie Unschaerfe und Glanz aus den Einstellungen an - vorher
     war das hier eine flache Fuellung, die neben der Shell tot wirkte. */
  .rail {
    width: 56px; flex: 0 0 56px; padding: 8px 0;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
  }
  .rail button {
    width: 38px; height: 38px; border-radius: 11px; border: 0; padding: 0;
    display: grid; place-items: center; cursor: pointer;
    background: none; color: rgba(var(--haos-text-rgb, 255,255,255), .45);
    transition: background .16s ease, color .16s ease;
  }
  /* Der aktive Bereich sitzt als Glasflaeche in der Leiste - dieselbe
     Sprache wie die Knoepfe in den Karten. */
  .rail button.active {
    color: var(--haos-text, #fff);
    ${CONTROL_SURFACE_CSS}
  }
  .rail button[disabled] { opacity: .3; cursor: default; }
  .rail ha-icon { --mdc-icon-size: 19px; }

  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }

  /* --- Kopfzeile --- */
  .head { display: flex; align-items: center; gap: 8px; }
  .head-text { flex: 1; min-width: 0; }
  .title { font-size: 15px; font-weight: var(--haos-font-weight-medium, 500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .subtitle { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill {
    display: flex; align-items: center; gap: 5px; flex: 0 0 auto;
    padding: 5px 10px; font-size: 12px;
    color: rgba(var(--haos-text-rgb, 255,255,255), .85);
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
    border-radius: 999px;
  }
  .pill[hidden] { display: none; }
  .pill.good { color: var(--haos-good, #7ee0b0); }
  .pill.bad { color: var(--haos-bad, #ff6b6b); }
  .pill ha-icon { --mdc-icon-size: 14px; }

  /* --- Reichweite --- */
  .hero {
    padding: 14px; display: flex; align-items: center; gap: 16px;
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
  }
  .hero-main { flex: 1; min-width: 0; }
  .hero-label { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .hero-value { font-size: 30px; font-weight: var(--haos-font-weight-medium, 500); line-height: 1.15; }
  .bar { height: 6px; border-radius: 99px; margin-top: 10px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .14); }
  .bar span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .3s ease; }
  .hero-foot { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin-top: 5px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .hero-image {
    width: 132px; flex: 0 0 132px; height: 74px; border-radius: 11px;
    display: grid; place-items: center; overflow: hidden;
    background: rgba(var(--haos-text-rgb, 255,255,255), .07);
    color: rgba(var(--haos-text-rgb, 255,255,255), .35);
  }
  .hero-image img { width: 100%; height: 100%; object-fit: contain; }
  .hero-image ha-icon { --mdc-icon-size: 40px; }

  /* --- Kacheln --- */
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .tile { padding: 10px; min-width: 0; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .tile-label { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-value { font-size: 14px; font-weight: var(--haos-font-weight-medium, 500); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-value.good { color: var(--haos-good, #7ee0b0); }
  .tile-value.bad { color: var(--haos-bad, #ff6b6b); }

  /* --- Tafeln --- */
  .panel { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; scrollbar-width: none; }
  .panel::-webkit-scrollbar { display: none; }
  .panel[hidden] { display: none; }
  .panel.rows { gap: 0; }
  .panel-note { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  .row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 7px 2px; font-size: 13px;
    border-bottom: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .07);
  }
  .row:last-child { border-bottom: 0; }
  .row-label { color: rgba(var(--haos-text-rgb, 255,255,255), .6); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-value { font-weight: var(--haos-font-weight-medium, 500); flex: 0 0 auto; }
  .row-value.good { color: var(--haos-good, #7ee0b0); }
  .row-value.bad { color: var(--haos-bad, #ff6b6b); }

  /* Reifen im Grundriss: vorn oben, hinten unten. */
  .tire-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tire {
    padding: 10px; display: grid; place-content: center; text-align: center;
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
  }
  .tire-value { font-size: 19px; font-weight: var(--haos-font-weight-medium, 500); }
  .tire-value.bad { color: var(--haos-bad, #ff6b6b); }
  .tire-label { font-size: 11px; margin-top: 2px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  .trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .trip-col { min-width: 0; }
  .trip-head {
    font-size: 11px; padding-bottom: 6px; text-transform: uppercase; letter-spacing: .06em;
    color: rgba(var(--haos-text-rgb, 255,255,255), .45);
  }

  .eco-item { display: flex; flex-direction: column; gap: 6px; }
  .eco-head { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: rgba(var(--haos-text-rgb, 255,255,255), .7); }
  .eco-value { font-weight: var(--haos-font-weight-medium, 500); color: var(--haos-text, #fff); }

  .placeholder { flex: 1; display: grid; place-content: center; text-align: center; gap: 6px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .error { display: grid; place-content: center; height: 100%; text-align: center; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
`;
var numberOf = (state) => {
  if (!state || state.state === "unknown" || state.state === "unavailable" || state.state === "") return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
};
var unitOf = (state) => state?.attributes?.unit_of_measurement || "";
var isLocked = (state) => {
  const value = String(state?.state ?? "").toLowerCase();
  if (value === "1" || value === "2") return true;
  if (value === "0" || value === "3") return false;
  return value === "locked" || value === "lock" || value === "on";
};
var windowLabel = (state) => {
  if (!state || ["unavailable", "unknown", ""].includes(String(state.state))) return { text: "–", tone: "" };
  const value = String(state.state).toLowerCase();
  if (value === "2" || value === "closed" || value === "off") return { text: "geschlossen", tone: "good" };
  if (value === "1" || value === "open" || value === "on") return { text: "offen", tone: "bad" };
  if (value === "0") return { text: "keine Meldung", tone: "" };
  if (value === "3" || value === "4") return { text: "Lüftungsstellung", tone: "bad" };
  return { text: state.state, tone: "" };
};
var windowSummary = (values) => {
  const known = values.filter((value) => value !== null && value !== void 0);
  if (!known.length) return null;
  const open = known.filter((value) => ["1", "3", "4", "open", "on"].includes(String(value).toLowerCase()));
  if (open.length) return { text: open.length === 1 ? "Fenster offen" : `${open.length} Fenster offen`, tone: "bad" };
  const silent = known.filter((value) => String(value) === "0");
  if (silent.length) return { text: "Fenster unklar", tone: "" };
  return { text: "Fenster zu", tone: "good" };
};
var formatNumber = (value, digits = 0) => value === null ? "–" : value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
var HaOsVehicleCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._nodes = null;
    this._section = "overview";
    this._lastStates = null;
  }
  static getConfigElement() {
    return document.createElement(EDITOR_TAG6);
  }
  static getStubConfig() {
    return { type: `custom:${TAG4}`, entity: "" };
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Ungültige Konfiguration.");
    this._config = { ...config };
    if (!this._nodes) this._build();
    this._update();
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first || this._watchedChanged(hass)) this._update();
  }
  getCardSize() {
    return 4;
  }
  getGridOptions() {
    return { columns: "full", min_rows: 3 };
  }
  _watchedEntities() {
    const keys = Object.keys(DERIVED).map((key) => resolveEntity(this._config, key, this._hass));
    const id = vehicleId(this._config?.entity);
    const warnings = id ? WARNINGS.map(([pattern]) => pattern.replace("{id}", id)) : [];
    return [...keys, ...warnings].filter(Boolean);
  }
  _watchedChanged(hass) {
    const watched = this._watchedEntities();
    if (!watched.length) return false;
    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;
    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) if (previous.get(id) !== state) return true;
    return false;
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES6;
    const card = el5("div", "card");
    const rail = el5("div", "rail");
    const buttons = /* @__PURE__ */ new Map();
    SECTIONS.forEach(([key, iconName, label]) => {
      const button = el5("button");
      button.append(icon4(iconName));
      button.title = label;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        this._section = key;
        this._update();
      });
      buttons.set(key, button);
      rail.append(button);
    });
    const main = el5("div", "main");
    const head = el5("div", "head");
    const headText = el5("div", "head-text");
    const title = el5("div", "title");
    const subtitle = el5("div", "subtitle");
    headText.append(title, subtitle);
    const lockPill = el5("div", "pill");
    const lockIcon = icon4("mdi:lock");
    const lockText = el5("span");
    lockPill.append(lockIcon, lockText);
    const windowPill = el5("div", "pill");
    const windowIcon = icon4("mdi:car-door");
    const windowText = el5("span");
    windowPill.append(windowIcon, windowText);
    head.append(headText, lockPill, windowPill);
    const hero = el5("div", "hero");
    const heroMain = el5("div", "hero-main");
    const heroLabel = el5("div", "hero-label", "Reichweite");
    const heroValue = el5("div", "hero-value", "–");
    const bar = el5("div", "bar");
    const barFill = el5("span");
    bar.append(barFill);
    const heroFoot = el5("div", "hero-foot");
    const footLeft = el5("span");
    const footRight = el5("span");
    heroFoot.append(footLeft, footRight);
    heroMain.append(heroLabel, heroValue, bar, heroFoot);
    const heroImage = el5("div", "hero-image");
    heroImage.append(icon4("mdi:car-side"));
    hero.append(heroMain, heroImage);
    const tiles = el5("div", "tiles");
    const tileNodes = ["tires", "oil", "warnings", "battery"].map((key) => {
      const tile = el5("div", "tile");
      const label = el5("div", "tile-label");
      const value = el5("div", "tile-value");
      tile.append(label, value);
      tiles.append(tile);
      return { key, tile, label, value };
    });
    const overview = el5("div", "panel");
    overview.append(hero, tiles);
    const rows = {};
    const rowPanel = (entries) => {
      const panel = el5("div", "panel rows");
      entries.forEach(([key, label]) => {
        const row = el5("div", "row");
        const name = el5("span", "row-label", label);
        const value = el5("span", "row-value", "–");
        row.append(name, value);
        panel.append(row);
        rows[key] = { row, value };
      });
      return panel;
    };
    const status = rowPanel([
      ["st_lock", "Verriegelung"],
      ["st_ignition", "Zündung"],
      ["st_park_brake", "Parkbremse"],
      ["st_battery", "Starterbatterie"],
      ["st_window_front_left", "Fenster vorn links"],
      ["st_window_front_right", "Fenster vorn rechts"],
      ["st_window_rear_left", "Fenster hinten links"],
      ["st_window_rear_right", "Fenster hinten rechts"],
      ["st_engine", "Motorkontrollleuchte"],
      ["st_brake_fluid", "Bremsflüssigkeit"],
      ["st_coolant", "Kühlmittel"],
      ["st_wash_water", "Wischwasser"]
    ]);
    const tires = el5("div", "panel");
    const tireGrid = el5("div", "tire-grid");
    const tireNodes = {};
    [
      ["tire_front_left", "vorn links"],
      ["tire_front_right", "vorn rechts"],
      ["tire_rear_left", "hinten links"],
      ["tire_rear_right", "hinten rechts"]
    ].forEach(([key, label]) => {
      const box = el5("div", "tire");
      const value = el5("div", "tire-value", "–");
      box.append(value, el5("div", "tire-label", label));
      tireGrid.append(box);
      tireNodes[key] = value;
    });
    const tireNote = el5("div", "panel-note");
    tires.append(tireGrid, tireNote);
    const trip = el5("div", "panel");
    const tripGrid = el5("div", "trip-grid");
    const tripNodes = {};
    [
      ["start", "Seit Start"],
      ["reset", "Seit Zurücksetzen"]
    ].forEach(([scope, heading]) => {
      const column = el5("div", "trip-col");
      column.append(el5("div", "trip-head", heading));
      [
        ["distance", "Strecke"],
        ["speed", "Ø Tempo"],
        ["consumption", "Verbrauch"]
      ].forEach(([what, label]) => {
        const row = el5("div", "row");
        row.append(el5("span", "row-label", label));
        const value = el5("span", "row-value", "–");
        row.append(value);
        column.append(row);
        tripNodes[`${what}_${scope}`] = value;
      });
      tripGrid.append(column);
    });
    trip.append(tripGrid);
    const eco = el5("div", "panel");
    const ecoNodes = {};
    [
      ["eco_acceleration", "Beschleunigung"],
      ["eco_constant", "Gleichmäßigkeit"],
      ["eco_free_wheel", "Ausrollen"]
    ].forEach(([key, label]) => {
      const item = el5("div", "eco-item");
      const head2 = el5("div", "eco-head");
      const value = el5("span", "eco-value", "–");
      head2.append(el5("span", null, label), value);
      const bar2 = el5("div", "bar");
      const fill = el5("span");
      bar2.append(fill);
      item.append(head2, bar2);
      eco.append(item);
      ecoNodes[key] = { value, fill };
    });
    const ecoBonus = el5("div", "panel-note");
    eco.append(ecoBonus);
    const panels = { overview, trip, status, tires, eco };
    Object.values(panels).forEach((panel) => main.append(panel));
    main.prepend(head);
    card.append(rail, main);
    this._nodes = {
      card,
      rail,
      buttons,
      title,
      subtitle,
      lockPill,
      lockIcon,
      lockText,
      windowPill,
      windowIcon,
      windowText,
      heroValue,
      barFill,
      footLeft,
      footRight,
      heroImage,
      tiles: tileNodes,
      panels,
      rows,
      tireNodes,
      tireNote,
      tripNodes,
      ecoNodes,
      ecoBonus
    };
    this.shadowRoot.replaceChildren(style, card);
  }
  _update() {
    if (!this._nodes) return;
    const nodes = this._nodes;
    const config = this._config || {};
    const hass = this._hass;
    nodes.buttons.forEach((button, key) => button.classList.toggle("active", key === this._section));
    Object.entries(nodes.panels).forEach(([key, panel]) => {
      panel.hidden = key !== this._section;
    });
    const stateOf = (key) => hass?.states?.[resolveEntity(config, key, hass)];
    const carState = hass?.states?.[config.entity];
    const id = vehicleId(config.entity);
    const carName = hass?.states?.[`sensor.${id}_car`]?.attributes?.friendly_name;
    nodes.title.textContent = config.name || carName || (id ? id.toUpperCase() : "Fahrzeug");
    if (!config.entity) {
      nodes.subtitle.textContent = "Im Editor eine Fahrzeug-Entität wählen";
      return;
    }
    const ignition = stateOf("ignition");
    const ignitionOn = !["0", "off", "aus", "unknown", "unavailable"].includes(String(ignition?.state ?? "").toLowerCase());
    const parts = [];
    if (ignition && ignition.state !== "unavailable") parts.push(ignitionOn ? "Zündung an" : "Zündung aus");
    const changed = carState?.last_changed || ignition?.last_changed;
    if (changed) parts.push(relativeTime(changed));
    nodes.subtitle.textContent = parts.join(" · ");
    const lock = stateOf("lock");
    if (lock && lock.state !== "unavailable") {
      const locked = isLocked(lock);
      nodes.lockPill.hidden = false;
      nodes.lockPill.classList.toggle("good", locked);
      nodes.lockPill.classList.toggle("bad", !locked);
      nodes.lockIcon.icon = locked ? "mdi:lock" : "mdi:lock-open-variant";
      nodes.lockText.textContent = locked ? "Verriegelt" : "Offen";
    } else {
      nodes.lockPill.hidden = true;
    }
    const windows = stateOf("windows");
    const sides = ["front_left", "front_right", "rear_left", "rear_right"];
    let windowValues = sides.map((side) => stateOf(`window_${side}`)?.state ?? null);
    if (windowValues.every((value) => value === null) && windows?.attributes) {
      windowValues = [
        windows.attributes.windowstatusfrontleft,
        windows.attributes.windowstatusfrontright,
        windows.attributes.windowstatusrearleft,
        windows.attributes.windowstatusrearright
      ].map((value) => value === void 0 ? null : String(value));
    }
    const summary = windowSummary(windowValues);
    if (summary) {
      nodes.windowPill.hidden = false;
      nodes.windowPill.classList.toggle("good", summary.tone === "good");
      nodes.windowPill.classList.toggle("bad", summary.tone === "bad");
      nodes.windowIcon.icon = summary.tone === "good" ? "mdi:car-door-lock" : "mdi:car-door";
      nodes.windowText.textContent = summary.text;
    } else if (windows && windows.state !== "unavailable") {
      const closed = windows.state === "on" || windows.state === "closed";
      nodes.windowPill.hidden = false;
      nodes.windowPill.classList.toggle("good", closed);
      nodes.windowPill.classList.toggle("bad", !closed);
      nodes.windowIcon.icon = closed ? "mdi:car-door-lock" : "mdi:car-door";
      nodes.windowText.textContent = closed ? "Fenster zu" : "Fenster offen";
    } else {
      nodes.windowPill.hidden = true;
    }
    const range = stateOf("range");
    const rangeValue = numberOf(range);
    nodes.heroValue.textContent = rangeValue === null ? "–" : `${formatNumber(rangeValue)} ${unitOf(range) || "km"}`;
    const fuel = numberOf(stateOf("fuel"));
    nodes.barFill.style.width = fuel === null ? "0%" : `${Math.max(0, Math.min(100, fuel))}%`;
    nodes.footLeft.textContent = fuel === null ? "" : `${formatNumber(fuel)} % Tank`;
    const odometer = stateOf("odometer");
    const odometerValue = numberOf(odometer);
    nodes.footRight.textContent = odometerValue === null ? "" : `${formatNumber(odometerValue)} ${unitOf(odometer) || "km"} gesamt`;
    if (config.image) {
      if (nodes.heroImage.firstElementChild?.tagName !== "IMG") {
        const img = document.createElement("img");
        img.alt = "";
        nodes.heroImage.replaceChildren(img);
      }
      nodes.heroImage.firstElementChild.src = config.image;
    }
    const tireTile = () => {
      const warning = stateOf("tire_warning");
      const rdk = stateOf("tire_state");
      if (warning && warning.state !== "unavailable" && warning.state !== "unknown") {
        const bad = warning.state === "on";
        return { value: bad ? "Warnung" : "ok", tone: bad ? "bad" : "good" };
      }
      if (rdk && !["unavailable", "unknown"].includes(rdk.state)) {
        const ok = ["0", "ok", "normal", "no_warning"].includes(String(rdk.state).toLowerCase());
        return { value: ok ? "ok" : rdk.state, tone: ok ? "good" : "bad" };
      }
      const pressures = ["tire_front_left", "tire_front_right", "tire_rear_left", "tire_rear_right"].map((key) => numberOf(stateOf(key))).filter((value) => value !== null);
      if (!pressures.length) return { value: "–", tone: "" };
      const low = Math.min(...pressures);
      return { value: `${formatNumber(low, 1)} bar min.`, tone: "" };
    };
    const oilTile = () => {
      const oil = stateOf("oil");
      const value = numberOf(oil);
      if (value === null) return { value: "–", tone: "" };
      return { value: `${formatNumber(value)} ${unitOf(oil) || "%"}`, tone: value < 15 ? "bad" : "" };
    };
    const active2 = WARNINGS.filter(([pattern]) => hass?.states?.[pattern.replace("{id}", id)]?.state === "on");
    const battery = stateOf("battery");
    const batteryOk = ["ok", "0", "normal", "good"].includes(String(battery?.state ?? "").toLowerCase());
    const values = {
      tires: { label: "Reifen", ...tireTile() },
      oil: { label: "Ölstand", ...oilTile() },
      warnings: {
        label: "Warnungen",
        value: active2.length ? active2.map(([, label]) => label).join(", ") : "keine",
        tone: active2.length ? "bad" : "good"
      },
      battery: {
        label: "Starterbatterie",
        value: battery && battery.state !== "unavailable" ? batteryOk ? "ok" : battery.state : "–",
        tone: battery && battery.state !== "unavailable" ? batteryOk ? "good" : "bad" : ""
      }
    };
    nodes.tiles.forEach(({ key, label, value }) => {
      label.textContent = values[key].label;
      value.textContent = values[key].value;
      value.title = values[key].value;
      value.classList.remove("good", "bad");
      if (values[key].tone) value.classList.add(values[key].tone);
    });
    this._updateStatus(stateOf, id);
    this._updateTires(stateOf);
    this._updateTrip(stateOf);
    this._updateEco(stateOf);
    nodes.card.classList.remove("is-on", "is-off", "is-unavailable");
    if (carState) nodes.card.classList.add(statusClass(carState));
  }
  /** Setzt eine Zeile auf Text und Färbung. */
  _setRow(key, text2, tone = "") {
    const row = this._nodes.rows[key];
    if (!row) return;
    row.value.textContent = text2;
    row.value.classList.remove("good", "bad");
    if (tone) row.value.classList.add(tone);
  }
  _updateStatus(stateOf, id) {
    const lock = stateOf("lock");
    if (lock && lock.state !== "unavailable") {
      const locked = isLocked(lock);
      this._setRow("st_lock", locked ? "verriegelt" : "offen", locked ? "good" : "bad");
    } else this._setRow("st_lock", "–");
    const ignition = stateOf("ignition");
    const ignitionOn = !["0", "off", "unknown", "unavailable", ""].includes(
      String(ignition?.state ?? "").toLowerCase()
    );
    this._setRow("st_ignition", ignition ? ignitionOn ? "an" : "aus" : "–");
    const brake = stateOf("park_brake");
    this._setRow(
      "st_park_brake",
      brake && brake.state !== "unavailable" ? brake.state === "on" ? "angezogen" : "gelöst" : "–"
    );
    const battery = stateOf("battery");
    const batteryOk = ["ok", "0", "normal", "good", "green"].includes(String(battery?.state ?? "").toLowerCase());
    this._setRow(
      "st_battery",
      battery && battery.state !== "unavailable" ? batteryOk ? "ok" : battery.state : "–",
      battery && battery.state !== "unavailable" ? batteryOk ? "good" : "bad" : ""
    );
    ["front_left", "front_right", "rear_left", "rear_right"].forEach((side) => {
      const state = stateOf(`window_${side}`);
      const { text: text2, tone } = windowLabel(state);
      this._setRow(`st_window_${side}`, text2, tone);
    });
    const warnRow = (key, pattern) => {
      const state = this._hass?.states?.[pattern.replace("{id}", id)];
      if (!state || ["unavailable", "unknown"].includes(state.state)) {
        this._setRow(key, "–");
        return;
      }
      const bad = state.state === "on";
      this._setRow(key, bad ? "Warnung" : "ok", bad ? "bad" : "good");
    };
    warnRow("st_engine", "binary_sensor.{id}_engine_light_warning");
    warnRow("st_brake_fluid", "binary_sensor.{id}_low_brake_fluid_warning");
    warnRow("st_coolant", "binary_sensor.{id}_low_coolant_level_warning");
    warnRow("st_wash_water", "binary_sensor.{id}_low_wash_water_warning");
  }
  _updateTires(stateOf) {
    const values = [];
    ["tire_front_left", "tire_front_right", "tire_rear_left", "tire_rear_right"].forEach((key) => {
      const state = stateOf(key);
      const value = numberOf(state);
      values.push(value);
      this._nodes.tireNodes[key].textContent = value === null ? "–" : `${formatNumber(value, 1)} ${unitOf(state) || "bar"}`;
    });
    const known = values.filter((value) => value !== null);
    const low = known.length ? Math.min(...known) : null;
    const high = known.length ? Math.max(...known) : null;
    Object.values(this._nodes.tireNodes).forEach((node) => node.classList.remove("bad"));
    if (low !== null && high !== null && high - low > 0.2) {
      ["tire_front_left", "tire_front_right", "tire_rear_left", "tire_rear_right"].forEach((key, index) => {
        if (values[index] === low) this._nodes.tireNodes[key].classList.add("bad");
      });
    }
    const warning = stateOf("tire_warning");
    const rdk = stateOf("tire_state");
    const parts = [];
    if (warning && !["unavailable", "unknown"].includes(warning.state)) {
      parts.push(warning.state === "on" ? "Reifenwarnung aktiv" : "keine Reifenwarnung");
    }
    if (rdk && !["unavailable", "unknown"].includes(rdk.state)) {
      const ok = ["0", "ok", "normal", "no_warning"].includes(String(rdk.state).toLowerCase());
      parts.push(ok ? "Kontrollsystem meldet nichts" : `Kontrollsystem: ${rdk.state}`);
    }
    this._nodes.tireNote.textContent = parts.join(" · ");
  }
  _updateTrip(stateOf) {
    const put = (key, state, digits = 1) => {
      const value = numberOf(state);
      this._nodes.tripNodes[key].textContent = value === null ? "–" : `${formatNumber(value, digits)} ${unitOf(state)}`.trim();
    };
    put("distance_start", stateOf("distance_start"));
    put("distance_reset", stateOf("distance_reset"));
    put("speed_start", stateOf("speed_start"));
    put("speed_reset", stateOf("speed_reset"));
    put("consumption_start", stateOf("consumption_start"));
    put("consumption_reset", stateOf("consumption_reset"));
  }
  _updateEco(stateOf) {
    Object.entries(this._nodes.ecoNodes).forEach(([key, { value, fill }]) => {
      const state = stateOf(key);
      const number3 = numberOf(state);
      value.textContent = number3 === null ? "–" : `${formatNumber(number3)} %`;
      fill.style.width = number3 === null ? "0%" : `${Math.max(0, Math.min(100, number3))}%`;
    });
    const bonus = stateOf("eco_bonus_range");
    const number2 = numberOf(bonus);
    this._nodes.ecoBonus.textContent = number2 === null ? "" : `Bonusreichweite ${formatNumber(number2, 1)} ${unitOf(bonus) || "km"}`;
  }
};
var relativeTime = (isoString) => {
  const then = new Date(isoString).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.round((Date.now() - then) / 6e4);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Minuten`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Stunden`;
  return `vor ${Math.round(hours / 24)} Tagen`;
};
if (!customElements.get(TAG4)) customElements.define(TAG4, HaOsVehicleCard);
registerCard({
  type: TAG4,
  name: "HA-OS Fahrzeug",
  description: "Fahrzeugübersicht für Mercedes (mbapi2020) – Reichweite, Tank, Verriegelung, Reifen und Warnungen.",
  preview: false
});

// src/cards/vehicle-editor.js
var EDITOR_TAG7 = EDITOR_TAG6;
var LABELS3 = {
  entity: "Fahrzeug",
  name: "Name",
  image: "Bild des Fahrzeugs",
  ueberschreiben: "Entitäten überschreiben",
  entity_oil: "Ölstand",
  entity_tire_warning: "Reifenwarnung",
  entity_tire_state: "Reifendruck-Zustand",
  entity_range: "Reichweite",
  entity_fuel: "Tankfüllung",
  entity_odometer: "Kilometerstand",
  entity_lock: "Verriegelung",
  entity_ignition: "Zündung",
  entity_windows: "Fenster geschlossen",
  entity_battery: "Starterbatterie",
  entity_tire_front_left: "Reifen vorn links",
  entity_tire_front_right: "Reifen vorn rechts",
  entity_tire_rear_left: "Reifen hinten links",
  entity_tire_rear_right: "Reifen hinten rechts"
};
var HELPERS3 = {
  entity: "Eine beliebige Entität des Fahrzeugs, etwa der Kilometerstand. Aus ihrer Kennung findet die Karte die übrigen Werte selbst.",
  name: "Leer lassen für den Namen aus Home Assistant.",
  image: "Hochladen oder ein Bild aus dieser Installation wählen, etwa /local/auto.png. Ohne Bild steht ein Symbol da.",
  ueberschreiben: "Nur nötig, wenn eine Entität aus dem Namensmuster fällt – Fensterkontakte tragen oft den Gerätenamen davor."
};
var OVERRIDES = {
  name: "ueberschreiben",
  type: "expandable",
  flatten: true,
  iconPath: "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5Z",
  schema: Object.keys(DERIVED).map((key) => ({ name: `entity_${key}`, selector: { entity: {} } }))
};
var buildSchema = () => [
  { name: "entity", required: true, selector: { entity: { integration: "mbapi2020" } } },
  { name: "name", selector: { text: {} } },
  OVERRIDES
];
var HaOsVehicleEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._form = null;
    this._hint = null;
    this._imageField = null;
  }
  setConfig(config) {
    const next = { ...config };
    if (isEqualConfig(next, this._config) && this._form) return;
    this._config = next;
    if (!this._form) {
      this._build();
      return;
    }
    this._form.data = this._config;
    this._imageField?.refresh();
    this._paintHint();
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    this._paintHint();
  }
  get hass() {
    return this._hass;
  }
  /**
   * Sagt geradeheraus, wie viele der abgeleiteten Entitäten es wirklich gibt.
   * Ohne das merkt man einen Tippfehler in der Kennung erst an leeren Kacheln.
   */
  _paintHint() {
    if (!this._hint) return;
    const id = vehicleId(this._config?.entity);
    if (!id) {
      this._hint.textContent = "Ein Fahrzeug wählen – die übrigen Werte findet die Karte selbst.";
      return;
    }
    if (!this._hass) {
      this._hint.textContent = `Kennung ${id}.`;
      return;
    }
    const keys = Object.keys(DERIVED);
    const found = keys.filter((key) => this._hass.states?.[resolveEntity(this._config, key, this._hass)]).length;
    this._hint.textContent = found === keys.length ? `Kennung ${id} – alle ${keys.length} Werte gefunden.` : `Kennung ${id} – ${found} von ${keys.length} Werten gefunden. Fehlende unten überschreiben.`;
  }
  /**
   * Bildauswahl mit Upload – gemeinsamer Baustein aus `shared/utils.js`,
   * derselbe wie in den Einstellungen der Shell.
   *
   * Bewusst ohne `ha-form` und ohne `ha-selector`: das eine liess ein Feld mit
   * `selector: { image: {} }` stillschweigend weg, beim anderen ist es Zufall,
   * ob es beim Bauen des Editors schon geladen ist.
   */
  _buildImageField() {
    const wrap = document.createElement("div");
    wrap.className = "image-field";
    const label = document.createElement("span");
    label.className = "image-label";
    label.textContent = LABELS3.image;
    this._imageField = createImageField({
      getHass: () => this._hass,
      getValue: () => this._config.image || "",
      placeholder: "/local/auto.png",
      onChange: (value) => {
        const next = { ...this._config };
        if (value) next.image = value;
        else delete next.image;
        this._config = next;
        this.dispatchEvent(
          new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true })
        );
      }
    });
    const helper = document.createElement("span");
    helper.className = "image-helper";
    helper.textContent = HELPERS3.image;
    wrap.append(label, this._imageField.element, helper);
    return wrap;
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      .hint { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
      .image-field { display: flex; flex-direction: column; gap: 8px; margin: 16px 0 8px; }
      .image-label { font-size: 14px; color: var(--primary-text-color); }
      .image-helper { font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
      ${IMAGE_FIELD_CSS}
      .path {
        width: 100%; padding: 10px 12px; border-radius: 8px; font: inherit;
        color: var(--primary-text-color);
        background: var(--secondary-background-color, rgba(127,127,127,.12));
        border: 1px solid var(--divider-color, rgba(127,127,127,.3));
      }
    `;
    this._hint = document.createElement("p");
    this._hint.className = "hint";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = buildSchema();
    form.computeLabel = (field) => LABELS3[field.name] || field.name;
    form.computeHelper = (field) => HELPERS3[field.name] || "";
    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      const value = { ...event.detail.value };
      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === void 0) delete value[key];
      });
      this._config = value;
      this._paintHint();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
    });
    this._form = form;
    this.shadowRoot.replaceChildren(style, this._hint, form, this._buildImageField());
    this._paintHint();
  }
};
if (!customElements.get(EDITOR_TAG7)) customElements.define(EDITOR_TAG7, HaOsVehicleEditor);

// src/cards/printer-card.js
var TAG5 = "ha-os-printer";
var EDITOR_TAG8 = "ha-os-printer-editor";
var FIELDS = [
  { key: "status", label: "Status", domain: "sensor", section: "overview", suffixes: ["druckstatus", "print_status"] },
  { key: "stage", label: "Arbeitsschritt", domain: "sensor", section: "overview", suffixes: ["aktueller_arbeitsschritt", "current_stage"] },
  { key: "progress", label: "Fortschritt", domain: "sensor", section: "overview", suffixes: ["druckfortschritt", "print_progress"] },
  { key: "task", label: "Auftrag", domain: "sensor", section: "overview", suffixes: ["name_der_aufgabe", "task_name"] },
  { key: "remaining", label: "Restzeit", domain: "sensor", section: "overview", suffixes: ["verbleibende_zeit", "remaining_time"] },
  { key: "end_time", label: "Fertig um", domain: "sensor", section: "overview", suffixes: ["endzeit", "end_time"] },
  { key: "layer", label: "Aktuelle Schicht", domain: "sensor", section: "overview", suffixes: ["aktuelle_schicht", "current_layer"] },
  { key: "layers", label: "Schichten gesamt", domain: "sensor", section: "overview", suffixes: ["gesamtzahl_der_schichten", "total_layer_count"] },
  { key: "cover", label: "Titelbild", domain: "image", section: "overview", suffixes: ["titelbild", "cover_image"] },
  { key: "online", label: "Online", domain: "binary_sensor", section: "overview", suffixes: ["online"] },
  { key: "error", label: "Druckfehler", domain: "binary_sensor", section: "overview", suffixes: ["druckfehler", "print_error"] },
  { key: "hms", label: "HMS-Fehler", domain: "binary_sensor", section: "overview", suffixes: ["hms_fehler", "hms_errors"] },
  { key: "nozzle", label: "Düse", domain: "sensor", section: "temps", suffixes: ["temperatur_der_duse", "nozzle_temperature"] },
  { key: "nozzle_target", label: "Düse Soll", domain: "sensor", section: "temps", suffixes: ["zieltemperatur_der_duse", "target_nozzle_temperature"] },
  { key: "bed", label: "Druckbett", domain: "sensor", section: "temps", suffixes: ["druckbetttemperatur", "bed_temperature"] },
  { key: "bed_target", label: "Druckbett Soll", domain: "sensor", section: "temps", suffixes: ["zieltemperatur_vom_druckbett", "target_bed_temperature"] },
  { key: "fan_part", label: "Bauteillüfter (Drehzahl)", domain: "sensor", section: "fans", suffixes: ["bauteillufterdrehzahl", "cooling_fan_speed"] },
  { key: "fan_aux", label: "Druckraumlüfter (Drehzahl)", domain: "sensor", section: "fans", suffixes: ["druckraumlufterdrehzahl", "aux_fan_speed"] },
  { key: "fan_hotend", label: "Druckkopflüfter (Drehzahl)", domain: "sensor", section: "fans", suffixes: ["druckkopflufterdrehzahl", "heatbreak_fan_speed"] },
  { key: "nozzle_size", label: "Düsengröße", domain: "sensor", section: "overview", suffixes: ["dusengrosse", "nozzle_size"] },
  // Steuerbare Luefter. Die drei Eintraege oben sind reine Drehzahlmesser -
  // diese hier sind fan-Entitaeten und nehmen set_percentage entgegen.
  { key: "fan_part_ctrl", label: "Bauteillüfter", domain: "fan", section: "fans", suffixes: ["bauteillufter", "cooling_fan", "part_cooling_fan"] },
  { key: "fan_aux_ctrl", label: "Druckraumlüfter", domain: "fan", section: "fans", suffixes: ["druckraumlufter", "aux_fan", "auxiliary_fan"] },
  { key: "fan_chamber_ctrl", label: "Druckkopflüfter", domain: "fan", section: "fans", suffixes: ["druckkopflufter", "chamber_fan", "heatbreak_fan"] },
  { key: "ams_slot_1", label: "Slot 1", domain: "sensor", section: "ams", suffixes: ["ams_1_slot_1", "ams_1_tray_1"] },
  { key: "ams_slot_2", label: "Slot 2", domain: "sensor", section: "ams", suffixes: ["ams_1_slot_2", "ams_1_tray_2"] },
  { key: "ams_slot_3", label: "Slot 3", domain: "sensor", section: "ams", suffixes: ["ams_1_slot_3", "ams_1_tray_3"] },
  { key: "ams_slot_4", label: "Slot 4", domain: "sensor", section: "ams", suffixes: ["ams_1_slot_4", "ams_1_tray_4"] },
  { key: "ams_temp", label: "AMS-Temperatur", domain: "sensor", section: "ams", suffixes: ["ams_1_temperatur", "ams_1_temperature"] },
  { key: "ams_humidity", label: "AMS-Luftfeuchte", domain: "sensor", section: "ams", suffixes: ["ams_1_luftfeuchtigkeit", "ams_1_humidity"] },
  { key: "ams_active", label: "Aktiver Slot", domain: "sensor", section: "ams", suffixes: ["aktiver_slot", "active_tray"] },
  { key: "pause", label: "Anhalten", domain: "button", section: "control", suffixes: ["druckvorgang_anhalten", "pause_printing"] },
  { key: "resume", label: "Fortsetzen", domain: "button", section: "control", suffixes: ["druckvorgang_fortsetzen", "resume_printing"] },
  { key: "stop", label: "Beenden", domain: "button", section: "control", suffixes: ["druckvorgang_beenden", "stop_printing"] },
  { key: "light", label: "Kammerlicht", domain: "light", section: "control", suffixes: ["druckraumbeleuchtung", "chamber_light"] },
  { key: "speed", label: "Druckgeschwindigkeit", domain: "select", section: "control", suffixes: ["druckgeschwindigkeit", "printing_speed"] },
  { key: "camera", label: "Kamera", domain: "camera", section: "camera", suffixes: ["kamera", "camera"] }
];
var FIELD_BY_KEY = Object.fromEntries(FIELDS.map((field) => [field.key, field]));
var guessEntities = (baseEntity, hass) => {
  const objectId = String(baseEntity || "").split(".")[1] || "";
  if (!objectId || !hass?.states) return {};
  const parts = objectId.split("_");
  const prefixes = [];
  for (let count = parts.length - 1; count >= 1; count -= 1) prefixes.push(parts.slice(0, count).join("_"));
  const ids = Object.keys(hass.states);
  let best = {};
  prefixes.forEach((prefix) => {
    if (Object.keys(best).length) return;
    const found = {};
    FIELDS.forEach((field) => {
      const match = field.suffixes.map((suffix) => `${field.domain}.${prefix}_${suffix}`).find((candidate) => ids.includes(candidate));
      if (match) found[field.key] = match;
    });
    if (Object.keys(found).length >= 3) best = found;
  });
  return best;
};
var resolveField = (config, key) => config?.[`entity_${key}`] || "";
var el6 = (tag, className, text2) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text2 !== void 0) node.textContent = text2;
  return node;
};
var icon5 = (name) => {
  const node = document.createElement("ha-icon");
  node.icon = name;
  return node;
};
var SECTIONS2 = [
  ["overview", "mdi:printer-3d", "Übersicht"],
  ["fans", "mdi:fan", "Lüfter"],
  ["ams", "mdi:tray-full", "AMS"]
];
var STYLES7 = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; }

  .card {
    height: 100%; padding: 10px; display: flex; gap: 10px; overflow: hidden;
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    ${CARD_SURFACE_CSS}
  }

  /* Innere Flaechen als eigenes Glas - siehe Fahrzeugkarte. */
  .rail {
    width: 56px; flex: 0 0 56px; padding: 8px 0;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
  }
  .rail button {
    width: 38px; height: 38px; border-radius: 11px; border: 0; padding: 0;
    display: grid; place-items: center; cursor: pointer;
    background: none; color: rgba(var(--haos-text-rgb, 255,255,255), .45);
    transition: background .16s ease, color .16s ease;
  }
  /* Der aktive Bereich sitzt als Glasflaeche in der Leiste - dieselbe
     Sprache wie die Knoepfe in den Karten. */
  .rail button.active {
    color: var(--haos-text, #fff);
    ${CONTROL_SURFACE_CSS}
  }
  .rail ha-icon { --mdc-icon-size: 19px; }

  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }

  .head { display: flex; align-items: center; gap: 8px; }
  .head-text { flex: 1; min-width: 0; }
  .title { font-size: 15px; font-weight: var(--haos-font-weight-medium, 500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .subtitle { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill {
    display: flex; align-items: center; gap: 5px; flex: 0 0 auto;
    padding: 5px 10px; font-size: 12px;
    color: rgba(var(--haos-text-rgb, 255,255,255), .85);
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
    border-radius: 999px;
  }
  .pill[hidden] { display: none; }
  .pill.good { color: var(--haos-good, #7ee0b0); }
  .pill.bad { color: var(--haos-bad, #ff6b6b); }
  .pill ha-icon { --mdc-icon-size: 14px; }

  .panel { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; scrollbar-width: none; }
  .panel::-webkit-scrollbar { display: none; }
  .panel[hidden] { display: none; }
  .panel.rows { gap: 0; }
  /* Zeilenblock INNERHALB einer Tafel - bewusst ohne die Klasse panel,
     sonst gaebe es verschachtelte Tafeln mit eigener Sichtbarkeit. */
  .rows { display: flex; flex-direction: column; }
  .panel-note { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  .hero { padding: 14px; display: flex; align-items: center; gap: 16px; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .hero-main { flex: 1; min-width: 0; }
  .hero-label { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hero-value { font-size: 30px; font-weight: var(--haos-font-weight-medium, 500); line-height: 1.15; }
  .bar { height: 6px; border-radius: 99px; margin-top: 10px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .14); }
  .bar span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .3s ease; }
  .hero-foot { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin-top: 5px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .hero-image { width: 96px; flex: 0 0 96px; height: 96px; border-radius: 11px; display: grid; place-items: center; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .07); color: rgba(var(--haos-text-rgb, 255,255,255), .35); }
  .hero-image img { width: 100%; height: 100%; object-fit: contain; }
  .hero-image[hidden] { display: none; }
  .hero-image ha-icon { --mdc-icon-size: 34px; }

  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 2px; font-size: 13px; border-bottom: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .07); }
  .row:last-child { border-bottom: 0; }
  .row[hidden] { display: none; }
  .row-label { color: rgba(var(--haos-text-rgb, 255,255,255), .6); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-value { font-weight: var(--haos-font-weight-medium, 500); flex: 0 0 auto; }
  .row-value.good { color: var(--haos-good, #7ee0b0); }
  .row-value.bad { color: var(--haos-bad, #ff6b6b); }

  .slots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .slot { padding: 10px; text-align: center; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .slot[hidden] { display: none; }
  .slot.active { box-shadow: inset 0 0 0 1px var(--haos-accent, #0a84ff); }
  .slot-dot { width: 22px; height: 22px; margin: 0 auto 6px; border-radius: 50%; background: rgba(var(--haos-text-rgb, 255,255,255), .25); }
  .slot-name { font-size: 12px; font-weight: var(--haos-font-weight-medium, 500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slot-label { font-size: 10px; margin-top: 2px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .slot-fill { height: 5px; margin-top: 8px; border-radius: 99px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .16); }
  .slot-fill[hidden] { display: none; }
  .slot-fill span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .3s ease; }
  .slot-remain { font-size: 10px; margin-top: 3px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .slot-remain[hidden] { display: none; }
  .slot-remain.low { color: var(--haos-bad, #ff6b6b); }

  /* Steuerung sitzt in der linken Spalte der Uebersicht, nicht in einer
     eigenen Tafel. Sie schiebt sich an den unteren Rand, damit die Zeilen
     darueber zusammenbleiben. */
  .control-block { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
  /* Luefter: Regler mit Verlauf in der Akzentfarbe - je schneller, desto
     dunkler. Der native Regler laesst sich nicht zuverlaessig einfaerben,
     deshalb liegt er unsichtbar ueber der eigenen Spur. */
  .fan { padding: 12px; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .fan[hidden] { display: none; }
  .fan-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .fan-name { font-size: 13px; color: rgba(var(--haos-text-rgb, 255,255,255), .7); }
  .fan-value { font-size: 17px; font-weight: var(--haos-font-weight-medium, 500); }
  .fan-track {
    position: relative; height: 14px; margin-top: 9px; border-radius: 99px; overflow: hidden;
    background: rgba(var(--haos-text-rgb, 255,255,255), .14);
  }
  .fan-fill { display: block; height: 100%; width: 0; border-radius: 99px; transition: width .18s ease; }
  .fan-track input[type="range"] {
    position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;
    opacity: 0; cursor: ew-resize;
  }
  .fan-speed { font-size: 11px; margin-top: 6px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .fan-speed[hidden] { display: none; }

  .controls { display: flex; flex-wrap: wrap; gap: 8px; }
  .ctrl {
    flex: 1 1 120px; min-width: 0; padding: 12px 10px; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px;
    color: var(--haos-text, #fff);
    transition: background .16s ease, transform .12s ease;
    ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px);
  }
  .ctrl:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .16); }
  .ctrl:active { transform: scale(.97); }
  .ctrl[hidden] { display: none; }
  .ctrl.danger { color: var(--haos-bad, #ff6b6b); }
  .ctrl.armed { background: color-mix(in srgb, var(--haos-bad, #ff6b6b) 26%, transparent); }
  .ctrl.on { background: color-mix(in srgb, var(--haos-accent, #0a84ff) 28%, transparent); }
  .ctrl ha-icon { --mdc-icon-size: 22px; }


  /* Zwei Spalten. Unter 620 px fallen sie untereinander - auf dem Telefon
     stuenden sonst zwei Spalten mit je 150 px nebeneinander. */
  .columns { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 10px; }
  .col { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
  @media (max-width: 620px) { .columns { grid-template-columns: minmax(0, 1fr); } }

  /* Bild und Kamera in einer Kachel, umschaltbar. */
  .media { position: relative; flex: 1; min-height: 120px; overflow: hidden; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .media img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .media img[hidden] { display: none; }
  .media-note { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; padding: 12px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .media-note[hidden] { display: none; }
  ${SEGMENTED_CSS}
  .media-toggle { position: absolute; top: 8px; right: 8px; }
  .media-toggle[hidden] { display: none; }
  .speed-wrap { display: flex; }
  .speed-wrap[hidden] { display: none; }
  .speed-wrap .haos-seg { width: 100%; justify-content: space-between; }
  .speed-wrap .haos-seg-option { flex: 1; }

  /* Temperaturen: zwei Kacheln nebeneinander unter dem Bild. */
  .graphs { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .graphs[hidden] { display: none; }
  .graph { min-width: 0; padding: 10px; ${CONTROL_SURFACE_CSS}
    border-radius: var(--haos-entity-radius, 20px); }
  .graph[hidden] { display: none; }
  .graph-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
  .graph-label { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .graph-value { font-size: 17px; font-weight: var(--haos-font-weight-medium, 500); }
  .graph-svg { width: 100%; height: 46px; display: block; overflow: visible; }
  .l-nozzle { stroke: var(--haos-accent, #0a84ff); }
  .l-bed { stroke: #ff9f0a; }
  .graph-note { font-size: 10px; color: rgba(var(--haos-text-rgb, 255,255,255), .45); }
  .graph-note[hidden] { display: none; }

  .empty { flex: 1; display: grid; place-content: center; text-align: center; gap: 6px; padding: 16px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .empty[hidden] { display: none; }
`;
var numberOf2 = (state) => {
  if (!state || ["unknown", "unavailable", ""].includes(state.state)) return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
};
var unitOf2 = (state) => state?.attributes?.unit_of_measurement || "";
var formatNumber2 = (value, digits = 0) => value === null ? "–" : value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
var formatMinutes = (state) => {
  const minutes = numberOf2(state);
  if (minutes === null) return state && !["unknown", "unavailable"].includes(state.state) ? state.state : "";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};
var HaOsPrinterCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._nodes = null;
    this._section = "overview";
    this._lastStates = null;
    this._armed = false;
    this._media = "photo";
    this._series = { nozzle: [], bed: [] };
  }
  static getConfigElement() {
    return document.createElement(EDITOR_TAG8);
  }
  static getStubConfig() {
    return { type: `custom:${TAG5}` };
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Ungültige Konfiguration.");
    this._config = { ...config };
    if (!this._nodes) this._build();
    this._update();
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first || this._watchedChanged(hass)) this._update();
  }
  getCardSize() {
    return 4;
  }
  getGridOptions() {
    return { columns: "full", min_rows: 3 };
  }
  _watchedEntities() {
    return FIELDS.map((field) => resolveField(this._config, field.key)).filter(Boolean);
  }
  _watchedChanged(hass) {
    const watched = this._watchedEntities();
    if (!watched.length) return false;
    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;
    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) if (previous.get(id) !== state) return true;
    return false;
  }
  _state(key) {
    return this._hass?.states?.[resolveField(this._config, key)];
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES7;
    const card = el6("div", "card");
    const rail = el6("div", "rail");
    const buttons = /* @__PURE__ */ new Map();
    SECTIONS2.forEach(([key, iconName, label]) => {
      const button = el6("button");
      button.append(icon5(iconName));
      button.title = label;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => {
        this._section = key;
        this._armed = false;
        this._update();
      });
      buttons.set(key, button);
      rail.append(button);
    });
    const main = el6("div", "main");
    const overview = el6("div", "panel");
    const hero = el6("div", "hero");
    const heroMain = el6("div", "hero-main");
    const heroLabel = el6("div", "hero-label", "Fortschritt");
    const heroValue = el6("div", "hero-value", "–");
    const bar = el6("div", "bar");
    const barFill = el6("span");
    bar.append(barFill);
    const heroFoot = el6("div", "hero-foot");
    const footLeft = el6("span");
    const footRight = el6("span");
    heroFoot.append(footLeft, footRight);
    heroMain.append(heroLabel, heroValue, bar, heroFoot);
    const heroImage = el6("div", "hero-image");
    heroImage.append(icon5("mdi:image-outline"));
    hero.append(heroMain, heroImage);
    const rows = {};
    const rowPanel = (keys, parent) => {
      keys.forEach(({ key, label }) => {
        const row = el6("div", "row");
        row.append(el6("span", "row-label", label));
        const value = el6("span", "row-value", "–");
        row.append(value);
        parent.append(row);
        rows[key] = { row, value };
      });
    };
    const overviewRows = el6("div", "rows");
    rowPanel(
      [
        { key: "status", label: "Status" },
        { key: "error", label: "Fehler" },
        { key: "task", label: "Auftrag" },
        { key: "stage", label: "Arbeitsschritt" },
        { key: "end_time", label: "Fertig um" },
        { key: "nozzle_size", label: "Düse" },
        { key: "layer_of", label: "Schicht" }
      ],
      overviewRows
    );
    const columns = el6("div", "columns");
    const left = el6("div", "col");
    const right = el6("div", "col");
    const media = el6("div", "media");
    const mediaImage = document.createElement("img");
    mediaImage.alt = "";
    const mediaNote = el6("div", "media-note");
    const mediaToggle = el6("div", "media-toggle");
    const mediaSeg = createSegmented({
      options: [
        { value: "photo", label: "Foto" },
        { value: "camera", label: "Kamera" }
      ],
      value: "photo",
      ariaLabel: "Bildquelle",
      onChange: (value) => {
        this._media = value;
        this._update();
      }
    });
    mediaToggle.append(mediaSeg.element);
    media.append(mediaImage, mediaNote, mediaToggle);
    const graph = this._buildGraph();
    right.append(media, graph.element);
    columns.append(left, right);
    overview.append(columns);
    const fans = el6("div", "panel");
    const fanNodes = [
      ["fan_part_ctrl", "fan_part", "Bauteillüfter"],
      ["fan_aux_ctrl", "fan_aux", "Druckraumlüfter"],
      ["fan_chamber_ctrl", "fan_hotend", "Druckkopflüfter"]
    ].map(([key, speedKey, label]) => {
      const box = el6("div", "fan");
      const head = el6("div", "fan-head");
      const name = el6("span", "fan-name", label);
      const value = el6("span", "fan-value", "–");
      head.append(name, value);
      const track = el6("div", "fan-track");
      const fill = el6("span", "fan-fill");
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.step = "5";
      track.append(fill, input);
      const speed = el6("div", "fan-speed");
      box.append(head, track, speed);
      fans.append(box);
      input.addEventListener("input", () => {
        value.textContent = `${input.value} %`;
        this._paintFan({ fill }, Number(input.value));
      });
      input.addEventListener("change", () => {
        const entity = resolveField(this._config, key);
        if (!entity) return;
        const percentage = Number(input.value);
        this._hass?.callService("fan", percentage === 0 ? "turn_off" : "set_percentage", {
          entity_id: entity,
          ...percentage === 0 ? {} : { percentage }
        });
      });
      return { key, speedKey, box, value, fill, input, speed };
    });
    const fanNote = el6("div", "panel-note");
    fans.append(fanNote);
    const ams = el6("div", "panel");
    const slots = el6("div", "slots");
    const slotNodes = [1, 2, 3, 4].map((number2) => {
      const slot = el6("div", "slot");
      const dot = el6("div", "slot-dot");
      const name = el6("div", "slot-name", "–");
      const kind = el6("div", "slot-label", `Slot ${number2}`);
      const fill = el6("div", "slot-fill");
      const fillBar = el6("span");
      fill.append(fillBar);
      const fillText = el6("div", "slot-remain");
      slot.append(dot, name, kind, fill, fillText);
      slots.append(slot);
      return { slot, dot, name, kind, fill, fillText };
    });
    const amsRows = el6("div", "rows");
    rowPanel(
      [
        { key: "ams_temp", label: "Temperatur" },
        { key: "ams_humidity", label: "Luftfeuchte" }
      ],
      amsRows
    );
    ams.append(slots, amsRows);
    const control = el6("div", "control-block");
    const controls = el6("div", "controls");
    const makeCtrl = (iconName, label, className = "") => {
      const button = el6("button", `ctrl ${className}`.trim());
      button.append(icon5(iconName), el6("span", null, label));
      controls.append(button);
      return button;
    };
    const pauseBtn = makeCtrl("mdi:pause", "Anhalten");
    const resumeBtn = makeCtrl("mdi:play", "Fortsetzen");
    const stopBtn = makeCtrl("mdi:stop", "Beenden", "danger");
    const lightBtn = makeCtrl("mdi:lightbulb", "Kammerlicht");
    const speedWrap = el6("div", "speed-wrap");
    const speedSeg = createSegmented({
      options: [],
      ariaLabel: "Druckgeschwindigkeit",
      onChange: (value) => {
        const entity = resolveField(this._config, "speed");
        if (!entity) return;
        this._hass?.callService(entity.split(".")[0], "select_option", { entity_id: entity, option: value });
      }
    });
    speedWrap.append(speedSeg.element);
    const controlNote = el6("div", "panel-note");
    control.append(controls, speedWrap, controlNote);
    pauseBtn.addEventListener("click", () => this._press("pause"));
    resumeBtn.addEventListener("click", () => this._press("resume"));
    lightBtn.addEventListener("click", () => {
      const entity = resolveField(this._config, "light");
      if (entity) this._hass?.callService("light", "toggle", { entity_id: entity });
    });
    stopBtn.addEventListener("click", () => {
      if (!this._armed) {
        this._armed = true;
        this._update();
        clearTimeout(this._armTimer);
        this._armTimer = setTimeout(() => {
          this._armed = false;
          this._update();
        }, 5e3);
        return;
      }
      clearTimeout(this._armTimer);
      this._armed = false;
      this._press("stop");
      this._update();
    });
    const empty = el6("div", "empty");
    empty.append(
      el6("strong", null, "Noch kein Drucker gewählt"),
      el6("span", null, "Im Editor oben eine Entität des Druckers wählen – die übrigen Felder füllen sich dann von selbst.")
    );
    left.append(hero, overviewRows, control);
    const panels = { overview, fans, ams };
    Object.values(panels).forEach((panel) => main.append(panel));
    main.append(empty);
    card.append(rail, main);
    this._nodes = {
      card,
      rail,
      buttons,
      heroValue,
      barFill,
      footLeft,
      footRight,
      heroImage,
      rows,
      slotNodes,
      panels,
      empty,
      fanNodes,
      fanNote,
      pauseBtn,
      resumeBtn,
      stopBtn,
      lightBtn,
      speedSeg,
      speedWrap,
      controlNote,
      mediaImage,
      mediaNote,
      mediaSeg,
      mediaToggle,
      graph
    };
    this.shadowRoot.replaceChildren(style, card);
  }
  _press(key) {
    const entity = resolveField(this._config, key);
    if (!entity) return;
    const domain = entity.split(".")[0];
    this._hass?.callService(domain, domain === "button" ? "press" : "turn_on", { entity_id: entity });
  }
  /** Setzt eine Zeile; ohne Wert verschwindet sie ganz. */
  _row(key, text2, tone = "") {
    const row = this._nodes.rows[key];
    if (!row) return;
    const empty = text2 === "" || text2 === null || text2 === void 0;
    row.row.hidden = empty;
    row.value.textContent = empty ? "" : text2;
    row.value.classList.remove("good", "bad");
    if (tone && !empty) row.value.classList.add(tone);
  }
  _update() {
    if (!this._nodes || !this._hass) return;
    const nodes = this._nodes;
    nodes.buttons.forEach((button, key) => button.classList.toggle("active", key === this._section));
    Object.entries(nodes.panels).forEach(([key, panel]) => {
      panel.hidden = key !== this._section;
    });
    const configured = this._watchedEntities().length;
    nodes.empty.hidden = configured > 0;
    if (!configured) {
      Object.values(nodes.panels).forEach((panel) => {
        panel.hidden = true;
      });
      return;
    }
    this._updateHead();
    this._updateOverview();
    this._updateFans();
    this._updateAms();
    this._updateControl();
    this._updateMedia();
    this._updateGraph();
  }
  /**
   * Status und Fehler als Zeilen.
   *
   * Die Karte hatte oben eine eigene Kopfzeile mit Name, Arbeitsschritt und
   * zwei Pillen. Sie kostete eine ganze Zeile Hoehe und wiederholte, was
   * ohnehin in der Liste steht – der Name steht schon im Kartentitel der
   * Shell. Geblieben sind die beiden Angaben, die es sonst nirgends gibt.
   */
  _updateHead() {
    const status = this._state("status");
    const online = this._state("online");
    if (status && !["unknown", "unavailable"].includes(status.state)) {
      const running = ["printing", "running", "druckt", "drucken"].includes(String(status.state).toLowerCase());
      this._row("status", status.state, running ? "good" : "");
    } else if (online) {
      this._row("status", online.state === "on" ? "Online" : "Offline", online.state === "on" ? "good" : "bad");
    } else {
      this._row("status", "");
    }
    const problems = [this._state("error"), this._state("hms")].filter((state) => state?.state === "on").length;
    this._row("error", problems ? problems > 1 ? `${problems} Fehler` : "Fehler" : "", "bad");
  }
  /** Aus einer Entitäts-ID einen brauchbaren Namen ableiten, z. B. „P1S". */
  _deviceName() {
    const first = this._watchedEntities()[0] || "";
    const objectId = first.split(".")[1] || "";
    return objectId.split("_")[0]?.toUpperCase() || "";
  }
  _updateOverview() {
    const nodes = this._nodes;
    const progress = numberOf2(this._state("progress"));
    nodes.heroValue.textContent = progress === null ? "–" : `${formatNumber2(progress)} %`;
    nodes.barFill.style.width = progress === null ? "0%" : `${Math.max(0, Math.min(100, progress))}%`;
    const remaining = formatMinutes(this._state("remaining"));
    nodes.footLeft.textContent = remaining ? `noch ${remaining}` : "";
    const end = this._state("end_time");
    nodes.footRight.textContent = end && !["unknown", "unavailable"].includes(end.state) ? `fertig ${end.state}` : "";
    const task = this._state("task");
    this._row("task", task && !["unknown", "unavailable"].includes(task.state) ? task.state : "");
    const stage = this._state("stage");
    this._row("stage", stage && !["unknown", "unavailable"].includes(stage.state) ? stage.state : "");
    this._row("end_time", end && !["unknown", "unavailable"].includes(end.state) ? end.state : "");
    const layer = numberOf2(this._state("layer"));
    const layers = numberOf2(this._state("layers"));
    this._row(
      "layer_of",
      layer === null && layers === null ? "" : `${formatNumber2(layer)} / ${formatNumber2(layers)}`
    );
    const size = this._state("nozzle_size");
    this._row(
      "nozzle_size",
      size && !["unknown", "unavailable"].includes(size.state) ? `${size.state} ${unitOf2(size)}`.trim() : ""
    );
    const cover = this._state("cover");
    const picture = cover?.attributes?.entity_picture;
    if (picture) {
      nodes.heroImage.hidden = false;
      let img = nodes.heroImage.firstElementChild;
      if (img?.tagName !== "IMG") {
        img = document.createElement("img");
        img.alt = "";
        nodes.heroImage.replaceChildren(img);
      }
      img.src = picture;
    } else {
      nodes.heroImage.hidden = true;
    }
  }
  /**
   * Färbt die Reglerspur.
   *
   * Je schneller, desto dunkler: die Akzentfarbe wird mit steigendem Wert
   * zunehmend abgedunkelt. Der Verlauf innerhalb der Spur macht die Richtung
   * sichtbar, auch wenn man den Zahlenwert nicht liest.
   */
  _paintFan(node, percentage) {
    const value = Math.max(0, Math.min(100, percentage || 0));
    node.fill.style.width = `${value}%`;
    const dark = Math.round(value / 100 * 55);
    node.fill.style.background = `linear-gradient(90deg, color-mix(in srgb, var(--haos-accent, #0a84ff) 72%, white), color-mix(in srgb, var(--haos-accent, #0a84ff) ${100 - dark}%, black))`;
  }
  _updateFans() {
    const nodes = this._nodes;
    let anyFan = false;
    nodes.fanNodes.forEach((fan) => {
      const entity = resolveField(this._config, fan.key);
      const state = entity ? this._hass?.states?.[entity] : null;
      fan.box.hidden = !state;
      if (!state) return;
      anyFan = true;
      const percentage = Number(state.attributes?.percentage);
      const value = Number.isFinite(percentage) ? percentage : state.state === "on" ? 100 : 0;
      if (document.activeElement !== fan.input && fan.input.value !== String(value)) {
        fan.input.value = String(value);
      }
      fan.value.textContent = `${Math.round(value)} %`;
      this._paintFan(fan, value);
      const speedState = this._state(fan.speedKey);
      const speed = numberOf2(speedState);
      fan.speed.textContent = speed === null ? "" : `${formatNumber2(speed)} ${unitOf2(speedState) || "U/min"}`;
      fan.speed.hidden = speed === null;
    });
    nodes.fanNote.textContent = anyFan ? "" : "Keine Lüfter gewählt. Im Editor unter „Lüfter“ die fan-Entitäten des Druckers setzen.";
  }
  _updateAms() {
    const active2 = this._state("ams_active");
    const activeIndex = numberOf2(active2);
    this._nodes.slotNodes.forEach(({ slot, dot, name, kind, fill, fillText }, index) => {
      const state = this._state(`ams_slot_${index + 1}`);
      if (!state) {
        slot.hidden = true;
        return;
      }
      slot.hidden = false;
      const attributes = state.attributes || {};
      const empty = attributes.empty === true || ["unknown", "unavailable", "", "Empty", "leer"].includes(state.state);
      name.textContent = empty ? "leer" : state.state;
      kind.textContent = empty ? `Slot ${index + 1}` : attributes.type || `Slot ${index + 1}`;
      const raw = attributes.color || attributes.colour || attributes.filament_color;
      const colour = raw ? `#${String(raw).replace("#", "").slice(0, 6)}` : "";
      dot.style.background = empty ? "" : colour;
      const remain = Number(attributes.remain);
      const measurable = attributes.remain_enabled !== false && Number.isFinite(remain) && remain >= 0;
      fill.hidden = empty || !measurable;
      fillText.hidden = empty || !measurable;
      if (measurable && !empty) {
        fill.firstElementChild.style.width = `${Math.max(0, Math.min(100, remain))}%`;
        fill.firstElementChild.style.background = colour || "";
        fillText.textContent = `${Math.round(remain)} %`;
        fillText.classList.toggle("low", remain < 15);
      }
      slot.classList.toggle("active", activeIndex !== null && activeIndex === index + 1);
    });
    const temp = this._state("ams_temp");
    const tempValue = numberOf2(temp);
    this._row("ams_temp", tempValue === null ? "" : `${formatNumber2(tempValue, 1)} ${unitOf2(temp) || "°C"}`);
    const humidity = this._state("ams_humidity");
    const humidityValue = numberOf2(humidity);
    this._row(
      "ams_humidity",
      humidityValue === null ? humidity && !["unknown", "unavailable"].includes(humidity.state) ? humidity.state : "" : `${formatNumber2(humidityValue)} ${unitOf2(humidity) || "%"}`
    );
  }
  _updateControl() {
    const nodes = this._nodes;
    nodes.pauseBtn.hidden = !resolveField(this._config, "pause");
    nodes.resumeBtn.hidden = !resolveField(this._config, "resume");
    nodes.stopBtn.hidden = !resolveField(this._config, "stop");
    nodes.lightBtn.hidden = !resolveField(this._config, "light");
    nodes.stopBtn.classList.toggle("armed", this._armed);
    nodes.stopBtn.lastElementChild.textContent = this._armed ? "Wirklich beenden?" : "Beenden";
    nodes.controlNote.textContent = this._armed ? "Noch einmal tippen beendet den Druck. Die Rückfrage verfällt nach fünf Sekunden." : "";
    const light = this._state("light");
    nodes.lightBtn.classList.toggle("on", light?.state === "on");
    const speed = this._state("speed");
    const options = speed?.attributes?.options || [];
    nodes.speedWrap.hidden = !speed || !options.length;
    if (speed && options.length) nodes.speedSeg.update(speed.state, options);
  }
  /**
   * Bild und Kamera in einer Kachel, umschaltbar.
   *
   * Das Standbild der Kamera wird nur geholt, wenn die Kachel auf *Kamera*
   * steht **und** die Übersicht sichtbar ist. Sonst laueft ein Bildabruf im
   * Sekundentakt auf einer Seite weiter, die niemand ansieht.
   */
  /**
   * Temperaturverlauf von Düse und Bett.
   *
   * Der Verlauf wird einmal aus Home Assistants Aufzeichnung geholt
   * (`history/period`, letzte Stunde) und danach aus den laufenden Zuständen
   * fortgeschrieben. Ohne den ersten Schritt wäre die Kurve nach dem Laden
   * eine Stunde lang leer; ohne den zweiten stünde sie still.
   *
   * Gezeichnet wird als SVG-Linienzug – kein Diagrammpaket, das wäre für zwei
   * Linien mehr Ballast als das ganze Bündel.
   */
  _buildGraph() {
    const wrap = el6("div", "graphs");
    const build = (title, lineClass) => {
      const box = el6("div", "graph");
      const head = el6("div", "graph-head");
      const label = el6("span", "graph-label", title);
      const value = el6("span", "graph-value", "–");
      head.append(label, value);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 160 48");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.classList.add("graph-svg");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("fill", "none");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("stroke-linecap", "round");
      line.classList.add(lineClass);
      svg.append(line);
      const note = el6("div", "graph-note", "sammelt Werte");
      box.append(head, svg, note);
      wrap.append(box);
      return { box, value, line, note };
    };
    this._graph = {
      wrap,
      nozzle: build("Düse", "l-nozzle"),
      bed: build("Bett", "l-bed")
    };
    return { element: wrap };
  }
  /** Punkte anhängen, höchstens alle 15 Sekunden einen. */
  _recordSeries() {
    const now = Date.now();
    if (this._lastPoint && now - this._lastPoint < 15e3) return;
    const nozzle = numberOf2(this._state("nozzle"));
    const bed = numberOf2(this._state("bed"));
    if (nozzle === null && bed === null) return;
    this._lastPoint = now;
    this._series = this._series || { nozzle: [], bed: [] };
    if (nozzle !== null) this._series.nozzle.push({ t: now, v: nozzle });
    if (bed !== null) this._series.bed.push({ t: now, v: bed });
    const cutoff = now - 60 * 60 * 1e3;
    ["nozzle", "bed"].forEach((key) => {
      this._series[key] = this._series[key].filter((point) => point.t >= cutoff).slice(-240);
    });
  }
  /** Einmalig den vorhandenen Verlauf nachladen, damit die Kurve nicht leer startet. */
  async _seedSeries() {
    if (this._seeded || !this._hass?.callApi) return;
    const ids = ["nozzle", "bed"].map((key) => resolveField(this._config, key)).filter(Boolean);
    if (!ids.length) return;
    this._seeded = true;
    try {
      const start = new Date(Date.now() - 60 * 60 * 1e3);
      const path = `history/period/${encodeURIComponent(start.toISOString())}?filter_entity_id=${encodeURIComponent(ids.join(","))}&minimal_response&no_attributes`;
      const result = await this._hass.callApi("GET", path);
      const series = { nozzle: [], bed: [] };
      (result || []).forEach((reihe) => {
        const first = reihe?.[0]?.entity_id || "";
        const key = first === resolveField(this._config, "nozzle") ? "nozzle" : "bed";
        reihe.forEach((point) => {
          const value = Number(point.state);
          if (!Number.isFinite(value)) return;
          series[key].push({ t: new Date(point.last_changed || point.last_updated).getTime(), v: value });
        });
      });
      this._series = {
        nozzle: [...series.nozzle, ...this._series?.nozzle || []].slice(-240),
        bed: [...series.bed, ...this._series?.bed || []].slice(-240)
      };
      this._updateGraph();
    } catch (_error) {
    }
  }
  _updateGraph() {
    if (!this._graph) return;
    const nozzle = numberOf2(this._state("nozzle"));
    const bed = numberOf2(this._state("bed"));
    this._graph.wrap.hidden = nozzle === null && bed === null;
    if (this._graph.wrap.hidden) return;
    this._recordSeries();
    if (this._section === "overview") this._seedSeries();
    const series = this._series || { nozzle: [], bed: [] };
    const paint = (target, points, current) => {
      target.box.hidden = current === null;
      if (current === null) return;
      target.value.textContent = `${formatNumber2(current)} °C`;
      if (points.length < 2) {
        target.note.hidden = false;
        target.line.setAttribute("points", "");
        return;
      }
      target.note.hidden = true;
      const times = points.map((point) => point.t);
      const values = points.map((point) => point.v);
      const tMin = Math.min(...times);
      const spanT = Math.max(...times) - tMin || 1;
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const mid = (vMin + vMax) / 2;
      const half = Math.max((vMax - vMin) / 2, 5);
      const low = mid - half;
      const spanV = half * 2;
      target.line.setAttribute(
        "points",
        points.map((point) => {
          const x = (point.t - tMin) / spanT * 160;
          const y = 48 - (point.v - low) / spanV * 48;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ")
      );
    };
    paint(this._graph.nozzle, series.nozzle, nozzle);
    paint(this._graph.bed, series.bed, bed);
  }
  _updateMedia() {
    const nodes = this._nodes;
    const cover = this._state("cover");
    const camera = this._state("camera");
    const hasCover = Boolean(cover?.attributes?.entity_picture);
    const hasCamera = Boolean(camera?.attributes?.entity_picture) && camera.state !== "unavailable";
    nodes.mediaToggle.hidden = !hasCamera;
    if (!hasCamera && this._media === "camera") this._media = "photo";
    nodes.mediaSeg.update(this._media);
    const live = this._media === "camera" && hasCamera;
    const stop = () => {
      clearInterval(this._cameraTimer);
      this._cameraTimer = null;
    };
    if (!live) {
      stop();
      if (hasCover) {
        nodes.mediaImage.hidden = false;
        nodes.mediaNote.hidden = true;
        nodes.mediaImage.src = cover.attributes.entity_picture;
      } else {
        nodes.mediaImage.hidden = true;
        nodes.mediaNote.hidden = false;
        nodes.mediaNote.textContent = hasCamera ? "Kein Titelbild – auf Kamera umschalten." : "Kein Bild";
      }
      return;
    }
    nodes.mediaImage.hidden = false;
    nodes.mediaNote.hidden = true;
    if (this._section !== "overview") {
      stop();
      if (nodes.mediaImage.getAttribute("src")) nodes.mediaImage.removeAttribute("src");
      return;
    }
    const picture = camera.attributes.entity_picture;
    const paint = () => {
      nodes.mediaImage.src = `${picture}${picture.includes("?") ? "&" : "?"}_=${Date.now()}`;
    };
    paint();
    if (!this._cameraTimer) this._cameraTimer = setInterval(paint, 5e3);
  }
  disconnectedCallback() {
    clearInterval(this._cameraTimer);
    this._cameraTimer = null;
    clearTimeout(this._armTimer);
  }
};
if (!customElements.get(TAG5)) customElements.define(TAG5, HaOsPrinterCard);
registerCard({
  type: TAG5,
  name: "HA-OS Drucker",
  description: "3D-Drucker (Bambu Lab) – Fortschritt, Temperaturen, AMS, Steuerung und Kamera.",
  preview: false
});

// src/cards/printer-editor.js
var EDITOR_TAG9 = EDITOR_TAG8;
var SECTION_LABELS = {
  overview: "Übersicht",
  temps: "Temperaturen",
  ams: "AMS",
  control: "Steuerung",
  camera: "Kamera"
};
var SECTION_ICONS = {
  overview: "M12,2A10,10 0 1,0 22,12A10,10 0 0,0 12,2Z",
  temps: "M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2Z",
  ams: "M4,4H20V8H4V4M4,10H20V14H4V10M4,16H20V20H4V16Z",
  control: "M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5Z",
  camera: "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4Z"
};
var LABELS4 = {
  entity: "Drucker",
  name: "Name"
};
var HELPERS4 = {
  entity: "Eine beliebige Entität des Druckers. Beim Wählen werden die übrigen Felder einmalig gefüllt – ändern lässt sich danach jedes einzeln.",
  name: "Leer lassen für den Namen aus Home Assistant."
};
FIELDS.forEach((field) => {
  LABELS4[`entity_${field.key}`] = field.label;
});
var sectionsOf = (fields) => {
  const order = ["overview", "temps", "ams", "control", "camera"];
  return order.map((section) => ({ section, items: fields.filter((field) => field.section === section) })).filter(({ items }) => items.length);
};
var buildSchema2 = () => [
  { name: "entity", selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  ...sectionsOf(FIELDS).map(({ section, items }) => ({
    name: section,
    type: "expandable",
    flatten: true,
    iconPath: SECTION_ICONS[section],
    schema: items.map((field) => ({
      name: `entity_${field.key}`,
      selector: { entity: field.domain ? { domain: field.domain } : {} }
    }))
  }))
];
var SECTION_TITLES = Object.fromEntries(
  Object.entries(SECTION_LABELS).map(([key, label]) => [key, label])
);
var HaOsPrinterEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._form = null;
    this._hint = null;
  }
  setConfig(config) {
    const next = { ...config };
    if (isEqualConfig(next, this._config) && this._form) return;
    this._config = next;
    if (!this._form) {
      this._build();
      return;
    }
    this._form.data = this._config;
    this._paintHint();
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    this._paintHint();
  }
  get hass() {
    return this._hass;
  }
  _filled() {
    return FIELDS.filter((field) => this._config[`entity_${field.key}`]).length;
  }
  _paintHint() {
    if (!this._hint) return;
    const filled = this._filled();
    if (!filled) {
      this._hint.textContent = "Oben eine Entität des Druckers wählen – die übrigen Felder werden dann einmalig gefüllt.";
      return;
    }
    this._hint.textContent = `${filled} von ${FIELDS.length} Werten gesetzt. Jedes Feld lässt sich einzeln ändern.`;
  }
  _build() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      .hint { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
    `;
    this._hint = document.createElement("p");
    this._hint.className = "hint";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = buildSchema2();
    form.computeLabel = (field) => LABELS4[field.name] || SECTION_TITLES[field.name] || field.name;
    form.computeHelper = (field) => HELPERS4[field.name] || "";
    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      let value = { ...event.detail.value };
      if (value.entity && value.entity !== this._config.entity) {
        const guessed = guessEntities(value.entity, this._hass);
        Object.entries(guessed).forEach(([key, entityId]) => {
          if (!value[`entity_${key}`]) value[`entity_${key}`] = entityId;
        });
      }
      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === void 0) delete value[key];
      });
      this._config = value;
      this._form.data = value;
      this._paintHint();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
    });
    this._form = form;
    this.shadowRoot.replaceChildren(style, this._hint, form);
    this._paintHint();
  }
};
if (!customElements.get(EDITOR_TAG9)) customElements.define(EDITOR_TAG9, HaOsPrinterEditor);

// src/ha-os.js
var VERSION = "0.30.0";
console.info(
  `%c HA-OS %c ${VERSION} `,
  "background:#0a84ff;color:#fff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "background:#18212a;color:#fff;border-radius:0 3px 3px 0;padding:2px 6px"
);
export {
  CARD_TYPES,
  FIELDS as PRINTER_FIELDS,
  VERSION,
  guessEntities,
  uploadImage
};
