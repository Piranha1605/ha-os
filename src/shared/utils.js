/**
 * HA-OS – gemeinsame Helfer für Shell und Karten.
 */

export const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const deepClone = (value) =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

/** Stabiler Vergleich für "hat sich die Konfiguration wirklich geändert?" */
export const isEqualConfig = (a, b) => {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_error) {
    return false;
  }
};

export const fireEvent = (node, type, detail = {}) => {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
};

export const showMoreInfo = (node, entityId) => {
  if (entityId) fireEvent(node, "hass-more-info", { entityId });
};

export const navigate = (path) => {
  const value = String(path || "").trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value)) {
    window.open(value, "_blank", "noopener");
    return;
  }
  history.pushState(null, "", value.startsWith("/") ? value : `/${value}`);
  window.dispatchEvent(new CustomEvent("location-changed"));
};

const DOMAIN_ICONS = {
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
  input_number: "mdi:ray-vertex",
};

export const domainOf = (entityId) => String(entityId || "").split(".")[0];

export const domainIcon = (entityId, state) => {
  if (state?.attributes?.icon) return state.attributes.icon;
  return DOMAIN_ICONS[domainOf(entityId)] || "mdi:circle-outline";
};

export const friendlyName = (entityId, state) =>
  state?.attributes?.friendly_name || String(entityId || "").split(".").slice(1).join(".") || entityId || "";

const ON_STATES = new Set([
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
  "active",
]);

export const isUnavailable = (state) => !state || ["unavailable", "unknown"].includes(state.state);

export const isActive = (state) => !isUnavailable(state) && ON_STATES.has(state.state);

/** Liefert die Statusklasse für die CSS-Statusfarben. */
export const statusClass = (state) => {
  if (isUnavailable(state)) return "is-unavailable";
  return isActive(state) ? "is-on" : "is-off";
};

export const formatState = (hass, entityId) => {
  const state = hass?.states?.[entityId];
  if (!state) return "Nicht verfügbar";
  if (hass.formatEntityState) {
    try {
      return hass.formatEntityState(state);
    } catch (_error) {
      /* Fallback unten */
    }
  }
  const unit = state.attributes?.unit_of_measurement;
  return unit ? `${state.state} ${unit}` : state.state;
};

/**
 * Führt eine konfigurierte Aktion aus.
 * Unterstützt: toggle, more-info, navigate, url, call-service, none.
 */
export const handleAction = (node, hass, config = {}, entityId) => {
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

/**
 * Erzeugt eine beliebige Home-Assistant-Karte.
 *
 * Nutzt bewusst die offizielle Helferschnittstelle, damit JEDE installierte
 * Karte funktioniert (Bubble Card, button-card, Mushroom, HA-Standardkarten)
 * und Fehlkonfigurationen als reguläre HA-Fehlerkarte erscheinen.
 */
let helpersPromise;
export const cardHelpers = () => {
  if (!helpersPromise) helpersPromise = window.loadCardHelpers?.() ?? Promise.resolve(null);
  return helpersPromise;
};

export const createCardElement = async (config) => {
  const helpers = await cardHelpers();
  if (helpers?.createCardElement) return helpers.createCardElement(config);

  // Notfallpfad, falls loadCardHelpers nicht verfügbar ist.
  const tag = String(config?.type || "").replace(/^custom:/, "");
  const element = document.createElement(tag || "hui-error-card");
  element.setConfig?.(config);
  return element;
};

/** Gemeinsames CSS für eine Entitäts-Glasfläche. */
export const ENTITY_SURFACE_CSS = `
  border: 1px solid rgba(var(--haos-entity-border-rgb, 255,255,255), var(--haos-entity-border-opacity, .25));
  border-radius: var(--haos-entity-radius, 14px);
  background: rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10));
  box-shadow: var(--haos-entity-shadow, 0 12px 30px rgba(0,0,0,.18));
  backdrop-filter: blur(var(--haos-entity-blur, 16px)) saturate(var(--haos-entity-saturation, 160%));
  -webkit-backdrop-filter: blur(var(--haos-entity-blur, 16px)) saturate(var(--haos-entity-saturation, 160%));
`;

/** Gemeinsames CSS für die grosse Hintergrund-Glasfläche. */
export const CARD_SURFACE_CSS = `
  border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), var(--haos-card-border-opacity, .25));
  border-radius: var(--haos-card-radius, 14px);
  background: rgba(var(--haos-card-surface-rgb, 255,255,255), var(--haos-card-opacity, .10));
  box-shadow: var(--haos-card-shadow, 0 24px 70px rgba(0,0,0,.28));
  backdrop-filter: blur(var(--haos-card-blur, 16px)) saturate(var(--haos-card-saturation, 160%));
  -webkit-backdrop-filter: blur(var(--haos-card-blur, 16px)) saturate(var(--haos-card-saturation, 160%));
`;

/** Registriert eine Karte im HA-Kartenauswahldialog. */
export const registerCard = (entry) => {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === entry.type)) window.customCards.push(entry);
};
