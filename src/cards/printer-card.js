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

import { CARD_SURFACE_CSS, registerCard } from "../shared/utils.js";

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
  { key: "fan_part", label: "Bauteillüfter", domain: "sensor", section: "temps", suffixes: ["bauteillufterdrehzahl", "cooling_fan_speed"] },
  { key: "fan_aux", label: "Druckraumlüfter", domain: "sensor", section: "temps", suffixes: ["druckraumlufterdrehzahl", "aux_fan_speed"] },
  { key: "fan_hotend", label: "Druckkopflüfter", domain: "sensor", section: "temps", suffixes: ["druckkopflufterdrehzahl", "heatbreak_fan_speed"] },
  { key: "nozzle_size", label: "Düsengröße", domain: "sensor", section: "temps", suffixes: ["dusengrosse", "nozzle_size"] },

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
  ["temps", "mdi:thermometer", "Temperaturen"],
  ["ams", "mdi:tray-full", "AMS"],
  ["control", "mdi:gesture-tap-button", "Steuerung"],
  ["camera", "mdi:cctv", "Kamera"],
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

  .rail {
    width: 56px; flex: 0 0 56px; border-radius: 14px; padding: 8px 0;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .07);
  }
  .rail button {
    width: 38px; height: 38px; border-radius: 11px; border: 0; padding: 0;
    display: grid; place-items: center; cursor: pointer;
    background: none; color: rgba(var(--haos-text-rgb, 255,255,255), .45);
    transition: background .16s ease, color .16s ease;
  }
  .rail button.active { background: rgba(var(--haos-text-rgb, 255,255,255), .16); color: var(--haos-text, #fff); }
  .rail ha-icon { --mdc-icon-size: 19px; }

  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }

  .head { display: flex; align-items: center; gap: 8px; }
  .head-text { flex: 1; min-width: 0; }
  .title { font-size: 15px; font-weight: var(--haos-font-weight-medium, 500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .subtitle { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill {
    display: flex; align-items: center; gap: 5px; flex: 0 0 auto;
    border-radius: 999px; padding: 5px 10px; font-size: 12px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .10);
    color: rgba(var(--haos-text-rgb, 255,255,255), .85);
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

  .hero { border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 16px; background: rgba(var(--haos-text-rgb, 255,255,255), .10); }
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
  .slot { border-radius: 12px; padding: 10px; text-align: center; background: rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .slot[hidden] { display: none; }
  .slot.active { box-shadow: inset 0 0 0 1px var(--haos-accent, #0a84ff); }
  .slot-dot { width: 22px; height: 22px; margin: 0 auto 6px; border-radius: 50%; background: rgba(var(--haos-text-rgb, 255,255,255), .25); }
  .slot-name { font-size: 12px; font-weight: var(--haos-font-weight-medium, 500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slot-label { font-size: 10px; margin-top: 2px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  .controls { display: flex; flex-wrap: wrap; gap: 8px; }
  .ctrl {
    flex: 1 1 120px; min-width: 0; padding: 12px 10px; border: 0; border-radius: 12px; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .10); color: var(--haos-text, #fff);
    transition: background .16s ease, transform .12s ease;
  }
  .ctrl:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .16); }
  .ctrl:active { transform: scale(.97); }
  .ctrl[hidden] { display: none; }
  .ctrl.danger { color: var(--haos-bad, #ff6b6b); }
  .ctrl.armed { background: color-mix(in srgb, var(--haos-bad, #ff6b6b) 26%, transparent); }
  .ctrl.on { background: color-mix(in srgb, var(--haos-accent, #0a84ff) 28%, transparent); }
  .ctrl ha-icon { --mdc-icon-size: 22px; }

  select.speed {
    width: 100%; padding: 10px 12px; border-radius: 12px; font: inherit; color: var(--haos-text, #fff);
    background: rgba(var(--haos-text-rgb, 255,255,255), .10);
    border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .14);
  }
  select.speed option { color: #18212a; }

  .camera-wrap { flex: 1; min-height: 0; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,.35); position: relative; }
  .camera-wrap img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .camera-note { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; padding: 12px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .camera-note[hidden] { display: none; }

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

    const head = el("div", "head");
    const headText = el("div", "head-text");
    const title = el("div", "title");
    const subtitle = el("div", "subtitle");
    headText.append(title, subtitle);

    const statePill = el("div", "pill");
    const statePillIcon = icon("mdi:printer-3d-nozzle");
    const statePillText = el("span");
    statePill.append(statePillIcon, statePillText);

    const errorPill = el("div", "pill bad");
    const errorPillText = el("span");
    errorPill.append(icon("mdi:alert"), errorPillText);

    head.append(headText, errorPill, statePill);

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
        { key: "task", label: "Auftrag" },
        { key: "stage", label: "Arbeitsschritt" },
        { key: "remaining", label: "Restzeit" },
        { key: "end_time", label: "Fertig um" },
        { key: "layer_of", label: "Schicht" },
      ],
      overviewRows
    );
    overview.append(hero, overviewRows);

    // --- Temperaturen
    const temps = el("div", "panel rows");
    rowPanel(
      [
        { key: "nozzle_pair", label: "Düse" },
        { key: "bed_pair", label: "Druckbett" },
        { key: "nozzle_size", label: "Düsengröße" },
        { key: "fan_part", label: "Bauteillüfter" },
        { key: "fan_aux", label: "Druckraumlüfter" },
        { key: "fan_hotend", label: "Druckkopflüfter" },
      ],
      temps
    );

    // --- AMS
    const ams = el("div", "panel");
    const slots = el("div", "slots");
    const slotNodes = [1, 2, 3, 4].map((number) => {
      const slot = el("div", "slot");
      const dot = el("div", "slot-dot");
      const name = el("div", "slot-name", "–");
      slot.append(dot, name, el("div", "slot-label", `Slot ${number}`));
      slots.append(slot);
      return { slot, dot, name };
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
    const control = el("div", "panel");
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
    const speedSelect = document.createElement("select");
    speedSelect.className = "speed";
    const controlNote = el("div", "panel-note");
    control.append(controls, speedSelect, controlNote);

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

    speedSelect.addEventListener("change", () => {
      const entity = resolveField(this._config, "speed");
      if (!entity) return;
      const domain = entity.split(".")[0];
      this._hass?.callService(domain, "select_option", { entity_id: entity, option: speedSelect.value });
    });

    // --- Kamera
    const camera = el("div", "panel");
    const cameraWrap = el("div", "camera-wrap");
    const cameraImage = document.createElement("img");
    cameraImage.alt = "";
    const cameraNote = el("div", "camera-note");
    cameraWrap.append(cameraImage, cameraNote);
    camera.append(cameraWrap);

    const empty = el("div", "empty");
    empty.append(
      el("strong", null, "Noch kein Drucker gewählt"),
      el("span", null, "Im Editor oben eine Entität des Druckers wählen – die übrigen Felder füllen sich dann von selbst.")
    );

    const panels = { overview, temps, ams, control, camera };
    Object.values(panels).forEach((panel) => main.append(panel));
    main.prepend(head);
    main.append(empty);
    card.append(rail, main);

    this._nodes = {
      card, rail, buttons, title, subtitle,
      statePill, statePillIcon, statePillText, errorPill, errorPillText,
      heroValue, barFill, footLeft, footRight, heroImage,
      rows, slotNodes, panels, empty,
      pauseBtn, resumeBtn, stopBtn, lightBtn, speedSelect, controlNote, cameraImage, cameraNote,
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
      nodes.title.textContent = this._config?.name || "Drucker";
      nodes.subtitle.textContent = "";
      nodes.statePill.hidden = true;
      nodes.errorPill.hidden = true;
      return;
    }

    this._updateHead();
    this._updateOverview();
    this._updateTemps();
    this._updateAms();
    this._updateControl();
    this._updateCamera();
  }

  _updateHead() {
    const nodes = this._nodes;
    const status = this._state("status");
    const online = this._state("online");

    nodes.title.textContent =
      this._config.name || status?.attributes?.device_name || this._deviceName() || "Drucker";

    const stage = this._state("stage");
    nodes.subtitle.textContent = stage && !["unknown", "unavailable"].includes(stage.state) ? stage.state : "";

    if (status && !["unknown", "unavailable"].includes(status.state)) {
      const running = ["printing", "running", "druckt", "drucken"].includes(String(status.state).toLowerCase());
      nodes.statePill.hidden = false;
      nodes.statePill.classList.toggle("good", running);
      nodes.statePillIcon.icon = running ? "mdi:printer-3d-nozzle" : "mdi:printer-3d";
      nodes.statePillText.textContent = status.state;
    } else if (online) {
      nodes.statePill.hidden = false;
      nodes.statePill.classList.toggle("good", online.state === "on");
      nodes.statePillText.textContent = online.state === "on" ? "Online" : "Offline";
    } else {
      nodes.statePill.hidden = true;
    }

    const error = this._state("error");
    const hms = this._state("hms");
    const problems = [error, hms].filter((state) => state?.state === "on").length;
    nodes.errorPill.hidden = problems === 0;
    nodes.errorPillText.textContent = problems > 1 ? `${problems} Fehler` : "Fehler";
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

    this._row("remaining", remaining);
    this._row("end_time", end && !["unknown", "unavailable"].includes(end.state) ? end.state : "");

    const layer = numberOf(this._state("layer"));
    const layers = numberOf(this._state("layers"));
    this._row(
      "layer_of",
      layer === null && layers === null ? "" : `${formatNumber(layer)} / ${formatNumber(layers)}`
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

  _updateTemps() {
    const pair = (currentKey, targetKey) => {
      const current = this._state(currentKey);
      const target = this._state(targetKey);
      const currentValue = numberOf(current);
      const targetValue = numberOf(target);
      if (currentValue === null && targetValue === null) return "";
      const unit = unitOf(current) || unitOf(target) || "°C";
      const shown = `${formatNumber(currentValue, 0)} ${unit}`;
      return targetValue ? `${shown} → ${formatNumber(targetValue, 0)} ${unit}` : shown;
    };

    this._row("nozzle_pair", pair("nozzle", "nozzle_target"));
    this._row("bed_pair", pair("bed", "bed_target"));

    const size = this._state("nozzle_size");
    this._row("nozzle_size", size && !["unknown", "unavailable"].includes(size.state) ? `${size.state} ${unitOf(size)}`.trim() : "");

    ["fan_part", "fan_aux", "fan_hotend"].forEach((key) => {
      const state = this._state(key);
      const value = numberOf(state);
      this._row(key, value === null ? "" : `${formatNumber(value)} ${unitOf(state) || "%"}`);
    });
  }

  _updateAms() {
    const active = this._state("ams_active");
    const activeIndex = numberOf(active);

    this._nodes.slotNodes.forEach(({ slot, dot, name }, index) => {
      const state = this._state(`ams_slot_${index + 1}`);
      if (!state) {
        slot.hidden = true;
        return;
      }
      slot.hidden = false;
      const empty = ["unknown", "unavailable", "", "Empty", "leer"].includes(state.state);
      name.textContent = empty ? "leer" : state.state;
      // Die Integration liefert die Filamentfarbe als Attribut – damit wird
      // der Punkt eingefärbt, sonst bleibt er neutral.
      const colour = state.attributes?.color || state.attributes?.colour || state.attributes?.filament_color;
      dot.style.background = colour ? (String(colour).startsWith("#") ? colour : `#${colour}`) : "";
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
    nodes.speedSelect.hidden = !speed || !options.length;
    if (speed && options.length) {
      const current = options.join("|");
      if (nodes.speedSelect.dataset.options !== current) {
        nodes.speedSelect.dataset.options = current;
        nodes.speedSelect.replaceChildren(
          ...options.map((option) => {
            const node = document.createElement("option");
            node.value = option;
            node.textContent = option;
            return node;
          })
        );
      }
      if (nodes.speedSelect.value !== speed.state) nodes.speedSelect.value = speed.state;
    }
  }

  _updateCamera() {
    const nodes = this._nodes;
    const camera = this._state("camera");
    const picture = camera?.attributes?.entity_picture;

    if (!camera) {
      nodes.cameraNote.hidden = false;
      nodes.cameraNote.textContent = "Keine Kamera gewählt.";
      nodes.cameraImage.hidden = true;
      return;
    }
    if (!picture || camera.state === "unavailable") {
      nodes.cameraNote.hidden = false;
      nodes.cameraNote.textContent = "Kamera nicht erreichbar.";
      nodes.cameraImage.hidden = true;
      return;
    }

    nodes.cameraNote.hidden = true;
    nodes.cameraImage.hidden = false;

    // Nur im sichtbaren Bereich laden – ein Standbild alle paar Sekunden
    // reicht, und auf einer verlassenen Seite soll gar nichts laufen.
    if (this._section !== "camera") {
      if (nodes.cameraImage.getAttribute("src")) nodes.cameraImage.removeAttribute("src");
      clearInterval(this._cameraTimer);
      this._cameraTimer = null;
      return;
    }

    const paint = () => {
      nodes.cameraImage.src = `${picture}${picture.includes("?") ? "&" : "?"}_=${Date.now()}`;
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
