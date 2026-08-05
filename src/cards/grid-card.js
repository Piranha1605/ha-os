/**
 * HA-OS – 2×2-Rasterkarte (`custom:ha-os-grid`)
 *
 * Vier Plätze in zwei Spalten und zwei Reihen. In jeden Platz passt jede
 * installierte Lovelace-Karte, ausgewählt über die Kartenliste – kein YAML.
 *
 * Zum Spaltenverhältnis: `column_widths: [1, 1]` heißt gleich breit,
 * `[2, 1]` macht die linke Spalte doppelt so breit. Die Breite der Kachel
 * insgesamt regelt Home Assistant über die Rasteroptionen des Abschnitts.
 *
 * Wie überall in HA-OS gilt: Kinderkarten werden wiederverwendet, solange
 * sich ihre Konfiguration nicht ändert. Würden sie bei jedem `hass`-Update
 * neu erzeugt, verlören sie ihren inneren Zustand und lüden ihre Daten neu –
 * genau der Fehler, an dem der Vorgänger gescheitert ist.
 */

import { CARD_SURFACE_CSS, createCardElement, isEqualConfig, registerCard } from "../shared/utils.js";

const TAG = "ha-os-grid";
const EDITOR_TAG = "ha-os-grid-editor";
const SLOTS = 4;

const STYLES = `
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

const clampRatio = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

class HaOsGridCard extends HTMLElement {
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
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return { type: `custom:${TAG}`, column_widths: [1, 1], gap: 12, cards: [] };
  }

  setConfig(config) {
    this._config = {
      column_widths: [1, 1],
      gap: 12,
      framed: false,
      responsive: true,
      cards: [],
      ...config,
    };
    if (!this._grid) this._build();
    this._applyLayout();
    this._syncCards();
  }

  set hass(hass) {
    this._hass = hass;
    // Weiterreichen genügt: jede Kinderkarte entscheidet selbst, ob sie sich
    // deswegen neu zeichnen muss.
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
    style.textContent = STYLES;

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

      // Unveränderte Karte: nichts anfassen. Ein Neuaufbau würde ihren
      // Zustand verwerfen und Daten neu laden lassen.
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
}

if (!customElements.get(TAG)) customElements.define(TAG, HaOsGridCard);

registerCard({
  type: TAG,
  name: "HA-OS 2×2-Raster",
  description: "Vier Plätze in zwei Spalten und zwei Reihen, jeder frei mit einer beliebigen Karte belegbar.",
  preview: false,
});

export { HaOsGridCard, TAG as GRID_TAG, EDITOR_TAG as GRID_EDITOR_TAG, SLOTS };
