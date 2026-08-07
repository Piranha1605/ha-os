/**
 * HA-OS – Fahrzeugkarte (`custom:ha-os-vehicle`)
 *
 * Stufe 1: die Übersicht. Kopfzeile mit Zustand, grosse Reichweite mit
 * Füllstandsbalken, vier Kacheln darunter. Die Symbolleiste links ist
 * angelegt, aber nur der erste Bereich ist gefüllt – die übrigen kommen in
 * Stufe 2 und 3.
 *
 * Vorbild ist `ngocjohn/vehicle-info-card` (MIT). Übernommen sind Zuschnitt
 * und Feldbelegung, nicht der Code: jene Karte baut auf Lit und rendert bei
 * jeder Zustandsänderung neu. HA-OS baut das DOM einmal und ändert danach
 * nur noch Werte.
 *
 * Zur Konfiguration: `mbapi2020` benennt seine Entitäten nach dem Muster
 * `sensor.<kennung>_<messwert>`. Aus einer einzigen gewählten Entität lässt
 * sich deshalb der Rest ableiten – der Anwender wählt das Fahrzeug einmal
 * statt fünfzehn Felder zu füllen. Jedes Feld bleibt trotzdem einzeln
 * überschreibbar, denn die Fensterkontakte tragen bei manchen Anlagen den
 * Gerätenamen davor und fallen aus dem Muster.
 */

import { CARD_SURFACE_CSS, registerCard, statusClass } from "../shared/utils.js";

const TAG = "ha-os-vehicle";
const EDITOR_TAG = "ha-os-vehicle-editor";

/** Messwerte, die sich aus der Kennung ableiten lassen. */
export const DERIVED = {
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
};

/**
 * Warnleuchten, gesammelt in einer Kachel.
 *
 * Die Reifenwarnung fehlt hier bewusst: sie hat eine eigene Kachel. Stünde sie
 * in beiden, meldete ein platter Reifen zweimal dasselbe.
 */
export const WARNINGS = [
  ["binary_sensor.{id}_engine_light_warning", "Motorkontrollleuchte"],
  ["binary_sensor.{id}_low_brake_fluid_warning", "Bremsflüssigkeit"],
  ["binary_sensor.{id}_low_coolant_level_warning", "Kühlmittel"],
  ["binary_sensor.{id}_low_wash_water_warning", "Wischwasser"],
];

/**
 * Die Kennung ist der erste Abschnitt der Objekt-ID: aus
 * `sensor.clpef165_average_speed_reset` wird `clpef165`. Alles danach ist der
 * Messwert und kann selbst Unterstriche enthalten.
 */
export const vehicleId = (entityId) => String(entityId || "").split(".")[1]?.split("_")[0] || "";

/** Ausdrücklich gesetztes Feld schlägt die Ableitung. */
export const resolveEntity = (config, key) => {
  if (config?.[`entity_${key}`]) return config[`entity_${key}`];
  const id = vehicleId(config?.entity);
  return id && DERIVED[key] ? DERIVED[key].replace("{id}", id) : "";
};

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
  ["overview", "mdi:car", "Übersicht"],
  ["trip", "mdi:map-marker-path", "Fahrt"],
  ["status", "mdi:shield-check", "Status"],
  ["tires", "mdi:car-tire-alert", "Reifen"],
  ["eco", "mdi:leaf", "Eco"],
];

const STYLES = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }

  .card {
    height: 100%; padding: 10px; display: flex; gap: 10px; overflow: hidden;
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    ${CARD_SURFACE_CSS}
  }

  /* --- Symbolleiste links, Vorbild CarPlay --- */
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
    border-radius: 999px; padding: 5px 10px; font-size: 12px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .10);
    color: rgba(var(--haos-text-rgb, 255,255,255), .85);
  }
  .pill[hidden] { display: none; }
  .pill.good { color: var(--haos-good, #7ee0b0); }
  .pill.bad { color: var(--haos-bad, #ff6b6b); }
  .pill ha-icon { --mdc-icon-size: 14px; }

  /* --- Reichweite --- */
  .hero {
    border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 16px;
    background: rgba(var(--haos-text-rgb, 255,255,255), .10);
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
  .tile { border-radius: 12px; padding: 10px; min-width: 0; background: rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .tile-label { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-value { font-size: 14px; font-weight: var(--haos-font-weight-medium, 500); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-value.good { color: var(--haos-good, #7ee0b0); }
  .tile-value.bad { color: var(--haos-bad, #ff6b6b); }

  .placeholder { flex: 1; display: grid; place-content: center; text-align: center; gap: 6px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .error { display: grid; place-content: center; height: 100%; text-align: center; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
`;

/** Zahl aus einem Zustand, oder null. `Number(null)` wäre 0 – das wäre gelogen. */
const numberOf = (state) => {
  if (!state || state.state === "unknown" || state.state === "unavailable" || state.state === "") return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
};

const unitOf = (state) => state?.attributes?.unit_of_measurement || "";

/** Verriegelt sind bei mbapi2020 die Zustände 0 und "locked". */
const isLocked = (state) => {
  const value = String(state?.state ?? "").toLowerCase();
  return value === "0" || value === "locked" || value === "lock" || value === "off";
};

const formatNumber = (value, digits = 0) =>
  value === null ? "–" : value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

class HaOsVehicleCard extends HTMLElement {
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
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return { type: `custom:${TAG}`, entity: "" };
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
    // Wie bei allen HA-OS-Karten: nur aktualisieren, wenn eine der beobachteten
    // Entitäten sich wirklich geändert hat. Sonst liefe das bei jeder
    // Zustandsmeldung im ganzen Haus.
    if (first || this._watchedChanged(hass)) this._update();
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: "full", min_rows: 3 };
  }

  _watchedEntities() {
    const keys = Object.keys(DERIVED).map((key) => resolveEntity(this._config, key));
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
    style.textContent = STYLES;

    const card = el("div", "card");
    const rail = el("div", "rail");
    const buttons = new Map();

    SECTIONS.forEach(([key, iconName, label]) => {
      const button = el("button");
      button.append(icon(iconName));
      button.title = label;
      button.setAttribute("aria-label", label);
      // Stufe 1 füllt nur die Übersicht. Die übrigen bleiben sichtbar, damit
      // erkennbar ist, was noch kommt – aber sie führen ins Leere.
      if (key !== "overview") button.disabled = true;
      button.addEventListener("click", () => {
        if (button.disabled) return;
        this._section = key;
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

    const lockPill = el("div", "pill");
    const lockIcon = icon("mdi:lock");
    const lockText = el("span");
    lockPill.append(lockIcon, lockText);

    const windowPill = el("div", "pill");
    const windowIcon = icon("mdi:car-door");
    const windowText = el("span");
    windowPill.append(windowIcon, windowText);

    head.append(headText, lockPill, windowPill);

    const hero = el("div", "hero");
    const heroMain = el("div", "hero-main");
    const heroLabel = el("div", "hero-label", "Reichweite");
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
    heroImage.append(icon("mdi:car-side"));

    hero.append(heroMain, heroImage);

    const tiles = el("div", "tiles");
    const tileNodes = ["tires", "oil", "warnings", "battery"].map((key) => {
      const tile = el("div", "tile");
      const label = el("div", "tile-label");
      const value = el("div", "tile-value");
      tile.append(label, value);
      tiles.append(tile);
      return { key, tile, label, value };
    });

    main.append(head, hero, tiles);
    card.append(rail, main);

    this._nodes = {
      card, rail, buttons, title, subtitle,
      lockPill, lockIcon, lockText,
      windowPill, windowIcon, windowText,
      heroValue, barFill, footLeft, footRight, heroImage,
      tiles: tileNodes,
    };

    this.shadowRoot.replaceChildren(style, card);
  }

  _update() {
    if (!this._nodes) return;
    const nodes = this._nodes;
    const config = this._config || {};
    const hass = this._hass;

    nodes.buttons.forEach((button, key) => button.classList.toggle("active", key === this._section));

    const stateOf = (key) => hass?.states?.[resolveEntity(config, key)];

    const carState = hass?.states?.[config.entity];

    // Als Überschrift taugt der Name der gewählten Entität selten – wer den
    // Kilometerstand wählt, bekäme "Kilometerstand" über die Karte. Die
    // Entität `<kennung>_car` trägt dagegen den Fahrzeugnamen.
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

    // --- Verriegelung
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

    // --- Fenster
    const windows = stateOf("windows");
    if (windows && windows.state !== "unavailable") {
      const closed = windows.state === "on" || windows.state === "closed";
      nodes.windowPill.hidden = false;
      nodes.windowPill.classList.toggle("good", closed);
      nodes.windowPill.classList.toggle("bad", !closed);
      nodes.windowIcon.icon = closed ? "mdi:car-door-lock" : "mdi:car-door";
      nodes.windowText.textContent = closed ? "Fenster zu" : "Fenster offen";
    } else {
      nodes.windowPill.hidden = true;
    }

    // --- Reichweite und Tank
    const range = stateOf("range");
    const rangeValue = numberOf(range);
    nodes.heroValue.textContent = rangeValue === null ? "–" : `${formatNumber(rangeValue)} ${unitOf(range) || "km"}`;

    const fuel = numberOf(stateOf("fuel"));
    nodes.barFill.style.width = fuel === null ? "0%" : `${Math.max(0, Math.min(100, fuel))}%`;
    nodes.footLeft.textContent = fuel === null ? "" : `${formatNumber(fuel)} % Tank`;

    const odometer = stateOf("odometer");
    const odometerValue = numberOf(odometer);
    nodes.footRight.textContent =
      odometerValue === null ? "" : `${formatNumber(odometerValue)} ${unitOf(odometer) || "km"} gesamt`;

    if (config.image) {
      if (nodes.heroImage.firstElementChild?.tagName !== "IMG") {
        const img = document.createElement("img");
        img.alt = "";
        nodes.heroImage.replaceChildren(img);
      }
      nodes.heroImage.firstElementChild.src = config.image;
    }

    // --- Kacheln
    /**
     * Reifen als eine Aussage statt vier Zahlen. Die Einzeldrücke bleiben in
     * der Konfiguration – sie tragen später den Bereich „Reifen".
     */
    const tireTile = () => {
      const warning = stateOf("tire_warning");
      const rdk = stateOf("tire_state");
      if (warning && warning.state !== "unavailable" && warning.state !== "unknown") {
        const bad = warning.state === "on";
        return { value: bad ? "Warnung" : "ok", tone: bad ? "bad" : "good" };
      }
      // Ohne Warnmelder hilft der RDK-Zustand weiter.
      if (rdk && !["unavailable", "unknown"].includes(rdk.state)) {
        const ok = ["0", "ok", "normal", "no_warning"].includes(String(rdk.state).toLowerCase());
        return { value: ok ? "ok" : rdk.state, tone: ok ? "good" : "bad" };
      }
      // Letzter Ausweg: aus den Einzeldrücken lässt sich immerhin sagen, ob
      // überhaupt Werte ankommen.
      const pressures = ["tire_front_left", "tire_front_right", "tire_rear_left", "tire_rear_right"]
        .map((key) => numberOf(stateOf(key)))
        .filter((value) => value !== null);
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

    const active = WARNINGS.filter(([pattern]) => hass?.states?.[pattern.replace("{id}", id)]?.state === "on");

    const battery = stateOf("battery");
    const batteryOk = ["ok", "0", "normal", "good"].includes(String(battery?.state ?? "").toLowerCase());

    const values = {
      tires: { label: "Reifen", ...tireTile() },
      oil: { label: "Ölstand", ...oilTile() },
      warnings: {
        label: "Warnungen",
        value: active.length ? active.map(([, label]) => label).join(", ") : "keine",
        tone: active.length ? "bad" : "good",
      },
      battery: {
        label: "Starterbatterie",
        value: battery && battery.state !== "unavailable" ? (batteryOk ? "ok" : battery.state) : "–",
        tone: battery && battery.state !== "unavailable" ? (batteryOk ? "good" : "bad") : "",
      },
    };

    nodes.tiles.forEach(({ key, label, value }) => {
      label.textContent = values[key].label;
      value.textContent = values[key].value;
      value.title = values[key].value;
      value.classList.remove("good", "bad");
      if (values[key].tone) value.classList.add(values[key].tone);
    });

    nodes.card.classList.remove("is-on", "is-off", "is-unavailable");
    if (carState) nodes.card.classList.add(statusClass(carState));
  }
}

/** „vor 4 Minuten" – knapp gehalten, die Karte hat wenig Platz. */
export const relativeTime = (isoString) => {
  const then = new Date(isoString).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Minuten`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Stunden`;
  return `vor ${Math.round(hours / 24)} Tagen`;
};

if (!customElements.get(TAG)) customElements.define(TAG, HaOsVehicleCard);

registerCard({
  type: TAG,
  name: "HA-OS Fahrzeug",
  description: "Fahrzeugübersicht für Mercedes (mbapi2020) – Reichweite, Tank, Verriegelung, Reifen und Warnungen.",
  preview: false,
});

export { HaOsVehicleCard, TAG as VEHICLE_TAG, EDITOR_TAG as VEHICLE_EDITOR_TAG, SECTIONS };
