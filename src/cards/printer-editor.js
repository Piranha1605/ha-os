/**
 * HA-OS – Editor der Druckerkarte
 *
 * **Jede Entität ist einzeln wählbar.** Die Felder sind nach Bereichen
 * gruppiert und zugeklappt, sonst stünden dreißig Wähler untereinander.
 *
 * Ganz oben ein Feld *Drucker* als Bequemlichkeit: daraus werden die übrigen
 * geraten und beim Wählen **einmalig eingetragen** – nicht bei jedem Laden neu
 * berechnet. Das ist Absicht: was in der Konfiguration steht, bleibt stehen,
 * auch wenn jemand später eine Entität umbenennt. Sonst änderte sich die
 * Karte hinter dem Rücken des Anwenders.
 */

import { isEqualConfig } from "../shared/utils.js";
import { FIELDS, PRINTER_EDITOR_TAG, guessEntities } from "./printer-card.js";

const EDITOR_TAG = PRINTER_EDITOR_TAG;

const SECTION_LABELS = {
  overview: "Übersicht",
  temps: "Temperaturen",
  ams: "AMS",
  control: "Steuerung",
  camera: "Kamera",
};

const SECTION_ICONS = {
  overview: "M12,2A10,10 0 1,0 22,12A10,10 0 0,0 12,2Z",
  temps: "M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2Z",
  ams: "M4,4H20V8H4V4M4,10H20V14H4V10M4,16H20V20H4V16Z",
  control: "M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5Z",
  camera: "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4Z",
};

const LABELS = {
  entity: "Drucker",
  name: "Name",
};

const HELPERS = {
  entity:
    "Eine beliebige Entität des Druckers. Beim Wählen werden die übrigen Felder einmalig gefüllt – ändern lässt sich danach jedes einzeln.",
  name: "Leer lassen für den Namen aus Home Assistant.",
};

FIELDS.forEach((field) => {
  LABELS[`entity_${field.key}`] = field.label;
});

const sectionsOf = (fields) => {
  const order = ["overview", "temps", "ams", "control", "camera"];
  return order
    .map((section) => ({ section, items: fields.filter((field) => field.section === section) }))
    .filter(({ items }) => items.length);
};

const buildSchema = () => [
  { name: "entity", selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  ...sectionsOf(FIELDS).map(({ section, items }) => ({
    name: section,
    type: "expandable",
    flatten: true,
    iconPath: SECTION_ICONS[section],
    schema: items.map((field) => ({
      name: `entity_${field.key}`,
      selector: { entity: field.domain ? { domain: field.domain } : {} },
    })),
  })),
];

const SECTION_TITLES = Object.fromEntries(
  Object.entries(SECTION_LABELS).map(([key, label]) => [key, label])
);

class HaOsPrinterEditor extends HTMLElement {
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
      this._hint.textContent =
        "Oben eine Entität des Druckers wählen – die übrigen Felder werden dann einmalig gefüllt.";
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
    form.schema = buildSchema();
    form.computeLabel = (field) => LABELS[field.name] || SECTION_TITLES[field.name] || field.name;
    form.computeHelper = (field) => HELPERS[field.name] || "";

    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      let value = { ...event.detail.value };

      // Neuer Drucker gewählt: die übrigen Felder EINMALIG füllen. Bereits
      // gesetzte bleiben unangetastet – wer von Hand etwas eingetragen hat,
      // soll es nicht durch eine Vermutung verlieren.
      if (value.entity && value.entity !== this._config.entity) {
        const guessed = guessEntities(value.entity, this._hass);
        Object.entries(guessed).forEach(([key, entityId]) => {
          if (!value[`entity_${key}`]) value[`entity_${key}`] = entityId;
        });
      }

      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === undefined) delete value[key];
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
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsPrinterEditor);

export { HaOsPrinterEditor };
