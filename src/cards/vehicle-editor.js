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
  entity_tire_rear_right: "Reifen hinten rechts",
};

const HELPERS = {
  entity:
    "Eine beliebige Entität des Fahrzeugs, etwa der Kilometerstand. Aus ihrer Kennung findet die Karte die übrigen Werte selbst.",
  name: "Leer lassen für den Namen aus Home Assistant.",
  image: "Hochladen oder ein Bild aus dieser Installation wählen, etwa /local/auto.png. Ohne Bild steht ein Symbol da.",
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

const buildSchema = () => [
  { name: "entity", required: true, selector: { entity: { integration: "mbapi2020" } } },
  { name: "name", selector: { text: {} } },
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
    this._preview = null;
    this._status = null;
    this._pathInput = null;
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
    // Das Bildfeld steht ausserhalb des Formulars und muss von Hand
    // nachgezogen werden, sonst zeigt es nach einem Rueckgaengig alte Werte.
    if (this._pathInput) this._pathInput.value = this._config.image || "";
    this._paintPreview();
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

  /**
   * Bildauswahl mit eigenem Upload.
   *
   * Zwei Anläufe über Home Assistants eigene Bausteine sind gescheitert:
   * `ha-form` liess ein Feld mit `selector: { image: {} }` stillschweigend
   * weg, und ein direkt erzeugtes `ha-selector` blieb im Kartendialog leer –
   * ohne Fehlermeldung, auch nachdem es registriert war.
   *
   * Deshalb hier ein eigener Knopf gegen die Schnittstelle, die HAs Uploader
   * selbst benutzt: POST auf `/api/image/upload`, das Bild liegt danach unter
   * `/api/image/serve/<id>/original`. Das hängt an keinem Element, das da sein
   * kann oder nicht. Schlägt es fehl, steht der Grund darunter – kein
   * stilles Nichts mehr.
   */
  _buildImageField() {
    const wrap = document.createElement("div");
    wrap.className = "image-field";

    const label = document.createElement("span");
    label.className = "image-label";
    label.textContent = LABELS.image;
    wrap.append(label);

    const write = (value) => {
      const next = { ...this._config };
      if (value) next.image = value;
      else delete next.image;
      this._config = next;
      this._pathInput.value = next.image || "";
      this._paintPreview();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
    };

    const row = document.createElement("div");
    row.className = "image-row";

    this._preview = document.createElement("div");
    this._preview.className = "preview";
    row.append(this._preview);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/gif,image/webp";
    fileInput.className = "file";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "upload";
    button.textContent = "Bild hochladen";
    button.addEventListener("click", () => fileInput.click());

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "upload ghost";
    clear.textContent = "Entfernen";
    clear.addEventListener("click", () => write(""));

    const buttons = document.createElement("div");
    buttons.className = "image-buttons";
    buttons.append(button, clear);
    row.append(buttons);
    wrap.append(row, fileInput);

    this._status = document.createElement("span");
    this._status.className = "image-status";
    wrap.append(this._status);

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      this._status.textContent = `${file.name} wird hochgeladen …`;
      this._status.classList.remove("bad");
      try {
        const url = await this._upload(file);
        write(url);
        this._status.textContent = "Hochgeladen.";
      } catch (error) {
        this._status.textContent = `Upload fehlgeschlagen: ${error.message}`;
        this._status.classList.add("bad");
      }
    });

    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.className = "path";
    pathInput.placeholder = "/local/auto.png";
    pathInput.value = this._config.image || "";
    pathInput.addEventListener("change", () => write(pathInput.value.trim()));
    this._pathInput = pathInput;
    wrap.append(pathInput);

    const helper = document.createElement("span");
    helper.className = "image-helper";
    helper.textContent = HELPERS.image;
    wrap.append(helper);

    this._paintPreview();
    return wrap;
  }

  _paintPreview() {
    if (!this._preview) return;
    const value = this._config.image || "";
    if (!value) {
      this._preview.replaceChildren();
      this._preview.classList.add("empty");
      return;
    }
    this._preview.classList.remove("empty");
    let img = this._preview.firstElementChild;
    if (img?.tagName !== "IMG") {
      img = document.createElement("img");
      img.alt = "";
      this._preview.replaceChildren(img);
    }
    img.src = value;
  }

  /**
   * Lädt die Datei in Home Assistants Bildablage und gibt die Adresse zurück.
   *
   * Der Token steckt je nach Version an zwei Stellen im `hass`-Objekt –
   * beide werden probiert. Ohne Token bricht der Upload mit einer klaren
   * Meldung ab, statt eine Anfrage ohne Anmeldung zu schicken.
   */
  async _upload(file) {
    const token =
      this._hass?.auth?.data?.access_token || this._hass?.connection?.options?.auth?.accessToken;
    if (!token) throw new Error("kein Zugangstoken im hass-Objekt");

    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/image/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText || ""}`.trim());
    }

    const data = await response.json();
    if (!data?.id) throw new Error("Antwort ohne Bild-Kennung");
    return `/api/image/serve/${data.id}/original`;
  }

  _build() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      .hint { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
      .image-field { display: flex; flex-direction: column; gap: 8px; margin: 16px 0 8px; }
      .image-label { font-size: 14px; color: var(--primary-text-color); }
      .image-helper { font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
      .image-row { display: flex; align-items: center; gap: 12px; }
      .image-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
      .preview {
        width: 84px; height: 52px; flex: 0 0 84px; border-radius: 8px; overflow: hidden;
        background: var(--secondary-background-color, rgba(127,127,127,.12));
        border: 1px solid var(--divider-color, rgba(127,127,127,.3));
      }
      .preview.empty { border-style: dashed; }
      .preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
      input.file { display: none; }
      button.upload {
        font: inherit; padding: 8px 14px; border-radius: 8px; cursor: pointer;
        color: var(--primary-color, #03a9f4);
        background: none;
        border: 1px solid var(--divider-color, rgba(127,127,127,.3));
      }
      button.upload.ghost { color: var(--secondary-text-color); }
      .image-status { font-size: 12px; color: var(--secondary-text-color); }
      .image-status.bad { color: var(--error-color, #db4437); }
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
    this.shadowRoot.replaceChildren(style, this._hint, form, this._buildImageField());
    this._paintHint();
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsVehicleEditor);

export { HaOsVehicleEditor };
