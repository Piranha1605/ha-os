/**
 * HA-OS – Editor der Fahrzeugkarte
 *
 * Ein Pflichtfeld: das Fahrzeug. Alles Weitere leitet die Karte aus dessen
 * Kennung ab (siehe `vehicle-card.js`). Die Überschreibungen stecken in einem
 * zugeklappten Block – wer sie braucht, findet sie; wer nicht, sieht drei
 * Felder statt fünfzehn.
 *
 * Wie überall in HA-OS wird `ha-form` genau einmal erzeugt und danach nur
 * über `.data` und `.schema` aktualisiert, damit Textfelder beim Tippen den
 * Fokus behalten.
 */

import { isEqualConfig } from "../shared/utils.js";
import { DERIVED, VEHICLE_EDITOR_TAG, resolveEntity, vehicleId } from "./vehicle-card.js";

const EDITOR_TAG = VEHICLE_EDITOR_TAG;

const LABELS = {
  entity: "Fahrzeug",
  name: "Name",
  image: "Bild des Fahrzeugs",
  ueberschreiben: "Entitäten überschreiben",
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
  entity_tire_rear_right: "Reifen hinten rechts",
};

const HELPERS = {
  entity:
    "Eine beliebige Entität des Fahrzeugs, etwa der Kilometerstand. Aus ihrer Kennung findet die Karte die übrigen Werte selbst.",
  name: "Leer lassen für den Namen aus Home Assistant.",
  image: "Pfad innerhalb dieser Installation, etwa /local/auto.png. Ohne Bild steht ein Symbol da.",
  ueberschreiben:
    "Nur nötig, wenn eine Entität aus dem Namensmuster fällt – Fensterkontakte tragen oft den Gerätenamen davor.",
};

const OVERRIDES = {
  name: "ueberschreiben",
  type: "expandable",
  flatten: true,
  iconPath:
    "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5Z",
  schema: Object.keys(DERIVED).map((key) => ({ name: `entity_${key}`, selector: { entity: {} } })),
};

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { integration: "mbapi2020" } } },
  { name: "name", selector: { text: {} } },
  { name: "image", selector: { text: {} } },
  OVERRIDES,
];

class HaOsVehicleEditor extends HTMLElement {
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
    const found = keys.filter((key) => this._hass.states?.[resolveEntity(this._config, key)]).length;
    this._hint.textContent =
      found === keys.length
        ? `Kennung ${id} – alle ${keys.length} Werte gefunden.`
        : `Kennung ${id} – ${found} von ${keys.length} Werten gefunden. Fehlende unten überschreiben.`;
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
    form.schema = SCHEMA;
    form.computeLabel = (field) => LABELS[field.name] || field.name;
    form.computeHelper = (field) => HELPERS[field.name] || "";

    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      const value = { ...event.detail.value };
      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === undefined) delete value[key];
      });
      this._config = value;
      this._paintHint();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
    });

    this._form = form;
    this.shadowRoot.replaceChildren(style, this._hint, form);
    this._paintHint();
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsVehicleEditor);

export { HaOsVehicleEditor };
