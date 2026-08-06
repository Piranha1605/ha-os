/**
 * HA-OS – Editor der generischen Karte
 *
 * Oben das Typ-Auswahlfeld, darunter nur die Felder des gewählten Typs.
 *
 * WICHTIG gegen Fokusverlust:
 * Das <ha-form>-Element wird EINMAL erzeugt und danach nur noch über die
 * Eigenschaften .data und .schema aktualisiert. Würde der Editor bei jedem
 * Tastendruck neues DOM erzeugen, verlöre das gerade beschriebene Feld den
 * Fokus – genau das Verhalten aus der alten Version.
 */

import { CARD_TYPES } from "./haos-card.js";
import { isEqualConfig, flattenLegacyGroups } from "../shared/utils.js";

const EDITOR_TAG = "ha-os-card-editor";

const TYPE_FIELD = {
  name: "card_type",
  required: true,
  selector: { select: { mode: "dropdown", options: CARD_TYPES.map(({ value, label }) => ({ value, label })) } },
};

const entityField = (domains, multiple = false) => ({
  name: multiple ? "entities" : "entity",
  required: !multiple,
  selector: { entity: domains ? { domain: domains, multiple } : { multiple } },
});

const text = (name) => ({ name, selector: { text: {} } });
const bool = (name) => ({ name, selector: { boolean: {} } });
const number = (name, min, max, step = 1) => ({
  name,
  selector: { number: { min, max, step, mode: "box" } },
});

/**
 * Aufklappbare Blöcke.
 *
 * `flatten: true` ist hier keine Feinheit, sondern notwendig. Ohne die Angabe
 * legt `ha-form-expandable` die Felder verschachtelt unter dem Blocknamen ab –
 * aus dem Namensfeld wurde `darstellung: { name: "…" }` statt `name: "…"`.
 * Die Karte las `config.name`, fand nichts und zeigte weiter den langen
 * Entitätsnamen von Home Assistant. Wer den Block anfasst, prüft das erneut.
 */
const APPEARANCE = {
  name: "darstellung",
  type: "expandable",
  flatten: true,
  iconPath: "M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5Z",
  schema: [text("name"), { name: "icon", selector: { icon: {} } }],
};

const ACTION = {
  name: "aktion",
  type: "expandable",
  flatten: true,
  schema: [{ name: "tap_action", selector: { ui_action: {} } }],
};

/** Feldsatz je Kartentyp. */
const SCHEMAS = {
  button: [
    entityField(),
    APPEARANCE,
    { name: "state_entity", selector: { entity: {} } },
    bool("show_state"),
    bool("show_toggle"),
    { name: "press_icon", selector: { icon: {} } },
    ACTION,
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
            { value: "daily", label: "Täglich" },
          ],
        },
      },
    },
    number("forecast_count", 2, 10),
    bool("show_graph"),
  ],
  energy: [entityField(["sensor"]), APPEARANCE, number("days", 2, 31)],
  media: [entityField(["media_player"]), APPEARANCE],
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
            { value: "buttons", label: "Optionsknöpfe" },
          ],
        },
      },
    },
  ],
  clock: [
    text("name"),
    {
      name: "hour_format",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "24", label: "24 Stunden" },
            { value: "12", label: "12 Stunden" },
          ],
        },
      },
    },
    bool("show_seconds"),
    bool("show_date"),
    text("time_zone"),
  ],
};

const LABELS = {
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
  days: "Zeitraum in Tagen",
  max_events: "Maximale Termine",
  display: "Anzeigeart",
  hour_format: "Stundenformat",
  show_seconds: "Sekunden anzeigen",
  show_date: "Datum anzeigen",
  time_zone: "Zeitzone",
  haos_weight: "Höhenfaktor",
};

const HELPERS = {
  haos_weight: "1 entspricht der Standard-Kartenhöhe der Shell. 2 ist doppelt so hoch.",
  time_zone: "Leer lassen für die Zeitzone des Browsers, z. B. Europe/Berlin.",
  days: "Zeitraum, der geladen wird.",
  show_graph: "Temperaturverlauf über der Vorhersagezeile. Standardmäßig an.",
  press_icon: "Nur bei Tasten, Szenen und Skripten. Standard ist ein Finger.",
  show_toggle:
    "Die Form richtet sich nach der Entität: Umschalter, Taster oder Auf/Stopp/Zu.",
  state_entity:
    "Leer lassen, wenn die Entität selbst einen Zustand hat. Tasten (button) haben keinen – " +
    "hier dann den Sensor eintragen, der den echten Zustand meldet, z. B. den Türkontakt.",
};

class HaOsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._form = null;
  }

  setConfig(config) {
    // Alte Fassung mit verschachtelten Blöcken: hochziehen, sonst stünden die
    // Felder im Formular leer und die Werte gingen beim nächsten Speichern
    // verloren.
    const next = { card_type: "button", ...flattenLegacyGroups(config) };

    // Kommt die Änderung von uns selbst zurück, nichts anfassen.
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
    return [TYPE_FIELD, ...(SCHEMAS[this._config.card_type] || []), { name: "haos_weight", selector: { number: { min: 0.5, max: 6, step: 0.25, mode: "box" } } }];
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
    form.computeLabel = (field) => LABELS[field.name] || field.name;
    form.computeHelper = (field) => HELPERS[field.name] || "";

    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      const value = { ...event.detail.value };

      // Beim Typwechsel entstehen sonst Reste alter Felder in der Konfiguration.
      if (value.card_type !== this._config.card_type) {
        const keep = new Set(["type", "card_type", "haos_weight"]);
        Object.keys(value).forEach((key) => {
          if (!keep.has(key)) delete value[key];
        });
      }

      Object.keys(value).forEach((key) => {
        if (value[key] === "" || value[key] === undefined) delete value[key];
      });

      this._config = value;
      this._form.schema = this._schema();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
    });

    this._form = form;
    this.shadowRoot.replaceChildren(style, hint, form);
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsCardEditor);

export { HaOsCardEditor };
