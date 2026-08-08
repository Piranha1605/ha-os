/**
 * HA-OS – Druckerkarte (`custom:ha-os-printer`)
 *
 * Für Bambu-Lab-Drucker über die Integration `ha-bambulab`. Aufbau wie die
 * Fahrzeugkarte: Symbolleiste links, rechts der gewählte Bereich.
 *
 * **Nichts ist fest verdrahtet.** Jede Entität ist im Editor einzeln wählbar.
 * Das Feld *Drucker* ist nur eine Bequemlichkeit: daraus wird der Rest
 * geraten. Zwei Gründe, warum das hier weniger verlässlich ist als beim Auto:
 *
 * 1. Die Kennung ist der **Gerätename** – `p1s`, `x1c`, `bambu_p1s`. Sie kann
 *    mehrere Abschnitte haben, deshalb wird die längste passende Kennung
 *    gesucht statt stur der erste Abschnitt genommen.
 * 2. Die Namen der Messwerte hängen an der **Sprache** der Installation:
 *    `druckstatus` hier, `print_status` anderswo. Deshalb trägt jedes Feld
 *    mehrere mögliche Endungen.
 *
 * Was die Suche nicht findet, bleibt leer – und die Karte zeigt dann auch
 * keine Zeile dafür. Eine Liste voller Striche hilft niemandem.
 */

import {
  CARD_SURFACE_CSS,
  CONTROL_SURFACE_CSS,
  ENTITY_SURFACE_CSS,
  SEGMENTED_CSS,
  createSegmented,
  registerCard,
} from "../shared/utils.js";

const TAG = "ha-os-printer";
const EDITOR_TAG = "ha-os-printer-editor";

/**
 * Alle Werte der Karte.
 *
 * `suffixes` sind die möglichen Endungen der Objekt-ID, deutsch und englisch.
 * `domain` grenzt die Suche ein, damit ein `fan.`-Eintrag nicht als Messwert
 * durchgeht.
 */
export const FIELDS = [
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

  { key: "camera", label: "Kamera", domain: "camera", section: "camera", suffixes: ["kamera", "camera"] },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((field) => [field.key, field]));

/**
 * Rät die Entitäten aus einer gewählten.
 *
 * Der Gerätename kann mehrere Abschnitte haben (`bambu_p1s_druckstatus`).
 * Deshalb werden alle Kennungen von lang nach kurz probiert und die erste
 * genommen, die überhaupt etwas findet – die längste passende ist die
 * genaueste.
 */
export const guessEntities = (baseEntity, hass) => {
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
      const match = field.suffixes
        .map((suffix) => `${field.domain}.${prefix}_${suffix}`)
        .find((candidate) => ids.includes(candidate));
      if (match) found[field.key] = match;
    });
    // Ein einzelner Treffer wäre Zufall – erst ab drei ist die Kennung glaubhaft.
    if (Object.keys(found).length >= 3) best = found;
  });

  return best;
};

/** Ausdrücklich gesetztes Feld schlägt die Vermutung. */
export const resolveField = (config, key) => config?.[`entity_${key}`] || "";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const icon = (name) => {
  const node = document.createElement("ha-icon");
  node.icon = name;
  return node;
};

const SECTIONS = [
  ["overview", "mdi:printer-3d", "Übersicht"],
  ["fans", "mdi:fan", "Lüfter"],
  ["ams", "mdi:tray-full", "AMS"],
];

const STYLES = `
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
    ${ENTITY_SURFACE_CSS}
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
    ${ENTITY_SURFACE_CSS}
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

  .hero { padding: 14px; display: flex; align-items: center; gap: 16px; ${ENTITY_SURFACE_CSS} }
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
  .slot { padding: 10px; text-align: center; ${ENTITY_SURFACE_CSS} }
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
  .fan { padding: 12px; ${ENTITY_SURFACE_CSS} }
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
    ${ENTITY_SURFACE_CSS}
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
  .media { position: relative; flex: 1; min-height: 120px; overflow: hidden; ${ENTITY_SURFACE_CSS} }
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
  .graph { min-width: 0; padding: 10px; ${ENTITY_SURFACE_CSS} }
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

const numberOf = (state) => {
  if (!state || ["unknown", "unavailable", ""].includes(state.state)) return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
};

const unitOf = (state) => state?.attributes?.unit_of_measurement || "";

const formatNumber = (value, digits = 0) =>
  value === null ? "–" : value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** „2 h 14 min" – Restzeiten kommen je nach Version in Minuten oder als Text. */
export const formatMinutes = (state) => {
  const minutes = numberOf(state);
  if (minutes === null) return state && !["unknown", "unavailable"].includes(state.state) ? state.state : "";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

class HaOsPrinterCard extends HTMLElement {
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
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return { type: `custom:${TAG}` };
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
    style.textContent = STYLES;

    const card = el("div", "card");
    const rail = el("div", "rail");
    const buttons = new Map();

    SECTIONS.forEach(([key, iconName, label]) => {
      const button = el("button");
      button.append(icon(iconName));
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

    const main = el("div", "main");

    // --- Übersicht
    const overview = el("div", "panel");
    const hero = el("div", "hero");
    const heroMain = el("div", "hero-main");
    const heroLabel = el("div", "hero-label", "Fortschritt");
    const heroValue = el("div", "hero-value", "–");
    const bar = el("div", "bar");
    const barFill = el("span");
    bar.append(barFill);
    const heroFoot = el("div", "hero-foot");
    const footLeft = el("span");
    const footRight = el("span");
    heroFoot.append(footLeft, footRight);
    heroMain.append(heroLabel, heroValue, bar, heroFoot);
    const heroImage = el("div", "hero-image");
    heroImage.append(icon("mdi:image-outline"));
    hero.append(heroMain, heroImage);

    const rows = {};
    const rowPanel = (keys, parent) => {
      keys.forEach(({ key, label }) => {
        const row = el("div", "row");
        row.append(el("span", "row-label", label));
        const value = el("span", "row-value", "–");
        row.append(value);
        parent.append(row);
        rows[key] = { row, value };
      });
    };

    const overviewRows = el("div", "rows");
    rowPanel(
      [
        { key: "status", label: "Status" },
        { key: "error", label: "Fehler" },
        { key: "task", label: "Auftrag" },
        { key: "stage", label: "Arbeitsschritt" },
        { key: "end_time", label: "Fertig um" },
        { key: "nozzle_size", label: "Düse" },
        { key: "layer_of", label: "Schicht" },
      ],
      overviewRows
    );

    // Zwei Spalten: links der Verlauf des Auftrags, rechts Bild und
    // Temperaturen. Auf schmalen Flaechen fallen sie untereinander.
    const columns = el("div", "columns");
    const left = el("div", "col");
    const right = el("div", "col");
    // `control` wird weiter unten gebaut und hier nachgereicht.

    // Bild und Kamera teilen sich eine Kachel und werden umgeschaltet -
    // deshalb braucht es keinen eigenen Kamerabereich mehr.
    const media = el("div", "media");
    const mediaImage = document.createElement("img");
    mediaImage.alt = "";
    const mediaNote = el("div", "media-note");
    const mediaToggle = el("div", "media-toggle");
    const mediaSeg = createSegmented({
      options: [
        { value: "photo", label: "Foto" },
        { value: "camera", label: "Kamera" },
      ],
      value: "photo",
      ariaLabel: "Bildquelle",
      onChange: (value) => {
        this._media = value;
        this._update();
      },
    });
    mediaToggle.append(mediaSeg.element);
    media.append(mediaImage, mediaNote, mediaToggle);

    const graph = this._buildGraph();
    right.append(media, graph.element);
    columns.append(left, right);
    overview.append(columns);

    // --- Lüfter
    //
    // Die Temperaturen sind auf die Übersicht gewandert, hier stehen die
    // Lüfter. `fan`-Entitäten nehmen `set_percentage` entgegen – deshalb ein
    // Regler statt einer Anzeige.
    const fans = el("div", "panel");
    const fanNodes = [
      ["fan_part_ctrl", "fan_part", "Bauteillüfter"],
      ["fan_aux_ctrl", "fan_aux", "Druckraumlüfter"],
      ["fan_chamber_ctrl", "fan_hotend", "Druckkopflüfter"],
    ].map(([key, speedKey, label]) => {
      const box = el("div", "fan");

      const head = el("div", "fan-head");
      const name = el("span", "fan-name", label);
      const value = el("span", "fan-value", "–");
      head.append(name, value);

      // Der Regler liegt unsichtbar über der Spur. Der native Regler lässt
      // sich nicht zuverlässig einfärben, die Spur darunter schon – dasselbe
      // Vorgehen wie beim runden Farbwähler in den Einstellungen.
      const track = el("div", "fan-track");
      const fill = el("span", "fan-fill");
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.step = "5";
      track.append(fill, input);

      const speed = el("div", "fan-speed");
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
          ...(percentage === 0 ? {} : { percentage }),
        });
      });

      return { key, speedKey, box, value, fill, input, speed };
    });

    const fanNote = el("div", "panel-note");
    fans.append(fanNote);

    // --- AMS
    const ams = el("div", "panel");
    const slots = el("div", "slots");
    const slotNodes = [1, 2, 3, 4].map((number) => {
      const slot = el("div", "slot");
      const dot = el("div", "slot-dot");
      const name = el("div", "slot-name", "–");
      const kind = el("div", "slot-label", `Slot ${number}`);
      // Fuellstand der Spule. Die Integration liefert ihn als `remain`, aber
      // nur wenn der Drucker ihn messen kann - bei Fremdspulen ohne Chip
      // steht dort -1 und `remain_enabled` ist falsch. Dann bleibt der
      // Balken weg, statt eine erfundene Menge zu zeigen.
      const fill = el("div", "slot-fill");
      const fillBar = el("span");
      fill.append(fillBar);
      const fillText = el("div", "slot-remain");
      slot.append(dot, name, kind, fill, fillText);
      slots.append(slot);
      return { slot, dot, name, kind, fill, fillText };
    });
    const amsRows = el("div", "rows");
    rowPanel(
      [
        { key: "ams_temp", label: "Temperatur" },
        { key: "ams_humidity", label: "Luftfeuchte" },
      ],
      amsRows
    );
    ams.append(slots, amsRows);

    // --- Steuerung
    //
    // Sie steht direkt auf der Uebersicht statt in einem eigenen Bereich: die
    // Knoepfe sind das, was man am haeufigsten braucht, und links unten war
    // ohnehin Platz. Die Leiste hat dadurch drei Symbole statt vier.
    const control = el("div", "control-block");
    const controls = el("div", "controls");
    const makeCtrl = (iconName, label, className = "") => {
      const button = el("button", `ctrl ${className}`.trim());
      button.append(icon(iconName), el("span", null, label));
      controls.append(button);
      return button;
    };
    const pauseBtn = makeCtrl("mdi:pause", "Anhalten");
    const resumeBtn = makeCtrl("mdi:play", "Fortsetzen");
    const stopBtn = makeCtrl("mdi:stop", "Beenden", "danger");
    const lightBtn = makeCtrl("mdi:lightbulb", "Kammerlicht");
    const speedWrap = el("div", "speed-wrap");
    const speedSeg = createSegmented({
      options: [],
      ariaLabel: "Druckgeschwindigkeit",
      onChange: (value) => {
        const entity = resolveField(this._config, "speed");
        if (!entity) return;
        this._hass?.callService(entity.split(".")[0], "select_option", { entity_id: entity, option: value });
      },
    });
    speedWrap.append(speedSeg.element);
    const controlNote = el("div", "panel-note");
    control.append(controls, speedWrap, controlNote);

    pauseBtn.addEventListener("click", () => this._press("pause"));
    resumeBtn.addEventListener("click", () => this._press("resume"));
    lightBtn.addEventListener("click", () => {
      const entity = resolveField(this._config, "light");
      if (entity) this._hass?.callService("light", "toggle", { entity_id: entity });
    });

    // Beenden fragt nach: ein Fehlgriff wäre ein abgebrochener Druck nach
    // Stunden. Erst der zweite Druck innerhalb von fünf Sekunden löst aus.
    stopBtn.addEventListener("click", () => {
      if (!this._armed) {
        this._armed = true;
        this._update();
        clearTimeout(this._armTimer);
        this._armTimer = setTimeout(() => {
          this._armed = false;
          this._update();
        }, 5000);
        return;
      }
      clearTimeout(this._armTimer);
      this._armed = false;
      this._press("stop");
      this._update();
    });

    const empty = el("div", "empty");
    empty.append(
      el("strong", null, "Noch kein Drucker gewählt"),
      el("span", null, "Im Editor oben eine Entität des Druckers wählen – die übrigen Felder füllen sich dann von selbst.")
    );

    left.append(hero, overviewRows, control);

    const panels = { overview, fans, ams };
    Object.values(panels).forEach((panel) => main.append(panel));
    main.append(empty);
    card.append(rail, main);

    this._nodes = {
      card, rail, buttons,
      heroValue, barFill, footLeft, footRight, heroImage,
      rows, slotNodes, panels, empty, fanNodes, fanNote,
      pauseBtn, resumeBtn, stopBtn, lightBtn, speedSeg, speedWrap, controlNote,
      mediaImage, mediaNote, mediaSeg, mediaToggle, graph,
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
  _row(key, text, tone = "") {
    const row = this._nodes.rows[key];
    if (!row) return;
    const empty = text === "" || text === null || text === undefined;
    row.row.hidden = empty;
    row.value.textContent = empty ? "" : text;
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
    this._row("error", problems ? (problems > 1 ? `${problems} Fehler` : "Fehler") : "", "bad");
  }

  /** Aus einer Entitäts-ID einen brauchbaren Namen ableiten, z. B. „P1S". */
  _deviceName() {
    const first = this._watchedEntities()[0] || "";
    const objectId = first.split(".")[1] || "";
    return objectId.split("_")[0]?.toUpperCase() || "";
  }

  _updateOverview() {
    const nodes = this._nodes;
    const progress = numberOf(this._state("progress"));
    nodes.heroValue.textContent = progress === null ? "–" : `${formatNumber(progress)} %`;
    nodes.barFill.style.width = progress === null ? "0%" : `${Math.max(0, Math.min(100, progress))}%`;

    const remaining = formatMinutes(this._state("remaining"));
    nodes.footLeft.textContent = remaining ? `noch ${remaining}` : "";

    const end = this._state("end_time");
    nodes.footRight.textContent = end && !["unknown", "unavailable"].includes(end.state) ? `fertig ${end.state}` : "";

    const task = this._state("task");
    this._row("task", task && !["unknown", "unavailable"].includes(task.state) ? task.state : "");

    const stage = this._state("stage");
    this._row("stage", stage && !["unknown", "unavailable"].includes(stage.state) ? stage.state : "");

    // Keine eigene Zeile fuer die Restzeit: sie steht schon unter dem
    // Fortschrittsbalken. Zweimal dieselbe Zahl untereinander liest niemand.
    this._row("end_time", end && !["unknown", "unavailable"].includes(end.state) ? end.state : "");

    const layer = numberOf(this._state("layer"));
    const layers = numberOf(this._state("layers"));
    this._row(
      "layer_of",
      layer === null && layers === null ? "" : `${formatNumber(layer)} / ${formatNumber(layers)}`
    );

    const size = this._state("nozzle_size");
    this._row(
      "nozzle_size",
      size && !["unknown", "unavailable"].includes(size.state) ? `${size.state} ${unitOf(size)}`.trim() : ""
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
    const dark = Math.round((value / 100) * 55);
    node.fill.style.background =
      `linear-gradient(90deg, ` +
      `color-mix(in srgb, var(--haos-accent, #0a84ff) 72%, white), ` +
      `color-mix(in srgb, var(--haos-accent, #0a84ff) ${100 - dark}%, black))`;
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

      // Nicht überschreiben, während jemand zieht – sonst springt der Regler
      // unter dem Finger zurück, sobald eine Zustandsmeldung eintrifft.
      if (document.activeElement !== fan.input && fan.input.value !== String(value)) {
        fan.input.value = String(value);
      }
      fan.value.textContent = `${Math.round(value)} %`;
      this._paintFan(fan, value);

      const speedState = this._state(fan.speedKey);
      const speed = numberOf(speedState);
      fan.speed.textContent = speed === null ? "" : `${formatNumber(speed)} ${unitOf(speedState) || "U/min"}`;
      fan.speed.hidden = speed === null;
    });

    nodes.fanNote.textContent = anyFan
      ? ""
      : "Keine Lüfter gewählt. Im Editor unter „Lüfter“ die fan-Entitäten des Druckers setzen.";
  }

  _updateAms() {
    const active = this._state("ams_active");
    const activeIndex = numberOf(active);

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

      // Die Farbe kommt als #RRGGBB oder #RRGGBBAA. Die Alpha-Stellen fallen
      // weg, sonst wird der Punkt bei manchen Filamenten durchsichtig.
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
    const tempValue = numberOf(temp);
    this._row("ams_temp", tempValue === null ? "" : `${formatNumber(tempValue, 1)} ${unitOf(temp) || "°C"}`);

    const humidity = this._state("ams_humidity");
    const humidityValue = numberOf(humidity);
    this._row(
      "ams_humidity",
      humidityValue === null
        ? humidity && !["unknown", "unavailable"].includes(humidity.state)
          ? humidity.state
          : ""
        : `${formatNumber(humidityValue)} ${unitOf(humidity) || "%"}`
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
    nodes.controlNote.textContent = this._armed
      ? "Noch einmal tippen beendet den Druck. Die Rückfrage verfällt nach fünf Sekunden."
      : "";

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
    // Zwei getrennte Kacheln nebeneinander statt einer gemeinsamen. Duese und
    // Bett liegen selten im selben Bereich - in einem Diagramm klebt die eine
    // Linie dann oben und die andere unten, und beide sind schlecht zu lesen.
    // Jede Kachel skaliert fuer sich.
    const wrap = el("div", "graphs");

    const build = (title, lineClass) => {
      const box = el("div", "graph");
      const head = el("div", "graph-head");
      const label = el("span", "graph-label", title);
      const value = el("span", "graph-value", "–");
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

      const note = el("div", "graph-note", "sammelt Werte");
      box.append(head, svg, note);
      wrap.append(box);
      return { box, value, line, note };
    };

    this._graph = {
      wrap,
      nozzle: build("Düse", "l-nozzle"),
      bed: build("Bett", "l-bed"),
    };
    return { element: wrap };
  }

  /** Punkte anhängen, höchstens alle 15 Sekunden einen. */
  _recordSeries() {
    const now = Date.now();
    if (this._lastPoint && now - this._lastPoint < 15000) return;

    const nozzle = numberOf(this._state("nozzle"));
    const bed = numberOf(this._state("bed"));
    if (nozzle === null && bed === null) return;

    this._lastPoint = now;
    this._series = this._series || { nozzle: [], bed: [] };
    if (nozzle !== null) this._series.nozzle.push({ t: now, v: nozzle });
    if (bed !== null) this._series.bed.push({ t: now, v: bed });

    const cutoff = now - 60 * 60 * 1000;
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
      const start = new Date(Date.now() - 60 * 60 * 1000);
      const path =
        `history/period/${encodeURIComponent(start.toISOString())}` +
        `?filter_entity_id=${encodeURIComponent(ids.join(","))}` +
        `&minimal_response&no_attributes`;
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

      // Bereits gesammelte Punkte behalten – sie sind neuer als der Verlauf.
      this._series = {
        nozzle: [...series.nozzle, ...(this._series?.nozzle || [])].slice(-240),
        bed: [...series.bed, ...(this._series?.bed || [])].slice(-240),
      };
      this._updateGraph();
    } catch (_error) {
      /* Ohne Aufzeichnung wächst die Kurve eben ab jetzt. */
    }
  }

  _updateGraph() {
    if (!this._graph) return;

    const nozzle = numberOf(this._state("nozzle"));
    const bed = numberOf(this._state("bed"));

    this._graph.wrap.hidden = nozzle === null && bed === null;
    if (this._graph.wrap.hidden) return;

    this._recordSeries();
    if (this._section === "overview") this._seedSeries();

    const series = this._series || { nozzle: [], bed: [] };

    const paint = (target, points, current) => {
      target.box.hidden = current === null;
      if (current === null) return;
      target.value.textContent = `${formatNumber(current)} °C`;

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
      // Mindestens zehn Grad Spanne, sonst macht das Rauschen eines
      // stehenden Druckers aus zwei Grad ein dramatisches Gebirge.
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const mid = (vMin + vMax) / 2;
      const half = Math.max((vMax - vMin) / 2, 5);
      const low = mid - half;
      const spanV = half * 2;

      target.line.setAttribute(
        "points",
        points
          .map((point) => {
            const x = ((point.t - tMin) / spanT) * 160;
            const y = 48 - ((point.v - low) / spanV) * 48;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
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

    // Ohne Kamera kein Umschalter – ein einzelner Knopf waere nur Zierde.
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
    if (!this._cameraTimer) this._cameraTimer = setInterval(paint, 5000);
  }

  disconnectedCallback() {
    clearInterval(this._cameraTimer);
    this._cameraTimer = null;
    clearTimeout(this._armTimer);
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HaOsPrinterCard);

registerCard({
  type: TAG,
  name: "HA-OS Drucker",
  description: "3D-Drucker (Bambu Lab) – Fortschritt, Temperaturen, AMS, Steuerung und Kamera.",
  preview: false,
});

export { HaOsPrinterCard, TAG as PRINTER_TAG, EDITOR_TAG as PRINTER_EDITOR_TAG, SECTIONS };
