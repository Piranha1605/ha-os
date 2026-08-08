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

/**
 * Zieht Felder aus alten, verschachtelten Editor-Blöcken nach oben.
 *
 * Bis Version 0.3.0 legte `ha-form-expandable` die Felder der aufklappbaren
 * Blöcke unter deren Namen ab – `darstellung: { name, icon }` statt `name`
 * und `icon`. Gespeicherte Konfigurationen sehen deshalb noch so aus. Ohne
 * diese Umsetzung verlöre Enrico beim Update alle vergebenen Namen und
 * Symbole.
 *
 * Gibt bewusst dasselbe Objekt zurück, wenn nichts zu tun war: die Karten
 * vergleichen Konfigurationen, um unnötiges Neuzeichnen zu vermeiden.
 */
const LEGACY_GROUPS = ["darstellung", "aktion"];

export const flattenLegacyGroups = (config) => {
  if (!config || typeof config !== "object") return config;

  let touched = false;
  const flat = { ...config };

  LEGACY_GROUPS.forEach((group) => {
    const nested = flat[group];
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return;
    Object.entries(nested).forEach(([key, value]) => {
      // Ein bereits flach gesetzter Wert gewinnt – er ist der neuere.
      if (flat[key] === undefined) flat[key] = value;
    });
    delete flat[group];
    touched = true;
  });

  return touched ? flat : config;
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

/**
 * Gemeinsames CSS für eine Entitäts-Glasfläche.
 *
 * Der Aufbau ist bewusst dreischichtig:
 *   1. `--haos-*-gloss` – diagonaler Schimmer, liegt als Verlauf oben auf
 *   2. die eingefärbte Fläche darunter
 *   3. `--haos-*-sheen` – helle Kante oben, dunkle unten, als inset-Schatten
 *
 * Genau diese Trennung erzeugt den Eindruck von Glas. Eine gleichmäßig
 * getrübte Fläche mit rundum gleich hellem Rahmen wirkt stattdessen flach,
 * egal wie stark man die Weichzeichnung dreht.
 */
export const ENTITY_SURFACE_CSS = `
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

/** Gemeinsames CSS für die grosse Hintergrund-Glasfläche. */
export const CARD_SURFACE_CSS = `
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

/** Registriert eine Karte im HA-Kartenauswahldialog. */
export const registerCard = (entry) => {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === entry.type)) window.customCards.push(entry);
};

/**
 * Lädt eine Datei in Home Assistants Bildablage und gibt die Adresse zurück.
 *
 * Das ist dieselbe Schnittstelle, die HAs eigener Uploader benutzt. Der Token
 * steckt je nach Version an zwei Stellen im `hass`-Objekt – beide werden
 * probiert. Ohne Token bricht es mit klarer Meldung ab, statt eine Anfrage
 * ohne Anmeldung zu schicken.
 */
export const uploadImage = async (hass, file) => {
  const token = hass?.auth?.data?.access_token || hass?.connection?.options?.auth?.accessToken;
  if (!token) throw new Error("kein Zugangstoken im hass-Objekt");

  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/image/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText || ""}`.trim());

  const data = await response.json();
  if (!data?.id) throw new Error("Antwort ohne Bild-Kennung");
  return `/api/image/serve/${data.id}/original`;
};

/**
 * Baut ein Feld zur Bildauswahl: Vorschau, Knopf zum Hochladen, Entfernen und
 * darunter eine Pfadeingabe.
 *
 * Bewusst ohne `ha-selector` und ohne `ha-form`. Beide zeigten in
 * Kartendialogen nichts an – `ha-form` liess ein Feld mit
 * `selector: { image: {} }` stillschweigend weg, und ob `ha-selector` beim
 * Bauen schon geladen ist, ist Zufall. Genau daran ist die Bildauswahl in den
 * Einstellungen der Shell zeitweise verschwunden.
 *
 * `onChange` bekommt die neue Adresse oder einen leeren Text.
 */
export const createImageField = ({ getHass, getValue, onChange, placeholder = "/local/bild.jpg" }) => {
  const wrap = document.createElement("div");
  wrap.className = "haos-image";

  const row = document.createElement("div");
  row.className = "haos-image-row";

  const preview = document.createElement("div");
  preview.className = "haos-image-preview";
  row.append(preview);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/gif,image/webp";
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

/** Gemeinsames CSS für `createImageField`. */
export const IMAGE_FIELD_CSS = `
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
